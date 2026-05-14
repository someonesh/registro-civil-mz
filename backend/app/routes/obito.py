from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import date
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.hospital import Hospital
from app.models.obito import PreRegistoObito, RegistoObito
from app.models.configuracao import Configuracao
from app.schemas.obito import ObitoFase1, ObitoFase2, AprovarObito, RejeitarObito
from app.services.validacao_bi import verificar_bi, verificar_bi_falecido
from app.services.nuic import gerar_numero_assento_obito
from app.services.notificacoes import enviar_notificacao_obito
import datetime

router = APIRouter(prefix="/obito", tags=["Óbito"])


def autenticar_hospital(api_key: str, db: Session) -> Hospital:
    hospital = db.query(Hospital).filter(
        Hospital.api_key == api_key,
        Hospital.activo == True
    ).first()
    if not hospital:
        raise HTTPException(status_code=401, detail="API key inválida ou hospital inactivo.")
    return hospital


# ── ENDPOINT PARA EDITAR REGISTO ──
class AtualizarRegistoObito(BaseModel):
    nome_completo: Optional[str] = None
    sexo: Optional[str] = None
    idade: Optional[int] = None
    estado_civil: Optional[str] = None
    dia_falecimento: Optional[date] = None
    hora_falecimento: Optional[str] = None
    local_falecimento: Optional[str] = None
    causa_morte: Optional[str] = None
    nome_declarante: Optional[str] = None


@router.put("/registados/{registo_id}")
def atualizar_registo_obito(
    registo_id: int, 
    dados: AtualizarRegistoObito, 
    db: Session = Depends(get_db)
):
    registo = db.query(RegistoObito).filter(
        RegistoObito.id == registo_id
    ).first()
    
    if not registo:
        raise HTTPException(status_code=404, detail="Registo não encontrado.")
    
    update_data = dados.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(registo, key, value)
    
    db.commit()
    db.refresh(registo)
    
    return {"sucesso": True, "mensagem": "Registo actualizado com sucesso.", "registo": registo}


@router.post("/fase1")
def receber_obito_fase1(dados: ObitoFase1, db: Session = Depends(get_db)):
    hospital = autenticar_hospital(dados.api_key, db)

    existente = db.query(PreRegistoObito).filter(
        PreRegistoObito.ref_hospital == dados.ref_hospital
    ).first()
    if existente:
        raise HTTPException(status_code=409, detail=f"Referência '{dados.ref_hospital}' já existe.")

    erros = []
    bi_falecido_valido = False

    if dados.bi_falecido:
        resultado = verificar_bi_falecido(db, dados.bi_falecido, dados.nome_completo)
        if not resultado["valido"]:
            erros.append({"campo": "bi_falecido", "mensagem": resultado["mensagem"]})
        else:
            bi_falecido_valido = True

    if erros:
        return {
            "sucesso": False,
            "status": "bi_invalido",
            "erros": erros,
            "mensagem": "Pré-registo não criado. Corrija os dados e reenvie."
        }

    canal = "pendente"
    if dados.whatsapp_declarante:
        canal = "whatsapp"
    elif dados.email_declarante:
        canal = "email"

    pre_registo = PreRegistoObito(
        ref_hospital=dados.ref_hospital,
        hospital_id=hospital.id,
        status="incompleto",
        nome_completo=dados.nome_completo,
        sexo=dados.sexo,
        idade=dados.idade,
        estado_civil=dados.estado_civil,
        naturalidade=dados.naturalidade,
        localidade_naturalidade=dados.localidade_naturalidade,
        provincia_naturalidade=dados.provincia_naturalidade,
        ultima_residencia=dados.ultima_residencia,
        localidade_residencia=dados.localidade_residencia,
        provincia_residencia=dados.provincia_residencia,
        nome_pai_falecido=dados.nome_pai_falecido,
        nome_mae_falecida=dados.nome_mae_falecida,
        hora_falecimento=dados.hora_falecimento,
        dia_falecimento=dados.dia_falecimento,
        local_falecimento=dados.local_falecimento,
        localidade_falecimento=dados.localidade_falecimento,
        provincia_falecimento=dados.provincia_falecimento,
        causa_morte=dados.causa_morte,
        boletim_hospital=dados.boletim_hospital,
        bi_falecido=dados.bi_falecido,
        bi_falecido_valido=bi_falecido_valido,
        bi_declarante=dados.bi_declarante,
        nome_declarante=dados.nome_declarante,
        estado_civil_declarante=dados.estado_civil_declarante,
        residencia_declarante=dados.residencia_declarante,
        whatsapp_declarante=dados.whatsapp_declarante,
        email_declarante=dados.email_declarante,
        canal_notificacao=canal
    )

    db.add(pre_registo)
    db.commit()
    db.refresh(pre_registo)

    enviar_notificacao_obito(db, pre_registo, tipo="pre_registo")

    return {
        "sucesso": True,
        "status": "incompleto",
        "pre_registo_id": pre_registo.id,
        "mensagem": "Pré-registo de óbito criado. Aguarda dados complementares."
    }


