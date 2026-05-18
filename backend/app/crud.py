# from sqlalchemy.orm import Session
# from . import models, schemas

# def get_tasks(db: Session):
#     return db.query(models.Task).all()

# def create_task(db: Session, task: schemas.TaskCreate):
#     db_task = models.Task(**task.model_dump())
#     db.add(db_task)
#     db.commit()
#     db.refresh(db_task)
#     return db_task

# def update_task(db: Session, task_id: int, task_data: schemas.TaskCreate):
#     db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
#     if db_task:
#         for key, value in task_data.model_dump().items():
#             setattr(db_task, key, value)
#         db.commit()
#         db.refresh(db_task)
#     return db_task

# def delete_task(db: Session, task_id: int):
#     db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
#     if db_task:
#         db.delete(db_task)
#         db.commit()
#     return db_task