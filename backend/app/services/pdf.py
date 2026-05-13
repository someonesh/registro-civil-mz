from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_JUSTIFY
from reportlab.lib.utils import simpleSplit
from reportlab.platypus import Paragraph
from reportlab.pdfgen import canvas
import os
import datetime

PDF_DIR = "/tmp/pdfs"
os.makedirs(PDF_DIR, exist_ok=True)

_EMBLEMA_PATH = os.path.join(os.path.dirname(__file__), "emblema.png")

MESES = {
    1: "Janeiro", 2: "Fevereiro", 3: "Março", 4: "Abril",
    5: "Maio", 6: "Junho", 7: "Julho", 8: "Agosto",
    9: "Setembro", 10: "Outubro", 11: "Novembro", 12: "Dezembro"
}

VERDE = colors.HexColor("#003F20")
CINZA = colors.HexColor("#4A5568")
CINZA_CLARO = colors.HexColor("#CBD5E0")


def _get_emblema_path():
    if os.path.exists(_EMBLEMA_PATH):
        return _EMBLEMA_PATH
    return None


def _parse_data(data):
    if isinstance(data, datetime.date):
        return str(data.day), MESES[data.month], str(data.year)
    partes = str(data).split("-")
    return partes[2], partes[1], partes[0]


def _cabecalho(c, w, h, emblema_path, titulo, ref=None):
    mg = 2.0 * cm
    if ref:
        c.setFont("Helvetica-Bold", 9)
        c.drawRightString(w - mg, h - 1.0 * cm, ref)
    if emblema_path and os.path.exists(emblema_path):
        ew = 2.4 * cm
        eh = 2.4 * cm
        c.drawImage(emblema_path, (w - ew) / 2, h - 1.3 * cm - eh,
            width=ew, height=eh, preserveAspectRatio=True, mask='auto')
    y = h - 4.7 * cm
    c.setFont("Times-Bold", 12)
    c.drawCentredString(w / 2, y, "República de Moçambique")
    y -= 0.6 * cm
    c.setFont("Times-Roman", 8.5)
    c.drawCentredString(w / 2, y, "Ministério da Justiça, Assuntos Constitucionais e Religiosos")
    y -= 0.8 * cm
    c.setFont("Times-Bold", 13)
    c.drawCentredString(w / 2, y, titulo)
    y -= 0.3 * cm
    c.setLineWidth(1.5)
    c.setStrokeColor(VERDE)
    c.line(mg, y, w - mg, y)
    c.setStrokeColor(colors.black)
    c.setLineWidth(0.5)
    y -= 0.6 * cm
    return y


def _campo(c, mg, linha_w, y, label, valor):
    c.setFont("Helvetica-Bold", 8)
    c.setFillColor(CINZA)
    c.drawString(mg, y, label + ":")
    c.setFillColor(colors.black)
    x = mg + c.stringWidth(label + ":", "Helvetica-Bold", 8) + 4
    if valor:
        c.setFont("Times-Bold", 9)
        c.drawString(x, y, str(valor))
    else:
        c.setDash(1, 3)
        c.line(x, y - 0.05 * cm, mg + linha_w, y - 0.05 * cm)
        c.setDash()
    return y - 0.52 * cm


