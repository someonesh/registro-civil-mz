from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.hospital import Hospital
from app.models.nascimento import PreRegistoNascimento, RegistoNascimento
from app.models.configuracao import Configuracao
from app.schemas.nascimento import NascimentoFase1, NascimentoFase2, AprovarNascimento, RejeitarNascimento
from app.services.validacao_bi import verificar_bi
from app.services.nuic import gerar_nuic, gerar_numero_assento_nascimento
from app.services.notificacoes import enviar_notificacao_nascimento
import datetime

router = APIRouter(prefix="/nascimento", tags=["Nascimento"])


def autenticar_hospital(api_key: str, db: Session) -> Hospital:
    hospital = db.query(Hospital).filter(
        Hospital.api_key == api_key,
        Hospital.activo == True
    ).first()
    if not hospital:
        raise HTTPException(status_code=401, detail="API key inválida ou hospital inactivo.")
    return hospital


@router.post("/fase1")
def receber_nascimento_fase1(dados: NascimentoFase1, db: Session = Depends(get_db)):
    hospital = autenticar_hospital(dados.api_key, db)

    existente = db.query(PreRegistoNascimento).filter(
        PreRegistoNascimento.ref_hospital == dados.ref_hospital
    ).first()
    if existente:
        raise HTTPException(status_code=409, detail=f"Referência '{dados.ref_hospital}' já existe no sistema.")

    erros = []
    bi_pai_valido = False
    bi_mae_valido = False
    pai_vivo = True
    mae_viva = True

    resultado_pai = verificar_bi(db, dados.bi_pai, dados.nome_pai)
    if not resultado_pai["valido"]:
        erros.append({"campo": "bi_pai", "mensagem": resultado_pai["mensagem"]})
    else:
        bi_pai_valido = True
        pai_vivo = resultado_pai["dados"]["vivo"]

    resultado_mae = verificar_bi(db, dados.bi_mae, dados.nome_mae)
    if not resultado_mae["valido"]:
        erros.append({"campo": "bi_mae", "mensagem": resultado_mae["mensagem"]})
    else:
        bi_mae_valido = True
        mae_viva = resultado_mae["dados"]["vivo"]

    if erros:
        return {
            "sucesso": False,
            "status": "bi_invalido",
            "erros": erros,
            "mensagem": "Pré-registo não criado. Corrija os dados indicados e reenvie."
        }

    canal = "pendente"
    if dados.whatsapp_encarregado:
        canal = "whatsapp"
    elif dados.email_encarregado:
        canal = "email"

    pre_registo = PreRegistoNascimento(
        ref_hospital=dados.ref_hospital,
        hospital_id=hospital.id,
        status="incompleto",
        sexo_bebe=dados.sexo_bebe,
        data_nascimento=dados.data_nascimento,
        hora_nascimento=dados.hora_nascimento,
        local_nascimento=dados.local_nascimento,
        provincia_nascimento=dados.provincia_nascimento,
        distrito_nascimento=dados.distrito_nascimento,
        bi_pai=dados.bi_pai.upper(),
        nome_pai=dados.nome_pai,
        naturalidade_pai=dados.naturalidade_pai,
        estado_civil_pai=dados.estado_civil_pai,
        pai_vivo=pai_vivo,
        bi_mae=dados.bi_mae.upper(),
        nome_mae=dados.nome_mae,
        naturalidade_mae=dados.naturalidade_mae,
        estado_civil_mae=dados.estado_civil_mae,
        mae_viva=mae_viva,
        bi_pai_valido=bi_pai_valido,
        bi_mae_valido=bi_mae_valido,
        whatsapp_encarregado=dados.whatsapp_encarregado,
        email_encarregado=dados.email_encarregado,
        canal_notificacao=canal
    )

    db.add(pre_registo)
    db.commit()
    db.refresh(pre_registo)

    enviar_notificacao_nascimento(db, pre_registo, tipo="pre_registo")

    return {
        "sucesso": True,
        "status": "incompleto",
        "pre_registo_id": pre_registo.id,
        "mensagem": "Pré-registo criado com sucesso. Aguarda dados complementares (fase 2)."
    }


