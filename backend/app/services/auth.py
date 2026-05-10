from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from app.models.utilizador import Utilizador
import os

SECRET_KEY = os.getenv("SECRET_KEY", "registoCivilMZ2025chaveSecreta")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 horas

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verificar_password(password_plain, password_hash):
    return pwd_context.verify(password_plain, password_hash)


def criar_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def autenticar_utilizador(db: Session, username: str, password: str):
    utilizador = db.query(Utilizador).filter(
        Utilizador.username == username,
        Utilizador.activo == True
    ).first()
    if not utilizador:
        return None
    if not verificar_password(password, utilizador.password_hash):
        return None
    return utilizador


def obter_utilizador_actual(token: str, db: Session):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username is None:
            return None
    except JWTError:
        return None
    return db.query(Utilizador).filter(
        Utilizador.username == username,
        Utilizador.activo == True
    ).first()