@router.post("/fase2")
def completar_obito_fase2(dados: ObitoFase2, db: Session = Depends(get_db)):
    autenticar_hospital(dados.api_key, db)

    pre_registo = db.query(PreRegistoObito).filter(
        PreRegistoObito.ref_hospital == dados.ref_hospital
    ).first()

    if not pre_registo:
        raise HTTPException(status_code=404, detail="Pré-registo não encontrado.")

    if pre_registo.status != "incompleto":
        raise HTTPException(status_code=400, detail=f"Estado actual: '{pre_registo.status}'.")

    pre_registo.cemiterio = dados.cemiterio
    pre_registo.herdeiros = dados.herdeiros
    pre_registo.bens_inventario = dados.bens_inventario
    pre_registo.testamento = dados.testamento
    pre_registo.status = "aguarda_aprovacao"

    db.commit()

    return {
        "sucesso": True,
        "status": "aguarda_aprovacao",
        "mensagem": "Dados complementares recebidos. Aguarda aprovação do registo civil."
    }


@router.post("/aprovar")
def aprovar_obito(dados: AprovarObito, db: Session = Depends(get_db)):
    pre_registo = db.query(PreRegistoObito).filter(
        PreRegistoObito.id == dados.pre_registo_id,
        PreRegistoObito.status == "aguarda_aprovacao"
    ).first()

    if not pre_registo:
        raise HTTPException(status_code=404, detail="Pré-registo não encontrado ou estado inválido.")

    config_conservatoria = db.query(Configuracao).filter(
        Configuracao.chave == "nome_conservatoria"
    ).first()

    numero_assento = gerar_numero_assento_obito(db)

    registo = RegistoObito(
        pre_registo_id=pre_registo.id,
        numero_assento=numero_assento,
        nome_completo=pre_registo.nome_completo,
        sexo=pre_registo.sexo,
        idade=pre_registo.idade,
        estado_civil=pre_registo.estado_civil,
        naturalidade=pre_registo.naturalidade,
        localidade_naturalidade=pre_registo.localidade_naturalidade,
        provincia_naturalidade=pre_registo.provincia_naturalidade,
        ultima_residencia=pre_registo.ultima_residencia,
        localidade_residencia=pre_registo.localidade_residencia,
        provincia_residencia=pre_registo.provincia_residencia,
        nome_pai_falecido=pre_registo.nome_pai_falecido,
        nome_mae_falecida=pre_registo.nome_mae_falecida,
        hora_falecimento=pre_registo.hora_falecimento,
        dia_falecimento=pre_registo.dia_falecimento,
        local_falecimento=pre_registo.local_falecimento,
        localidade_falecimento=pre_registo.localidade_falecimento,
        provincia_falecimento=pre_registo.provincia_falecimento,
        causa_morte=pre_registo.causa_morte,
        boletim_hospital=pre_registo.boletim_hospital,
        nome_declarante=pre_registo.nome_declarante,
        bi_declarante=pre_registo.bi_declarante,
        estado_civil_declarante=pre_registo.estado_civil_declarante,
        residencia_declarante=pre_registo.residencia_declarante,
        cemiterio=pre_registo.cemiterio,
        herdeiros=pre_registo.herdeiros,
        bens_inventario=pre_registo.bens_inventario,
        testamento=pre_registo.testamento,
        registo_nascimento_ref=dados.registo_nascimento_ref,
        registo_casamento_ref=dados.registo_casamento_ref,
        conservatoria=config_conservatoria.valor if config_conservatoria else "1ª Conservatória do Registo Civil da Beira",
        conservador=dados.conservador,
        diario_numero=dados.diario_numero,
    )

    db.add(registo)
    pre_registo.status = "aprovado"
    pre_registo.data_confirmacao = datetime.datetime.now()
    pre_registo.confirmado_por = dados.conservador
    db.commit()
    db.refresh(registo)

    try:
        from app.services.pdf import gerar_assento_obito
        cfg_conserv = db.query(Configuracao).filter(Configuracao.chave == "nome_conservatoria").first()
        cfg_cons = db.query(Configuracao).filter(Configuracao.chave == "nome_conservador").first()
        pdf_path = gerar_assento_obito(
            registo,
            conservatoria=cfg_conserv.valor if cfg_conserv else "1ª Conservatória do Registo Civil da Beira",
            conservador=cfg_cons.valor if cfg_cons else "Dr. João Carlos Gotoro"
        )
        registo.pdf_gerado = True
        registo.pdf_path = pdf_path
        db.commit()
    except Exception as e:
        print(f"[PDF ERRO] {e}")

    enviar_notificacao_obito(db, pre_registo, tipo="aprovado", registo=registo)

    return {
        "sucesso": True,
        "numero_assento": numero_assento,
        "mensagem": f"Registo de óbito aprovado. Assento nº {numero_assento}"
    }


