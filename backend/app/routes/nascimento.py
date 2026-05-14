"""
Rotas de Nascimento — Registo Civil de Moçambique
=================================================
Correções aplicadas (v2):
  1. Ordem das rotas corrigida: rotas fixas (GET /registados, PUT /registados/{id})
     registadas ANTES do wildcard GET /{pre_registo_id}, eliminando o "Not Found" no editor.
  2. POST /fase2 envolto em try/except; erros de negócio voltam 4xx + JSON {detail}.
  3. Callback ao hospital com payload completo (nome_completo, nuic, etc.) via POST
     para Hospital.callback_url quando existe.
  4. Status documentados e consistentes (ver STATUS_VALUES).
  5. GET /{pre_registo_id} devolve dict filtrado em vez do ORM raw.
"""

import datetime
import logging
import traceback
from typing import Optional

import requests as _requests
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.configuracao import Configuracao
from app.models.hospital import Hospital
from app.models.nascimento import PreRegistoNascimento, RegistoNascimento
from app.schemas.nascimento import (
    AprovarNascimento,
    NascimentoFase1,
    NascimentoFase2,
    ReconhecerPaternidade,
    RejeitarNascimento,
)
from app.services.notificacoes import enviar_notificacao_nascimento
from app.services.nuic import gerar_nuic, gerar_numero_assento_nascimento
from app.services.validacao_bi import verificar_bi

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/nascimento", tags=["Nascimento"])

# ── Contrato de estados ────────────────────────────────────────────────────────
# Conjunto fixo e documentado. Nunca usar strings ad-hoc fora desta lista.
STATUS_VALUES = {
    "incompleto":        "Pré-registo criado; aguarda dados complementares (fase 2).",
    "aguarda_aprovacao": "Dados completos; aguarda aprovação do funcionário do RC.",
    "aprovado":          "Registo aprovado e assento emitido.",
    "rejeitado":         "Registo rejeitado pelo RC.",
}


# ── Helpers ────────────────────────────────────────────────────────────────────

def autenticar_hospital(api_key: str, db: Session) -> Hospital:
    hospital = db.query(Hospital).filter(
        Hospital.api_key == api_key,
        Hospital.activo == True
    ).first()
    if not hospital:
        raise HTTPException(status_code=401, detail="API key inválida ou hospital inactivo.")
    return hospital


def _callback_hospital(hospital: Hospital, payload: dict) -> None:
    """Envia POST para o URL de callback do hospital (se configurado)."""
    callback_url = getattr(hospital, "callback_url", None)
    if not callback_url:
        return
    try:
        resp = _requests.post(callback_url, json=payload, timeout=10)
        logger.info("[CALLBACK] POST %s → %s", callback_url, resp.status_code)
    except Exception as exc:
        logger.error("[CALLBACK ERRO] %s — %s", callback_url, exc)


def _payload_nascimento(pre_registo: PreRegistoNascimento, registo: RegistoNascimento = None) -> dict:
    """Payload completo para o hospital, incluindo nome_completo e demais campos."""
    p = {
        "ref_hospital":       pre_registo.ref_hospital,
        "pre_registo_id":     pre_registo.id,
        "estado":             pre_registo.status,
        "nome_completo":      f"{pre_registo.nome_completo or ''} {pre_registo.apelidos or ''}".strip() or None,
        "sexo_bebe":          pre_registo.sexo_bebe,
        "data_nascimento":    str(pre_registo.data_nascimento),
        "nome_mae":           pre_registo.nome_mae,
        "nome_pai":           pre_registo.nome_pai,
        "paternidade_fixada": pre_registo.paternidade_fixada,
        "motivo":             pre_registo.motivo_rejeicao,
    }
    if registo:
        p.update({
            "nuic":           registo.nuic,
            "numero_assento": registo.numero_assento,
            "conservador":    registo.conservador,
            "conservatoria":  registo.conservatoria,
        })
    return p


