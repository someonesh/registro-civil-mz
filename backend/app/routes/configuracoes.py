from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.configuracao import Configuracao
from app.models.cidadao import CidadaoBI

router = APIRouter(prefix="/configuracoes", tags=["Configurações"])


class ValorUpdate(BaseModel):
    valor: str


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
