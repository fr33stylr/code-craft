from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__="users"

    id=Column(Integer, primary_key=True, index=True)
    username=Column(String, unique=True, index=True,nullable=False)
    xp=Column(Integer, default=0)
    level=Column(Integer, default=1)

class Project(Base):
    __tablename__="projects"
    id=Column(Integer, primary_key=True, index=True)
    title=Column(String, nullable=False)
    description=Column(String,nullable=False)
    difficulty=Column(String,default="Beginner")
    