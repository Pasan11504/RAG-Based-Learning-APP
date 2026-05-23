import os
import uuid
import logging
import shutil
from fastapi import FastAPI, File, UploadFile, HTTPException, Depends
from app.langchain_utils import get_rag_chain, generate_textbook_lesson_plan, generate_textbook_quiz, evaluate_student_script, generate_student_summary, generate_student_practice_questions, evaluate_student_answers
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# 1. Dynamically calculate paths to find the .env file in the BACKEND folder
current_dir = os.path.dirname(os.path.abspath(__file__)) 
backend_dir = os.path.dirname(current_dir)                
dotenv_path = os.path.join(backend_dir, '.env')

# 2. Load the environment variables
load_dotenv(dotenv_path=dotenv_path)

# --- Cleaned Schemas and Logic Imports ---
from app.pydantic_models import (
    QueryInput, QueryResponse, DocumentInfo, DeleteFileRequest,
    UserRegisterInput, UserLoginInput, TokenResponse, 
    ProfileUpdateInput, UserProfileResponse, LessonPlanRequest,
    QuizGenerationRequest,
    StudentSummaryRequest, StudentPracticeRequest, StudentAnswerCheckRequest
)
from app.langchain_utils import get_rag_chain, generate_textbook_lesson_plan, generate_textbook_quiz
from app.db_utils import (
    insert_application_logs, get_chat_history, get_all_documents, 
    insert_document_record, delete_document_record, register_user, 
    get_user_by_email, get_user_by_id, update_user_profile
)
from app.chroma_utils import index_document_to_chroma, delete_doc_from_chroma
from app.auth_utils import verify_password, create_access_token, get_current_user, RoleChecker

logging.basicConfig(filename='app.log', level=logging.INFO)
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[ "http://localhost:5173",
        "http://127.0.0.1:5173"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==============================================================================
# USER REGISTRATION AND LOGIN ROUTERS
# ==============================================================================

@app.post("/auth/register")
def register(user_data: UserRegisterInput):
    """Registers a clean system account profile inside the MySQL framework database."""
    if user_data.role.lower() not in ["admin", "teacher", "student", "evaluator"]:
        raise HTTPException(status_code=400, detail="Invalid system role profile type assigned.")
        
    created_user = register_user(
        name=user_data.name,
        email=user_data.email,
        plain_password=user_data.password,
        role=user_data.role,
        grade=user_data.grade,
        subject=user_data.subject,
        school=user_data.school,
        preferred_language=user_data.preferred_language
    )
    if not created_user:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
        
    return {"message": "User registered successfully.", "user_id": created_user.id}


@app.post("/auth/login", response_model=TokenResponse)
def login(credentials: UserLoginInput):
    """Validates user account data against hashes and emits signed JWT active sessions."""
    user = get_user_by_email(credentials.email)
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid account email or verification password.")
        
    # Cast user.id to string explicitly to guarantee clean PyJWT context compilation
    token_payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "grade": user.grade,
        "subject": user.subject
    }
    token = create_access_token(data=token_payload)
    return TokenResponse(access_token=token, token_type="bearer", role=user.role)


# ==============================================================================
# PROFILE MANAGEMENT ROUTERS (SECURED)
# ==============================================================================

@app.get("/profile", response_model=UserProfileResponse)
def get_profile(current_user: dict = Depends(get_current_user)):
    """Fetches user details extracted from their valid active session token mapping context."""
    user = get_user_by_id(current_user["user_id"])
    if not user:
        raise HTTPException(status_code=44, detail="User target reference account not found.")
    return user


@app.put("/profile", response_model=UserProfileResponse)
def update_profile(profile_data: ProfileUpdateInput, current_user: dict = Depends(get_current_user)):
    """Modifies custom fields belonging to the authentic active profile context."""
    updated_user = update_user_profile(
        user_id=current_user["user_id"],
        name=profile_data.name,
        grade=profile_data.grade,
        subject=profile_data.subject,
        school=profile_data.school,
        preferred_language=profile_data.preferred_language
    )
    if not updated_user:
        raise HTTPException(status_code=400, detail="Failed to patch requested target profile definitions.")
    return updated_user


# ==============================================================================
# CORE WORKSPACE SERVICES (SECURED & CLEANED)
# ==============================================================================

@app.post("/chat", response_model=QueryResponse)
def chat(query_input: QueryInput, current_user: dict = Depends(get_current_user)):
    """Handles conversational chat loops utilizing active user context validation."""
    session_id = query_input.session_id
    logging.info(f"Session ID: {session_id}, User Query: {query_input.question}, Model: {query_input.model}")
    if not session_id:
        session_id = str(uuid.uuid4())

    chat_history = get_chat_history(session_id)
    rag_chain = get_rag_chain(query_input.model.value)
    answer = rag_chain.invoke({
        "input": query_input.question,
        "chat_history": chat_history
    })['answer']
    
    insert_application_logs(session_id, query_input.question, answer, query_input.model.value)
    logging.info(f"Session ID: {session_id}, AI Response: {answer}")
    return QueryResponse(answer=answer, session_id=session_id, model=query_input.model)


