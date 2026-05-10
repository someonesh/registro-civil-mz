from sqlalchemy.orm import Session
from app.models.cidadao import CidadaoBI
from typing import Optional
import re

def validar_formato_bi(numero_bi: str) -> bool:
    """
    Valida o formato do BI moçambicano:
    13 dígitos numéricos + 1 letra no final = 14 caracteres
    Exemplo: 0901000000001A
    """
    padrao = r'^\d{13}[A-Za-z]$'
    return bool(re.match(padrao, numero_bi))


def verificar_bi(db: Session, numero_bi: str, nome_fornecido: str) -> dict:
    """
    Verifica se o BI existe na BD e se o nome corresponde.
    Devolve dict com resultado e mensagem detalhada.
    """
    # Validar formato
    if not validar_formato_bi(numero_bi):
        return {
            "valido": False,
            "existe": False,
            "mensagem": f"Formato do BI '{numero_bi}' inválido. Deve ter 13 dígitos seguidos de uma letra (ex: 0901000000001A)."
        }

    # Verificar se existe na BD
    cidadao = db.query(CidadaoBI).filter(
        CidadaoBI.numero_bi == numero_bi.upper()
    ).first()

    if not cidadao:
        return {
            "valido": False,
            "existe": False,
            "mensagem": f"BI '{numero_bi}' não encontrado na base de dados."
        }

    # Verificar correspondência do nome (comparação flexível)
    nome_bd = cidadao.nome_completo.strip().lower()
    nome_fornecido_normalizado = nome_fornecido.strip().lower()

    if nome_bd != nome_fornecido_normalizado:
        return {
            "valido": False,
            "existe": True,
            "mensagem": f"O nome fornecido '{nome_fornecido}' não corresponde ao BI '{numero_bi}'."
        }

    return {
        "valido": True,
        "existe": True,
        "vivo": cidadao.vivo,
        "dados": {
            "nome_completo": cidadao.nome_completo,
            "sexo": cidadao.sexo,
            "data_nasc": str(cidadao.data_nasc),
            "naturalidade": cidadao.naturalidade,
            "provincia": cidadao.provincia,
            "estado_civil": cidadao.estado_civil,
            "vivo": cidadao.vivo,
            "data_morte": str(cidadao.data_morte) if cidadao.data_morte else None
        },
        "mensagem": "BI válido e verificado com sucesso."
    }


def verificar_bi_falecido(db: Session, numero_bi: str, nome_fornecido: str) -> dict:
    """
    Para óbitos — verifica BI e confirma que a pessoa está registada.
    Não exige que esteja viva (pode já ter falecido noutro registo).
    """
    resultado = verificar_bi(db, numero_bi, nome_fornecido)
    return resultado