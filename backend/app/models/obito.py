from sqlalchemy import Column, Integer, String, Boolean, Date, Time, Enum, Text, TIMESTAMP, ForeignKey
from sqlalchemy.sql import func
from app.database import Base

class PreRegistoObito(Base):
    __tablename__ = "pre_registos_obito"

    id                      = Column(Integer, primary_key=True, autoincrement=True)
    ref_hospital            = Column(String(50), unique=True, nullable=False)
    hospital_id             = Column(Integer, ForeignKey("hospitais.id"), nullable=False)
    status                  = Column(Enum("incompleto", "aguarda_aprovacao", "aprovado", "rejeitado", "bi_invalido"), default="incompleto")

    # Falecido
    nome_completo           = Column(String(200), nullable=False)
    sexo                    = Column(Enum("M", "F"), nullable=False)
    idade                   = Column(Integer)
    estado_civil            = Column(String(50))
    naturalidade            = Column(String(100))
    localidade_naturalidade = Column(String(100))
    provincia_naturalidade  = Column(String(100))
    ultima_residencia       = Column(String(200))
    localidade_residencia   = Column(String(100))
    provincia_residencia    = Column(String(100))
    nome_pai_falecido       = Column(String(200))
    nome_mae_falecida       = Column(String(200))

    # Falecimento
    hora_falecimento        = Column(String(10))
    dia_falecimento         = Column(Date, nullable=False)
    local_falecimento       = Column(String(200))
    localidade_falecimento  = Column(String(100))
    provincia_falecimento   = Column(String(100))
    causa_morte             = Column(String(500), nullable=False)
    boletim_hospital        = Column(String(50))

    # BI do falecido
    bi_falecido             = Column(String(20))
    bi_falecido_valido      = Column(Boolean, default=False)

    # Declarante
    bi_declarante           = Column(String(20))
    nome_declarante         = Column(String(200))
    estado_civil_declarante = Column(String(50))
    residencia_declarante   = Column(String(200))

    # Sepultamento (fase 2)
    cemiterio               = Column(String(200))
    herdeiros               = Column(Text)
    bens_inventario         = Column(Boolean, default=False)
    testamento              = Column(Boolean, default=False)

    # Validação e rejeição
    erros_validacao         = Column(Text)
    motivo_rejeicao         = Column(Text)
    rejeitado_por           = Column(String(200))

    # Contacto
    whatsapp_declarante     = Column(String(20))
    email_declarante        = Column(String(200))
    canal_notificacao       = Column(Enum("whatsapp", "email", "pendente"), default="pendente")
    ultima_notificacao      = Column(TIMESTAMP, nullable=True)
    total_notificacoes      = Column(Integer, default=0)

    data_recepcao           = Column(TIMESTAMP, server_default=func.now())
    data_confirmacao        = Column(TIMESTAMP, nullable=True)
    confirmado_por          = Column(String(200))


class RegistoObito(Base):
    __tablename__ = "registos_obito"

    id                      = Column(Integer, primary_key=True, autoincrement=True)
    pre_registo_id          = Column(Integer, ForeignKey("pre_registos_obito.id"), unique=True)
    numero_assento          = Column(String(20), unique=True, nullable=False)
    numero_documento        = Column(String(20))
    numero_maco             = Column(String(20))

    nome_completo           = Column(String(200), nullable=False)
    sexo                    = Column(Enum("M", "F"), nullable=False)
    idade                   = Column(Integer)
    estado_civil            = Column(String(50))
    naturalidade            = Column(String(100))
    localidade_naturalidade = Column(String(100))
    provincia_naturalidade  = Column(String(100))
    ultima_residencia       = Column(String(200))
    localidade_residencia   = Column(String(100))
    provincia_residencia    = Column(String(100))
    nome_pai_falecido       = Column(String(200))
    nome_mae_falecida       = Column(String(200))
    hora_falecimento        = Column(String(10))
    dia_falecimento         = Column(Date, nullable=False)
    local_falecimento       = Column(String(200))
    localidade_falecimento  = Column(String(100))
    provincia_falecimento   = Column(String(100))
    causa_morte             = Column(String(500))
    boletim_hospital        = Column(String(50))
    nome_declarante         = Column(String(200))
    bi_declarante           = Column(String(20))
    estado_civil_declarante = Column(String(50))
    residencia_declarante   = Column(String(200))
    cemiterio               = Column(String(200))
    herdeiros               = Column(Text)
    bens_inventario         = Column(Boolean, default=False)
    testamento              = Column(Boolean, default=False)

    registo_nascimento_ref  = Column(String(50))
    registo_casamento_ref   = Column(String(50))

    conservatoria           = Column(String(200))
    conservador             = Column(String(200))
    diario_numero           = Column(String(50))

    pdf_gerado              = Column(Boolean, default=False)
    pdf_path                = Column(String(500))
    data_registo            = Column(TIMESTAMP, server_default=func.now())