@router.post("/fase2")
def completar_nascimento_fase2(dados: NascimentoFase2, db: Session = Depends(get_db)):
    autenticar_hospital(dados.api_key, db)

    pre_registo = db.query(PreRegistoNascimento).filter(
        PreRegistoNascimento.ref_hospital == dados.ref_hospital
    ).first()

    if not pre_registo:
        raise HTTPException(status_code=404, detail="Pré-registo não encontrado.")

    if pre_registo.status not in ["incompleto"]:
        raise HTTPException(
            status_code=400,
            detail=f"Pré-registo já se encontra no estado '{pre_registo.status}'."
        )

    pre_registo.nome_completo = dados.nome_completo
    pre_registo.apelidos = dados.apelidos
    pre_registo.avo_paterno = dados.avo_paterno
    pre_registo.avo_paterna = dados.avo_paterna
    pre_registo.avo_materno = dados.avo_materno
    pre_registo.avo_materna = dados.avo_materna
    pre_registo.bi_declarante = dados.bi_declarante
    pre_registo.nome_declarante = dados.nome_declarante
    pre_registo.estado_civil_declarante = dados.estado_civil_declarante
    pre_registo.residencia_declarante = dados.residencia_declarante
    pre_registo.relacao_declarante = dados.relacao_declarante
    pre_registo.status = "aguarda_aprovacao"

    db.commit()

    return {
        "sucesso": True,
        "status": "aguarda_aprovacao",
        "pre_registo_id": pre_registo.id,
        "mensagem": "Dados complementares recebidos. Registo aguarda aprovação do funcionário do registo civil."
    }


@router.post("/aprovar")
def aprovar_nascimento(dados: AprovarNascimento, db: Session = Depends(get_db)):
    pre_registo = db.query(PreRegistoNascimento).filter(
        PreRegistoNascimento.id == dados.pre_registo_id,
        PreRegistoNascimento.status == "aguarda_aprovacao"
    ).first()

    if not pre_registo:
        raise HTTPException(
            status_code=404,
            detail="Pré-registo não encontrado ou não está em estado 'aguarda_aprovacao'."
        )

    config_conservatoria = db.query(Configuracao).filter(
        Configuracao.chave == "nome_conservatoria"
    ).first()
    config_posto = db.query(Configuracao).filter(
        Configuracao.chave == "posto_registo"
    ).first()

    nuic = gerar_nuic(db)
    numero_assento = gerar_numero_assento_nascimento(db)

    registo = RegistoNascimento(
        pre_registo_id=pre_registo.id,
        nuic=nuic,
        numero_assento=numero_assento,
        cedula_numero=dados.cedula_numero,
        diario_numero=dados.diario_numero,
        nome_completo=pre_registo.nome_completo,
        apelidos=pre_registo.apelidos,
        sexo=pre_registo.sexo_bebe,
        data_nascimento=pre_registo.data_nascimento,
        hora_nascimento=pre_registo.hora_nascimento,
        local_nascimento=pre_registo.local_nascimento,
        provincia_nascimento=pre_registo.provincia_nascimento,
        distrito_nascimento=pre_registo.distrito_nascimento,
        nome_pai=pre_registo.nome_pai,
        bi_pai=pre_registo.bi_pai,
        naturalidade_pai=pre_registo.naturalidade_pai,
        estado_civil_pai=pre_registo.estado_civil_pai,
        nome_mae=pre_registo.nome_mae,
        bi_mae=pre_registo.bi_mae,
        naturalidade_mae=pre_registo.naturalidade_mae,
        estado_civil_mae=pre_registo.estado_civil_mae,
        avo_paterno=pre_registo.avo_paterno,
        avo_paterna=pre_registo.avo_paterna,
        avo_materno=pre_registo.avo_materno,
        avo_materna=pre_registo.avo_materna,
        nome_declarante=pre_registo.nome_declarante,
        bi_declarante=pre_registo.bi_declarante,
        estado_civil_declarante=pre_registo.estado_civil_declarante,
        residencia_declarante=pre_registo.residencia_declarante,
        conservatoria=config_conservatoria.valor if config_conservatoria else "1ª Conservatória do Registo Civil da Beira",
        posto_registo=config_posto.valor if config_posto else "",
        conservador=dados.conservador,
    )

    db.add(registo)
    pre_registo.status = "aprovado"
    pre_registo.data_confirmacao = datetime.datetime.now()
    pre_registo.confirmado_por = dados.conservador
    db.commit()
    db.refresh(registo)

    # Gerar PDF
    try:
        from app.services.pdf import gerar_boletim_nascimento
        cfg_conserv = db.query(Configuracao).filter(Configuracao.chave == "nome_conservatoria").first()
        cfg_cons = db.query(Configuracao).filter(Configuracao.chave == "nome_conservador").first()
        pdf_path = gerar_boletim_nascimento(
            registo,
            conservatoria=cfg_conserv.valor if cfg_conserv else "1ª Conservatória do Registo Civil da Beira",
            conservador=cfg_cons.valor if cfg_cons else "Dr. João Carlos Gotoro"
        )
        registo.pdf_gerado = True
        registo.pdf_path = pdf_path
        db.commit()
    except Exception as e:
        print(f"[PDF ERRO] {e}")

    enviar_notificacao_nascimento(db, pre_registo, tipo="aprovado", registo=registo)

    return {
        "sucesso": True,
        "nuic": nuic,
        "numero_assento": numero_assento,
        "mensagem": f"Registo aprovado com sucesso. NUIC: {nuic}"
    }


