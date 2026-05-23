from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime
from typing import Optional, List  # <-- CRITICAL: This was missing 'Optional' and 'List'


class ModelName(str, Enum):
    LLAMA_3_1_8B = "llama-3.1-8b-instant"
    # 2.5 Series Models
    GEMINI_2_5_FLASH = "gemini-2.5-flash"
    GEMINI_2_5_PRO = "gemini-2.5-pro"
    
    # 2.0 Series Models
    GEMINI_2_FLASH = "gemini-2.0-flash"
    GEMINI_2_FLASH_LITE = "gemini-2.0-flash-lite"

class QueryInput(BaseModel):
    question: str
    session_id: Optional[str] = None
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


# Add to the very bottom of app/pydantic_models.py

class LessonPlanRequest(BaseModel):
    file_id: int
    topic: str
    duration_minutes: Optional[int] = Field(default=40, ge=10, le=120)
    model: str


# Add to the very bottom of app/pydantic_models.py

class QuizGenerationRequest(BaseModel):
    file_id: int
    question_type: str  # E.g., "MCQ", "Short Answer", "Essay"
    num_questions: Optional[int] = Field(default=3, ge=1, le=10)
    model: str


# Add to the very bottom of app/pydantic_models.py

class EvaluationRequest(BaseModel):
    question_text: str
    model_answer: str
    student_answer: str
    max_marks: int
    model: str

class StudentSummaryRequest(BaseModel):
    file_id: int
    model: str

class StudentPracticeRequest(BaseModel):
    file_id: int
    num_questions: int
    model: str

class StudentAnswerCheckRequest(BaseModel):
    questions: List[str]
    student_answers: List[str]
    correct_answers: List[str]
    explanations: List[str]
