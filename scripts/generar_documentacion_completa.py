from __future__ import annotations

import re
import shutil
from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "DOCUMENTACION-COMPLETA-EFFICIENT-PARKING.docx"
DIAGRAMS = ROOT / "docs" / "diagramas"
EVIDENCE = ROOT / "docs" / "evidencias"
CURRENT_STATUS = (
    "Estado comprobado el 23 de octubre de 2026 tras redesplegar: el App Service "
    "efficient-parking-3126533e en Azure responde 200 en /health, / , /login y "
    "/student; la web ya no apunta a localhost; el login de administración "
    "devuelve token y /api/dashboard/overview responde 200. Una falla previa "
    "(Cannot find module 'dotenv' en arranques en frío) se resolvió al "
    "redesplegar. El plan es B1 y puede generar cargos. El APK existe como "
    "release, pero no se ha probado en un teléfono físico. El asistente IA "
    "responde 503 con sesión mientras no se configure AI_API_KEY."
)
OLD_STATUS = {
    "El intento anterior de crear el servicio gratuito en Azure terminó con el sitio deshabilitado por `QuotaExceeded`; Azure devolvió “Site Disabled”. La web y la API **no están publicadas de manera funcional** y no se produjo un APK. La cuenta de prueba mencionada en el historial anterior reside en una base local, ignorada por Git, no en una base de datos pública. No presentar el sitio como desplegado ni distribuir una dirección como si estuviera activa.":
        CURRENT_STATUS,
    "Implementado para desarrollo local; Azure no está operativo": "Implementado y desplegado en Azure; /health responde 200 tras el redespliegue",
    "Pendiente: la instancia Azure quedó `QuotaExceeded`": "Desplegado en Azure; verificado /health, login de administración y dashboard",
    "Pendientes: no hay URL operativa ni APK generado en este estado": "URL y APK publicados; la instalación del APK en teléfono no está verificada",
    "Azure muestra Site Disabled/QuotaExceeded. No insistir con despliegues idénticos ni escoger plan de pago. Confirmar cuota con Azure; el sitio no es un servicio público mientras siga deshabilitado.":
        "Azure respondió 200 tras redesplegar. El plan B1 puede generar costo; revisar Cost Management y repetir las pruebas de salud antes de presentar.",
    "¿El proyecto ya está en Azure? Se intentó publicar con App Service F1 en Mexico Central, pero Azure deshabilitó el sitio por cuota (`QuotaExceeded`). No existe una URL operativa confirmada ni APK generado en este estado.":
        "¿El proyecto ya está en Azure? Sí: https://efficient-parking-3126533e.azurewebsites.net respondió 200 en /health, /login y el dashboard tras redesplegar. El APK está publicado, sin prueba de instalación física.",
}
forbidden_status_fragments = (
    "La cuenta es Azure for Students y la región México Central se eligió dentro de las regiones permitidas.",
)


def replace_status(text: str) -> str:
    previous = {
        "La arquitectura existe; el servicio de Azure no respondió en la última comprobación": "Implementado y desplegado en Azure; /health responde 200 tras el redespliegue",
        "Recursos creados; el último despliegue falló con Kudu HTTP 502": "Desplegado en Azure; verificado /health, login de administración y dashboard",
        "URL y APK publicados; la disponibilidad de Azure y la instalación en teléfono no están verificadas": "URL y APK publicados; la instalación del APK en teléfono no está verificada",
    }
    if text in previous:
        return previous[text]
    if text.startswith("Estado comprobado el 23 de octubre de 2026: existe el App Service"):
        return CURRENT_STATUS
    if text.startswith("Azure devolvió HTTP 502 en el último despliegue"):
        return "Azure respondió 200 tras redesplegar. El plan B1 puede generar costo; revisar Cost Management y repetir las pruebas de salud antes de presentar."
    if text.startswith("¿El proyecto ya está en Azure? Existe la URL"):
        return "¿El proyecto ya está en Azure? Sí: https://efficient-parking-3126533e.azurewebsites.net respondió 200 en /health, /login y el dashboard tras redesplegar. El APK está publicado, sin prueba de instalación física."
    for old, new in OLD_STATUS.items():
        text = text.replace(old, new)
    if "QuotaExceeded" in text or "Site Disabled" in text:
        return CURRENT_STATUS
    if any(fragment in text for fragment in forbidden_status_fragments):
        return CURRENT_STATUS
    return text


def replace_paragraph(paragraph) -> None:
    updated = replace_status(paragraph.text)
    if updated != paragraph.text:
        paragraph.clear()
        paragraph.add_run(updated)


def replace_document_status(document) -> None:
    for paragraph in document.paragraphs:
        replace_paragraph(paragraph)
    for table in document.tables:
        for row in table.rows:
            for cell in row.cells:
                for paragraph in cell.paragraphs:
                    replace_paragraph(paragraph)


def hex_color(value: str) -> RGBColor:
    return RGBColor.from_string(value)


def shade_cell(cell, fill: str) -> None:
    properties = cell._tc.get_or_add_tcPr()
    shading = OxmlElement("w:shd")
    shading.set(qn("w:fill"), fill)
    properties.append(shading)


def set_cell_text(cell, text: str, *, bold: bool = False, color: str = "14243A", size: int = 9) -> None:
    cell.text = ""
    paragraph = cell.paragraphs[0]
    paragraph.paragraph_format.space_after = Pt(2)
    run = paragraph.add_run(str(text))
    run.bold = bold
    run.font.name = "Arial"
    run.font.size = Pt(size)
    run.font.color.rgb = hex_color(color)
    cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.CENTER


def add_table(document, headers: list[str], rows: list[list[str]], widths: list[float] | None = None) -> None:
    table = document.add_table(rows=1, cols=len(headers))
    table.style = "Table Grid"
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = True
    for index, label in enumerate(headers):
        set_cell_text(table.rows[0].cells[index], label, bold=True, color="FFFFFF", size=9)
        shade_cell(table.rows[0].cells[index], "17365D")
    for row_index, row in enumerate(rows):
        cells = table.add_row().cells
        for index, value in enumerate(row):
            set_cell_text(cells[index], value, size=9)
            if row_index % 2 == 1:
                shade_cell(cells[index], "F0F5FA")
    if widths:
        for row in table.rows:
            for cell, width in zip(row.cells, widths):
                cell.width = Inches(width)
    document.add_paragraph().paragraph_format.space_after = Pt(0)


def add_field(paragraph, instruction: str) -> None:
    field = OxmlElement("w:fldSimple")
    field.set(qn("w:instr"), instruction)
    paragraph._p.append(field)


def set_font(run, size: int = 11, bold: bool = False, color: str = "24364B") -> None:
    run.font.name = "Arial"
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = hex_color(color)


def add_body(document, text: str, *, italic: bool = False) -> None:
    paragraph = document.add_paragraph()
    paragraph.paragraph_format.line_spacing = 1.35
    paragraph.paragraph_format.space_after = Pt(6)
    paragraph.paragraph_format.widow_control = True
    run = paragraph.add_run(text)
    set_font(run, 11, color="24364B")
    run.italic = italic


def add_bullets(document, items: list[str]) -> None:
    for item in items:
        paragraph = document.add_paragraph(style="List Bullet")
        paragraph.paragraph_format.space_after = Pt(3)
        paragraph.paragraph_format.line_spacing = 1.15
        run = paragraph.add_run(item)
        set_font(run, 10)


def add_numbered(document, items: list[str]) -> None:
    for item in items:
        paragraph = document.add_paragraph(style="List Number")
        paragraph.paragraph_format.space_after = Pt(3)
        paragraph.paragraph_format.line_spacing = 1.15
        run = paragraph.add_run(item)
        set_font(run, 10)


def heading(document, text: str, level: int = 1) -> None:
    paragraph = document.add_heading(text, level=level)
    paragraph.paragraph_format.keep_with_next = True
    paragraph.paragraph_format.space_before = Pt(10 if level == 1 else 7)
    paragraph.paragraph_format.space_after = Pt(5)


def caption(document, text: str) -> None:
    paragraph = document.add_paragraph()
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    paragraph.paragraph_format.space_after = Pt(7)
    run = paragraph.add_run(text)
    run.italic = True
    set_font(run, 9, color="53677D")


