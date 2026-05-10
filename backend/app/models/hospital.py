from sqlalchemy import Column, Integer, String, Boolean, TIMESTAMP
from sqlalchemy.sql import func
from app.database import Base

class Hospital(Base):
    __tablename__ = "hospitais"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    nome       = Column(String(200), nullable=False)
    provincia  = Column(String(100), nullable=False)
    cidade     = Column(String(100), nullable=False)
    api_key    = Column(String(100), unique=True, nullable=False)
    activo     = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP, server_default=func.now())