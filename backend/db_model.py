from sqlalchemy import Column, Integer, String, Text
from database import Base 

class Note(Base):
    __tablename__ = "mynotes"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    type = Column(String(50), nullable=False)
    source = Column(String(50), nullable=False)
    tone = Column(String(50), nullable=False)