def image_font(size: int, bold: bool = False):
    candidates = [
        Path("C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf"),
        Path("C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


def draw_rounded(draw, box, label: str, fill: str = "#EAF2F8", outline: str = "#2563EB", font=None):
    draw.rounded_rectangle(box, radius=22, fill=fill, outline=outline, width=4)
    x1, y1, x2, y2 = box
    font = font or image_font(25)
    bounds = draw.multiline_textbbox((0, 0), label, font=font, align="center", spacing=6)
    width = bounds[2] - bounds[0]
    height = bounds[3] - bounds[1]
    draw.multiline_text(((x1 + x2 - width) / 2, (y1 + y2 - height) / 2), label, fill="#14243A", font=font, align="center", spacing=6)


def arrow(draw, start: tuple[int, int], end: tuple[int, int], color: str = "#64748B", width: int = 4):
    draw.line((start, end), fill=color, width=width)
    from math import atan2, cos, sin

    angle = atan2(end[1] - start[1], end[0] - start[0])
    length = 18
    left = (end[0] - length * cos(angle - 0.48), end[1] - length * sin(angle - 0.48))
    right = (end[0] - length * cos(angle + 0.48), end[1] - length * sin(angle + 0.48))
    draw.polygon((end, left, right), fill=color)


def create_flow_diagram(path: Path) -> None:
    image = Image.new("RGB", (1800, 1250), "white")
    draw = ImageDraw.Draw(image)
    title = image_font(38, True)
    regular = image_font(25)
    draw.text((70, 35), "Flujo de reserva y validacion QR", fill="#17365D", font=title)
    nodes = [
        ((120, 130, 670, 245), "Estudiante: inicia sesion"),
        ((120, 310, 670, 425), "API: valida credenciales y rol"),
        ((120, 490, 670, 605), "Estudiante: selecciona zona y cupo"),
        ((120, 670, 670, 785), "API y SQLite: crean reserva\nactiva por 15 minutos"),
        ((120, 850, 670, 965), "App muestra reserva y codigo QR"),
        ((990, 670, 1540, 785), "Seguridad escanea el codigo"),
        ((990, 850, 1540, 965), "API busca una reserva activa\npara cedula y espacio"),
    ]
    for box, text in nodes:
        draw_rounded(draw, box, text, font=regular)
    for y in (245, 425, 605, 785):
        arrow(draw, (395, y), (395, y + 65))
    arrow(draw, (670, 907), (990, 727))
    arrow(draw, (1265, 785), (1265, 850))
    decision = [(1265, 1015), (1420, 1095), (1265, 1175), (1110, 1095)]
    draw.polygon(decision, fill="#FFF4D6", outline="#D97706")
    draw.line(decision + [decision[0]], fill="#D97706", width=4)
    draw.multiline_text((1192, 1072), "¿Activa?", fill="#14243A", font=regular, align="center")
    arrow(draw, (1265, 965), (1265, 1015))
    draw_rounded(draw, (680, 1040, 990, 1170), "Acceso\npermitido", fill="#E5F5ED", outline="#0E9F6E", font=regular)
    draw_rounded(draw, (1540, 1040, 1760, 1170), "Acceso\ndenegado", fill="#FDECEC", outline="#C2413B", font=regular)
    arrow(draw, (1110, 1095), (990, 1095), "#0E9F6E")
    arrow(draw, (1420, 1095), (1540, 1095), "#C2413B")
    draw.text((1015, 1055), "Si", fill="#0E9F6E", font=regular)
    draw.text((1440, 1055), "No", fill="#C2413B", font=regular)
    image.save(path)


def create_class_diagram(path: Path) -> None:
    image = Image.new("RGB", (1800, 1100), "white")
    draw = ImageDraw.Draw(image)
    title = image_font(38, True)
    font = image_font(24)
    small = image_font(21)
    draw.text((70, 35), "Diagrama de clases del dominio", fill="#17365D", font=title)

    def class_box(box, name, fields):
        x1, y1, x2, y2 = box
        draw.rectangle(box, fill="#F7FAFC", outline="#2563EB", width=4)
        draw.rectangle((x1, y1, x2, y1 + 55), fill="#17365D")
        draw.text((x1 + 18, y1 + 12), name, fill="white", font=font)
        draw.multiline_text((x1 + 18, y1 + 70), "\n".join(fields), fill="#24364B", font=small, spacing=9)

    user = (80, 160, 520, 430)
    zone = (690, 160, 1120, 380)
    space = (1290, 160, 1710, 380)
    reservation = (690, 610, 1160, 920)
    event = (1290, 650, 1710, 900)
    class_box(user, "User", ["id: integer", "cedula: texto unico", "name: texto", "password_hash: hash", "role: student/admin/security/visitor", "plate, vehicle_type, created_at"])
    class_box(zone, "Zone", ["id: integer", "name: texto", "vehicle_type", "capacity: integer"])
    class_box(space, "ParkingSpace", ["id: integer", "zone_id: FK", "number: entero", "UNIQUE(zone_id, number)"])
    class_box(reservation, "Reservation", ["id: integer", "user_id: FK", "space_id: FK", "status: active/cancelled/completed/expired", "created_at, expires_at, ended_at"])
    class_box(event, "ParkingEvent", ["id: integer", "reservation_id: FK", "event_type", "created_at"])
    arrow(draw, (520, 300), (690, 720))
    arrow(draw, (1120, 270), (1290, 270))
    arrow(draw, (1490, 380), (980, 610))
    arrow(draw, (1160, 770), (1290, 770))
    draw.text((515, 460), "1 a muchos", fill="#53677D", font=small)
    draw.text((1120, 225), "1 a muchos", fill="#53677D", font=small)
    draw.text((1200, 480), "1 a muchos historicos", fill="#53677D", font=small)
    draw.text((1165, 720), "1 a muchos", fill="#53677D", font=small)
    image.save(path)


def create_erd(path: Path) -> None:
    image = Image.new("RGB", (1800, 1200), "white")
    draw = ImageDraw.Draw(image)
    title = image_font(38, True)
    header = image_font(24, True)
    field = image_font(21)
    draw.text((70, 35), "Modelo entidad-relacion SQLite", fill="#17365D", font=title)

    entities = {
        "users": (60, 140, 550, 500, ["PK id", "UQ cedula", "name", "password_hash", "role", "plate", "vehicle_type", "created_at"]),
        "zones": (680, 140, 1110, 410, ["PK id", "name", "vehicle_type", "capacity"]),
        "parking_spaces": (1270, 140, 1740, 410, ["PK id", "FK zone_id", "number", "UQ zone_id + number"]),
        "reservations": (640, 650, 1190, 1080, ["PK id", "FK user_id", "FK space_id", "status", "created_at", "expires_at", "ended_at", "Indice unico parcial activo"]),
        "parking_events": (1320, 680, 1760, 970, ["PK id", "FK reservation_id", "event_type", "created_at"]),
    }
    for name, (x1, y1, x2, y2, fields) in entities.items():
        draw.rectangle((x1, y1, x2, y2), fill="#F7FAFC", outline="#2563EB", width=4)
        draw.rectangle((x1, y1, x2, y1 + 55), fill="#17365D")
        draw.text((x1 + 16, y1 + 12), name, fill="white", font=header)
        draw.multiline_text((x1 + 18, y1 + 74), "\n".join(fields), fill="#24364B", font=field, spacing=8)
    arrow(draw, (1110, 300), (1270, 300))
    arrow(draw, (350, 500), (750, 650))
    arrow(draw, (1490, 410), (1060, 650))
    arrow(draw, (1190, 820), (1320, 820))
    draw.text((1120, 265), "1 : N", fill="#53677D", font=field)
    draw.text((560, 560), "1 : N", fill="#53677D", font=field)
    draw.text((1160, 510), "1 : N", fill="#53677D", font=field)
    draw.text((1210, 780), "1 : N", fill="#53677D", font=field)
    image.save(path)


def create_use_cases(path: Path) -> None:
    image = Image.new("RGB", (1800, 1150), "white")
    draw = ImageDraw.Draw(image)
    title = image_font(38, True)
    font = image_font(22)
    small = image_font(20)
    draw.text((70, 35), "Diagrama de casos de uso", fill="#17365D", font=title)
    system = (330, 130, 1470, 1070)
    draw.rounded_rectangle(system, radius=25, fill="#FBFDFF", outline="#64748B", width=4)
    draw.text((370, 145), "Eficient Parking Lot", fill="#17365D", font=font)
    actors = [(140, 330, "Estudiante"), (140, 790, "Seguridad"), (1630, 560, "Administracion")]
    for x, y, label in actors:
        draw.ellipse((x + 38, y, x + 78, y + 40), outline="#17365D", width=4)
        draw.line((x + 58, y + 40, x + 58, y + 125), fill="#17365D", width=4)
        draw.line((x + 15, y + 70, x + 101, y + 70), fill="#17365D", width=4)
        draw.line((x + 58, y + 125, x + 20, y + 180), fill="#17365D", width=4)
        draw.line((x + 58, y + 125, x + 96, y + 180), fill="#17365D", width=4)
        draw.text((x - 5, y + 190), label, fill="#24364B", font=small)
    cases = [
        ((510, 235, 890, 325), "Registrarse e iniciar sesion"),
        ((970, 235, 1330, 325), "Consultar disponibilidad"),
        ((510, 390, 890, 480), "Reservar y cancelar"),
        ((970, 390, 1330, 480), "Consultar historial"),
        ((510, 560, 890, 650), "Validar codigo QR"),
        ((970, 560, 1330, 650), "Buscar persona/placa"),
        ((510, 730, 890, 820), "Asignar espacio"),
        ((970, 730, 1330, 820), "Gestionar visitantes"),
        ((720, 900, 1110, 990), "Consultar dashboard"),
    ]
    for box, label in cases:
        draw.ellipse(box, fill="#EAF2F8", outline="#2563EB", width=3)
        x1, y1, x2, y2 = box
        bounds = draw.multiline_textbbox((0, 0), label, font=small, align="center")
        draw.text(((x1 + x2 - (bounds[2] - bounds[0])) / 2, (y1 + y2 - (bounds[3] - bounds[1])) / 2), label, fill="#14243A", font=small, align="center")
    student_origin = (245, 390)
    for target in ((510, 280), (510, 435), (970, 280), (970, 435)):
        draw.line((student_origin, target), fill="#94A3B8", width=3)
    security_origin = (245, 850)
    for target in ((510, 605), (510, 775), (970, 605), (970, 775)):
        draw.line((security_origin, target), fill="#94A3B8", width=3)
    admin_origin = (1630, 650)
    for target in ((1330, 605), (1330, 775), (1110, 945)):
        draw.line((admin_origin, target), fill="#94A3B8", width=3)
    image.save(path)


def set_document_styles(document) -> None:
    section = document.sections[0]
    section.page_width = Inches(8.27)
    section.page_height = Inches(11.69)
    section.top_margin = Inches(0.78)
    section.bottom_margin = Inches(0.78)
    section.left_margin = Inches(0.9)
    section.right_margin = Inches(0.9)
    for style_name in ("Normal", "Body Text"):
        style = document.styles[style_name]
        style.font.name = "Arial"
        style.font.size = Pt(11)
        style.font.color.rgb = hex_color("24364B")
        style.paragraph_format.line_spacing = 1.3
        style.paragraph_format.space_after = Pt(6)
    for name, size, color in (
        ("Title", 27, "17365D"),
        ("Heading 1", 17, "17365D"),
        ("Heading 2", 13, "1F7A8C"),
        ("Heading 3", 11, "2563EB"),
    ):
        style = document.styles[name]
        style.font.name = "Arial"
        style.font.size = Pt(size)
        style.font.bold = True
        style.font.color.rgb = hex_color(color)
    for sec in document.sections:
        header = sec.header.paragraphs[0]
        header.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        run = header.add_run("EFICIENT PARKING LOT  |  DOCUMENTACIÓN INTEGRAL")
        set_font(run, 8, color="64748B")
        footer = sec.footer.paragraphs[0]
        footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = footer.add_run("Universidad de Cundinamarca  ·  Página ")
        set_font(run, 8, color="64748B")
        add_field(footer, "PAGE")


def add_cover(document) -> None:
    for _ in range(3):
        document.add_paragraph()
    paragraph = document.add_paragraph()
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = paragraph.add_run("UNIVERSIDAD DE CUNDINAMARCA")
    set_font(run, 15, True, "17365D")
    paragraph = document.add_paragraph()
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = paragraph.add_run("DOCUMENTACIÓN INTEGRAL DEL PROYECTO")
    set_font(run, 14, True, "53677D")
    paragraph = document.add_paragraph()
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    paragraph.paragraph_format.space_before = Pt(30)
    paragraph.paragraph_format.space_after = Pt(18)
    run = paragraph.add_run("EFFICIENT PARKING LOT")
    set_font(run, 30, True, "17365D")
    paragraph = document.add_paragraph()
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = paragraph.add_run("Aplicación web y Android para la gestión de parqueaderos universitarios")
    set_font(run, 16, color="1F7A8C")
    for _ in range(4):
        document.add_paragraph()
    for text in (
        "Propuesta, análisis, diseño, implementación, pruebas y manual de operación",
        "Universidad de Cundinamarca · Girardot, Colombia",
        "Versión documental 1.0 · 23 de octubre de 2026",
    ):
        paragraph = document.add_paragraph()
        paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = paragraph.add_run(text)
        set_font(run, 11, color="53677D")
    document.add_page_break()


def add_toc_page(document) -> None:
    heading(document, "Contenido", 1)
    items = [
        "Resumen ejecutivo y estado verificado de la entrega",
        "1. Contexto, problema, objetivos y justificación",
        "2. Alcance, actores y requisitos",
        "3. Metodología, arquitectura y decisiones tecnológicas",
        "4. Flujos funcionales por rol",
        "5. Diagramas: flujo, clases, entidad-relación y casos de uso",
        "6. Modelo de datos y diccionario",
        "7. API y contratos de respuesta",
        "8. Dashboard y análisis exploratorio",
        "9. Asistente IA e Industria 5.0",
        "10. Seguridad, privacidad y riesgos",
        "11. Pruebas, criterios de aceptación y resultados",
        "12. Despliegue, APK y operación",
        "13. Manuales de usuario",
        "14. Limitaciones, mejoras y conclusiones",
        "15. Evidencias de ejecución local",
        "Anexo A. Anteproyecto y fundamentos",
        "Anexo B. Guía de estudio completa",
        "Anexo C. Referencias y glosario",
    ]
    add_numbered(document, items)
    add_body(document, "El estado de despliegue indicado en el resumen y en el capítulo 12 es el más reciente. Los anexos conservan el material académico de origen; si una sección histórica difiere del estado técnico actual, prevalece la actualización fechada del resumen ejecutivo.")
    document.add_page_break()


def add_current_status(document) -> None:
    heading(document, "Resumen ejecutivo y estado verificado", 1)
    add_body(document, "Eficient Parking Lot es un prototipo para que estudiantes consulten cupos y gestionen reservas, mientras los equipos de seguridad y administración coordinan ocupación, visitantes y seguimiento. La aplicación comparte una API HTTP de Node.js/Express entre el cliente Expo para web y Android. El servidor aplica autenticación y permisos y utiliza SQLite como persistencia.")
    add_body(document, "El dominio sembrado incluye cinco zonas y 125 espacios: Administrativa (25), Biblioteca (20), Auditorio (20), Cafetería (30) y Laboratorios (30). Las tres primeras admiten automóviles y las dos restantes motocicletas. Los datos de la base local usados en las capturas son sintéticos y no describen demanda universitaria real.")
    add_table(document, ["Elemento", "Estado observado", "Límite de la evidencia"], [
        ["Azure App Service", "URL efficient-parking-3126533e.azurewebsites.net; tras el redespliegue /health, /login y /student responden 200.", "Plan B1 con posible costo; sin alta disponibilidad."],
        ["Plan", "La instancia se cambió de F1 a B1.", "B1 puede generar cargos; revisar Azure Cost Management."],
        ["APK", "Release apk-latest disponible en GitHub.", "No se instaló en un teléfono físico; API pública no está disponible ahora."],
        ["Dashboard", "Métricas, tendencia 14 días y desglose por zona/rol en el código.", "La evidencia visual usa datos locales sintéticos."],
        ["Asistente IA", "Endpoint valida entrada y JSON de respuesta.", "No hay AI_API_KEY configurada; en producción devuelve 503."],
    ])
    add_body(document, "La corrección de configuración de frontend selecciona una URL relativa en exportaciones de producción cuando no se pasa una variable explícita. La exportación web local se comprobó y ya no contiene la dirección localhost. La carga de esa versión en Azure falló; por ello, una corrección comprobada en el paquete local no equivale a una corrección activa en el sitio.")


def add_chapter(document, title: str, paragraphs: list[str], *, bullets: list[str] | None = None, table: tuple[list[str], list[list[str]]] | None = None) -> None:
    document.add_page_break()
    heading(document, title, 1)
    for paragraph in paragraphs:
        add_body(document, paragraph)
    if bullets:
        add_bullets(document, bullets)
    if table:
        add_table(document, table[0], table[1])


def add_figure_page(document, title: str, path: Path, explanation: str) -> None:
    document.add_page_break()
    heading(document, title, 1)
    add_body(document, explanation)
    document.add_picture(str(path), width=Inches(6.35))
    caption(document, title)


def crop_mobile_screenshot(source: Path) -> Path:
    image = Image.open(source).convert("RGB")
    pixels = image.load()
    width, height = image.size
    visible = Image.new("1", image.size)
    mask = visible.load()
    for y in range(height):
        for x in range(width):
            red, green, blue = pixels[x, y]
            mask[x, y] = max(red, green, blue) < 238 or min(red, green, blue) < 145
    bounds = visible.getbbox()
    if not bounds:
        return source
    left, top, right, bottom = bounds
    cropped = image.crop((left, top, min(width, right + 8), min(height, bottom + 8)))
    if cropped.width < 500:
        scaled_height = round(cropped.height * 3)
        cropped = cropped.resize((cropped.width * 3, scaled_height), Image.Resampling.LANCZOS)
    target = source.with_name(f"{source.stem}-recortada.png")
    cropped.save(target)
    return target


def add_source_doc(document, source_path: Path, title: str, word_target: int = 175) -> int:
    source = Document(source_path)
    replace_document_status(source)
    heading(document, title, 1)
    current_words = 0
    inserted_breaks = 0
    body = source.element.body
    for element in body.iterchildren():
        if element.tag == qn("w:p"):
            from docx.text.paragraph import Paragraph

            paragraph = Paragraph(element, source)
            text = replace_status(paragraph.text).strip()
            if not text:
                continue
            count = len(re.findall(r"\w+", text, flags=re.UNICODE))
            if current_words and current_words + count > word_target:
                document.add_page_break()
                inserted_breaks += 1
                current_words = 0
            style_name = paragraph.style.name if paragraph.style else ""
            if style_name.startswith("Heading") or style_name == "Title":
                level_match = re.search(r"(\d+)$", style_name)
                level = max(1, min(3, int(level_match.group(1)) if level_match else 2))
                heading(document, text, level)
            else:
                add_body(document, text)
            current_words += count
        elif element.tag == qn("w:tbl"):
            from docx.table import Table

            source_table = Table(element, source)
            rows = [[cell.text.replace("\n", " ").strip() for cell in row.cells] for row in source_table.rows]
            rows = [row for row in rows if any(row)]
            if not rows:
                continue
            count = sum(len(re.findall(r"\w+", cell, flags=re.UNICODE)) for row in rows for cell in row)
            if current_words and current_words + count > word_target:
                document.add_page_break()
                inserted_breaks += 1
                current_words = 0
            headers, data = rows[0], rows[1:]
            add_table(document, headers, data)
            current_words += count
    return inserted_breaks


def update_existing_guide() -> None:
    path = ROOT / "GUIA-DE-ESTUDIO.docx"
    document = Document(path)
    replace_document_status(document)
    document.save(path)


def add_manual_screens(document) -> None:
    items = [
        ("Pantalla de inicio de sesión", EVIDENCE / "login.png", "Formulario web real servido por la API local. La captura se tomó sin credenciales; la contraseña aparece solo como marcador visual.", False),
        ("Vista de estudiante", EVIDENCE / "student.png", "Pantalla de estudiante ejecutada en navegador local. Las cuentas y reservas pertenecen a una base temporal de demostración.", True),
        ("Vista de seguridad", EVIDENCE / "security.png", "Pantalla local del rol de seguridad con búsqueda y controles de cámara. La captura no demuestra lectura de cámara en Android.", True),
        ("Interfaz del asistente IA", EVIDENCE / "assistant.png", "Pantalla del asistente en ejecución local. El mensaje inicial es interfaz; no prueba una respuesta del proveedor ni que AI_API_KEY esté configurada.", True),
        ("Dashboard administrativo", EVIDENCE / "admin.png", "Panel abierto desde el navegador local con registros sintéticos: 125 cupos, dos activos y una cancelación. No son cifras del servicio Azure.", False),
    ]
    for title, image_path, explanation, mobile in items:
        if not image_path.exists():
            continue
        document.add_page_break()
        heading(document, title, 1)
        add_body(document, explanation)
        picture_path = crop_mobile_screenshot(image_path) if mobile else image_path
        paragraph = document.add_paragraph()
        if mobile:
            paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
        paragraph.add_run().add_picture(str(picture_path), width=Inches(3.1 if mobile else 6.2))
        caption(document, "Evidencia local reproducible · fecha de captura 23/10/2026")


def main() -> None:
    DIAGRAMS.mkdir(parents=True, exist_ok=True)
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    for source_name, target_name in (
        ("Evidencia-login-local.png", "login.png"),
        ("Evidencia-estudiante-local.png", "student.png"),
        ("Evidencia-seguridad-local.png", "security.png"),
        ("Evidencia-asistente-local.png", "assistant.png"),
    ):
        source_image = ROOT / source_name
        target_image = EVIDENCE / target_name
        if source_image.exists() and (not target_image.exists() or target_name == "security.png"):
            shutil.copyfile(source_image, target_image)
    diagram_paths = {
        "flow": DIAGRAMS / "flujo-reserva-qr.png",
        "classes": DIAGRAMS / "diagrama-clases.png",
        "erd": DIAGRAMS / "diagrama-entidad-relacion.png",
        "usecases": DIAGRAMS / "diagrama-casos-de-uso.png",
    }
    create_flow_diagram(diagram_paths["flow"])
    create_class_diagram(diagram_paths["classes"])
    create_erd(diagram_paths["erd"])
    create_use_cases(diagram_paths["usecases"])
    update_existing_guide()

    document = Document()
    set_document_styles(document)
    add_cover(document)
    add_toc_page(document)
    add_current_status(document)

    add_chapter(document, "1. Contexto, problema y objetivos", [
        "La gestión de estacionamientos en una institución educativa combina una capacidad física limitada con horarios variables de llegada y salida. Cuando la disponibilidad se comunica de forma manual, una persona puede desplazarse hasta una zona para encontrarla ocupada; el personal, a su vez, debe contrastar placas, usuarios y autorizaciones mediante registros dispersos.",
        "El problema abordado por el prototipo no se formula como una medición institucional definitiva, porque no se cuenta aquí con una serie observacional real de entradas y salidas de la Universidad. Se plantea como una necesidad operativa: centralizar disponibilidad, reserva temporal y comprobación de acceso con una fuente de datos común para estudiantes, seguridad y administración.",
        "La pregunta de diseño es: ¿cómo organizar la consulta y asignación de cupos universitarios desde interfaces móviles y web, manteniendo una sola regla de disponibilidad y dejando trazabilidad de las operaciones principales? La respuesta desarrollada es una aplicación Expo conectada a una API Express y a una base SQLite.",
        "El objetivo general es construir y documentar un prototipo multiplataforma que permita consultar y reservar espacios por tipo de vehículo, atender asignaciones de seguridad y revisar indicadores de ocupación. Los objetivos específicos son definir actores y reglas; implementar el modelo de datos y las rutas; integrar la interfaz con la API; validar los recorridos principales mediante pruebas; y preparar una entrega reproducible con limitaciones explícitas.",
    ], bullets=[
        "Beneficiarios directos: estudiantes que necesitan saber qué zonas aceptan su vehículo y personal que controla la asignación.",
        "Beneficiarios indirectos: coordinación universitaria, que obtiene una vista agregada del uso registrado.",
        "Criterio de honestidad: el tablero presenta datos que existen en SQLite; no convierte una demostración sintética en evidencia de demanda real.",
    ])

    add_chapter(document, "2. Justificación, alcance y delimitaciones", [
        "La justificación técnica está en la centralización. Si cada teléfono mantuviera su propio catálogo de cupos, dos usuarios podrían observar el mismo espacio libre y reclamarlo a la vez. El backend concentra la decisión y SQLite impone restricciones adicionales sobre reservas activas. Esta separación no elimina todos los riesgos de operación, pero reduce la dependencia de que la interfaz se comporte correctamente.",
        "En el plano académico, el ejercicio integra diseño de interfaces, navegación, protocolos HTTP, control de acceso, persistencia relacional, pruebas y publicación de artefactos. Para el usuario, el valor esperado consiste en reducir consultas presenciales y dejar una secuencia verificable desde el inicio de sesión hasta la reserva o la asignación.",
        "El alcance presente comprende registro de estudiantes, inicio de sesión, reserva temporal, cancelación, consulta de historial, edición de perfil, código QR, validación en servidor por personal autorizado, creación y asignación de visitantes, operación por zona, panel administrativo y un asistente conversacional opcional que produce JSON estructurado.",
        "Quedan fuera de alcance la conexión a sensores físicos, barreras vehiculares, mapas con geolocalización en tiempo real, pagos, notificaciones verificadas por correo, recuperación segura de contraseña, base administrada con alta disponibilidad y el reemplazo de los sistemas institucionales existentes. La aplicación no debe tratarse como control de acceso de seguridad crítica.",
    ], table=(["Dentro del prototipo", "Fuera del alcance actual"], [
        ["Consulta de 125 cupos sembrados y cinco zonas", "Lectura de sensores o cámaras de placa"],
        ["Reserva de estudiante por 15 minutos", "Pago, multas o facturación"],
        ["Asignación por seguridad con vigencia configurada", "Integración con directorio universitario"],
        ["Dashboard agregado sobre SQLite", "Estudio estadístico de ocupación real institucional"],
        ["APK publicado por workflow", "Certificación de instalación en teléfonos de laboratorio"],
    ]))

    add_chapter(document, "3. Actores y requisitos funcionales", [
        "Los roles son una decisión de servidor, no solo una condición de navegación. La cuenta administrativa puede acceder al dashboard; seguridad puede consultar espacios, verificar códigos y realizar asignaciones; el estudiante consulta zonas compatibles, gestiona su propia reserva y ve su historial. Los visitantes se representan como usuarios internos creados desde el flujo de seguridad y no tienen acceso de inicio de sesión pública.",
        "Los requisitos se consideran cubiertos por código y pruebas locales cuando existe una ruta que implementa la conducta. La disponibilidad de un requisito en el sitio público depende además del estado del servicio, que el 23 de octubre de 2026 respondió correctamente tras un redespliegue (health, login de administración y dashboard). Se mantiene la distinción entre lo probado localmente, lo probado en Azure y lo no probado (APK en teléfono, asistente IA sin clave).",
    ], table=(["ID", "Requisito funcional", "Rol", "Criterio observable"], [
        ["RF-01", "Iniciar sesión con cédula y contraseña", "Todos", "Token válido y navegación según rol"],
        ["RF-02", "Crear una cuenta de estudiante", "Estudiante", "Validar placa, contraseña y aceptación de términos"],
        ["RF-03", "Consultar zonas y espacios libres", "Estudiante", "Filtrar por tipo de vehículo"],
        ["RF-04", "Crear una reserva temporal", "Estudiante", "Máximo una reserva activa por usuario y espacio"],
        ["RF-05", "Consultar y cancelar reserva", "Estudiante", "Actualizar estado e historial"],
        ["RF-06", "Presentar QR de reserva", "Estudiante", "Codificar identificador de usuario/espacio"],
        ["RF-07", "Validar QR contra la API", "Seguridad/Admin", "Permitir solo si coincide con reserva activa"],
        ["RF-08", "Buscar por placa o cédula", "Seguridad/Admin", "Consultar identidad y estado operativo"],
        ["RF-09", "Crear visitante", "Seguridad/Admin", "Evitar duplicar visitante por placa"],
        ["RF-10", "Asignar cupo a persona", "Seguridad/Admin", "Rechazar espacio o usuario ya asignado"],
        ["RF-11", "Consultar ocupación por zona", "Seguridad/Admin", "Mostrar cupos y estado actual"],
        ["RF-12", "Consultar dashboard", "Admin", "Cargar indicadores y series analíticas"],
        ["RF-13", "Consultar historial", "Usuario autenticado", "Ordenar reservas propias por fecha"],
        ["RF-14", "Actualizar datos del perfil", "Usuario autenticado", "Guardar nombre y placa permitida"],
        ["RF-15", "Preguntar al asistente IA", "Usuario autenticado", "Devolver JSON validado por esquema"],
        ["RF-16", "Cerrar sesión", "Todos", "Borrar credenciales locales y volver a login"],
    ]))

    add_chapter(document, "4. Requisitos no funcionales y criterios de calidad", [
        "Los requisitos de calidad delimitan la forma en que debe comportarse la aplicación. El prototipo no tiene un acuerdo de nivel de servicio ni métricas de disponibilidad. Por ello, se expresan como criterios verificables a nivel del repositorio y de una instalación de prueba, no como garantías de producción.",
        "La interfaz debe dar mensajes comprensibles ante errores HTTP o de red. El servidor debe comprobar rol en cada ruta protegida, parametrizar las consultas, limitar el tamaño de los cuerpos entrantes y responder JSON coherente. La base debe mantener claves foráneas y evitar duplicados de espacios dentro de la misma zona.",
        "La usabilidad requiere que el usuario pueda identificar qué rol está usando, qué zona está seleccionada y si la reserva sigue activa. El código QR no constituye firma criptográfica ni prueba de identidad por sí solo: se contrasta en línea contra el servidor. La privacidad exige no incluir credenciales, tokens ni datos reales en capturas o documentación.",
    ], table=(["ID", "Criterio", "Evidencia/condición"], [
        ["RNF-01", "Autenticación", "JWT firmado por el backend y vencimiento de 12 horas"],
        ["RNF-02", "Permisos", "Middleware requireRole en rutas administrativas y de seguridad"],
        ["RNF-03", "Integridad", "Claves foráneas y dos índices únicos parciales"],
        ["RNF-04", "Compatibilidad", "Expo para Android y navegador; API compartida"],
        ["RNF-05", "Mantenibilidad", "Separación de pantallas, configuración, API y persistencia"],
        ["RNF-06", "Privacidad", "Datos sintéticos en evidencia; no distribuir credenciales"],
        ["RNF-07", "Disponibilidad", "Verificada puntualmente en Azure (HTTP 200); sin SLA para producción"],
        ["RNF-08", "Rendimiento", "Sin prueba de carga ni concurrencia multiinstancia"],
    ]))

    add_chapter(document, "5. Método de desarrollo y organización del trabajo", [
        "El desarrollo se organizó por incrementos. Primero se definieron las pantallas y el dominio de parqueadero; después se conectó la interfaz a un servidor HTTP con persistencia; posteriormente se incorporaron validación de roles, reservas y visitantes; por último se añadió el dashboard analítico, el asistente JSON y los flujos de despliegue.",
        "Cada incremento tiene una señal de validación distinta. Una compilación TypeScript revisa consistencia estática, las pruebas API ejercitan contratos en SQLite temporal, el export de Expo verifica el empaquetado web y una comprobación HTTP evalúa el entorno en la nube. Ninguna de esas señales reemplaza las otras.",
        "La metodología puede describirse como iterativa con entregas pequeñas. No existe en este repositorio evidencia suficiente para afirmar que se siguió Scrum formal con ceremonias, roles o métricas de velocidad; se documentan fases y artefactos observables en vez de atribuir al equipo un proceso que no se haya demostrado.",
    ], table=(["Fase", "Trabajo principal", "Artefacto verificable"], [
        ["Descubrimiento", "Actores, problema y funciones", "Anteproyecto, requisitos y alcance"],
        ["Diseño", "Navegación, datos y contratos API", "Diagramas y modelo relacional"],
        ["Implementación", "Pantallas, servidor y persistencia", "Código TypeScript/JavaScript"],
        ["Verificación", "Pruebas, tipos, lint y export", "Salida de comandos y matriz de pruebas"],
        ["Publicación", "Azure y APK de GitHub Actions", "URL/Release; estado sujeto a comprobación"],
        ["Documentación", "Manual, evidencias y limitaciones", "Documento integral y guía Markdown"],
    ]))

    add_chapter(document, "6. Arquitectura y decisiones tecnológicas", [
        "El navegador y la aplicación Expo para Android funcionan como clientes. Ambos consumen endpoints HTTP de la API Express. El servidor extrae identidad desde un JWT, ejecuta reglas de negocio, consulta SQLite y construye las respuestas. Para la versión web, Express también sirve los archivos estáticos exportados por Expo Router.",
        "Expo Router organiza pantallas por archivos dentro de `app/`. React Native permite compartir componentes, mientras React Native Web adapta la interfaz al navegador. TypeScript tipa los módulos de frontend. El backend está escrito en JavaScript CommonJS y concentra rutas en `backend/server.cjs`; `backend/database.cjs` abre y prepara la base.",
        "SQLite fue una decisión práctica para la demostración: no necesita servicio separado y ofrece transacciones y restricciones relacionales. Sus límites importan en Azure: almacenamiento de una instancia, concurrencia y recuperación requieren una estrategia más robusta si el prototipo se convierte en servicio real. `better-sqlite3` ejecuta consultas sincrónicas y las transacciones agrupan mutaciones consistentes.",
        "La elección de JWT separa la sesión del estado visual de la pantalla. bcryptjs guarda un hash de contraseña y no el texto original. Zustand persiste el usuario y token del cliente con AsyncStorage; el servidor sigue siendo quien valida firma, vencimiento y rol. La configuración usa `EXPO_PUBLIC_API_URL` cuando se proporciona y una URL relativa en exportación web de producción.",
    ], bullets=[
        "Frontend: Expo SDK 54, React Native, Expo Router, TypeScript, Zustand, AsyncStorage y react-native-svg.",
        "Backend: Node.js, Express, CORS, bcryptjs, jsonwebtoken y better-sqlite3.",
        "Datos: SQLite con tablas de usuarios, zonas, espacios, reservas y eventos.",
        "Compilación Android: workflow GitHub Actions con Node 22, Java 17 y Gradle.",
    ])

    add_chapter(document, "7. Flujos funcionales por rol", [
        "El recorrido de estudiante inicia en la pantalla de login. Al autenticarse, el servidor devuelve un usuario público y un token. La pantalla usa el rol y tipo de vehículo para seleccionar las zonas compatibles. La consulta de espacios no reserva por sí misma; al confirmar, el cliente envía el identificador de espacio. El backend valida la zona, revisa que no haya otra reserva activa y registra la reserva con vencimiento a quince minutos.",
        "El usuario puede recuperar su reserva activa al volver a la pantalla, mostrar el código QR y cancelar. Si el tiempo vence, la limpieza del backend actualiza el estado y registra un evento. Un temporizador visual ayuda a la persona, pero no reemplaza la validación temporal del servidor.",
        "El flujo de seguridad contempla búsqueda manual, lectura con cámara cuando el dispositivo concede permiso, validación del código y asignación. El endpoint QR extrae cédula y número de espacio del texto identificador, luego busca una reserva activa que coincida. Si no hay una reserva coincidente, el resultado es denegado; un error de red no debe interpretarse como autorización.",
        "La administración accede al estado de zonas y dashboard. Este último solicita datos cada cinco segundos, lo que es polling periódico y no una conexión instantánea por WebSocket. El panel combina disponibilidad actual con agregaciones históricas; es importante explicar por separado esas dos clases de indicador.",
    ], table=(["Actor", "Acciones principales", "Regla crítica"], [
        ["Estudiante", "Consultar, reservar, cancelar, QR, historial y perfil", "Una reserva activa por usuario"],
        ["Seguridad", "Buscar, validar QR, crear visitante y asignar cupo", "Solo permitir el QR tras consulta al servidor"],
        ["Administración", "Consultar espacios y dashboard", "El endpoint del dashboard requiere rol admin"],
        ["Visitante", "Registro interno y asignación por seguridad", "No tiene alta pública de sesión"],
    ]))

    add_figure_page(document, "8. Diagrama de flujo de reserva y QR", diagram_paths["flow"], "El diagrama representa la ruta feliz y el punto de decisión que separa un acceso permitido de uno denegado. El QR contiene información identificadora y no es un token firmado; el control real ocurre cuando el backend comprueba la reserva activa.")
    add_figure_page(document, "9. Diagrama de clases", diagram_paths["classes"], "Las clases representan el dominio conceptual que aparece en la persistencia. `User` cubre los roles; una persona puede acumular reservas históricas, cada reserva apunta a un espacio y genera eventos. La zona agrupa espacios.")
    add_figure_page(document, "10. Diagrama entidad-relación", diagram_paths["erd"], "El esquema corresponde a SQLite. Las claves foráneas conectan usuarios, espacios, zonas, reservas y eventos. Los índices parciales garantizan unicidad para reservas activas por usuario y por espacio.")
    add_figure_page(document, "11. Diagrama de casos de uso", diagram_paths["usecases"], "Los casos de uso resumen las responsabilidades visibles por actor. Las autorizaciones efectivas se validan en el backend; el diagrama no convierte una ruta de interfaz en permiso.")

    add_chapter(document, "12. Modelo de datos y diccionario", [
        "La base se crea en `openDatabase()` y carga las cinco zonas con sus espacios. En desarrollo se pueden crear tres usuarios demo. En producción el despliegue configura `DEMO_DATA=false`; si se suministra un bootstrap de administración, el servidor crea o actualiza la cuenta usando un hash de costo mayor.",
        "La tabla `reservations` conserva estados para análisis e historial. Una reserva activa no se borra al cancelar; se actualizan `status` y `ended_at` y se registra un evento. Ese historial permite medir cancelaciones y vencimientos sin inferirlos a partir del estado actual de los espacios.",
        "Dos índices únicos parciales cubren invariantes que deben mantenerse aun cuando dos solicitudes compitan: `one_active_reservation_per_space` y `one_active_reservation_per_user`. Las transacciones aíslan la escritura y las rutas capturan el conflicto para responder HTTP 409.",
    ], table=(["Entidad", "Campos relevantes", "Relaciones y regla"], [
        ["users", "id, cedula, name, password_hash, role, plate, vehicle_type, created_at", "Cédula única; roles student/admin/security/visitor"],
        ["zones", "id, name, vehicle_type, capacity", "Una zona contiene varios espacios"],
        ["parking_spaces", "id, zone_id, number", "Número único dentro de su zona"],
        ["reservations", "id, user_id, space_id, status, created_at, expires_at, ended_at", "Máximo una activa por usuario y por espacio"],
        ["parking_events", "id, reservation_id, event_type, created_at", "Registro temporal asociado a una reserva"],
    ]))

    add_chapter(document, "13. API y contratos", [
        "Las rutas de negocio conservan sufijos `.php` por compatibilidad con el prototipo previo, pero están servidas por Express y no por PHP. Salvo los endpoints públicos, el servidor espera `Authorization: Bearer <token>`. La API devuelve JSON; `success` indica la aceptación del flujo, mientras el código HTTP diferencia validación, autenticación, permisos, conflicto y error de infraestructura.",
        "Las respuestas deben documentarse como contratos, no como capturas de una sola ejecución. Por ejemplo, el número de espacios libres cambia con cada reserva y el token cambia en cada login. Los ejemplos de esta sección usan datos inventados y no deben copiarse como credenciales de una instancia.",
        "El endpoint del asistente necesita un proveedor compatible con Chat Completions y una clave en el ambiente del servidor. Aun cuando el proveedor responda, el backend analiza el contenido como JSON y revisa los campos antes de devolver la respuesta a la app.",
    ], table=(["Método y ruta", "Acceso", "Uso"], [
        ["GET /health", "Público", "Comprobar disponibilidad del proceso"],
        ["POST /eficient-parking-lot/login.php", "Público", "Autenticar y devolver usuario/token"],
        ["POST /eficient-parking-lot/registro.php", "Público con reglas", "Crear cuenta estudiante; personal requiere clave"],
        ["GET /eficient-parking-lot/me", "Autenticado", "Consultar identidad del token"],
        ["POST /eficient-parking-lot/espacios.php", "Estudiante", "Listar espacios libres por zona"],
        ["POST /eficient-parking-lot/reserva_activa.php", "Estudiante", "Consultar reserva vigente"],
        ["POST /eficient-parking-lot/reservar.php", "Estudiante", "Crear reserva de 15 minutos"],
        ["POST /eficient-parking-lot/cancelar.php", "Estudiante", "Cancelar reserva activa"],
        ["GET /eficient-parking-lot/admin_espacios.php", "Seguridad/Admin", "Listar libres, ocupados y por vencer"],
        ["POST /eficient-parking-lot/validar_qr.php", "Seguridad/Admin", "Validar QR contra reserva activa"],
        ["POST /eficient-parking-lot/buscar_usuario_placa.php", "Seguridad/Admin", "Buscar persona por cédula o placa"],
        ["POST /eficient-parking-lot/buscar_placa_activa.php", "Seguridad/Admin", "Consultar asignación activa"],
        ["POST /eficient-parking-lot/crear_visitante.php", "Seguridad/Admin", "Crear visitante por placa"],
        ["POST /eficient-parking-lot/asignar_usuario.php", "Seguridad/Admin", "Asignar espacio existente"],
        ["POST /eficient-parking-lot/asignar_visitante.php", "Seguridad/Admin", "Crear/asignar visitante a cupo"],
        ["POST /eficient-parking-lot/historial.php", "Autenticado", "Listar historial correspondiente"],
        ["POST /eficient-parking-lot/actualizar_usuario.php", "Autenticado", "Actualizar perfil propio"],
        ["GET /api/dashboard/overview", "Admin", "Métricas y análisis agrupado"],
        ["POST /api/assistant/chat", "Autenticado", "Respuesta Industria 5.0 en JSON"],
    ]))
    add_body(document, "La recuperación de contraseña no está habilitada: `verificar_usuario.php` y `cambiar_contrasena.php` responden HTTP 503. Mantener ese límite visible es más seguro que simular una recuperación sin probar la identidad.")

    add_chapter(document, "14. Dashboard y análisis exploratorio", [
        "El dashboard presenta una lectura operativa y una lectura histórica. La primera estima ocupación actual sobre los 125 espacios sembrados, cuenta ocupados y disponibles por zona y agrega eventos del día y actividad por hora. La segunda explora reservas registradas, su tendencia diaria de catorce días, distribución por estado, tasa de cancelación, tasa de vencimiento, duración promedio de reservas finalizadas, horas de mayor demanda, utilización de zona en treinta días y reservas por rol.",
        "La serie temporal se completa con días en cero para que el gráfico no pierda continuidad. Las horas se normalizan para la zona horaria de Colombia. La tasa de cancelación se calcula sobre el conjunto de reservas con estado, no sobre el total de estudiantes registrados. La duración promedio utiliza registros con un tiempo de finalización; si no hay datos suficientes, el tablero muestra N/D.",
        "El conjunto de datos del sistema no constituye una muestra representativa de la universidad. Las capturas de esta documentación se generaron en SQLite temporal con tres reservas sintéticas: dos activas y una cancelada. Por tanto, sirven para explicar el cálculo y la interfaz, pero no para concluir que una zona es más demandada en la realidad.",
        "Un análisis institucional futuro debería acordar periodo de captura, calidad de marcas de tiempo, tratamiento de visitantes, definición de ocupación, intervalos de confianza y reglas para valores atípicos. También tendría que anonimizar identificadores antes de compartir resultados. El dashboard actual aporta indicadores descriptivos; no ejecuta modelos predictivos ni prueba hipótesis.",
    ], table=(["Indicador", "Definición operativa", "Advertencia"], [
        ["Ocupación actual", "Espacios con reserva activa / capacidad", "Foto del momento; no es flujo de entradas"],
        ["Tendencia 14 días", "Reservas creadas por fecha local de Colombia", "Incluye eventos sintéticos si la base es demo"],
        ["Tasa de cancelación", "Canceladas / reservas con estado", "No mide cancelación de usuarios no registrados"],
        ["Duración promedio", "Promedio en reservas con finalización", "Puede ser N/D si no existen tiempos completos"],
        ["Horas pico", "Horas con mayor número de reservas", "Puede cambiar con la zona horaria y la ventana"],
        ["Uso por zona 30 días", "Reservas agrupadas por zona", "No corrige por capacidad ni duración"],
    ]))

    add_chapter(document, "15. Asistente IA e Industria 5.0", [
        "El asistente está diseñado para conversar en español sobre el uso del parqueadero y tecnologías relacionadas con Industria 5.0. La instrucción de sistema prioriza soluciones centradas en las personas, sostenibles y resilientes, y puede explicar inteligencia artificial, Internet de las cosas, sensores, gemelos digitales y computación perimetral. También limita las afirmaciones: no debe atribuir a la aplicación funciones que no están implementadas.",
        "La app envía una pregunta de hasta 1200 caracteres y un historial de hasta diez mensajes válidos. El backend exige autenticación, selecciona modelo y URL mediante variables de entorno y solicita formato JSON. Una vez recibida la respuesta, comprueba que existan los campos y tipos esperados.",
        "La forma de salida es `{ respuesta: string, tecnologias: [{ nombre: string, beneficio: string }], siguientePregunta: string }`. El endpoint usa `AI_API_KEY`, `AI_API_URL` opcional y `AI_MODEL` opcional. Si no existe clave, responde 503 de manera explícita. La interfaz puede enseñar el mensaje inicial sin proveedor, pero eso no demuestra generación real.",
        "La referencia a Industria 5.0 se emplea como marco: las decisiones digitales deben complementar a las personas, considerar impacto ambiental y facilitar resiliencia. El proyecto no mide emisiones, no integra sensores ni ejecuta un gemelo digital; esas ideas se presentan como posibilidades, no como prestaciones instaladas.",
    ], table=(["Tecnología", "Aplicación posible", "Situación en el prototipo"], [
        ["IA generativa", "Responder preguntas y estructurar orientación", "Endpoint construido; API key no configurada en Azure"],
        ["IoT/sensores", "Contar cupos sin intervención manual", "No implementado; requiere hardware e integración"],
        ["Computación perimetral", "Procesar señales cerca del acceso", "Concepto de mejora, no ejecutado"],
        ["Gemelo digital", "Simular ocupación y escenarios", "No implementado; datos actuales son operativos"],
        ["Analítica descriptiva", "Describir reservas históricas", "Dashboard implementado sobre SQLite"],
    ]))

    add_chapter(document, "16. Seguridad, privacidad y manejo de datos", [
        "El servidor usa bcryptjs para calcular hashes de contraseñas, JSON Web Tokens firmados con un secreto, expiración temporal y verificación de rol en el backend. Las consultas usan parámetros en vez de interpolar entradas, y los cuerpos JSON/formulario están limitados a 100 KB. Las restricciones SQLite cubren algunas invariantes de integridad.",
        "No se debe interpretar esta lista como una auditoría de seguridad ni como una certificación. CORS se configura de manera amplia en el código y no hay evidencia de un WAF, monitoreo, rotación automática de secretos, copias de seguridad verificadas o análisis formal de amenazas. Para producción se deben revisar orígenes permitidos, límites de intentos de login, protección de datos personales y controles de acceso a logs.",
        "El QR actual lleva una identificación derivada de nombre, cédula y número de espacio. Aunque el backend valide una reserva activa, mostrar datos personales en un código aumenta exposición en capturas o lectores externos. Una mejora sería usar un identificador opaco aleatorio con vencimiento y evitar guardar la cédula en logs.",
        "Las credenciales de bootstrap y el secreto JWT se generan para Azure desde el script; no deben añadirse a Git ni a este Word. Las cuentas demo incluidas en desarrollo no son cuentas de producción. El archivo `.env` y la base local deben permanecer fuera del control de versiones.",
    ], table=(["Riesgo", "Consecuencia", "Mitigación o trabajo pendiente"], [
        ["URL de API errónea", "Login y reservas sin conexión", "Exportar y buscar localhost en bundle antes de publicar"],
        ["QR con identificadores personales", "Exposición de datos al compartir captura", "Migrar a token opaco de un solo uso"],
        ["Clave IA ausente o filtrada", "Asistente no responde o costo/abuso", "Guardar en app settings; nunca en frontend/Git"],
        ["SQLite en una sola instancia", "Pérdida o bloqueo con fallos/escala", "Backups y base administrada para producción"],
        ["Recuperación de contraseña deshabilitada", "Usuario no puede recuperar acceso", "Mantener 503 hasta verificación de identidad segura"],
        ["CORS amplio", "Origen web no restringido", "Definir dominios autorizados y probar preflight"],
    ]))

    add_chapter(document, "17. Estrategia de pruebas y resultados", [
        "La prueba automatizada de API inicia una aplicación Express en puerto temporal y usa un archivo SQLite desechable. Valida rutas web, modo de journal, registro, login, consultas, reserva, historial, conflicto de segunda reserva, autorización administrativa, visitante, asignación, QR y asistente con proveedor simulado.",
        "Los resultados anteriores al cambio de configuración registraron seis pruebas aprobadas; TypeScript y lint terminaron sin errores. Después del cambio de `constants/config.ts` se exportó la web y se confirmó que el bundle incluye la ruta relativa y no `http://localhost:4000/eficient-parking-lot`. Esta documentación diferencia resultados de código de estado actual de Azure.",
        "La verificación manual web se hizo en un servidor local con SQLite temporal. Se crearon tres usuarios sintéticos y tres reservas para mostrar el dashboard: dos activas y una cancelada. Las capturas no se deben citar como observación de uso real ni como prueba de Android nativo.",
        "No se completó una instalación física del APK, una lectura QR con cámara de teléfono, una prueba de carga ni un ensayo de persistencia Azure tras reinicio. Son pruebas de aceptación pendientes y no se cubren con un test de API o una captura de interfaz.",
    ], table=(["Prueba", "Resultado informado", "Alcance"], [
        ["npm run api:test", "6/6 aprobadas en validación previa", "API en DB temporal; no cubre Azure"],
        ["npx tsc --noEmit", "Sin errores en validación previa", "Chequeo estático del frontend"],
        ["npm run lint", "0 errores; existían warnings", "Reglas ESLint del repositorio"],
        ["npx expo export --platform web", "Correcto tras cambio de URL", "Bundle local contiene URL relativa"],
        ["GET /health Azure", "HTTP 200 tras el redespliegue", "Repetir antes de cada presentación"],
        ["APK en Android físico", "No probado", "Pendiente de instalación y recorrido completo"],
    ]))
    add_table(document, ["Caso", "Preparación", "Resultado esperado"], [
        ["Login correcto", "Cuenta sintética estudiante", "200, token y ruta acorde al rol"],
        ["Login inválido", "Contraseña errónea", "401 y mensaje visible"],
        ["Registro sin términos", "Omitir aceptación", "400 sin crear cuenta"],
        ["Reserva válida", "Zona y espacio libres", "201 y vencimiento a 15 minutos"],
        ["Doble reserva por usuario", "Intentar reservar un segundo espacio", "409 sin duplicar activa"],
        ["Dos usuarios mismo cupo", "Solicitudes concurrentes", "Solo una reserva activa; otra recibe conflicto"],
        ["QR sin reserva", "Código sintético sin coincidencia", "valido:false"],
        ["QR con reserva", "Código coincidente y rol security", "valido:true"],
        ["QR por estudiante", "Usar token de estudiante", "403"],
        ["Dashboard por estudiante", "Consultar endpoint admin", "403"],
        ["Asistente sin clave", "AI_API_KEY ausente", "503 explícito"],
        ["Asistente con proveedor simulado", "Respuesta JSON conforme", "Campos validados y devueltos"],
        ["Web sin archivo", "Ruta desconocida", "404"],
    ])

    add_chapter(document, "18. Despliegue, APK y operación", [
        "El script Azure crea o reutiliza grupo y plan, genera secreto JWT y credenciales de bootstrap, exporta Expo Web, prepara el paquete de backend y web, configura app settings e inicia despliegue ZIP. Tras validar API y login elimina los valores temporales de bootstrap de la configuración. El paquete no copia la SQLite local.",
        "La instancia pública se llama `efficient-parking-3126533e`; su URL es https://efficient-parking-3126533e.azurewebsites.net. La región es México Central y el plan existente se cambió a B1 después de una cuota F1 agotada. Un despliegue previo falló con Kudu 502 y arranques en frío con `Cannot find module 'dotenv'`; el redespliegue con el script del repositorio lo resolvió y `/health` responde 200. Revisar facturación en Azure. El nombre del grupo `rg-efficient-parking-free-mx` es histórico y no prueba que el recurso no tenga costo.",
        "El workflow Android instala dependencias, genera el proyecto nativo con Expo prebuild, compila el APK release con Gradle, sube el artefacto y publica la release `apk-latest`. La variable de URL API se establece para el servidor Azure. La compilación correcta acredita que el artefacto fue generado, no que se haya instalado ni que el backend esté disponible.",
        "El runbook de recuperación comienza por comprobar estado de App Service, plan y costo; consultar los registros de despliegue; verificar la estructura del ZIP y buscar `localhost` en el bundle; desplegar cuando exista autorización de costo; y probar salud, login, rutas protegidas, persistencia y conexión móvil. Una prueba que falla debe quedar registrada con fecha y código HTTP, no transformarse en una afirmación de éxito.",
    ], table=(["Componente", "Ubicación", "Comprobación"], [
        ["Web", "URL /login", "200 y carga de JS con API del mismo origen"],
        ["API", "URL /health", "200 y JSON status=ok"],
        ["Login", "POST /eficient-parking-lot/login.php", "Respuesta sin imprimir token"],
        ["Dashboard", "GET /api/dashboard/overview", "Admin 200; estudiante 403"],
        ["APK", "Release apk-latest", "Instalar y probar en dispositivo físico"],
        ["Base", "/home/data/parking.sqlite", "Reinicio y persistencia con permiso explícito"],
    ]))

    add_chapter(document, "19. Manual breve por perfil", [
        "Estudiante: instalar desde una fuente confiable; conectarse a internet; registrarse con cédula, contraseña y datos del vehículo; iniciar sesión; escoger zona compatible; consultar un espacio; reservar y revisar la hora de vencimiento; mostrar QR al personal de seguridad; cancelar si ya no necesita el cupo; cerrar sesión al terminar. La contraseña demo solo aplica a entorno local.",
        "Seguridad: iniciar sesión con una cuenta autorizada; comprobar que cámara tenga permiso si se usa escaneo; como alternativa, buscar por cédula; validar QR en línea; revisar respuesta del servidor; elegir zona y asignar un espacio cuando corresponda; no conceder acceso si la API no responde o el resultado no valida la reserva. Para visitante, completar placa y nombre de acuerdo con el flujo.",
        "Administración: ingresar con rol admin; abrir el panel operativo para revisar distribución por zona; usar Dashboard para ocupación y tendencias; distinguir indicadores actuales de histórico; cerrar sesión cuando termine. Las métricas solo representan la base de datos de la instancia conectada.",
        "Si el sistema devuelve error de conexión, revisar estado de red y URL de API. No repetir una asignación si la respuesta quedó indeterminada sin consultar de nuevo el estado. No se debe compartir una captura que contenga nombre, cédula, placa, token o QR personal.",
    ])

    add_chapter(document, "20. Limitaciones, riesgos y plan de mejora", [
        "La disponibilidad en Azure se comprobó de forma puntual y no está garantizada; hubo una configuración anterior con localhost y fallas de arranque ya corregidas, y el APK no se ha probado en teléfono. El servicio de IA no está activo por ausencia de clave y recuperación de contraseña está deliberadamente deshabilitada. El plan B1 puede tener costo; su permanencia requiere revisar presupuesto.",
        "SQLite y App Service en una sola instancia simplifican la demostración, pero no satisfacen continuidad de negocio ni concurrencia alta. No hay evidencia de copias de seguridad restauradas, monitorización de alertas, rotación programada de secretos ni una prueba de desastre. El QR contiene datos identificables y debería migrar a un código opaco.",
        "Las mejoras priorizadas son recuperar y verificar el sitio sin publicar credenciales; hacer instalación Android y prueba guiada en teléfono; añadir configuración segura de IA si el requisito académico lo exige; endurecer CORS y observabilidad; diseñar recuperación de contraseña; y revisar si conviene sustituir SQLite por una base administrada antes de aumentar escala.",
    ], table=(["Prioridad", "Mejora", "Criterio de cierre"], [
        ["P0", "Restaurar Azure", "health 200, login web/API correcto, dashboard autenticado"],
        ["P0", "Revisar costo B1", "Decisión registrada y presupuesto aprobado"],
        ["P1", "Probar APK en teléfono", "Login, reserva, QR, cámara, historial y logout"],
        ["P1", "Configurar proveedor IA", "AI_API_KEY segura; respuesta JSON real validada"],
        ["P2", "QR opaco y de un solo uso", "No exponer cédula/nombre en el valor QR"],
        ["P2", "Base administrada y backup", "Restauración verificada y política de retención"],
    ]))

    add_chapter(document, "21. Conclusiones", [
        "El repositorio contiene una aplicación multiplataforma con flujos identificables para estudiante, seguridad y administración, una API centralizada, persistencia relacional local y un dashboard descriptivo. Las pruebas de API cubren transacciones, roles, reservas y validación QR; el export web se verificó después de corregir la URL de producción.",
        "El tablero aporta un punto de partida para observar ocupación y reservas, pero la captura documentada usa datos sintéticos y no sustenta conclusiones sobre comportamiento real de la comunidad universitaria. Para un análisis institucional se requiere una recolección de datos autorizada, un periodo definido y un tratamiento explícito de privacidad.",
        "La publicación de un APK y la creación de recursos de Azure no son equivalentes a una solución operativa de extremo a extremo. El último error de Azure, el proveedor IA sin configurar y la falta de prueba en teléfono quedan visibles en este informe para que la evaluación no confunda implementación local con disponibilidad pública.",
        "La documentación se diseñó como material de entrega y estudio: recoge el anteproyecto, decisiones que cambiaron durante la implementación, diagramas, contratos de API, modelo de datos, evidencias locales, pruebas y lista de pendientes. Su valor depende de actualizar el estado cuando Azure o el APK se vuelvan a verificar.",
    ])

    add_manual_screens(document)
    add_chapter(document, "22. Referencias y material de consulta", [
        "La bibliografía principal y los antecedentes incluidos en el anteproyecto se conservan en el Anexo A. Las fuentes técnicas deben revisarse en sus versiones vigentes antes de modificar dependencias o prácticas de publicación.",
        "Documentación del proyecto: README, guía de estudio en Markdown, código de backend, esquema SQLite, pruebas automatizadas y workflow de GitHub Actions. Las rutas citadas corresponden al repositorio `jesica1221/proyecto`.",
        "La información sobre precios y disponibilidad de Azure cambia por región, suscripción y fecha; consultar Azure Cost Management y la documentación oficial de App Service antes de mantener o escalar recursos.",
    ], bullets=[
        "Expo y Expo Router: https://docs.expo.dev/",
        "React Native: https://reactnative.dev/docs/getting-started",
        "Node.js: https://nodejs.org/docs/",
        "Express: https://expressjs.com/",
        "SQLite: https://www.sqlite.org/docs.html",
        "Azure App Service: https://learn.microsoft.com/azure/app-service/",
        "GitHub Actions: https://docs.github.com/actions",
    ])

    document.add_page_break()
    heading(document, "Anexo A. Anteproyecto académico de origen", 1)
    add_body(document, "Se conserva aquí el contenido completo del anteproyecto existente: resumen, problema, objetivos, justificación, marcos, metodología, cronograma, antecedentes, propuesta tecnológica y referencias. Los pasajes que describen tecnologías como PHP/MySQL pertenecen a una propuesta inicial; la implementación actual utiliza Node.js, Express y SQLite, descritos en los capítulos técnicos anteriores.")
    proposal_path = ROOT / "Anteproyecto_Eficient_Parking_Lot.docx"
    source_breaks = add_source_doc(document, proposal_path, "A.1 Texto y tablas del anteproyecto", 175)

    document.add_page_break()
    heading(document, "Anexo B. Guía de estudio completa", 1)
    add_body(document, "Este anexo integra la guía existente de ejecución, arquitectura, endpoints, pruebas, seguridad, solución de problemas y presentación. Su estado de Azure se actualizó antes de incorporar el texto. La guía amplía las instrucciones de uso y los detalles prácticos del repositorio.")
    guide_path = ROOT / "GUIA-DE-ESTUDIO.docx"
    guide_breaks = add_source_doc(document, guide_path, "B.1 Texto y tablas de la guía de estudio", 175)

    document.add_page_break()
    heading(document, "Anexo C. Registro de límites de evidencia", 1)
    add_table(document, ["Afirmación", "Qué sí respalda el repositorio", "Qué no se afirma"], [
        ["Hay más de ocho funciones", "Pantallas y endpoints implementados; pruebas de API para flujos clave", "Que todos los flujos estén disponibles en Azure ahora"],
        ["Existe APK", "Artefacto publicado por workflow en GitHub", "Que se haya instalado o probado en teléfono físico"],
        ["Hay dashboard exploratorio", "Métricas y gráficos implementados; captura local con datos sintéticos", "Que los datos midan la demanda universitaria real"],
        ["Hay despliegue Azure", "Recursos App Service y URL asignada", "Que el servicio respondió 200 el 23/10/2026; sin garantía continua"],
        ["Existe asistente IA", "Cliente y endpoint con contrato JSON", "Que el proveedor esté activo sin AI_API_KEY"],
    ])
    add_body(document, "Este registro ayuda a presentar resultados con precisión. Una capacidad implementada en código puede ser una evidencia del prototipo sin que eso implique disponibilidad en nube, uso por población real o pruebas de dispositivo.")

    document.core_properties.title = "Documentación integral de Eficient Parking Lot"
    document.core_properties.subject = "Anteproyecto, diseño, implementación, pruebas y manual de operación"
    document.core_properties.author = "Equipo del proyecto Eficient Parking Lot"
    document.core_properties.keywords = "parqueadero, Expo, React Native, Express, SQLite, dashboard"
    document.save(OUTPUT)
    total_breaks = sum(1 for paragraph in document.paragraphs if "w:type=\"page\"" in paragraph._p.xml)
    print(f"Documento generado: {OUTPUT.name}")
    print(f"Saltos de pagina explicitos: {total_breaks}")
    print(f"Anexos paginados: {source_breaks + guide_breaks}")


if __name__ == "__main__":
    main()
