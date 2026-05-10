from sqlalchemy.orm import Session
from app.models.configuracao import Configuracao
import datetime

def gerar_nuic(db: Session) -> str:
    """
    Gera o NUIC no formato: MZ-ANO-SEQUENCIAL
    Exemplo: MZ-2025-000001
    """
    ano = datetime.datetime.now().year
    config = db.query(Configuracao).filter(
        Configuracao.chave == "proximo_numero_assento_nasc"
    ).first()
    sequencial = int(config.valor)
    config.valor = str(sequencial + 1)
    db.commit()
    return f"MZ-{ano}-{sequencial:06d}"


def gerar_numero_assento_nascimento(db: Session) -> str:
    config = db.query(Configuracao).filter(
        Configuracao.chave == "proximo_numero_assento_nasc"
    ).first()
    numero = int(config.valor)
    config.valor = str(numero + 1)
    db.commit()
    return str(numero)


def gerar_numero_assento_obito(db: Session) -> str:
    config = db.query(Configuracao).filter(
        Configuracao.chave == "proximo_numero_assento_obito"
    ).first()
    numero = int(config.valor)
    config.valor = str(numero + 1)
    db.commit()
    return str(numero)