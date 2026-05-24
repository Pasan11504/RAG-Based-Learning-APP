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
from langchain.output_parsers import StructuredOutputParser, ResponseSchema

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
# 5. FULL HISTORY-AWARE RAG CHAIN (Gemini-compatible)
# ============================================================

def get_rag_chain(model="llama-3.1-8b-instant"):
    llm = get_llm(model)
    model_l = model.lower()

    # ---------- Contextualization prompt ----------
    contextualize_q_system = (
        "පෙර සංවාදය නොසලකා නව ප්‍රශ්නය ස්වාධීන ලෙස නැවත ලියන්න. "
        "පිළිතුර නොදෙන්න. Sinhala භාෂාවෙන් පමණක්."
    )

    if "gemini" in model_l:
        contextualize_q_prompt = ChatPromptTemplate.from_messages([
            ("system", contextualize_q_system),
            ("human", "{input}")
        ])

        qa_prompt_local = ChatPromptTemplate.from_messages([
            ("system",
             "ඔබ Sinhala භාෂාවෙන් පමණක් පිළිතුරු දෙන AI උපකාරකයෙකි. "
             "පහත context එකේ තොරතුරු පමණක් භාවිතා කරන්න. "
             "බාහිර දත්ත නොයොදන්න.\n\nContext:\n{context}"),
            ("human", "{input}")
        ])
    else:
        contextualize_q_prompt = ChatPromptTemplate.from_messages([
            ("system", contextualize_q_system),
            MessagesPlaceholder("chat_history"),
            ("human", "{input}")
        ])

        qa_prompt_local = ChatPromptTemplate.from_messages([
            ("system",
             "ඔබ Sinhala භාෂාවෙන් පමණක් පිළිතුරු දෙන AI උපකාරකයෙකි. "
             "පහත context එකේ තොරතුරු පමණක් භාවිතා කරන්න. "
             "බාහිර දත්ත නොයොදන්න."),
            ("system", "Context:\n{context}"),
            MessagesPlaceholder("chat_history"),
            ("human", "{input}")
        ])

    contextualize_chain = contextualize_q_prompt | llm | StrOutputParser()

    history_aware_retriever = (
        RunnablePassthrough.assign(
            input=lambda x: contextualize_chain.invoke(
                {
                    "input": x["input"],
                    "chat_history": x.get("chat_history", [])
                }
            ) if x.get("chat_history") else x["input"]
        )
        | (lambda x: retriever.invoke(x["input"]))
    )

    rag_chain = (
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

    return rag_chain | RunnableLambda(lambda text: {"answer": text})





# ============================================================
# 6. LESSON PLAN GENERATOR (Gemini)
# ============================================================

def generate_textbook_lesson_plan(file_id: int, topic: str, duration: int, model: str) -> str:
    llm = get_llm(model)

    retr = vectorstore.as_retriever(
        search_kwargs={"k": 2, "filter": {"file_id": int(file_id)}}
    )

    docs = retr.invoke(f"{topic} main ideas")
    context_text = format_docs(docs)

    lesson_prompt = ChatPromptTemplate.from_messages([
        ("system",
         "ඔබ Sinhala පාසල් ගුරුවරයෙකි. "
         "පහත context භාවිතා කරමින් {duration} මිනිත්තු පාඩම් සැලැස්මක් සකසන්න. "
         "අවශ්‍ය කොටස්: සාරාංශය, ඉලක්ක, ක්‍රියාදාමය, ප්‍රශ්න."),
        ("human",
         "Topic: {topic}\n\nContext:\n{context}")
    ])

    chain = lesson_prompt | llm | StrOutputParser()
    return chain.invoke({"duration": duration, "context": context_text, "topic": topic})



# ============================================================
# 7. QUIZ GENERATOR (Gemini)
# ============================================================

def generate_textbook_quiz(file_id: int, question_type: str, num_questions: int, model: str) -> str:
    llm = get_llm(model)

    retr = vectorstore.as_retriever(
        search_kwargs={"k": 2, "filter": {"file_id": int(file_id)}}
    )

    docs = retr.invoke("important concepts for quiz")
    context_text = format_docs(docs)

    quiz_prompt = ChatPromptTemplate.from_messages([
        ("system",
         "ඔබ විභාග ප්‍රශ්න සකස් කරන AI ය. "
         "Sinhala භාෂාවෙන් {num_questions} {q_type} ප්‍රශ්න සකසන්න. "
         "Context පමණක් භාවිතා කරන්න."),
        ("human",
         "Context:\n{context}\n\nප්‍රශ්න සකසන්න.")
    ])

    chain = quiz_prompt | llm | StrOutputParser()
    return chain.invoke({"num_questions": num_questions, "q_type": question_type, "context": context_text})

# ============================================================
# 8. AUTO-MARKING (Gemini)
# ============================================================

def evaluate_student_script(question: str, model_answer: str, student_answer: str, max_marks: int, model: str) -> str:
    llm = get_llm(model)

    evaluation_prompt = ChatPromptTemplate.from_messages([
        ("system",
         "ඔබ නිර්පක්ෂ විභාග නිර්ණායකයෙකි. "
         "Sinhala භාෂාවෙන් {max_marks} න් ලකුණු දෙන්න. "
         "ලකුණු, විශ්වාසය, හේතුව, මඟහැර ගිය කරුණු ලබා දෙන්න."),
        ("human",
         "Question: {question}\n\nModel Answer: {model_answer}\n\nStudent Answer: {student_answer}")
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
        search_kwargs={"k": 2, "filter": {"file_id": file_id}}
    )

    docs = retr.invoke("summary main ideas")
    context = format_docs(docs)

    prompt = ChatPromptTemplate.from_messages([
        ("system", "Context එක සරල Sinhala භාෂාවෙන් සාරාංශ කරන්න."),
        ("human", "{context}")
    ])

    chain = prompt | llm | StrOutputParser()
    return chain.invoke({"context": context})


#PRACTICE QUESTION GENERATOR
# def generate_student_practice_questions(file_id: int, num_questions: int, model: str):
#     llm = get_llm(model)
#     model_l = model.lower()

#     retr = vectorstore.as_retriever(
#         search_kwargs={"k": 2, "filter": {"file_id": file_id}}
#     )

#     docs = retr.invoke("practice question concepts")
#     context = format_docs(docs)

#     # ============================================================
#     # 1. STRICT GEMINI PROMPT (escaped braces)
#     # ============================================================
#     if "gemini" in model_l:
#         prompt = ChatPromptTemplate.from_messages([
#             ("system",
#             f"""
#             You MUST output ONLY VALID JSON.

#             Follow this EXACT SCHEMA:

#             {{{{ 
#             "questions": [
#                 {{{{ 
#                 "question": "string",
#                 "correct_answer": "string",
#                 "explanation": "string"
#                 }}}}
#             ]
#             }}}}

#             RULES:
#             - Output ONLY JSON.
#             - No Markdown.
#             - No ``` fences.
#             - No text before or after JSON.
#             - MUST include exactly {num_questions} items in "questions".
#             - All fields MUST exist.
#             - All values MUST be strings.
#             - Use ONLY the provided context.
#             """
#             )
# ,
#             (("human",
#             "Context:\n{context}\n\nGenerate the JSON now.")
#             )
#         ])

#     # ============================================================
#     # 2. GROQ PROMPT (already stable)
#     # ============================================================
#     else:
#         prompt = ChatPromptTemplate.from_messages([
#             ("system",
#              "Sinhala භාෂාවෙන් VALID JSON array එකක් පමණක් ලබා දෙන්න. "
#              "JSON පිටත කිසිවක් නොලියන්න. "
#              "Array object keys: question, correct_answer, explanation. "
#              "Context පමණක් භාවිතා කරන්න."),
#             ("human",
#              "Context:\n{context}\n\n"
#              f"{num_questions} ප්‍රශ්න JSON array එකක් ලෙස සකසන්න. "
#              "JSON පමණක් output කරන්න.")
#         ])

#     # ============================================================
#     # 3. RUN CHAIN
#     # ============================================================
#     chain = prompt | llm | StrOutputParser()
#     raw = chain.invoke({"num_questions": num_questions, "context": context})

#     # ============================================================
#     # 4. CLEAN JSON
#     # ============================================================
#     cleaned = raw.replace("```json", "").replace("```", "").replace("```JSON", "")
#     cleaned = cleaned.strip()

#     # Try direct JSON
#     try:
#         return json.loads(cleaned)
#     except:
#         pass

#     # Extract array only
#     try:
#         array_part = cleaned[cleaned.find('['): cleaned.rfind(']') + 1]
#         return json.loads(array_part)
#     except:
#         pass

#     # Wrap as array
#     try:
#         return json.loads(f"[{cleaned}]")
#     except:
#         raise ValueError("Model did not return valid JSON:\n" + raw)



def generate_student_practice_questions_groq(file_id: int, num_questions: int, model: str):
    llm = get_llm(model)

    retr = vectorstore.as_retriever(
        search_kwargs={"k": 1, "filter": {"file_id": file_id}}
    )

    docs = retr.invoke("generate practice questions")
    material = format_docs(docs)
    material = material[:2000]

    system_prompt = f"""
You MUST output ONLY JSON.

FORMAT (MANDATORY):
Return an object with a key named "questions".
"questions" must be an array.
Each array item must contain:
- question
- correct_answer
- explanation

RULES:
- NEVER return a list of strings.
- ALWAYS return objects.
- ALWAYS include correct_answer and explanation.
- Use Sinhala only.
- Output ONLY JSON.
"""

    human_prompt = f"""
Study Material:
{material}

Generate {num_questions} Sinhala practice questions now.
"""

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", human_prompt)
    ])

    chain = prompt | llm

    raw = chain.invoke({})

    raw_text = raw.content if hasattr(raw, "content") else raw

    try:
        data = json.loads(raw_text)
    except:
        data = {"questions": []}

    normalized = []
    for q in data.get("questions", []):
        if isinstance(q, str):
            normalized.append({
                "question": q,
                "correct_answer": "",
                "explanation": ""
            })
        else:
            normalized.append({
                "question": q.get("question", ""),
                "correct_answer": q.get("correct_answer", ""),
                "explanation": q.get("explanation", "")
            })

    return {"questions": normalized}