def gerar_boletim_nascimento(
    registo,
    conservatoria="1ª Conservatória do Registo Civil da Beira",
    conservador="Dr. Rollins da Conceição Chanesa"
):
    path = os.path.join(PDF_DIR, f"boletim_nasc_{registo.nuic.replace('-', '_')}.pdf")
    emblema_path = _get_emblema_path()
    w, h = A4
    c = canvas.Canvas(path, pagesize=A4)
    mg = 2.0 * cm
    linha_w = w - 2 * mg
    nuic = registo.nuic or ""

    ref = f"A{nuic.replace('-', '').replace('MZ', '')[:9]}"
    y = _cabecalho(c, w, h, emblema_path, "BOLETIM DE NASCIMENTO", ref)

    # NUIC centrado em caixas
    y -= 0.3 * cm
    box_w = 0.75 * cm
    box_h = 0.75 * cm
    spacing = 0.02 * cm
    label = "NUIC:"
    c.setFont("Times-Bold", 10)
    label_w = c.stringWidth(label, "Times-Bold", 10)
    total_w = label_w + 0.3 * cm + len(nuic) * (box_w + spacing)
    x_inicio = (w - total_w) / 2
    c.drawString(x_inicio, y, label)
    x_nuic = x_inicio + label_w + 0.3 * cm
    for i, ch in enumerate(nuic):
        x = x_nuic + i * (box_w + spacing)
        c.setLineWidth(0.5)
        c.rect(x, y - 0.1 * cm, box_w, box_h)
        c.setFont("Times-Bold", 10)
        c.drawCentredString(x + box_w / 2, y + 0.05 * cm, ch)
    y -= 1.2 * cm

    # Dados para o corpo
    dia_str, mes_str, ano_str = _parse_data(registo.data_nascimento)
    data_txt = f"{dia_str} de {mes_str} de {ano_str}"
    sexo_txt = "Masculino" if registo.sexo == "M" else "Feminino"
    nome_completo = f"{registo.nome_completo or ''} {registo.apelidos or ''}".strip()
    hora = registo.hora_nascimento or ""
    hora_txt = hora.split(":")[0] if ":" in hora else hora
    min_txt = hora.split(":")[1] if ":" in hora else "00"

    # Corpo justificado
    estilo = ParagraphStyle(
        "corpo",
        fontName="Times-Roman",
        fontSize=10,
        leading=16,
        alignment=TA_JUSTIFY,
    )

    texto_html = (
        f"Conservatória de <b>{conservatoria}</b>, "
        f"Posto de Registo Civil da <b>Beira</b>.<br/><br/>"
        f"Às <b>{hora_txt}</b> horas e <b>{min_txt}</b> minutos do dia "
        f"<b>{data_txt}</b>, em <b>{registo.local_nascimento or ''}</b>, "
        f"nasceu um indivíduo do sexo <b>{sexo_txt}</b>, a quem foi atribuído "
        f"o nome completo de <b>{nome_completo}</b>.<br/><br/>"
        f"Filho(a) de <b>{registo.nome_pai or ''}</b> "
        f"e de <b>{registo.nome_mae or ''}</b>."
    )

    paragrafo = Paragraph(texto_html, estilo)
    _, altura = paragrafo.wrap(linha_w, 400)
    paragrafo.drawOn(c, mg, y - altura)
    y -= altura + 1.5 * cm

    # Data de emissão
    hoje = datetime.date.today()
    c.setFont("Times-Roman", 10)
    c.drawString(mg, y, f"Emitido aos {hoje.day} de {MESES[hoje.month]} de {hoje.year}")
    y -= 2.2 * cm

    c.drawCentredString(w / 2, y, "O(A) Conservador(a)")
    y -= 1.6 * cm
    c.setDash(1, 2)
    c.line(w / 2 - 5 * cm, y, w / 2 + 5 * cm, y)
    c.setDash()
    y -= 0.6 * cm
    c.setFont("Times-Italic", 10)
    c.drawCentredString(w / 2, y, conservador)
    y -= 0.5 * cm
    c.setFont("Times-Roman", 8)
    c.drawCentredString(w / 2, y, conservatoria)

    c.save()
    return path


