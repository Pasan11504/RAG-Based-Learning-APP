import os
import json
import re
from typing import List
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
from langchain_core.documents import Document
from app.chroma_utils import vectorstore

# ============================================================
# 1. LLM SELECTOR (Gemini primary, Groq fallback)
# ============================================================

def get_llm(model: str):
    model = model.lower()

    # Gemini models
    if "gemini" in model:
        return ChatGoogleGenerativeAI(
            model=model,
            google_api_key=os.getenv("GEMINI_API_KEY"),
            temperature=0.2
        )

    # Default Groq fallback
    return ChatGroq(
        model=model,
        groq_api_key=os.getenv("GROQ_API_KEY"),
        temperature=0.2
    )

# ============================================================
# 2. RAG RETRIEVER
# ============================================================

retriever = vectorstore.as_retriever(search_kwargs={"k": 2})

def format_docs(docs: List[Document]):
    return "\n\n".join(doc.page_content for doc in docs)

# ============================================================
# 3. CONTEXTUAL QUESTION REFORMULATION
# ============================================================

contextualize_q_system_prompt = (
    "Given a chat history and the latest user question "
    "which might reference context in the chat history, "
    "formulate a standalone question which can be understood "
    "without the chat history. Do NOT answer the question, "
    "just reformulate it if needed and otherwise return it as is."
)

""" contextualize_q_prompt = ChatPromptTemplate.from_messages([
    ("system", contextualize_q_system_prompt),
    MessagesPlaceholder("chat_history"),
    ("human", "{input}"),
]) """

# ============================================================
# 4. QA PROMPT
# ============================================================

""" qa_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful AI assistant. Use the following context to answer the user's question."),
    ("system", "Context: {context}"),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{input}")
]) """

# ============================================================
# 5. FULL HISTORY-AWARE RAG CHAIN (Gemini-compatible)
# ============================================================

def get_rag_chain(model="llama-3.1-8b-instant"):
    llm = get_llm(model)
    model_l = model.lower()

    # ============================
    # 1. MODEL-SPECIFIC PROMPTS
    # ============================

    # Gemini cannot accept system messages inside chat history
    if "gemini" in model_l:
        contextualize_q_prompt = ChatPromptTemplate.from_messages([
            ("system", contextualize_q_system_prompt),
            ("human", "{input}"),
        ])

        qa_prompt_local = ChatPromptTemplate.from_messages([
            ("system", "You are a helpful AI assistant. Use the following context to answer the user's question."),
            ("Context: {context}"),
            ("human", "{input}")
        ])

    # Groq (LLaMA) supports full history
    else:
        contextualize_q_prompt = ChatPromptTemplate.from_messages([
            ("system", contextualize_q_system_prompt),
            MessagesPlaceholder("chat_history"),
            ("human", "{input}"),
        ])

        qa_prompt_local = ChatPromptTemplate.from_messages([
            ("system", "You are a helpful AI assistant. Use the following context to answer the user's question."),
            ("system", "Context: {context}"),
            MessagesPlaceholder("chat_history"),
            ("human", "{input}")
        ]) 

    # ============================
    # 2. CONTEXTUALIZATION CHAIN
    # ============================

    contextualize_chain = contextualize_q_prompt | llm | StrOutputParser()

    history_aware_retriever = (
        RunnablePassthrough.assign(
            input=lambda x: contextualize_chain.invoke(
                {"input": x["input"], "chat_history": x.get("chat_history", [])}
            ) if x.get("chat_history") else x["input"]
        )
        | (lambda x: retriever.invoke(x["input"]))
    )

    # ============================
    # 3. FINAL RAG CHAIN
    # ============================

    lcel_rag_chain = (
        RunnablePassthrough.assign(
            context=lambda x: format_docs(
                history_aware_retriever.invoke({
                    "input": x["input"],
                    "chat_history": x.get("chat_history", [])
                })
            )
        )
        | qa_prompt_local
        | llm
        | StrOutputParser()
    )

    return lcel_rag_chain | RunnableLambda(lambda text: {"answer": text})



# ============================================================
# 6. LESSON PLAN GENERATOR (Gemini)
# ============================================================

def generate_textbook_lesson_plan(file_id: int, topic: str, duration: int, model: str) -> str:
    llm = get_llm(model)

    retr = vectorstore.as_retriever(
        search_kwargs={"k": 4, "filter": {"file_id": int(file_id)}}
    )

    search_query = f"Core concepts, key terms, definitions, formulas, and main subtopics about {topic}"
    docs = retr.invoke(search_query)
    context_text = format_docs(docs)

    lesson_prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an expert school curriculum developer and master teacher.\n"
                   "Create a highly professional, detailed lesson plan for a {duration}-minute class period "
                   "based ONLY on the provided textbook context below.\n\n"
                   "The lesson plan MUST include these exact sections with clear formatting:\n"
                   "1. LESSON OVERVIEW & SUMMARY\n"
                   "2. CORE INTELLECTUAL OBJECTIVES (What students will know/do)\n"
                   "3. DETAILED TIMELINE BREAKDOWN (Allocate specific minutes for: Introduction, Core Content Delivery, Student Activity, Assessment/Wrap-up)\n"
                   "4. CONTEXTUAL ASSESSMENT QUESTIONS (Directly matching the text numbers)\n\n"
                   "Context from textbook:\n{context}"),
        ("human", "Compile a detailed lesson plan for the topic: {topic}")
    ])

    chain = lesson_prompt | llm | StrOutputParser()
    return chain.invoke({"duration": duration, "context": context_text, "topic": topic})