@router.post("/rejeitar")
def rejeitar_nascimento(dados: RejeitarNascimento, db: Session = Depends(get_db)):
    pre_registo = db.query(PreRegistoNascimento).filter(
        PreRegistoNascimento.id == dados.pre_registo_id,
        PreRegistoNascimento.status == "aguarda_aprovacao"
    ).first()

    if not pre_registo:
        raise HTTPException(status_code=404, detail="Pré-registo não encontrado.")

    pre_registo.status = "rejeitado"
    pre_registo.motivo_rejeicao = dados.motivo_rejeicao
    pre_registo.rejeitado_por = dados.rejeitado_por
    db.commit()

    return {
        "sucesso": True,
        "mensagem": f"Registo rejeitado. Motivo: {dados.motivo_rejeicao}"
    }


# ── ROTAS FIXAS ANTES DE /{id} ──

@router.get("/pendentes")
def listar_pendentes(db: Session = Depends(get_db)):
    registos = db.query(PreRegistoNascimento).filter(
        PreRegistoNascimento.status.in_(["incompleto", "aguarda_aprovacao"])
    ).order_by(PreRegistoNascimento.data_recepcao.desc()).all()

    return {
        "total": len(registos),
        "registos": [
            {
                "id": r.id,
                "ref_hospital": r.ref_hospital,
                "status": r.status,
                "sexo_bebe": r.sexo_bebe,
                "nome_completo": r.nome_completo or "— sem nome —",
                "data_nascimento": str(r.data_nascimento),
                "nome_pai": r.nome_pai,
                "nome_mae": r.nome_mae,
                "canal_notificacao": r.canal_notificacao,
                "total_notificacoes": r.total_notificacoes,
                "data_recepcao": str(r.data_recepcao)
            }
            for r in registos
        ]
    }


@router.get("/historico")
def historico_nascimentos(db: Session = Depends(get_db)):
    # Aprovados — vêm da tabela registos_nascimento
    aprovados = db.query(RegistoNascimento).order_by(
        RegistoNascimento.data_registo.desc()
    ).all()

    # Rejeitados — vêm da tabela pre_registos_nascimento
    rejeitados = db.query(PreRegistoNascimento).filter(
        PreRegistoNascimento.status == "rejeitado"
    ).order_by(PreRegistoNascimento.data_recepcao.desc()).all()

    return {
        "aprovados": [
            {
                "id": r.id,
                "nuic": r.nuic,
                "numero_assento": r.numero_assento,
                "nome_completo": f"{r.nome_completo} {r.apelidos}".strip(),
                "sexo": r.sexo,
                "data_nascimento": str(r.data_nascimento),
                "local_nascimento": r.local_nascimento,
                "provincia_nascimento": r.provincia_nascimento,
                "nome_pai": r.nome_pai,
                "nome_mae": r.nome_mae,
                "conservador": r.conservador,
                "data_registo": str(r.data_registo),
            }
            for r in aprovados
        ],
        "rejeitados": [
            {
                "id": r.id,
                "ref_hospital": r.ref_hospital,
                "nome_completo": r.nome_completo or "— sem nome —",
                "data_nascimento": str(r.data_nascimento),
                "nome_pai": r.nome_pai,
                "nome_mae": r.nome_mae,
                "motivo_rejeicao": r.motivo_rejeicao,
                "rejeitado_por": r.rejeitado_por,
                "data_recepcao": str(r.data_recepcao),
            }
            for r in rejeitados
        ]
    }


@router.get("/registados")
def listar_registados(db: Session = Depends(get_db)):
    registos = db.query(RegistoNascimento).order_by(
        RegistoNascimento.data_registo.desc()
    ).all()

    return {
        "total": len(registos),
        "registos": [
            {
                "id": r.id,
                "nuic": r.nuic,
                "numero_assento": r.numero_assento,
                "nome_completo": f"{r.nome_completo} {r.apelidos}".strip(),
                "sexo": r.sexo,
                "data_nascimento": str(r.data_nascimento),
                "local_nascimento": r.local_nascimento,
                "provincia_nascimento": r.provincia_nascimento,
                "nome_pai": r.nome_pai,
                "nome_mae": r.nome_mae,
                "conservador": r.conservador,
                "data_registo": str(r.data_registo),
            }
            for r in registos
        ]
    }


@router.get("/verificar/{nuic}")
def verificar_nuic(nuic: str, db: Session = Depends(get_db)):
    registo = db.query(RegistoNascimento).filter(
        RegistoNascimento.nuic == nuic
    ).first()
    if not registo:
        raise HTTPException(status_code=404, detail="NUIC não encontrado.")
    return registo


@router.get("/{pre_registo_id}")
def detalhe_pre_registo(pre_registo_id: int, db: Session = Depends(get_db)):
    r = db.query(PreRegistoNascimento).filter(
        PreRegistoNascimento.id == pre_registo_id
    ).first()
    if not r:
        raise HTTPException(status_code=404, detail="Pré-registo não encontrado.")
    return r