def gerar_assento_nascimento(
    registo,
    conservatoria="1ª Conservatória do Registo Civil da Beira",
    conservador="Dr. Rollins da Conceição Chanesa"
):
    path = os.path.join(PDF_DIR, f"assento_nasc_{registo.numero_assento}.pdf")
    emblema_path = _get_emblema_path()
    w, h = A4
    c = canvas.Canvas(path, pagesize=A4)
    mg = 2.0 * cm
    linha_w = w - 2 * mg

    ref = f"Assento n.º {registo.numero_assento}"
    y = _cabecalho(c, w, h, emblema_path, "ASSENTO DE NASCIMENTO", ref)

    c.setFont("Times-Bold", 9)
    c.drawString(mg, y, f"Assento de Nascimento n.º {registo.numero_assento}")
    c.drawRightString(mg + linha_w, y, "Documento n.º ______  Maço n.º ______")
    y -= 0.7 * cm

    dia_str, mes_str, ano_str = _parse_data(registo.data_nascimento)
    nome = f"{registo.nome_completo or ''} {registo.apelidos or ''}".strip()

    y = _campo(c, mg, linha_w, y, "Nome completo", nome)
    y = _campo(c, mg, linha_w, y, "Apelidos", registo.apelidos or "")
    y = _campo(c, mg, linha_w, y, "Sexo", "Masculino" if registo.sexo == "M" else "Feminino")
    y = _campo(c, mg, linha_w, y, "Hora de nascimento", registo.hora_nascimento or "")
    y = _campo(c, mg, linha_w, y, "Dia", dia_str)
    y = _campo(c, mg, linha_w, y, "Mês", mes_str)
    y = _campo(c, mg, linha_w, y, "Ano", ano_str)
    y = _campo(c, mg, linha_w, y, "Distrito do lugar de nascimento", registo.distrito_nascimento or "")

    c.setFont("Times-Bold", 9)
    c.drawString(mg, y, "Pai")
    y -= 0.4 * cm
    y = _campo(c, mg, linha_w, y, "  Nome", registo.nome_pai or "")
    y = _campo(c, mg, linha_w, y, "  Estado civil", registo.estado_civil_pai or "")
    y = _campo(c, mg, linha_w, y, "  Naturalidade", registo.naturalidade_pai or "")

    c.setFont("Times-Bold", 9)
    c.drawString(mg, y, "Mãe")
    y -= 0.4 * cm
    y = _campo(c, mg, linha_w, y, "  Nome", registo.nome_mae or "")
    y = _campo(c, mg, linha_w, y, "  Estado civil", registo.estado_civil_mae or "")
    y = _campo(c, mg, linha_w, y, "  Naturalidade", registo.naturalidade_mae or "")

    c.setFont("Times-Bold", 9)
    c.drawString(mg, y, "Avós paternos")
    y -= 0.4 * cm
    y = _campo(c, mg, linha_w, y, "  Avô", registo.avo_paterno or "")
    y = _campo(c, mg, linha_w, y, "  Avó", registo.avo_paterna or "")

    c.setFont("Times-Bold", 9)
    c.drawString(mg, y, "Avós maternos")
    y -= 0.4 * cm
    y = _campo(c, mg, linha_w, y, "  Avô", registo.avo_materno or "")
    y = _campo(c, mg, linha_w, y, "  Avó", registo.avo_materna or "")

    c.setFont("Times-Bold", 9)
    c.drawString(mg, y, "Declarante")
    y -= 0.4 * cm
    y = _campo(c, mg, linha_w, y, "  Nome", registo.nome_declarante or "")
    y = _campo(c, mg, linha_w, y, "  Estado civil", registo.estado_civil_declarante or "")
    y = _campo(c, mg, linha_w, y, "  Residência habitual", registo.residencia_declarante or "")

    y -= 0.3 * cm
    estilo = ParagraphStyle(
        "corpo_assento",
        fontName="Times-Roman",
        fontSize=9,
        leading=14,
        alignment=TA_JUSTIFY,
    )
    texto_conf = (
        f"Este assento lavrado com base nos documentos apresentados e conferido, depois de lido "
        f"vai ser assinado pelo declarante e por mim, <b>{conservador}</b>, "
        f"Conservador da {conservatoria}."
    )
    p = Paragraph(texto_conf, estilo)
    _, alt = p.wrap(linha_w, 200)
    p.drawOn(c, mg, y - alt)
    y -= alt + 0.5 * cm

    hoje = datetime.date.today()
    c.setFont("Times-Roman", 9)
    c.drawString(mg, y, f"No dia {hoje.day} do mês de {MESES[hoje.month]} do ano de {hoje.year}")
    y -= 1.2 * cm

    c.setDash(1, 3)
    c.line(mg, y, mg + 5 * cm, y)
    c.line(mg + linha_w - 5 * cm, y, mg + linha_w, y)
    c.setDash()
    y -= 0.3 * cm
    c.setFont("Times-Roman", 8)
    c.drawCentredString(mg + 2.5 * cm, y, "O(A) Declarante")
    c.drawCentredString(mg + linha_w - 2.5 * cm, y, "O(A) Conservador(a)")

    y -= 0.8 * cm
    c.setFont("Helvetica-Bold", 8)
    c.setFillColor(CINZA)
    c.drawString(mg, y, "AVERBAMENTOS:")
    c.setFillColor(colors.black)
    y -= 0.4 * cm
    for _ in range(4):
        c.setDash(1, 3)
        c.line(mg, y, mg + linha_w, y)
        c.setDash()
        y -= 0.45 * cm

    y -= 0.2 * cm
    c.setFont("Times-Roman", 8)
    c.drawString(mg, y, "Registado no Diário sob o n.º _____")
    c.drawRightString(mg + linha_w, y, "Cédula n.º _____")

    c.save()
    return path


