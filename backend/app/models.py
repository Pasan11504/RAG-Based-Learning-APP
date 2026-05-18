# from sqlalchemy import Column, Integer, String, Date
# from .database import Base

# class Task(Base):
#     __tablename__ = "tasks"

#     id = Column(Integer, primary_key=True, index=True)
#     title = Column(String(100))
#     description = Column(String(255))
#     due_date = Column(Date)
#     status = Column(String(20), default="todo") # todo, inprogress, done