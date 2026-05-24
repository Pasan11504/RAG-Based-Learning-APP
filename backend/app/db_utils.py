import os
from typing import Optional, List, Dict, Any
from datetime import datetime
from sqlmodel import Field, SQLModel, create_engine, Session, select
from sqlalchemy import Column, Text
# ==========================================
# 1. DATABASE CONNECTION SETUP
# ==========================================

# Replace these values with your actual MySQL database credentials
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "password")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME", "rag_app_db")

# Construct the MySQL connection string using the pymysql driver
DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Create the engine with a connection pool to manage concurrent users seamlessly
engine = create_engine(
    DATABASE_URL,
    pool_size=10,         # Keeps 10 open connections ready to use
    max_overflow=20,     # Allows up to 20 extra connections during heavy traffic
    pool_recycle=3600    # Recycles connections every hour to prevent drop-offs
)

# ==========================================
# 2. TABLE SCHEMAS (DEFINITIONS)
# ==========================================

class ApplicationLog(SQLModel, table=True):
    """Stores chat conversations and responses."""
    __tablename__ = "application_logs"

    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: str = Field(index=True)
    user_query: str = Field(sa_column=Column(Text))       # allow long questions
    gpt_response: str = Field(sa_column=Column(Text))     # FIXED: unlimited length
    model: str = Field(max_length=50)
    created_at: datetime = Field(default_factory=datetime.utcnow)
class DocumentStore(SQLModel, table=True):
    """Tracks uploaded files and metadata."""
    __tablename__ = "document_store"

    id: Optional[int] = Field(default=None, primary_key=True)
    filename: str = Field(max_length=255)
    upload_timestamp: datetime = Field(default_factory=datetime.utcnow)

# ==========================================
# 3. INTERACTION FUNCTIONS (CRUD)
# ==========================================

def init_db() -> None:
    """Creates the tables automatically in MySQL if they do not exist."""
    SQLModel.metadata.create_all(engine)

def insert_application_logs(session_id: str, user_query: str, gpt_response: str, model: str) -> None:
    """Inserts a new chat log entry into the database safely using a session context."""
    with Session(engine) as session:
        log_entry = ApplicationLog(
            session_id=session_id,
            user_query=user_query,
            gpt_response=gpt_response,
            model=model
        )
        session.add(log_entry)
        session.commit()

def get_chat_history(session_id: str) -> List[Dict[str, str]]:
    """Retrieves chat history for a session formatted for LangChain workflows."""
    messages = []
    with Session(engine) as session:
        statement = select(ApplicationLog).where(ApplicationLog.session_id == session_id).order_by(ApplicationLog.created_at)
        results = session.exec(statement).all()
        
        for row in results:
            messages.extend([
                {"role": "human", "content": row.user_query},
                {"role": "ai", "content": row.gpt_response}
            ])
    return messages

def insert_document_record(filename: str) -> int:
    """Saves an uploaded document record and returns the generated unique file ID."""
    with Session(engine) as session:
        doc_record = DocumentStore(filename=filename)
        session.add(doc_record)
        session.commit()
        session.refresh(doc_record)  # Refreshes object to read the auto-generated ID
        return doc_record.id

def delete_document_record(file_id: int) -> bool:
    """Removes a document entry from the tracker database by its primary key ID."""
    with Session(engine) as session:
        statement = select(DocumentStore).where(DocumentStore.id == file_id)
        doc_record = session.exec(statement).first()
        if doc_record:
            session.delete(doc_record)
            session.commit()
            return True
        return False

def get_all_documents() -> List[Dict[str, Any]]:
    """Fetches a list of all uploaded documents sorted by latest upload timestamp."""
    with Session(engine) as session:
        statement = select(DocumentStore).order_by(DocumentStore.upload_timestamp.desc())
        results = session.exec(statement).all()
        return [
            {
                "id": doc.id,
                "filename": doc.filename,
                "upload_timestamp": doc.upload_timestamp
            }
            for doc in results
        ]

# ==========================================
# AUTHENTICATION & USER MANAGEMENT UPDATES
# ==========================================

class User(SQLModel, table=True):
    """Stores detailed user account credentials and profile parameters."""
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=255)
    email: str = Field(max_length=255, unique=True, index=True)
    hashed_password: str = Field(max_length=255)
    role: str = Field(max_length=50) # 'admin', 'teacher', 'student', 'evaluator'
    grade: Optional[str] = Field(default=None, max_length=50) # e.g., 'Grade 8'
    subject: Optional[str] = Field(default=None, max_length=100) # e.g., 'Science'
    school: Optional[str] = Field(default=None, max_length=255)
    preferred_language: str = Field(default="English", max_length=50)
    created_at: datetime = Field(default_factory=datetime.utcnow)

def register_user(name: str, email: str, plain_password: str, role: str, 
                  grade: Optional[str] = None, subject: Optional[str] = None, 
                  school: Optional[str] = None, preferred_language: str = "English") -> Optional[User]:
    """Registers a new user inside the MySQL engine with a safely hashed password."""
    from app.auth_utils import hash_password
    
    with Session(engine) as session:
        # Verify if email is already taken
        existing_user = session.exec(select(User).where(User.email == email)).first()
        if existing_user:
            return None
            
        new_user = User(
            name=name,
            email=email,
            hashed_password=hash_password(plain_password),
            role=role.lower(),
            grade=grade,
            subject=subject,
            school=school,
            preferred_language=preferred_language
        )
        session.add(new_user)
        session.commit()
        session.refresh(new_user)
        return new_user

def get_user_by_email(email: str) -> Optional[User]:
    """Fetches a complete User record by email address for verification processes."""
    with Session(engine) as session:
        return session.exec(select(User).where(User.email == email)).first()

def get_user_by_id(user_id: int) -> Optional[User]:
    """Fetches a complete User record by its primary key id."""
    with Session(engine) as session:
        return session.exec(select(User).where(User.id == user_id)).first()

def update_user_profile(user_id: int, name: str, grade: Optional[str], 
                        subject: Optional[str], school: Optional[str], 
                        preferred_language: str) -> Optional[User]:
    """Updates an existing user's descriptive profile configurations."""
    with Session(engine) as session:
        user = session.exec(select(User).where(User.id == user_id)).first()
        if user:
            user.name = name
            user.grade = grade
            user.subject = subject
            user.school = school
            user.preferred_language = preferred_language
            session.add(user)
            session.commit()
            session.refresh(user)
            return user
        return None
# ==========================================
# 4. INITIALIZATION RUN
# ==========================================
# Call this once to make sure tables are ready when your backend spins up
init_db()