# ══════════════════════════════════════════════════════════════════════════════
# ATENÇÃO: rotas fixas PRIMEIRO, wildcard /{pre_registo_id} POR ÚLTIMO.
# O FastAPI casa rotas na ordem em que são registadas — um wildcard no topo
# "engole" todos os paths seguintes, causando 404/422 inesperados.
# ══════════════════════════════════════════════════════════════════════════════


# ── PUT /registados/{id} — editar registo aprovado ────────────────────────────
class AtualizarRegistoNascimento(BaseModel):
    nome_completo:       Optional[str] = None
    apelidos:            Optional[str] = None
    sexo:                Optional[str] = None
    data_nascimento:     Optional[datetime.date] = None
    hora_nascimento:     Optional[str] = None
    local_nascimento:    Optional[str] = None
    provincia_nascimento: Optional[str] = None
    nome_pai:            Optional[str] = None
    nome_mae:            Optional[str] = None


@router.put(
    "/registados/{registo_id}",
    summary="Editar registo de nascimento aprovado",
    responses={
        200: {"description": "Registo actualizado."},
        404: {"description": "Registo não encontrado."},
    },
)
def atualizar_registo_nascimento(
    registo_id: int,
    dados: AtualizarRegistoNascimento,
    db: Session = Depends(get_db),
):
    registo = db.query(RegistoNascimento).filter(
        RegistoNascimento.id == registo_id
    ).first()
    if not registo:
        raise HTTPException(status_code=404, detail="Registo não encontrado.")

    for key, value in dados.dict(exclude_unset=True).items():
        setattr(registo, key, value)

    db.commit()
    db.refresh(registo)
    return {"sucesso": True, "mensagem": "Registo actualizado com sucesso."}


# ── GET /registados — listar registos aprovados ───────────────────────────────
@router.get("/registados", summary="Listar todos os registos de nascimento aprovados")
def listar_registados(db: Session = Depends(get_db)):
    registos = db.query(RegistoNascimento).order_by(
        RegistoNascimento.data_registo.desc()
    ).all()
    return {
        "total": len(registos),
        "registos": [
            {
                "id":                   r.id,
                "nuic":                 r.nuic,
                "numero_assento":       r.numero_assento,
                "nome_completo":        f"{r.nome_completo} {r.apelidos}".strip(),
                "sexo":                 r.sexo,
                "data_nascimento":      str(r.data_nascimento),
                "local_nascimento":     r.local_nascimento,
                "provincia_nascimento": r.provincia_nascimento,
                "nome_pai":             r.nome_pai,
                "nome_mae":             r.nome_mae,
                "conservador":          r.conservador,
                "data_registo":         str(r.data_registo),
            }
            for r in registos
        ],
    }


# ── GET /pendentes ─────────────────────────────────────────────────────────────
@router.get("/pendentes", summary="Listar pré-registos pendentes")
def listar_pendentes(db: Session = Depends(get_db)):
    registos = db.query(PreRegistoNascimento).filter(
        PreRegistoNascimento.status.in_(["incompleto", "aguarda_aprovacao"])
    ).order_by(PreRegistoNascimento.data_recepcao.desc()).all()
    return {
        "total": len(registos),
        "registos": [
            {
                "id":                   r.id,
                "ref_hospital":         r.ref_hospital,
                "status":               r.status,
                "sexo_bebe":            r.sexo_bebe,
                "nome_completo":        r.nome_completo or "— sem nome —",
                "data_nascimento":      str(r.data_nascimento),
                "nome_pai":             r.nome_pai,
                "nome_mae":             r.nome_mae,
                "paternidade_fixada":   r.paternidade_fixada,
                "canal_notificacao":    r.canal_notificacao,
                "total_notificacoes":   r.total_notificacoes,
                "data_recepcao":        str(r.data_recepcao),
            }
            for r in registos
        ],
    }


