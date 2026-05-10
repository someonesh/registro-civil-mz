from sqlalchemy import Column, Integer, String, Boolean, Date, TIMESTAMP
from sqlalchemy.sql import func
from app.database import Base

class CidadaoBI(Base):
    __tablename__ = "cidadaos_bi"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    numero_bi     = Column(String(14), unique=True, nullable=False)
    nome_completo = Column(String(200), nullable=False)
    sexo          = Column(String(1), nullable=False)
    data_nasc     = Column(Date, nullable=False)
    naturalidade  = Column(String(100))
    provincia     = Column(String(100))
    estado_civil  = Column(String(20), default="solteiro")
    vivo          = Column(Boolean, default=True)
    data_morte    = Column(Date, nullable=True)
    created_at    = Column(TIMESTAMP, server_default=func.now())