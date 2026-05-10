from passlib.context import CryptContext
from app.database import SessionLocal
from app.models.utilizador import Utilizador

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password):
    return pwd_context.hash(password)

db = SessionLocal()

utilizadores = [
    {
        "nome": "Administrador do Sistema",
        "username": "admin",
        "password": "admin123",
        "papel": "administrador"
    },
    {
        "nome": "Rollins da Conceição Chanesa",
        "username": "Rollins",
        "password": "rollins123",
        "papel": "conservador"
    },
    {
        "nome": "Beverly Zhuaki",
        "username": "Beverly",
        "password": "beverly123",
        "papel": "funcionario"
    }
]

for u in utilizadores:
    novo = Utilizador(
        nome=u["nome"],
        username=u["username"],
        password_hash=hash_password(u["password"]),
        papel=u["papel"]
    )
    db.add(novo)

db.commit()
print("Utilizadores criados com sucesso!")
db.close()