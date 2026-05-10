from sqlalchemy import Column, Integer, String, Enum, Text, TIMESTAMP, ForeignKey
from sqlalchemy.sql import func
from app.database import Base

class NotificacaoLog(Base):
    __tablename__ = "notificacoes_log"

    id             = Column(Integer, primary_key=True, autoincrement=True)
    tipo_registo   = Column(Enum("nascimento", "obito"), nullable=False)
    pre_registo_id = Column(Integer, nullable=False)
    canal          = Column(Enum("whatsapp", "email"), nullable=False)
    destinatario   = Column(String(200), nullable=False)
    mensagem       = Column(Text)
    status         = Column(Enum("enviado", "falhou"), default="enviado")
    erro           = Column(Text)
    enviado_em     = Column(TIMESTAMP, server_default=func.now())