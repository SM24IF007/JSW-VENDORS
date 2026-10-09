"""Contractor branded appointment letters generated from confirmed joining data."""
from io import BytesIO
from pathlib import Path
from xml.sax.saxutils import escape

from PIL import Image as PILImage, ImageDraw, ImageFont
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer

ASSETS = Path(__file__).resolve().parent / 'static' / 'appointment'
for name, filename in (('LetterSans', 'NotoSans-Regular.ttf'), ('LetterSansBold', 'NotoSans-Bold.ttf')):
    if name not in pdfmetrics.getRegisteredFontNames():
        pdfmetrics.registerFont(TTFont(name, str(ASSETS / filename)))


def hindi(text, width=495, size=10):
    """Shape Devanagari with RAQM; ReportLab's text renderer does not shape it."""
    scale = 3
    font = ImageFont.truetype(str(ASSETS / 'NotoSans-Regular.ttf'), round(size * scale), layout_engine=ImageFont.Layout.RAQM)
    probe = PILImage.new('RGB', (1, 1), 'white')
    draw = ImageDraw.Draw(probe)
    lines, current = [], ''
    for word in text.split():
        trial = (current + ' ' + word).strip()
        if draw.textlength(trial, font=font, language='hi') > width * scale and current:
            lines.append(current)
            current = word
        else:
            current = trial
    if current:
        lines.append(current)
    leading = round(size * scale * 1.75)
    pic = PILImage.new('RGB', (round(width * scale), max(leading * len(lines), 1)), 'white')
    painter = ImageDraw.Draw(pic)
    for index, line in enumerate(lines):
        painter.text((0, index * leading), line, font=font, fill='#18232d', language='hi')
    stream = BytesIO()
    pic.save(stream, 'PNG')
    stream.seek(0)
    return Image(stream, width=width, height=pic.height / scale)


