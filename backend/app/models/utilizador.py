from sqlalchemy import Column, Integer, String, Boolean, Enum, TIMESTAMP
from sqlalchemy.sql import func
from app.database import Base

class Utilizador(Base):
    __tablename__ = "utilizadores"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    nome          = Column(String(200), nullable=False)
    username      = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    papel         = Column(Enum("administrador", "conservador", "funcionario"), nullable=False)
    activo        = Column(Boolean, default=True)
    created_at    = Column(TIMESTAMP, server_default=func.now())