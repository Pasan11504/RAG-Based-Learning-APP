import os
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import jwt
import bcrypt
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Configurations from Environment Variables
SECRET_KEY = os.getenv("JWT_SECRET", "6a8b7c3d2e1f0g9h8i7j6k5l4m3n2o1p0q9r8s7t6u5v4w3x2y1z0a1b2c3d4e5f")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

# Bearer Token Extractor for FastAPI endpoints
security_bearer = HTTPBearer()

def hash_password(password: str) -> str:
    """Hashes a plain text password using native compiled bcrypt."""
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt(rounds=12)
    hashed_bytes = bcrypt.hashpw(password_bytes, salt)
    return hashed_bytes.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain text password against its stored database bcrypt hash string."""
    try:
        password_bytes = plain_password.encode('utf-8')
        hashed_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Generates a secure signed JSON Web Token (JWT) containing user identity details."""
    to_encode = data.copy()
    
    if "sub" in to_encode:
        to_encode["sub"] = str(to_encode["sub"])
        
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": int(expire.timestamp())})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security_bearer)) -> Dict[str, Any]:
    """FastAPI dependency that extracts, decodes, and validates a JWT token."""
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials. Please log in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        raw_sub = payload.get("sub")
        if raw_sub is None:
            raise credentials_exception
            
        user_id = int(raw_sub)
        email: Optional[str] = payload.get("email")
        role: Optional[str] = payload.get("role")
        grade: Optional[str] = payload.get("grade")
        subject: Optional[str] = payload.get("subject")
        
        if email is None or role is None:
            raise credentials_exception
            
        return {
            "user_id": user_id,
            "email": email,
            "role": role,
            "grade": grade,
            "subject": subject
        }
    except (jwt.PyJWTError, ValueError, AttributeError):
        raise credentials_exception

class RoleChecker:
    """FastAPI dependency to enforce role-based access control rules on endpoints."""
    def __init__(self, allowed_roles: list):
        self.allowed_roles = allowed_roles

    def __call__(self, current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        if current_user["role"] not in self.allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. This action requires one of the following roles: {self.allowed_roles}"
            )
        return current_user