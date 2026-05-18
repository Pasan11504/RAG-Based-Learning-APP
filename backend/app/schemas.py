from pydantic import BaseModel
from datetime import date
from typing import Optional

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: date
    status: str = "todo"

class TaskResponse(TaskCreate):
    id: int

    class Config:
        from_attributes = True