# ── GET /historico ─────────────────────────────────────────────────────────────
@router.get("/historico", summary="Histórico de nascimentos aprovados e rejeitados")
def historico_nascimentos(db: Session = Depends(get_db)):
    aprovados  = db.query(RegistoNascimento).order_by(RegistoNascimento.data_registo.desc()).all()
    rejeitados = db.query(PreRegistoNascimento).filter(
        PreRegistoNascimento.status == "rejeitado"
    ).order_by(PreRegistoNascimento.data_recepcao.desc()).all()
    return {
        "aprovados": [
            {
                "id":                   r.id,
                "nuic":                 r.nuic,
                "numero_assento":       r.numero_assento,
                "nome_completo":        f"{r.nome_completo} {r.apelidos}".strip(),
                "sexo":                 r.sexo,
                "data_nascimento":      str(r.data_nascimento),
                "local_nascimento":     r.local_nascimento,
                "provincia_nascimento": r.provincia_nascimento,
                "nome_pai":             r.nome_pai,
                "nome_mae":             r.nome_mae,
                "conservador":          r.conservador,
                "data_registo":         str(r.data_registo),
            }
            for r in aprovados
        ],
        "rejeitados": [
            {
                "id":              r.id,
                "ref_hospital":    r.ref_hospital,
                "nome_completo":   r.nome_completo or "— sem nome —",
                "data_nascimento": str(r.data_nascimento),
                "nome_pai":        r.nome_pai,
                "nome_mae":        r.nome_mae,
                "motivo_rejeicao": r.motivo_rejeicao,
                "rejeitado_por":   r.rejeitado_por,
                "data_recepcao":   str(r.data_recepcao),
            }
            for r in rejeitados
        ],
    }


# ── GET /verificar/{nuic} ──────────────────────────────────────────────────────
@router.get(
    "/verificar/{nuic}",
    summary="Verificar registo por NUIC",
    responses={404: {"description": "NUIC não encontrado."}},
)
def verificar_nuic(nuic: str, db: Session = Depends(get_db)):
    registo = db.query(RegistoNascimento).filter(RegistoNascimento.nuic == nuic).first()
    if not registo:
        raise HTTPException(status_code=404, detail="NUIC não encontrado.")
    return registo


# ── POST /fase1 ────────────────────────────────────────────────────────────────
@router.post(
    "/fase1",
    summary="Receber pré-registo de nascimento (fase 1)",
    responses={
        200: {"description": "Pré-registo criado (sucesso) ou inválido (bi_invalido)."},
        401: {"description": "API key inválida."},
        409: {"description": "Referência do hospital já existe."},
    },
)
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

    paternidade_fixada = bool(dados.bi_pai and dados.nome_pai)

    if paternidade_fixada:
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
            "mensagem": "Pré-registo não criado. Corrija os dados indicados e reenvie.",
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
        bi_pai=dados.bi_pai.upper() if dados.bi_pai else None,
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
        paternidade_fixada=paternidade_fixada,
        whatsapp_encarregado=dados.whatsapp_encarregado,
        email_encarregado=dados.email_encarregado,
        canal_notificacao=canal,
    )

    db.add(pre_registo)
    db.commit()
    db.refresh(pre_registo)

    enviar_notificacao_nascimento(db, pre_registo, tipo="pre_registo")
    _callback_hospital(hospital, _payload_nascimento(pre_registo))

    msg_pat = "" if paternidade_fixada else " Paternidade não fixada — mãe declarou sem presença do pai."
    return {
        "sucesso": True,
        "status": "incompleto",
        "pre_registo_id": pre_registo.id,
        "paternidade_fixada": paternidade_fixada,
        "mensagem": f"Pré-registo criado com sucesso. Aguarda dados complementares (fase 2).{msg_pat}",
    }


