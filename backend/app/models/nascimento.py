from sqlalchemy import Column, Integer, String, Boolean, Date, Time, Enum, Text, TIMESTAMP, ForeignKey
from sqlalchemy.sql import func
from app.database import Base

class PreRegistoNascimento(Base):
    __tablename__ = "pre_registos_nascimento"

    id                      = Column(Integer, primary_key=True, autoincrement=True)
    ref_hospital            = Column(String(50), unique=True, nullable=False)
    hospital_id             = Column(Integer, ForeignKey("hospitais.id"), nullable=False)
    status                  = Column(Enum("incompleto", "aguarda_aprovacao", "aprovado", "rejeitado", "bi_invalido"), default="incompleto")

    # Bebé
    sexo_bebe               = Column(Enum("M", "F"), nullable=False)
    data_nascimento         = Column(Date, nullable=False)
    hora_nascimento         = Column(String(10), nullable=False)
    local_nascimento        = Column(String(200), nullable=False)
    provincia_nascimento    = Column(String(100), nullable=False)
    distrito_nascimento     = Column(String(100))

    # Nome (pode chegar vazio)
    nome_completo           = Column(String(200), nullable=True)
    apelidos                = Column(String(200), nullable=True)

    # Pai
    bi_pai                  = Column(String(20))
    nome_pai                = Column(String(200))
    naturalidade_pai        = Column(String(100))
    estado_civil_pai        = Column(String(50))
    pai_vivo                = Column(Boolean, default=True)

    # Mãe
    bi_mae                  = Column(String(20))
    nome_mae                = Column(String(200))
    naturalidade_mae        = Column(String(100))
    estado_civil_mae        = Column(String(50))
    mae_viva                = Column(Boolean, default=True)

    # Avós (fase 2)
    avo_paterno             = Column(String(200))
    avo_paterna             = Column(String(200))
    avo_materno             = Column(String(200))
    avo_materna             = Column(String(200))

    # Declarante (fase 2)
    bi_declarante           = Column(String(20))
    nome_declarante         = Column(String(200))
    estado_civil_declarante = Column(String(50))
    residencia_declarante   = Column(String(200))
    relacao_declarante      = Column(Enum("pai", "mae", "familiar", "outro"), default="outro")

    # Validação
    bi_pai_valido           = Column(Boolean, default=False)
    bi_mae_valido           = Column(Boolean, default=False)
    erros_validacao         = Column(Text)

    # Rejeição
    motivo_rejeicao         = Column(Text)
    rejeitado_por           = Column(String(200))

    # Contacto do encarregado
    whatsapp_encarregado    = Column(String(20))
    email_encarregado       = Column(String(200))
    canal_notificacao       = Column(Enum("whatsapp", "email", "pendente"), default="pendente")
    ultima_notificacao      = Column(TIMESTAMP, nullable=True)
    total_notificacoes      = Column(Integer, default=0)

    # Datas
    data_recepcao           = Column(TIMESTAMP, server_default=func.now())
    data_confirmacao        = Column(TIMESTAMP, nullable=True)
    confirmado_por          = Column(String(200))


class RegistoNascimento(Base):
    __tablename__ = "registos_nascimento"

    id                      = Column(Integer, primary_key=True, autoincrement=True)
    pre_registo_id          = Column(Integer, ForeignKey("pre_registos_nascimento.id"), unique=True)
    nuic                    = Column(String(20), unique=True, nullable=False)
    numero_assento          = Column(String(20), unique=True, nullable=False)
    numero_documento        = Column(String(20))
    numero_maco             = Column(String(20))

    nome_completo           = Column(String(200), nullable=False)
    apelidos                = Column(String(200), nullable=False)
    sexo                    = Column(Enum("M", "F"), nullable=False)
    data_nascimento         = Column(Date, nullable=False)
    hora_nascimento         = Column(String(10), nullable=False)
    local_nascimento        = Column(String(200), nullable=False)
    provincia_nascimento    = Column(String(100), nullable=False)
    distrito_nascimento     = Column(String(100))

    nome_pai                = Column(String(200))
    bi_pai                  = Column(String(20))
    naturalidade_pai        = Column(String(100))
    estado_civil_pai        = Column(String(50))
    nome_mae                = Column(String(200))
    bi_mae                  = Column(String(20))
    naturalidade_mae        = Column(String(100))
    estado_civil_mae        = Column(String(50))

    avo_paterno             = Column(String(200))
    avo_paterna             = Column(String(200))
    avo_materno             = Column(String(200))
    avo_materna             = Column(String(200))

    nome_declarante         = Column(String(200))
    bi_declarante           = Column(String(20))
    estado_civil_declarante = Column(String(50))
    residencia_declarante   = Column(String(200))

    conservatoria           = Column(String(200))
    posto_registo           = Column(String(200))
    conservador             = Column(String(200))
    cedula_numero           = Column(String(50))
    diario_numero           = Column(String(50))

    pdf_gerado              = Column(Boolean, default=False)
    pdf_path                = Column(String(500))
    data_registo            = Column(TIMESTAMP, server_default=func.now())