def make_appointment_pdf(candidate):
    output = BytesIO()
    width, height = A4
    firm = str(candidate['contractor'] or '').strip()
    prb = firm == 'Prabhuram & Bichare'
    deva = firm == 'Deva Enterprises'
    name = str(candidate['full_name'] or '').strip()
    role = str(candidate['designation'] or candidate['requested_role'] or '').strip()
    date = str(candidate['appointment_issue_date'] or '').strip()
    joining = str(candidate['doj'] or '').strip()
    place = str(candidate['appointment_location'] or '').strip()
    salary = str(candidate['appointment_salary'] or '').strip()

    def header(pdf, doc):
        pdf.saveState()
        if deva:
            pdf.setFillColor(colors.HexColor('#bd2424'))
            pdf.setFont('Helvetica-Bold', 26)
            pdf.drawCentredString(width / 2, height - 51, 'DEVA ENTERPRISES')
            pdf.setFillColor(colors.HexColor('#172d57'))
            pdf.setFont('LetterSans', 8.3)
            pdf.drawCentredString(width / 2, height - 74, 'Khed Pabal Rd, Shop No. 02, Ground Floor, Yamaimata Complex, SH 54,')
            pdf.drawCentredString(width / 2, height - 87, 'Milkat No. 475, Khed, Kanhersar, Pune, Maharashtra - 410505')
            pdf.drawCentredString(width / 2, height - 100, 'Mob: 7467909090')
            pdf.setDash(2, 2)
            pdf.setStrokeColor(colors.HexColor('#405b83'))
            pdf.line(48, height - 114, width - 48, height - 114)
        else:
            path = ASSETS / ('prb_header.png' if prb else 'shubham_header.png')
            from reportlab.lib.utils import ImageReader
            pic = ImageReader(str(path))
            pw, ph = pic.getSize()
            hh = width * ph / pw
            pdf.drawImage(pic, 0, height - hh - 12, width=width, height=hh)
        pdf.setDash()
        pdf.setStrokeColor(colors.HexColor('#bec8d0'))
        pdf.line(50, 49, width - 50, 49)
        pdf.setFont('LetterSans', 7)
        pdf.setFillColor(colors.HexColor('#53616c'))
        pdf.drawString(50, 36, f'Ref: APPT/{candidate["id"]}  |  Date: {date}')
        pdf.drawRightString(width - 50, 36, f'Page {doc.page}')
        pdf.restoreState()

    style = ParagraphStyle('appointment', fontName='LetterSans', fontSize=9, leading=13,
                           spaceAfter=8, textColor=colors.HexColor('#18232d'))
    bold = ParagraphStyle('heading', parent=style, fontName='LetterSansBold', fontSize=13,
                          leading=19, alignment=1, spaceAfter=18)
    small = ParagraphStyle('small', parent=style, fontSize=8, leading=12)
    story = []
    def p(text, selected=style):
        story.append(Paragraph(text, selected))
    def e(value):
        return escape(str(value))

    if prb:
        p('नियुक्ति पत्र', bold)
        for line in (
            f'दिनांक: {date}     संदर्भ: APPT/{candidate["id"]}',
            f'प्रति, {name}',
            f'प्रिय {name},',
            f'हमें आपको सूचित करते हुए प्रसन्नता है कि प्रभुराम एंड बिचारे में आपकी नियुक्ति {role} पद पर {joining} से {place} में की जाती है।',
            f'आपका दर्ज किया गया मासिक वेतन / पारिश्रमिक: {salary}। वेतन के घटकों तथा लागू कटौतियों का विवरण जारी करने से पहले कंपनी द्वारा पुष्टि किया जाएगा।',
            'आपको सौंपे गए कार्य, कार्यस्थल के नियम तथा वरिष्ठ अधिकारी के उचित निर्देशों का पालन करना होगा। उपस्थिति, कार्य समय और अवकाश कंपनी की लागू नीति के अनुसार होंगे।',
            'नियुक्ति आवश्यक दस्तावेजों के सत्यापन, कार्य के लिए उपयुक्तता और लागू नियमों के अधीन है। किसी भी परिवर्तन या सेवा समाप्ति की शर्तें जारीकर्ता द्वारा पुष्टि की जाएंगी।',
            'कृपया इस पत्र में नाम, पद, कार्यस्थल, कार्य प्रारम्भ की तिथि और वेतन की जानकारी जाँच लें। स्वीकृति के प्रमाण के रूप में नीचे हस्ताक्षर करें।',
        ):
            story.append(hindi(line))
            story.append(Spacer(1, 9))
        story.append(Spacer(1, 22))
        p('___________________________                     ___________________________', small)
        story.append(hindi('अधिकृत हस्ताक्षर / मुहर                         कर्मचारी के हस्ताक्षर', size=9))
    else:
        p('APPOINTMENT LETTER', bold)
        p(f'Date: {e(date)}<br/>Ref: APPT/{candidate["id"]}<br/><br/>To,<br/><b>{e(name)}</b>')
        p(f'Dear {e(name)},')
        p(f'We are pleased to appoint you as <b>{e(role)}</b> with <b>{e(firm)}</b>, effective <b>{e(joining)}</b>. Your place of work will be <b>{e(place)}</b>.')
        if deva:
            clauses = [
                ('Appointment', 'Your duties will be assigned by the contractor or its authorised supervisor. You are expected to carry out those duties diligently and follow instructions applicable at the workplace.'),
                ('Remuneration', f'Your recorded monthly remuneration / CTC is <b>{e(salary)}</b>. The issuing contractor must confirm the salary components, statutory deductions and payment terms before this letter is signed.'),
                ('Working conditions', 'Your working hours, attendance, weekly rest and leave will follow the applicable workplace rules and communicated contractor policy.'),
                ('Documents and conduct', 'This appointment is subject to verification of the documents submitted by you. You must maintain workplace discipline and protect confidential information obtained through your work.'),
                ('Changes and separation', 'Any change of assignment and the applicable notice or separation terms will be governed by the written policy and law in force, as confirmed by the issuing contractor.'),
            ]
            for index, (title, body) in enumerate(clauses, 1):
                p(f'<b>{index}. {title}:</b> {body}')
        else:
            p(f'Your recorded monthly remuneration is <b>{e(salary)}</b>. The issuing contractor will confirm its components and applicable deductions before signing.')
            p('Please perform the duties assigned by your supervisor and follow the workplace rules concerning attendance, safety, conduct and leave. This appointment is subject to verification of your submitted documents and the applicable written terms of the issuing contractor.')
        p('Please review the details above and sign below to acknowledge your acceptance.')
        story.append(Spacer(1, 25))
        p('For <b>' + e(firm) + '</b><br/><br/>___________________________<br/>Authorised signatory / stamp')
        story.append(Spacer(1, 14))
        p('I accept the appointment terms recorded above.<br/><br/>___________________________<br/>' + e(name) + ' — employee signature')
    story.append(Spacer(1, 18))
    p('Prepared for review and signature by the issuing contractor.', small)
    doc = SimpleDocTemplate(output, pagesize=A4, leftMargin=50, rightMargin=50,
                            topMargin=155 if deva else 172, bottomMargin=64, title=f'Appointment letter - {name}')
    doc.build(story, onFirstPage=header, onLaterPages=header)
    output.seek(0)
    return output
