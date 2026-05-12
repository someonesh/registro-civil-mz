from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date


class NascimentoFase1(BaseModel):
    """Dados enviados pelo hospital na fase inicial"""
    ref_hospital: str
    api_key: str

    # Bebé
    sexo_bebe: str
    data_nascimento: date
    hora_nascimento: str
    local_nascimento: str
    provincia_nascimento: str
    distrito_nascimento: Optional[str] = None

    # Pai — OPCIONAIS: mãe solteira sem pai presente = paternidade não fixada
    bi_pai: Optional[str] = None
    nome_pai: Optional[str] = None
    naturalidade_pai: Optional[str] = None
    estado_civil_pai: Optional[str] = None

    # Mãe
    bi_mae: str
    nome_mae: str
    naturalidade_mae: Optional[str] = None
    estado_civil_mae: Optional[str] = None

    # Contacto do encarregado
    whatsapp_encarregado: Optional[str] = None
    email_encarregado: Optional[str] = None


class NascimentoFase2(BaseModel):
    """Dados complementares enviados pelo hospital na consulta"""
    ref_hospital: str
    api_key: str

    # Nome da criança
    nome_completo: str
    apelidos: str

    # Avós
    avo_paterno: Optional[str] = None
    avo_paterna: Optional[str] = None
    avo_materno: Optional[str] = None
    avo_materna: Optional[str] = None

    # Declarante
    bi_declarante: Optional[str] = None
    nome_declarante: Optional[str] = None
    estado_civil_declarante: Optional[str] = None
    residencia_declarante: Optional[str] = None
    relacao_declarante: Optional[str] = "outro"


class ReconhecerPaternidade(BaseModel):
    """Usado para reconhecimento posterior de paternidade"""
    api_key: str
    bi_pai: str
    nome_pai: str
    estado_civil_pai: Optional[str] = None
    naturalidade_pai: Optional[str] = None


class AprovarNascimento(BaseModel):
    """Usado pelo funcionário do registo civil"""
    pre_registo_id: int
    conservador: str
    cedula_numero: Optional[str] = None
    diario_numero: Optional[str] = None
    observacoes: Optional[str] = None


class RejeitarNascimento(BaseModel):
    pre_registo_id: int
    motivo_rejeicao: str
    rejeitado_por: str
