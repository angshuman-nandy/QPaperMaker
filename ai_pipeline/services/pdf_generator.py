# MIT License
# Copyright (c) 2026 Angshuman Nandy

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
from reportlab.lib import colors


def _build_styles():
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(
        name="PaperTitle",
        fontSize=18,
        leading=22,
        fontName="Helvetica-Bold",
        alignment=1,  # center
        spaceAfter=4,
    ))
    styles.add(ParagraphStyle(
        name="PaperMeta",
        fontSize=11,
        leading=14,
        fontName="Helvetica",
        alignment=1,
        spaceAfter=2,
    ))
    styles.add(ParagraphStyle(
        name="SectionTitle",
        fontSize=13,
        leading=16,
        fontName="Helvetica-Bold",
        spaceBefore=16,
        spaceAfter=4,
    ))
    styles.add(ParagraphStyle(
        name="Instruction",
        fontSize=10,
        leading=13,
        fontName="Helvetica-Oblique",
        spaceAfter=8,
        textColor=colors.grey,
    ))
    styles.add(ParagraphStyle(
        name="Question",
        fontSize=11,
        leading=15,
        fontName="Helvetica",
        spaceBefore=8,
        spaceAfter=2,
    ))
    styles.add(ParagraphStyle(
        name="Option",
        fontSize=11,
        leading=14,
        fontName="Helvetica",
        leftIndent=20,
        spaceAfter=1,
    ))
    styles.add(ParagraphStyle(
        name="Answer",
        fontSize=10,
        leading=13,
        fontName="Helvetica-BoldOblique",
        leftIndent=20,
        textColor=colors.HexColor("#1a6e2e"),
        spaceAfter=2,
    ))
    return styles


def _add_header(story, title: str, total_marks: int, time_minutes: int, styles):
    story.append(Paragraph(title, styles["PaperTitle"]))
    story.append(Paragraph(f"Total Marks: {total_marks}  |  Time Allowed: {time_minutes} minutes", styles["PaperMeta"]))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.black, spaceAfter=12))


def _add_sections(story, sections: list, styles, include_answers: bool):
    for section in sections:
        story.append(Paragraph(section["title"], styles["SectionTitle"]))
        if section.get("instructions"):
            story.append(Paragraph(section["instructions"], styles["Instruction"]))

        for q in section["questions"]:
            marks_label = f"[{q['marks']} mark{'s' if q['marks'] > 1 else ''}]"
            question_text = f"{q['number']}. {q['text']}  <font size='9' color='grey'>{marks_label}</font>"
            story.append(Paragraph(question_text, styles["Question"]))

            for option in q.get("options", []):
                story.append(Paragraph(option, styles["Option"]))

            if include_answers and q.get("answer"):
                story.append(Paragraph(f"Ans: {q['answer']}", styles["Answer"]))


def generate_pdf(
    output_path: str,
    title: str,
    total_marks: int,
    time_minutes: int,
    sections: list,
    include_answers: bool = False,
) -> None:
    """Render the question paper (or answer key) to a PDF file."""
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )
    styles = _build_styles()
    story = []

    display_title = f"{title} — Answer Key" if include_answers else title
    _add_header(story, display_title, total_marks, time_minutes, styles)
    _add_sections(story, sections, styles, include_answers)

    doc.build(story)
