from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from apscheduler.schedulers.background import BackgroundScheduler
from app.routes import nascimento, obito, configuracoes
from app.database import SessionLocal, engine
from app.models import nascimento as m_nasc, obito as m_obito
import datetime
from app.routes import nascimento, obito, configuracoes, auth

def reenviar_notificacoes():
    """
    Corre em background. Verifica registos pendentes e reenvia
    notificações conforme a frequência configurada na BD.
    """
    db = SessionLocal()
    try:
        from app.models.configuracao import Configuracao
        from app.models.nascimento import PreRegistoNascimento
        from app.models.obito import PreRegistoObito
        from app.services.notificacoes import enviar_notificacao_nascimento, enviar_notificacao_obito

        # Ler frequência configurada (em minutos)
        config = db.query(Configuracao).filter(
            Configuracao.chave == "frequencia_notificacao_minutos"
        ).first()
        frequencia_min = int(config.valor) if config else 21600

        agora = datetime.datetime.now()
        limite = agora - datetime.timedelta(minutes=frequencia_min)

        # Nascimentos pendentes sem notificação recente
        pendentes_nasc = db.query(PreRegistoNascimento).filter(
            PreRegistoNascimento.status.in_(["incompleto", "aguarda_aprovacao"]),
            (PreRegistoNascimento.ultima_notificacao == None) |
            (PreRegistoNascimento.ultima_notificacao <= limite)
        ).all()

        for r in pendentes_nasc:
            print(f"[SCHEDULER] Reenviar nascimento ID {r.id}")
            enviar_notificacao_nascimento(db, r, tipo="pre_registo")

        # Óbitos pendentes sem notificação recente
        pendentes_ob = db.query(PreRegistoObito).filter(
            PreRegistoObito.status.in_(["incompleto", "aguarda_aprovacao"]),
            (PreRegistoObito.ultima_notificacao == None) |
            (PreRegistoObito.ultima_notificacao <= limite)
        ).all()

        for r in pendentes_ob:
            print(f"[SCHEDULER] Reenviar óbito ID {r.id}")
            enviar_notificacao_obito(db, r, tipo="pre_registo")

        print(f"[SCHEDULER] {agora.strftime('%H:%M:%S')} — {len(pendentes_nasc)} nasc. + {len(pendentes_ob)} óbitos processados")

    except Exception as e:
        print(f"[SCHEDULER ERRO] {e}")
    finally:
        db.close()


scheduler = BackgroundScheduler()
scheduler.add_job(reenviar_notificacoes, 'interval', minutes=1)


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.start()
    print("[SCHEDULER] Iniciado — a verificar notificações a cada minuto")
    yield
    scheduler.shutdown()
    print("[SCHEDULER] Encerrado")


app = FastAPI(
    title="Sistema de Registo Civil — Moçambique",
    description="API para integração entre sistemas hospitalares e registo civil",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(nascimento.router)
app.include_router(obito.router)
app.include_router(configuracoes.router)
app.include_router(auth.router)

@app.get("/")
def root():
    return {"mensagem": "Sistema de Registo Civil — Moçambique", "status": "activo"}

@app.get("/health")
def health():
    return {"status": "ok"}