# ── POST /fase2 ────────────────────────────────────────────────────────────────
@router.post(
    "/fase2",
    summary="Completar pré-registo (fase 2 — nome e declarante)",
    responses={
        200: {"description": "Dados recebidos; pré-registo passa a aguarda_aprovacao."},
        400: {"description": "Pré-registo já se encontra num estado que não permite fase 2."},
        401: {"description": "API key inválida."},
        404: {"description": "Pré-registo não encontrado."},
    },
)
def completar_nascimento_fase2(dados: NascimentoFase2, db: Session = Depends(get_db)):
    try:
        hospital = autenticar_hospital(dados.api_key, db)

        pre_registo = db.query(PreRegistoNascimento).filter(
            PreRegistoNascimento.ref_hospital == dados.ref_hospital
        ).first()

        if not pre_registo:
            raise HTTPException(status_code=404, detail="Pré-registo não encontrado para a referência indicada.")

        if pre_registo.status != "incompleto":
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Fase 2 já foi submetida ou pré-registo está no estado '{pre_registo.status}'. "
                    f"Estados permitidos para fase 2: incompleto."
                ),
            )

        pre_registo.nome_completo           = dados.nome_completo
        pre_registo.apelidos                = dados.apelidos
        pre_registo.avo_paterno             = dados.avo_paterno
        pre_registo.avo_paterna             = dados.avo_paterna
        pre_registo.avo_materno             = dados.avo_materno
        pre_registo.avo_materna             = dados.avo_materna
        pre_registo.bi_declarante           = dados.bi_declarante
        pre_registo.nome_declarante         = dados.nome_declarante
        pre_registo.estado_civil_declarante = dados.estado_civil_declarante
        pre_registo.residencia_declarante   = dados.residencia_declarante
        pre_registo.relacao_declarante      = dados.relacao_declarante
        pre_registo.status                  = "aguarda_aprovacao"

        db.commit()
        db.refresh(pre_registo)

        _callback_hospital(hospital, _payload_nascimento(pre_registo))

        return {
            "sucesso": True,
            "status": "aguarda_aprovacao",
            "pre_registo_id": pre_registo.id,
            "mensagem": "Dados complementares recebidos. Registo aguarda aprovação do funcionário do registo civil.",
        }

    except HTTPException:
        raise  # re-lançar 4xx normalmente

    except Exception as exc:
        logger.error("[FASE2 ERRO] %s\n%s", exc, traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Erro interno ao processar fase 2. Referência: {dados.ref_hospital}.",
        )


# ── POST /aprovar ──────────────────────────────────────────────────────────────
@router.post(
    "/aprovar",
    summary="Aprovar pré-registo (funcionário RC)",
    responses={
        200: {"description": "Registo aprovado e assento emitido."},
        404: {"description": "Pré-registo não encontrado ou não está em aguarda_aprovacao."},
    },
)
def aprovar_nascimento(dados: AprovarNascimento, db: Session = Depends(get_db)):
    pre_registo = db.query(PreRegistoNascimento).filter(
        PreRegistoNascimento.id == dados.pre_registo_id,
        PreRegistoNascimento.status == "aguarda_aprovacao",
    ).first()

    if not pre_registo:
        raise HTTPException(
            status_code=404,
            detail="Pré-registo não encontrado ou não está em estado 'aguarda_aprovacao'.",
        )

    config_conservatoria = db.query(Configuracao).filter(Configuracao.chave == "nome_conservatoria").first()
    config_posto         = db.query(Configuracao).filter(Configuracao.chave == "posto_registo").first()

    nuic           = gerar_nuic(db)
    numero_assento = gerar_numero_assento_nascimento(db)

    nome_pai_registo = pre_registo.nome_pai if pre_registo.paternidade_fixada else "Não declarado — paternidade não fixada"

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
        nome_pai=nome_pai_registo,
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
    pre_registo.status           = "aprovado"
    pre_registo.data_confirmacao = datetime.datetime.now()
    pre_registo.confirmado_por   = dados.conservador
    db.commit()
    db.refresh(registo)

    # PDF (não-fatal)
    try:
        from app.services.pdf import gerar_boletim_nascimento
        cfg_conserv = db.query(Configuracao).filter(Configuracao.chave == "nome_conservatoria").first()
        cfg_cons    = db.query(Configuracao).filter(Configuracao.chave == "nome_conservador").first()
        pdf_path = gerar_boletim_nascimento(
            registo,
            conservatoria=cfg_conserv.valor if cfg_conserv else "1ª Conservatória do Registo Civil da Beira",
            conservador=cfg_cons.valor if cfg_cons else "Dr. João Carlos Gotoro",
        )
        registo.pdf_gerado = True
        registo.pdf_path   = pdf_path
        db.commit()
    except Exception as exc:
        logger.error("[PDF ERRO] %s", exc)

    # Notificação ao encarregado
    enviar_notificacao_nascimento(db, pre_registo, tipo="aprovado", registo=registo)

    # Callback ao hospital com payload completo
    hospital = db.query(Hospital).filter(Hospital.id == pre_registo.hospital_id).first()
    if hospital:
        _callback_hospital(hospital, _payload_nascimento(pre_registo, registo))

    return {
        "sucesso":         True,
        "nuic":            nuic,
        "numero_assento":  numero_assento,
        "mensagem":        f"Registo aprovado com sucesso. NUIC: {nuic}",
    }


