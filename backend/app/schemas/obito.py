from pydantic import BaseModel
from typing import Optional
from datetime import date

class ObitoFase1(BaseModel):
    """Dados enviados pelo hospital"""
    ref_hospital: str
    api_key: str

    # Falecido
    nome_completo: str
    sexo: str
    idade: Optional[int] = None
    estado_civil: Optional[str] = None
    naturalidade: Optional[str] = None
    localidade_naturalidade: Optional[str] = None
    provincia_naturalidade: Optional[str] = None
    ultima_residencia: Optional[str] = None
    localidade_residencia: Optional[str] = None
    provincia_residencia: Optional[str] = None
    nome_pai_falecido: Optional[str] = None
    nome_mae_falecida: Optional[str] = None

    # Falecimento
    hora_falecimento: Optional[str] = None
    dia_falecimento: date
    local_falecimento: Optional[str] = None
    localidade_falecimento: Optional[str] = None
    provincia_falecimento: Optional[str] = None
    causa_morte: str
    boletim_hospital: Optional[str] = None

    # BI do falecido (opcional)
    bi_falecido: Optional[str] = None

    # Declarante
    bi_declarante: Optional[str] = None
    nome_declarante: Optional[str] = None
    estado_civil_declarante: Optional[str] = None
    residencia_declarante: Optional[str] = None

    # Contacto
    whatsapp_declarante: Optional[str] = None
    email_declarante: Optional[str] = None


class ObitoFase2(BaseModel):
    """Dados complementares — sepultamento"""
    ref_hospital: str
    api_key: str

    cemiterio: Optional[str] = None
    herdeiros: Optional[str] = None
    bens_inventario: Optional[bool] = False
    testamento: Optional[bool] = False


class AprovarObito(BaseModel):
    pre_registo_id: int
    conservador: str
    diario_numero: Optional[str] = None
    registo_nascimento_ref: Optional[str] = None
    registo_casamento_ref: Optional[str] = None


class RejeitarObito(BaseModel):
    pre_registo_id: int
    motivo_rejeicao: str
    rejeitado_por: str