@app.post("/upload-doc")
def upload_and_index_document(
    file: UploadFile = File(...),
    current_user: dict = Depends(RoleChecker(["admin", "teacher"]))
):
    """Securely uploads and indexes text documentation. Restricts access to authorized roles."""
    allowed_extensions = ['.pdf', '.docx', '.html']
    file_extension = os.path.splitext(file.filename)[1].lower()
    
    if file_extension not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"Unsupported file type. Allowed types are: {', '.join(allowed_extensions)}")
    
    temp_file_path = f"temp_{file.filename}"
    try:
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        file_id = insert_document_record(file.filename)

        try:
            success = index_document_to_chroma(temp_file_path, file_id)
        except Exception as e:
            print("🔥 ERROR IN INDEXING:", e)
            delete_document_record(file_id)
            raise HTTPException(status_code=500, detail=str(e))

        if success:
            return {"message": f"File {file.filename} has been successfully uploaded and indexed.", "file_id": file_id}
        else:
            delete_document_record(file_id)
            raise HTTPException(status_code=500, detail=f"Failed to index {file.filename}.")
    finally:
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)


@app.get("/list-docs", response_model=list[DocumentInfo])
def list_documents(current_user: dict = Depends(get_current_user)):
    """Lists document configurations verified through the user context dependency."""
    return get_all_documents()


@app.post("/delete-doc")
def delete_document(request: DeleteFileRequest, current_user: dict = Depends(RoleChecker(["admin", "teacher"]))):
    """Deletes indexed items from both the collection files and database logs."""
    chroma_delete_success = delete_doc_from_chroma(request.file_id)

    if chroma_delete_success:
        db_delete_success = delete_document_record(request.file_id)
        if db_delete_success:
            return {"message": f"Successfully deleted document with file_id {request.file_id} from the system."}
        else:
            return {"error": f"Deleted from Chroma but failed to delete document with file_id {request.file_id} from the database."}
    else:
        return {"error": f"Failed to delete document with file_id {request.file_id} from Chroma."}


@app.post("/generate-lesson")
def generate_lesson(
    payload: LessonPlanRequest, 
    current_user: dict = Depends(RoleChecker(["admin", "teacher"]))
):
    """
    Secure endpoint that processes text fragments from an active textbook assignment 
    and returns an organized, time-allocated class lesson plan. Restrained to Teacher/Admin tokens.
    """
    try:
        plan_markdown = generate_textbook_lesson_plan(
            file_id=payload.file_id,
            topic=payload.topic,
            duration=payload.duration_minutes,
            model=payload.model
        )
        return {"status": "success", "lesson_plan": plan_markdown}
    except Exception as e:
        logging.error(f"Lesson plan generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process curriculum layout: {str(e)}")


@app.post("/generate-quiz")
def create_quiz(
    payload: QuizGenerationRequest, 
    current_user: dict = Depends(RoleChecker(["admin", "teacher"]))
):
    """
    Secure endpoint that extracts text information matching a file_id from ChromaDB
    and compiles a quiz paper with benchmark answers. Restrained to Teacher/Admin tokens.
    """
    try:
        quiz_markdown = generate_textbook_quiz(
            file_id=payload.file_id,
            question_type=payload.question_type,
            num_questions=payload.num_questions,
            model=payload.model
        )
        return {"status": "success", "quiz": quiz_markdown}
    except Exception as e:
        logging.error(f"Quiz generation processing crash encountered: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to compile test parameters: {str(e)}")
    



# Add to the very bottom of app/main.py
from app.pydantic_models import EvaluationRequest

@app.post("/auto-mark")
def auto_mark_script(
    payload: EvaluationRequest, 
    current_user: dict = Depends(RoleChecker(["admin", "teacher"]))
):
    """
    Secure endpoint that evaluates a student script text block against an official
    benchmark answer sheet. Restricted to Teachers and Admins.
    """
    try:
        evaluation_report = evaluate_student_script(
            question=payload.question_text,
            model_answer=payload.model_answer,
            student_answer=payload.student_answer,
            max_marks=payload.max_marks,
            model=payload.model
        )
        # Wrap response into an evaluation object matching your React state listener expectation
        return {"status": "success", "evaluation": {"score": evaluation_report, "confidence_score": 0.95, "feedback": "Detailed sheet compiled below.", "missing_points": []}}
    except Exception as e:
        logging.error(f"Automated script evaluation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to process answer evaluation: {str(e)}")
    
@app.post("/student-summary")
def student_summary(payload: StudentSummaryRequest):
    summary = generate_student_summary(
        file_id=payload.file_id,
        model=payload.model
    )
    return {"summary": summary}

@app.post("/student-practice")
def student_practice(payload: StudentPracticeRequest):
    quiz = generate_student_practice_questions(
        file_id=payload.file_id,
        num_questions=payload.num_questions,
        model=payload.model
    )
    return {"questions": quiz}


@app.post("/student-check-answers")
def student_check(payload: StudentAnswerCheckRequest):
    results = evaluate_student_answers(payload)
    return {"results": results}