def gerar_assento_obito(
    registo,
    conservatoria="1ª Conservatória do Registo Civil da Beira",
    conservador="Dr. Rollins da Conceição Chanesa"
):
    path = os.path.join(PDF_DIR, f"assento_obito_{registo.numero_assento}.pdf")
    emblema_path = _get_emblema_path()
    w, h = A4
    c = canvas.Canvas(path, pagesize=A4)
    mg = 2.0 * cm
    linha_w = w - 2 * mg

    ref = f"Assento n.º {registo.numero_assento}"
    y = _cabecalho(c, w, h, emblema_path, "ASSENTO DE ÓBITO", ref)

    c.setFont("Times-Bold", 9)
    c.drawString(mg, y, f"Assenta de Óbito n.º {registo.numero_assento}")
    c.drawRightString(mg + linha_w, y, "Doc. n.º ______  Maço n.º ______")
    y -= 0.7 * cm

    dia_str, mes_str, ano_str = _parse_data(registo.dia_falecimento)

    y = _campo(c, mg, linha_w, y, "Nome completo", registo.nome_completo)
    y = _campo(c, mg, linha_w, y, "Sexo", "Masculino" if registo.sexo == "M" else "Feminino")
    y = _campo(c, mg, linha_w, y, "Idade", f"{registo.idade} anos" if registo.idade else "")
    y = _campo(c, mg, linha_w, y, "Estado civil", registo.estado_civil or "")
    y = _campo(c, mg, linha_w, y, "Naturalidade d", registo.naturalidade or "")
    y = _campo(c, mg, linha_w, y, "Localidade d", registo.localidade_naturalidade or "")
    y = _campo(c, mg, linha_w, y, "Província d", registo.provincia_naturalidade or "")
    y = _campo(c, mg, linha_w, y, "Última residência habitual", registo.ultima_residencia or "")
    y = _campo(c, mg, linha_w, y, "Localidade d", registo.localidade_residencia or "")
    y = _campo(c, mg, linha_w, y, "Província d", registo.provincia_residencia or "")
    y = _campo(c, mg, linha_w, y, "Filho(a) de", registo.nome_pai_falecido or "")
    y = _campo(c, mg, linha_w, y, "e de", registo.nome_mae_falecida or "")

    y -= 0.2 * cm
    y = _campo(c, mg, linha_w, y, "Hora do falecimento", registo.hora_falecimento or "")
    y = _campo(c, mg, linha_w, y, "Dia", dia_str)
    y = _campo(c, mg, linha_w, y, "Mês", mes_str)
    y = _campo(c, mg, linha_w, y, "Ano", ano_str)
    y = _campo(c, mg, linha_w, y, "Lugar", registo.local_falecimento or "")
    y = _campo(c, mg, linha_w, y, "Localidade d", registo.localidade_falecimento or "")
    y = _campo(c, mg, linha_w, y, "Província d", registo.provincia_falecimento or "")
    y = _campo(c, mg, linha_w, y, "Causa da morte", registo.causa_morte or "")

    y -= 0.2 * cm
    c.setFont("Times-Bold", 9)
    c.drawString(mg, y, "DECLARANTE,")
    y -= 0.5 * cm
    y = _campo(c, mg, linha_w, y, "Nome", registo.nome_declarante or "")
    y = _campo(c, mg, linha_w, y, "Estado civil", registo.estado_civil_declarante or "")
    y = _campo(c, mg, linha_w, y, "Residência", registo.residencia_declarante or "")

    y -= 0.2 * cm
    cem = registo.cemiterio or "—"
    herd = registo.herdeiros or "Não declarado"
    bens = "Sim" if registo.bens_inventario else "Não deixa"
    test = "Sim" if registo.testamento else "Não deixa"

    estilo = ParagraphStyle(
        "corpo_obito",
        fontName="Times-Roman",
        fontSize=9,
        leading=14,
        alignment=TA_JUSTIFY,
    )

    texto_html = (
        f"O(a) falecido(a), cujo cadáver vai ser sepultado no cemitério de <b>{cem}</b>. "
        f"Herdeiros: <b>{herd}</b>. "
        f"Bens sujeitos a inventário obrigatório: <b>{bens}</b>. "
        f"Testamento: <b>{test}</b>.<br/><br/>"
        f"Este assento lavrado com base na declaração apresentada pelo Hospital e conferido, "
        f"depois de lido vai ser assinado pelo declarante e por mim, <b>{conservador}</b>, "
        f"substituto do Conservador da {conservatoria}."
    )

    p = Paragraph(texto_html, estilo)
    _, alt = p.wrap(linha_w, 300)
    p.drawOn(c, mg, y - alt)
    y -= alt + 0.5 * cm

    hoje = datetime.date.today()
    c.setFont("Times-Roman", 9)
    c.drawString(mg, y, f"No dia {hoje.day} do mês de {MESES[hoje.month]} do ano de {hoje.year}")
    y -= 0.4 * cm
    c.drawString(mg, y, f"Boletim n.º {registo.boletim_hospital or '—'}")
    y -= 1.0 * cm

    c.setDash(1, 3)
    c.line(mg, y, mg + 5 * cm, y)
    c.line(mg + linha_w - 5 * cm, y, mg + linha_w, y)
    c.setDash()
    y -= 0.3 * cm
    c.setFont("Times-Roman", 8)
    c.drawCentredString(mg + 2.5 * cm, y, "O(A) Declarante")
    c.drawCentredString(mg + linha_w - 2.5 * cm, y, "O(A) Conservador(a)")

    y -= 1.0 * cm
    c.setStrokeColor(CINZA_CLARO)
    c.circle(mg + 2 * cm, y, 1.0 * cm)
    c.setFont("Times-Roman", 6)
    c.setFillColor(CINZA_CLARO)
    c.drawCentredString(mg + 2 * cm, y - 0.15 * cm, "CARIMBO")
    c.setFillColor(colors.black)
    c.setStrokeColor(colors.black)

    c.setFont("Helvetica-Bold", 8)
    c.setFillColor(CINZA)
    c.drawRightString(mg + linha_w, y + 1.5 * cm, "AVERBAMENTOS")
    c.setFillColor(colors.black)
    y2 = y + 1.2 * cm
    for _ in range(5):
        c.setDash(1, 3)
        c.line(mg + linha_w - 6 * cm, y2, mg + linha_w, y2)
        c.setDash()
        y2 -= 0.4 * cm

    c.save()
    return path