# ============================================================
# 7. QUIZ GENERATOR (Gemini)
# ============================================================

def generate_textbook_quiz(file_id: int, question_type: str, num_questions: int, model: str) -> str:
    llm = get_llm(model)

    retr = vectorstore.as_retriever(
        search_kwargs={"k": 5, "filter": {"file_id": int(file_id)}}
    )

    search_query = "Important concepts, definitions, and facts for making questions"
    docs = retr.invoke(search_query)
    context_text = format_docs(docs)

    quiz_prompt = ChatPromptTemplate.from_messages([
        ("system", "You are an expert school examiner and evaluation officer.\n"
                   "Create a test paper with exactly {num_questions} {q_type} questions based ONLY on the provided textbook context below.\n\n"
                   "CRITICAL FORMATTING RULES:\n"
                   "- Provide the QUESTIONS section first.\n"
                   "- If the type is 'MCQ', each question must have 4 distinct options (A, B, C, D).\n"
                   "- Provide an ANSWER KEY section at the very end with clear explanations tied directly to the text context.\n"
                   "- Do not include outside facts or unverified assumptions.\n\n"
                   "Textbook Context:\n{context}"),
        ("human", "Generate the test paper now.")
    ])

    chain = quiz_prompt | llm | StrOutputParser()
    return chain.invoke({"num_questions": num_questions, "q_type": question_type, "context": context_text})

# ============================================================
# 8. AUTO-MARKING (Gemini)
# ============================================================

def evaluate_student_script(question: str, model_answer: str, student_answer: str, max_marks: int, model: str) -> str:
    llm = get_llm(model)

    evaluation_prompt = ChatPromptTemplate.from_messages([
                ("system", "You are an objective academic evaluator grading a secondary school student's answer script.\n"
                   "Compare the student's answer against the benchmark model answer provided.\n\n"
                   "CRITICAL GRADING CRITERIA:\n"
                   "- Grade strictly out of {max_marks} maximum marks.\n"
                   "- Deduct marks fairly if core terms, definitions, or key causal concepts are missing.\n"
                   "- Do not penalize grammar issues unless they completely alter the scientific or factual accuracy.\n\n"
                   "Your output must be a clean markdown report containing exactly these sections:\n"
                   "### SCORE: [Awarded Marks] / {max_marks}\n"
                   "### AI CERTAINTY: [Value between 80% and 100%]\n"
                   "### CONSTRUCTIVE FEEDBACK: [Explain why the score was given]\n"
                   "- Omitted Conceptual Variables: [List any key ideas, words, or facts the student missed from the model answer]"),
        ("human", "Question: {question}\n\n"
                  "Benchmark Model Answer: {model_answer}\n\n"
                  "Student's Submitted Answer: {student_answer}")
    ])

    chain = evaluation_prompt | llm | StrOutputParser()

    return chain.invoke({
        "max_marks": max_marks,
        "question": question,
        "model_answer": model_answer,
        "student_answer": student_answer
    })

#SUMMARY GENERATOR
def generate_student_summary(file_id: int, model: str):
    llm = get_llm(model)

    retr = vectorstore.as_retriever(
        search_kwargs={"k": 3, "filter": {"file_id": file_id}}
    )

    docs = retr.invoke("Main ideas, definitions, key points")
    context = format_docs(docs)

    prompt = ChatPromptTemplate.from_messages([
        ("system", "Explain the following content in simple language suitable for a student.\n\n{context}"),
        ("human", "Give me a short summary.")
    ])

    chain = prompt | llm | StrOutputParser()
    return chain.invoke({"context": context})

#PRACTICE QUESTION GENERATOR
def generate_student_practice_questions(file_id: int, num_questions: int, model: str):
    llm = get_llm(model)

    retr = vectorstore.as_retriever(
        search_kwargs={"k": 4, "filter": {"file_id": file_id}}
    )

    docs = retr.invoke("Important concepts for practice questions")
    context = format_docs(docs)

    prompt = ChatPromptTemplate.from_messages([
        ("system",
         "You MUST return ONLY valid JSON.\n"
         "Format: [\n"
         "  {{\n"
         "    \"question\": \"...\",\n"
         "    \"correct_answer\": \"...\",\n"
         "    \"explanation\": \"...\"\n"
         "  }}\n"
         "]\n"
         "No text before or after the JSON.\n"
         "Create {num_questions} simple practice questions.\n"
         "Context:\n{context}"
        ),
        ("human", "Generate now.")
    ])

    chain = prompt | llm | StrOutputParser()
    raw = chain.invoke({"num_questions": num_questions, "context": context})

    # Try parsing JSON
    try:
        return json.loads(raw)
    except:
        match = re.search(r'\[.*\]', raw, re.DOTALL)
        if not match:
            raise ValueError("Model did not return valid JSON.")
        return json.loads(match.group(0))



#ANSWER CHECKER
def evaluate_student_answers(payload):
    results = []

    for q, student, correct, exp in zip(
        payload.questions,
        payload.student_answers,
        payload.correct_answers,
        payload.explanations
    ):
        is_correct = (student.strip().lower() == correct.strip().lower())
        results.append({
            "question": q,
            "student_answer": student,
            "correct_answer": correct,
            "is_correct": is_correct,
            "explanation": exp
        })

    return results
