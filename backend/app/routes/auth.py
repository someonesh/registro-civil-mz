from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.models.utilizador import Utilizador
from app.services.auth import autenticar_utilizador, criar_token, obter_utilizador_actual
from passlib.context import CryptContext

router = APIRouter(prefix="/auth", tags=["Autenticação"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class LoginInput(BaseModel):
    username: str
    password: str


class UtilizadorInput(BaseModel):
    nome: str
    username: str
    password: str
    papel: str


@router.post("/login")
def login(dados: LoginInput, db: Session = Depends(get_db)):
    utilizador = autenticar_utilizador(db, dados.username, dados.password)
    if not utilizador:
        raise HTTPException(status_code=401, detail="Username ou password incorrectos.")
    token = criar_token({"sub": utilizador.username, "papel": utilizador.papel})
    return {
        "access_token": token,
        "token_type": "bearer",
        "papel": utilizador.papel,
        "nome": utilizador.nome
    }


@router.get("/me")
def perfil_actual(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token não fornecido.")
    token = authorization.split(" ")[1]
    utilizador = obter_utilizador_actual(token, db)
    if not utilizador:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado.")
    return {
        "id": utilizador.id,
        "nome": utilizador.nome,
        "username": utilizador.username,
        "papel": utilizador.papel
    }


@router.get("/utilizadores")
def listar_utilizadores(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token não fornecido.")
    token = authorization.split(" ")[1]
    utilizador = obter_utilizador_actual(token, db)
    if not utilizador or utilizador.papel != "administrador":
        raise HTTPException(status_code=403, detail="Acesso negado. Apenas administradores.")
    return db.query(Utilizador).all()


@router.post("/utilizadores")
def criar_utilizador(dados: UtilizadorInput, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token não fornecido.")
    token = authorization.split(" ")[1]
    utilizador = obter_utilizador_actual(token, db)
    if not utilizador or utilizador.papel != "administrador":
        raise HTTPException(status_code=403, detail="Acesso negado. Apenas administradores.")
    existente = db.query(Utilizador).filter(Utilizador.username == dados.username).first()
    if existente:
        raise HTTPException(status_code=409, detail="Username já existe.")
    novo = Utilizador(
        nome=dados.nome,
        username=dados.username,
        password_hash=pwd_context.hash(dados.password),
        papel=dados.papel
    )
    db.add(novo)
    db.commit()
    return {"sucesso": True, "mensagem": f"Utilizador '{dados.username}' criado com sucesso."}


@router.delete("/utilizadores/{id}")
def desactivar_utilizador(id: int, authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Token não fornecido.")
    token = authorization.split(" ")[1]
    utilizador = obter_utilizador_actual(token, db)
    if not utilizador or utilizador.papel != "administrador":
        raise HTTPException(status_code=403, detail="Acesso negado.")
    u = db.query(Utilizador).filter(Utilizador.id == id).first()
    if not u:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado.")
    u.activo = False
    db.commit()
    return {"sucesso": True, "mensagem": "Utilizador desactivado."}