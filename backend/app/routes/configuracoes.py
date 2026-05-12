from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import date
from app.database import get_db
from app.models.configuracao import Configuracao
from app.models.cidadao import CidadaoBI

router = APIRouter(prefix="/configuracoes", tags=["Configurações"])


class ValorUpdate(BaseModel):
    valor: str


class CidadaoCreate(BaseModel):
    numero_bi: str
    nome_completo: str
    sexo: str
    data_nasc: date
    naturalidade: Optional[str] = None
    provincia: Optional[str] = None
    estado_civil: Optional[str] = "solteiro"
    vivo: Optional[bool] = True
    data_morte: Optional[date] = None


@router.get("/")
def listar(db: Session = Depends(get_db)):
    return db.query(Configuracao).all()


@router.put("/{chave}")
def actualizar(chave: str, dados: ValorUpdate, db: Session = Depends(get_db)):
    config = db.query(Configuracao).filter(Configuracao.chave == chave).first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuração não encontrada.")
    config.valor = dados.valor
    db.commit()
    return {"sucesso": True, "chave": chave, "valor": dados.valor}


@router.get("/cidadaos")
def listar_cidadaos(db: Session = Depends(get_db)):
    cidadaos = db.query(CidadaoBI).order_by(CidadaoBI.nome_completo).all()
    return {
        "total": len(cidadaos),
        "cidadaos": [
            {
                "id": c.id,
                "numero_bi": c.numero_bi,
                "nome_completo": c.nome_completo,
                "sexo": c.sexo,
                "data_nasc": str(c.data_nasc),
                "naturalidade": c.naturalidade,
                "provincia": c.provincia,
                "estado_civil": c.estado_civil,
                "vivo": c.vivo,
                "data_morte": str(c.data_morte) if c.data_morte else None,
            }
            for c in cidadaos
        ]
    }


@router.post("/cidadaos")
def adicionar_cidadao(dados: CidadaoCreate, db: Session = Depends(get_db)):
    existente = db.query(CidadaoBI).filter(
        CidadaoBI.numero_bi == dados.numero_bi.upper()
    ).first()
    if existente:
        raise HTTPException(
            status_code=409,
            detail=f"BI '{dados.numero_bi.upper()}' já existe na base de dados."
        )

    cidadao = CidadaoBI(
        numero_bi=dados.numero_bi.upper(),
        nome_completo=dados.nome_completo,
        sexo=dados.sexo,
        data_nasc=dados.data_nasc,
        naturalidade=dados.naturalidade,
        provincia=dados.provincia,
        estado_civil=dados.estado_civil or "solteiro",
        vivo=dados.vivo if dados.vivo is not None else True,
        data_morte=dados.data_morte,
    )

    db.add(cidadao)
    db.commit()
    db.refresh(cidadao)

    return {
        "sucesso": True,
        "mensagem": f"Cidadão '{dados.nome_completo}' adicionado com sucesso.",
        "id": cidadao.id,
        "numero_bi": cidadao.numero_bi,
    }


@router.delete("/cidadaos/{numero_bi}")
def remover_cidadao(numero_bi: str, db: Session = Depends(get_db)):
    cidadao = db.query(CidadaoBI).filter(
        CidadaoBI.numero_bi == numero_bi.upper()
    ).first()
    if not cidadao:
        raise HTTPException(status_code=404, detail="Cidadão não encontrado.")
    db.delete(cidadao)
    db.commit()
    return {"sucesso": True, "mensagem": f"Cidadão '{cidadao.nome_completo}' removido."}