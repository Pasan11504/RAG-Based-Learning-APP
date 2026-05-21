from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime
from typing import Optional, List  # <-- CRITICAL: This was missing 'Optional' and 'List'

class ModelName(str, Enum):
    LLAMA_3_1_8B = "llama-3.1-8b-instant"  # Updated to your free Groq model choice

class QueryInput(BaseModel):
    question: str
    session_id: str = Field(default=None)
    model: ModelName = Field(default=ModelName.LLAMA_3_1_8B)

class QueryResponse(BaseModel):
    answer: str
    session_id: str
    model: ModelName

class DocumentInfo(BaseModel):
    id: int
    filename: str
    upload_timestamp: datetime

class DeleteFileRequest(BaseModel):
    file_id: int



# Add these definitions inside your app/pydantic_models.py file

class UserRegisterInput(BaseModel):
    name: str
    email: str
    password: str
    role: str # Must be 'admin', 'teacher', 'student', or 'evaluator'
    grade: Optional[str] = None
    subject: Optional[str] = None
    school: Optional[str] = None
    preferred_language: Optional[str] = "English"

class UserLoginInput(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str

class ProfileUpdateInput(BaseModel):
    name: str
    grade: Optional[str] = None
    subject: Optional[str] = None
    school: Optional[str] = None
    preferred_language: str

class UserProfileResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    grade: Optional[str] = None
    subject: Optional[str] = None
    school: Optional[str] = None
    preferred_language: str