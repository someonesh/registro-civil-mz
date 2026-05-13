from sqlalchemy.orm import Session
from app.models.notificacoes import NotificacaoLog
import os

TWILIO_ACTIVO = bool(os.getenv("TWILIO_ACCOUNT_SID", "").startswith("AC"))
GMAIL_ACTIVO = bool(os.getenv("GMAIL_USER", "")) and bool(os.getenv("GMAIL_PASSWORD", ""))


def _registar_log(db, tipo, pre_registo_id, canal, destinatario, mensagem, status="enviado", erro=None):
    log = NotificacaoLog(
        tipo_registo=tipo,
        pre_registo_id=pre_registo_id,
        canal=canal,
        destinatario=destinatario,
        mensagem=mensagem,
        status=status,
        erro=erro
    )
    db.add(log)
    db.commit()


def _enviar_whatsapp(destinatario: str, mensagem: str) -> bool:
    if not TWILIO_ACTIVO:
        print(f"[SIMULADO WhatsApp] Para: {destinatario}\n{mensagem}")
        return True
    try:
        from twilio.rest import Client
        client = Client(os.getenv("TWILIO_ACCOUNT_SID"), os.getenv("TWILIO_AUTH_TOKEN"))
        client.messages.create(
            from_=os.getenv("TWILIO_WHATSAPP_FROM"),
            to=f"whatsapp:{destinatario}",
            body=mensagem
        )
        return True
    except Exception as e:
        print(f"[ERRO WhatsApp] {e}")
        return False


def _enviar_email(destinatario: str, assunto: str, mensagem: str, pdf_path: str = None) -> bool:
    if not GMAIL_ACTIVO:
        print(f"[SIMULADO Email] Para: {destinatario}\nAssunto: {assunto}\n{mensagem}")
        return True
    try:
        import smtplib
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText
        from email.mime.base import MIMEBase
        from email import encoders

        msg = MIMEMultipart()
        msg["From"] = os.getenv("GMAIL_USER")
        msg["To"] = destinatario
        msg["Subject"] = assunto
        msg.attach(MIMEText(mensagem, "plain"))

        if pdf_path and os.path.exists(pdf_path):
            with open(pdf_path, "rb") as f:
                parte = MIMEBase("application", "octet-stream")
                parte.set_payload(f.read())
                encoders.encode_base64(parte)
                parte.add_header("Content-Disposition", f"attachment; filename={os.path.basename(pdf_path)}")
                msg.attach(parte)

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
            smtp.login(os.getenv("GMAIL_USER"), os.getenv("GMAIL_PASSWORD"))
            smtp.send_message(msg)
        return True
    except Exception as e:
        print(f"[ERRO Email] {e}")
        return False


def enviar_notificacao_nascimento(db: Session, pre_registo, tipo: str, registo=None):
    if tipo == "pre_registo":
        mensagem = (
            f"Registo Civil de Moçambique\n\n"
            f"Foi criado um pré-registo de nascimento para o seu filho(a).\n"
            f"Referência: {pre_registo.ref_hospital}\n"
            f"Data de nascimento: {pre_registo.data_nascimento}\n\n"
            f"Por favor aguarde a confirmação do registo civil."
        )
        assunto = "Pré-registo de Nascimento Criado"
    else:
        mensagem = (
            f"Registo Civil de Moçambique\n\n"
            f"O registo de nascimento foi aprovado!\n"
            f"Nome: {registo.nome_completo} {registo.apelidos}\n"
            f"NUIC: {registo.nuic}\n"
            f"Assento nº: {registo.numero_assento}\n\n"
            f"O seu documento está disponível no Registo Civil."
        )
        assunto = "Registo de Nascimento Aprovado"

    canal = pre_registo.canal_notificacao
    destinatario = pre_registo.whatsapp_encarregado or pre_registo.email_encarregado or "N/A"

    if canal == "whatsapp" and pre_registo.whatsapp_encarregado:
        ok = _enviar_whatsapp(pre_registo.whatsapp_encarregado, mensagem)
        _registar_log(db, "nascimento", pre_registo.id, "whatsapp", destinatario, mensagem,
                      "enviado" if ok else "falhou")
    elif canal == "email" and pre_registo.email_encarregado:
        pdf = registo.pdf_path if registo else None
        ok = _enviar_email(pre_registo.email_encarregado, assunto, mensagem, pdf)
        _registar_log(db, "nascimento", pre_registo.id, "email", destinatario, mensagem,
                      "enviado" if ok else "falhou")
    else:
        print(f"[PENDENTE] Contacto presencial necessário para pré-registo {pre_registo.id}")

    pre_registo.ultima_notificacao = __import__("datetime").datetime.now()
    pre_registo.total_notificacoes += 1
    db.commit()


def enviar_notificacao_obito(db: Session, pre_registo, tipo: str, registo=None):
    if tipo == "pre_registo":
        mensagem = (
            f"Registo Civil de Moçambique\n\n"
            f"Foi criado um pré-registo de óbito.\n"
            f"Falecido: {pre_registo.nome_completo}\n"
            f"Data: {pre_registo.dia_falecimento}\n\n"
            f"Aguarda aprovação do registo civil."
        )
        assunto = "Pré-registo de Óbito Criado"
    else:
        mensagem = (
            f"Registo Civil de Moçambique\n\n"
            f"O registo de óbito foi aprovado.\n"
            f"Falecido: {registo.nome_completo}\n"
            f"Assento nº: {registo.numero_assento}\n\n"
            f"A certidão está disponível no Registo Civil."
        )
        assunto = "Registo de Óbito Aprovado"

    canal = pre_registo.canal_notificacao
    destinatario = pre_registo.whatsapp_declarante or pre_registo.email_declarante or "N/A"

    if canal == "whatsapp" and pre_registo.whatsapp_declarante:
        ok = _enviar_whatsapp(pre_registo.whatsapp_declarante, mensagem)
        _registar_log(db, "obito", pre_registo.id, "whatsapp", destinatario, mensagem,
                      "enviado" if ok else "falhou")
    elif canal == "email" and pre_registo.email_declarante:
        pdf = registo.pdf_path if registo else None
        ok = _enviar_email(pre_registo.email_declarante, assunto, mensagem, pdf)
        _registar_log(db, "obito", pre_registo.id, "email", destinatario, mensagem,
                      "enviado" if ok else "falhou")
    else:
        print(f"[PENDENTE] Contacto presencial necessário para óbito {pre_registo.id}")

    pre_registo.ultima_notificacao = __import__("datetime").datetime.now()
    pre_registo.total_notificacoes += 1
    db.commit()