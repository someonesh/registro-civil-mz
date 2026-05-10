from sqlalchemy import Column, Integer, String, TIMESTAMP
from sqlalchemy.sql import func
from app.database import Base

class Configuracao(Base):
    __tablename__ = "configuracoes"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    chave      = Column(String(100), unique=True, nullable=False)
    valor      = Column(String(500), nullable=False)
    descricao  = Column(String(300))
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())