# ── POST /rejeitar ─────────────────────────────────────────────────────────────
@router.post(
    "/rejeitar",
    summary="Rejeitar pré-registo (funcionário RC)",
    responses={
        200: {"description": "Registo rejeitado."},
        404: {"description": "Pré-registo não encontrado."},
    },
)
def rejeitar_nascimento(dados: RejeitarNascimento, db: Session = Depends(get_db)):
    pre_registo = db.query(PreRegistoNascimento).filter(
        PreRegistoNascimento.id == dados.pre_registo_id,
        PreRegistoNascimento.status == "aguarda_aprovacao",
    ).first()

    if not pre_registo:
        raise HTTPException(status_code=404, detail="Pré-registo não encontrado ou já não está em aguarda_aprovacao.")

    pre_registo.status          = "rejeitado"
    pre_registo.motivo_rejeicao = dados.motivo_rejeicao
    pre_registo.rejeitado_por   = dados.rejeitado_por
    db.commit()

    # Callback ao hospital
    hospital = db.query(Hospital).filter(Hospital.id == pre_registo.hospital_id).first()
    if hospital:
        _callback_hospital(hospital, _payload_nascimento(pre_registo))

    return {"sucesso": True, "mensagem": f"Registo rejeitado. Motivo: {dados.motivo_rejeicao}"}


# ── POST /{id}/reconhecer-paternidade ─────────────────────────────────────────
@router.post(
    "/{pre_registo_id}/reconhecer-paternidade",
    summary="Reconhecimento posterior de paternidade",
)
def reconhecer_paternidade(pre_registo_id: int, dados: ReconhecerPaternidade, db: Session = Depends(get_db)):
    autenticar_hospital(dados.api_key, db)

    pre_registo = db.query(PreRegistoNascimento).filter(
        PreRegistoNascimento.id == pre_registo_id
    ).first()
    if not pre_registo:
        raise HTTPException(status_code=404, detail="Pré-registo não encontrado.")
    if pre_registo.paternidade_fixada:
        raise HTTPException(status_code=400, detail="Este registo já tem paternidade fixada.")

    resultado_pai = verificar_bi(db, dados.bi_pai, dados.nome_pai)
    if not resultado_pai["valido"]:
        raise HTTPException(status_code=422, detail=resultado_pai["mensagem"])

    pre_registo.bi_pai             = dados.bi_pai.upper()
    pre_registo.nome_pai           = dados.nome_pai
    pre_registo.estado_civil_pai   = dados.estado_civil_pai
    pre_registo.naturalidade_pai   = dados.naturalidade_pai
    pre_registo.bi_pai_valido      = True
    pre_registo.paternidade_fixada = True
    pre_registo.pai_vivo           = resultado_pai["dados"]["vivo"]

    registo = db.query(RegistoNascimento).filter(
        RegistoNascimento.pre_registo_id == pre_registo_id
    ).first()
    if registo:
        registo.bi_pai           = dados.bi_pai.upper()
        registo.nome_pai         = dados.nome_pai
        registo.estado_civil_pai = dados.estado_civil_pai
        registo.naturalidade_pai = dados.naturalidade_pai

    db.commit()
    return {"sucesso": True, "mensagem": f"Paternidade reconhecida. Pai: {dados.nome_pai} ({dados.bi_pai.upper()})"}


