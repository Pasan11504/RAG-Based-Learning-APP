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