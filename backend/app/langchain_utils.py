from langchain_groq import ChatGroq
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
from typing import List
from langchain_core.documents import Document
from app.chroma_utils import vectorstore

retriever = vectorstore.as_retriever(search_kwargs={"k": 2})

contextualize_q_system_prompt = (
    "Given a chat history and the latest user question "
    "which might reference context in the chat history, "
    "formulate a standalone question which can be understood "
    "without the chat history. Do NOT answer the question, "
    "just reformulate it if needed and otherwise return it as is."
)

contextualize_q_prompt = ChatPromptTemplate.from_messages([
    ("system", contextualize_q_system_prompt),
    MessagesPlaceholder("chat_history"),
    ("human", "{input}"),
])

qa_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are a helpful AI assistant. Use the following context to answer the user's question."),
    ("system", "Context: {context}"),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{input}")
])

def format_docs(docs):
    return "\n\n".join(doc.page_content for doc in docs)

def get_rag_chain(model="llama-3.1-8b-instant"):
    # Initialize Groq Engine (automatically picks up GROQ_API_KEY from environment variables)
    llm = ChatGroq(model=model)
    
    # Contextualization generation chain
    contextualize_chain = contextualize_q_prompt | llm | StrOutputParser()
    
    # Context-aware embedding document lookup retriever flow 
    history_aware_retriever = (
        RunnablePassthrough.assign(
            input=lambda x: contextualize_chain.invoke({"input": x["input"], "chat_history": x["chat_history"]})
            if x.get("chat_history") else x["input"]
        )
        | (lambda x: retriever.invoke(x["input"]))
    )
    
    # Modern LCEL RAG Pipeline logic execution layout mapping
    lcel_rag_chain = (
        RunnablePassthrough.assign(
            context=lambda x: format_docs(history_aware_retriever.invoke({
                "input": x["input"], 
                "chat_history": x.get("chat_history", [])
            }))
        )
        | qa_prompt
        | llm
        | StrOutputParser()
    )
    
    # Converts raw string response into dict containing {'answer': response}
    final_rag_chain = lcel_rag_chain | RunnableLambda(lambda text: {"answer": text})
    
    return final_rag_chain


# Add to the very bottom of app/langchain_utils.py

def generate_textbook_lesson_plan(file_id: int, topic: str, duration: int) -> str:
    """
    Retrieves targeted chapter context matching a file ID from the active Chroma vector store,
    then compiles a structured instructional lesson plan using the Groq LLM.
    """
    # Initialize the model using your established Groq configuration layout
    llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0.3)
    
    # Configure a search retriever specifically restricted to the selected file metadata
    retriever = vectorstore.as_retriever(
        search_kwargs={
            "k": 4, 
            "filter": {"file_id": int(file_id)}
        }
    )
    
    # Extract matching learning concepts from the vector store
    search_query = f"Core concepts, key terms, definitions, formulas, and main subtopics about {topic}"
    retrieved_docs = retriever.invoke(search_query)
    context_text = format_docs(retrieved_docs)
    
    # Strict prompt template to construct a balanced secondary school lesson breakdown
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
    
    # Execute the LangChain Expression Language (LCEL) sequence
    generation_chain = lesson_prompt | llm | StrOutputParser()
    return generation_chain.invoke({"duration": duration, "context": context_text, "topic": topic})


# Add to the very bottom of app/langchain_utils.py

def generate_textbook_quiz(file_id: int, question_type: str, num_questions: int) -> str:
    """
    Extracts relevant context from ChromaDB using the file_id, then uses 
    the Groq LLM to build an assessment quiz sheet with a benchmark answer key.
    """
    llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0.5)
    
    # Restrict retriever search parameters to the selected textbook file_id
    retriever = vectorstore.as_retriever(
        search_kwargs={
            "k": 5, 
            "filter": {"file_id": int(file_id)}
        }
    )
    
    # Retrieve semantic context blocks from the store
    search_query = f"Important concepts, definitions, core facts, statements, and practice text for making questions"
    retrieved_docs = retriever.invoke(search_query)
    context_text = format_docs(retrieved_docs)
    
    # System prompt enforcing strict formatting layout restrictions
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
    
    generation_chain = quiz_prompt | llm | StrOutputParser()
    return generation_chain.invoke({"num_questions": num_questions, "q_type": question_type, "context": context_text})



# Add to the very bottom of app/langchain_utils.py

def evaluate_student_script(question: str, model_answer: str, student_answer: str, max_marks: int) -> str:
    """
    Compares a student's answer against a benchmark key, assigns a fair score,
    and returns a structured feedback report using the Groq LLM.
    """
    llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0.1) # Low temperature for objective marking
    
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
    
    evaluation_chain = evaluation_prompt | llm | StrOutputParser()
    return evaluation_chain.invoke({
        "max_marks": max_marks,
        "question": question,
        "model_answer": model_answer,
        "student_answer": student_answer
    })