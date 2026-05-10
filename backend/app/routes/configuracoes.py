from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.configuracao import Configuracao

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