def generate_student_practice_questions_gemini(file_id: int, num_questions: int):
    llm = get_llm("gemini")   # or however you select Gemini

    retr = vectorstore.as_retriever(
        search_kwargs={"k": 1, "filter": {"file_id": file_id}}
    )

    docs = retr.invoke("generate practice questions")
    material = format_docs(docs)
    material = material[:1800]   # Gemini is sensitive to long context

    system_prompt = """
You MUST output ONLY valid JSON.

Output format:
- Return an object with a key "questions".
- "questions" must be an array.
- Each item must be an object with:
  - "question": string
  - "correct_answer": string
  - "explanation": string

Rules:
- Do NOT output anything except JSON.
- Do NOT output browser metadata.
- Do NOT output system info.
- Do NOT output empty arrays.
- Do NOT output strings inside the array.
- ALWAYS fill all three fields.
"""

    human_prompt = f"""
Study Material:
{material}

Generate {num_questions} Sinhala practice questions.
Return ONLY JSON.
"""

    prompt = ChatPromptTemplate.from_messages([
        ("system", system_prompt),
        ("human", human_prompt)
    ])

    chain = prompt | llm
    raw = chain.invoke({})

    raw_text = raw.content if hasattr(raw, "content") else raw

    try:
        data = json.loads(raw_text)
    except:
        data = {"questions": []}

    normalized = []
    for q in data.get("questions", []):
        if isinstance(q, dict):
            normalized.append({
                "question": q.get("question", ""),
                "correct_answer": q.get("correct_answer", ""),
                "explanation": q.get("explanation", "")
            })
        else:
            normalized.append({
                "question": str(q),
                "correct_answer": "",
                "explanation": ""
            })

    return {"questions": normalized}

def generate_student_practice_questions(file_id: int, num_questions: int, model: str):
    model = model.lower()

    if "gemini" in model:
        return generate_student_practice_questions_gemini(file_id, num_questions)

    # default → Groq
    return generate_student_practice_questions_groq(file_id, num_questions, model)






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
            "explanation": f"Sinhala: {exp}"
        })

    return results