@router.post("/rejeitar")
def rejeitar_obito(dados: RejeitarObito, db: Session = Depends(get_db)):
    pre_registo = db.query(PreRegistoObito).filter(
        PreRegistoObito.id == dados.pre_registo_id,
        PreRegistoObito.status == "aguarda_aprovacao"
    ).first()
    if not pre_registo:
        raise HTTPException(status_code=404, detail="Pré-registo não encontrado.")

    pre_registo.status = "rejeitado"
    pre_registo.motivo_rejeicao = dados.motivo_rejeicao
    pre_registo.rejeitado_por = dados.rejeitado_por
    db.commit()

    return {"sucesso": True, "mensagem": f"Óbito rejeitado. Motivo: {dados.motivo_rejeicao}"}


@router.get("/pendentes")
def listar_pendentes(db: Session = Depends(get_db)):
    registos = db.query(PreRegistoObito).filter(
        PreRegistoObito.status.in_(["incompleto", "aguarda_aprovacao"])
    ).order_by(PreRegistoObito.data_recepcao.desc()).all()

    return {
        "total": len(registos),
        "registos": [
            {
                "id": r.id,
                "ref_hospital": r.ref_hospital,
                "status": r.status,
                "nome_completo": r.nome_completo,
                "dia_falecimento": str(r.dia_falecimento),
                "causa_morte": r.causa_morte,
                "nome_declarante": r.nome_declarante,
                "canal_notificacao": r.canal_notificacao,
                "data_recepcao": str(r.data_recepcao)
            }
            for r in registos
        ]
    }


@router.get("/historico")
def historico_obitos(db: Session = Depends(get_db)):
    aprovados = db.query(RegistoObito).order_by(
        RegistoObito.data_registo.desc()
    ).all()

    rejeitados = db.query(PreRegistoObito).filter(
        PreRegistoObito.status == "rejeitado"
    ).order_by(PreRegistoObito.data_recepcao.desc()).all()

    return {
        "aprovados": [
            {
                "id": r.id,
                "numero_assento": r.numero_assento,
                "nome_completo": r.nome_completo,
                "sexo": r.sexo,
                "idade": r.idade,
                "dia_falecimento": str(r.dia_falecimento),
                "causa_morte": r.causa_morte,
                "local_falecimento": r.local_falecimento,
                "provincia_falecimento": r.provincia_falecimento,
                "nome_declarante": r.nome_declarante,
                "conservador": r.conservador,
                "data_registo": str(r.data_registo),
            }
            for r in aprovados
        ],
        "rejeitados": [
            {
                "id": r.id,
                "ref_hospital": r.ref_hospital,
                "nome_completo": r.nome_completo,
                "dia_falecimento": str(r.dia_falecimento),
                "causa_morte": r.causa_morte,
                "motivo_rejeicao": r.motivo_rejeicao,
                "rejeitado_por": r.rejeitado_por,
                "data_recepcao": str(r.data_recepcao),
            }
            for r in rejeitados
        ]
    }


@router.get("/registados")
def listar_registados(db: Session = Depends(get_db)):
    registos = db.query(RegistoObito).order_by(
        RegistoObito.data_registo.desc()
    ).all()

    return {
        "total": len(registos),
        "registos": [
            {
                "id": r.id,
                "numero_assento": r.numero_assento,
                "nome_completo": r.nome_completo,
                "sexo": r.sexo,
                "idade": r.idade,
                "dia_falecimento": str(r.dia_falecimento),
                "causa_morte": r.causa_morte,
                "local_falecimento": r.local_falecimento,
                "provincia_falecimento": r.provincia_falecimento,
                "conservador": r.conservador,
                "data_registo": str(r.data_registo),
            }
            for r in registos
        ]
    }


@router.get("/{pre_registo_id}")
def detalhe_pre_registo(pre_registo_id: int, db: Session = Depends(get_db)):
    r = db.query(PreRegistoObito).filter(PreRegistoObito.id == pre_registo_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Pré-registo não encontrado.")
    return r
    