# ── POST /{id}/completar — completar presencialmente ──────────────────────────
class CompletarPresencial(BaseModel):
    nome_completo:            str
    apelidos:                 str
    nome_pai:                 Optional[str] = None
    bi_pai:                   Optional[str] = None
    naturalidade_pai:         Optional[str] = None
    estado_civil_pai:         Optional[str] = None
    nome_mae:                 Optional[str] = None
    bi_mae:                   Optional[str] = None
    naturalidade_mae:         Optional[str] = None
    estado_civil_mae:         Optional[str] = None
    avo_paterno:              Optional[str] = None
    avo_paterna:              Optional[str] = None
    avo_materno:              Optional[str] = None
    avo_materna:              Optional[str] = None
    bi_declarante:            Optional[str] = None
    nome_declarante:          Optional[str] = None
    estado_civil_declarante:  Optional[str] = None
    residencia_declarante:    Optional[str] = None
    relacao_declarante:       Optional[str] = None


@router.post(
    "/{pre_registo_id}/completar",
    summary="Completar pré-registo presencialmente no RC",
    responses={
        200: {"description": "Dados completados; passa a aguarda_aprovacao."},
        400: {"description": "Estado actual não permite edição."},
        404: {"description": "Pré-registo não encontrado."},
    },
)
def completar_presencial(pre_registo_id: int, dados: CompletarPresencial, db: Session = Depends(get_db)):
    r = db.query(PreRegistoNascimento).filter(PreRegistoNascimento.id == pre_registo_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Pré-registo não encontrado.")
    if r.status != "incompleto":
        raise HTTPException(status_code=400, detail=f"Estado actual '{r.status}' não permite edição.")

    if dados.nome_completo:            r.nome_completo            = dados.nome_completo
    if dados.apelidos:                 r.apelidos                 = dados.apelidos
    if dados.nome_pai:                 r.nome_pai                 = dados.nome_pai
    if dados.bi_pai:                   r.bi_pai                   = dados.bi_pai.upper()
    if dados.naturalidade_pai:         r.naturalidade_pai         = dados.naturalidade_pai
    if dados.estado_civil_pai:         r.estado_civil_pai         = dados.estado_civil_pai
    if dados.nome_mae:                 r.nome_mae                 = dados.nome_mae
    if dados.bi_mae:                   r.bi_mae                   = dados.bi_mae.upper()
    if dados.naturalidade_mae:         r.naturalidade_mae         = dados.naturalidade_mae
    if dados.estado_civil_mae:         r.estado_civil_mae         = dados.estado_civil_mae
    if dados.avo_paterno:              r.avo_paterno              = dados.avo_paterno
    if dados.avo_paterna:              r.avo_paterna              = dados.avo_paterna
    if dados.avo_materno:              r.avo_materno              = dados.avo_materno
    if dados.avo_materna:              r.avo_materna              = dados.avo_materna
    if dados.bi_declarante:            r.bi_declarante            = dados.bi_declarante.upper()
    if dados.nome_declarante:          r.nome_declarante          = dados.nome_declarante
    if dados.estado_civil_declarante:  r.estado_civil_declarante  = dados.estado_civil_declarante
    if dados.residencia_declarante:    r.residencia_declarante    = dados.residencia_declarante
    if dados.relacao_declarante:       r.relacao_declarante       = dados.relacao_declarante

    r.status = "aguarda_aprovacao"
    db.commit()
    return {"sucesso": True, "status": "aguarda_aprovacao", "mensagem": "Dados completados com sucesso."}


# ── GET /{pre_registo_id} — WILDCARD, DEVE FICAR POR ÚLTIMO ───────────────────
@router.get(
    "/{pre_registo_id}",
    summary="Detalhe de pré-registo por ID",
    responses={
        200: {
            "description": "Campos do pré-registo guardados no RC.",
            "content": {
                "application/json": {
                    "example": {
                        "id": 1,
                        "ref_hospital": "HCB-2024-001",
                        "status": "aguarda_aprovacao",
                        "nome_completo": "João",
                        "apelidos": "Silva",
                        "sexo_bebe": "M",
                        "data_nascimento": "2024-01-15",
                        "hora_nascimento": "08:30",
                        "local_nascimento": "Hospital Central da Beira",
                        "provincia_nascimento": "Sofala",
                        "distrito_nascimento": "Beira",
                        "nome_pai": "Manuel Silva",
                        "bi_pai": "123456789AB",
                        "nome_mae": "Ana Silva",
                        "bi_mae": "987654321CD",
                        "paternidade_fixada": True,
                        "avo_paterno": None,
                        "avo_paterna": None,
                        "avo_materno": None,
                        "avo_materna": None,
                        "nome_declarante": "Ana Silva",
                        "bi_declarante": "987654321CD",
                        "relacao_declarante": "mae",
                        "canal_notificacao": "whatsapp",
                        "total_notificacoes": 2,
                        "data_recepcao": "2024-01-15T09:00:00",
                        "data_confirmacao": None,
                        "confirmado_por": None,
                        "motivo_rejeicao": None,
                    }
                }
            },
        },
        404: {"description": "Pré-registo não encontrado."},
    },
)
def detalhe_pre_registo(pre_registo_id: int, db: Session = Depends(get_db)):
    r = db.query(PreRegistoNascimento).filter(PreRegistoNascimento.id == pre_registo_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Pré-registo não encontrado.")
    # Devolve dict filtrado (todos os campos relevantes para o hospital sincronizar)
    return {
        "id":                       r.id,
        "ref_hospital":             r.ref_hospital,
        "status":                   r.status,
        "nome_completo":            r.nome_completo,
        "apelidos":                 r.apelidos,
        "sexo_bebe":                r.sexo_bebe,
        "data_nascimento":          str(r.data_nascimento),
        "hora_nascimento":          r.hora_nascimento,
        "local_nascimento":         r.local_nascimento,
        "provincia_nascimento":     r.provincia_nascimento,
        "distrito_nascimento":      r.distrito_nascimento,
        "nome_pai":                 r.nome_pai,
        "bi_pai":                   r.bi_pai,
        "naturalidade_pai":         r.naturalidade_pai,
        "estado_civil_pai":         r.estado_civil_pai,
        "paternidade_fixada":       r.paternidade_fixada,
        "nome_mae":                 r.nome_mae,
        "bi_mae":                   r.bi_mae,
        "naturalidade_mae":         r.naturalidade_mae,
        "estado_civil_mae":         r.estado_civil_mae,
        "avo_paterno":              r.avo_paterno,
        "avo_paterna":              r.avo_paterna,
        "avo_materno":              r.avo_materno,
        "avo_materna":              r.avo_materna,
        "nome_declarante":          r.nome_declarante,
        "bi_declarante":            r.bi_declarante,
        "estado_civil_declarante":  r.estado_civil_declarante,
        "residencia_declarante":    r.residencia_declarante,
        "relacao_declarante":       r.relacao_declarante,
        "canal_notificacao":        r.canal_notificacao,
        "total_notificacoes":       r.total_notificacoes,
        "data_recepcao":            str(r.data_recepcao),
        "data_confirmacao":         str(r.data_confirmacao) if r.data_confirmacao else None,
        "confirmado_por":           r.confirmado_por,
        "motivo_rejeicao":          r.motivo_rejeicao,
        "rejeitado_por":            r.rejeitado_por,
    }