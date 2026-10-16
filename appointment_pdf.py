"""Three-page contractor appointment letter and editable compensation annexure."""
import json
from io import BytesIO
from datetime import datetime
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, PageBreak, Table, TableStyle
from reportlab.lib.utils import ImageReader

ASSETS = Path(__file__).resolve().parent / 'static' / 'appointment'
for face, filename in (('LetterSans', 'NotoSans-Regular.ttf'), ('LetterSansBold', 'NotoSans-Bold.ttf')):
    if face not in pdfmetrics.getRegisteredFontNames():
        pdfmetrics.registerFont(TTFont(face, str(ASSETS / filename)))

PAY_FIELDS = (
    ('basic', 'Basic'), ('vda', 'VDA'), ('hra', 'HRA'),
    ('special', 'SPECIAL ALLOWANCE'), ('leave', 'LWW'), ('bonus', 'BONUS'),
    ('employer_pf', 'PF(13% OF BASIC)'), ('employer_esic', 'ESIC (3.25% on GROSS)'),
    ('mlwf', 'MLWF'), ('employee_pf', 'PF 12% Ded'), ('employee_esic', 'ESIC(.75%)'),
    ('professional_tax', 'PT'), ('total_deduction', 'Total Deduction'), ('take_home', 'Net Take home'),
)
PAY_KEYS = tuple(key for key, _ in PAY_FIELDS)


def compensation_totals(breakup):
    """Arithmetic totals for the supplied offer table; component rates stay editable."""
    from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
    component_keys=('basic','vda','hra','special','leave','bonus','employer_pf','employer_esic','mlwf')
    deduction_keys=('employee_pf','employee_esic','professional_tax')
    values={}
    for key in component_keys+deduction_keys:
        raw=str(breakup.get(key,'')).strip()
        if not raw:raise ValueError('Enter every compensation component, using 0 where it does not apply.')
        try:value=Decimal(raw)
        except InvalidOperation:raise ValueError('Compensation amounts must be numbers.')
        if not value.is_finite() or value<0 or value>1000000000:raise ValueError('Enter valid non-negative compensation amounts.')
        values[key]=value
    deductions=sum(values[k] for k in deduction_keys)
    net=sum(values[k] for k in component_keys[:6])-deductions
    if net<0:raise ValueError('Deductions cannot exceed employee earnings.')
    fmt=lambda n: str(n.quantize(Decimal('.01'),rounding=ROUND_HALF_UP))
    return fmt(sum(values[k] for k in component_keys)),fmt(deductions),fmt(net)


def make_appointment_pdf(candidate):
    output = BytesIO()
    firm = str(candidate['contractor'] or '').strip()
    if firm not in ('Prabhuram & Bichare', 'Deva Enterprises', 'Shubham Services'):
        raise ValueError('Unknown issuing contractor')
    name = str(candidate['full_name'] or '').strip()
    role = str(candidate['designation'] or candidate['requested_role'] or '').strip()
    date = str(candidate['appointment_issue_date'] or '').strip()
    joining = str(candidate['doj'] or '').strip()
    dob = str(candidate['dob'] or '').strip()
    place = str(candidate['appointment_location'] or '').strip()
    salary = str(candidate['appointment_salary'] or '').strip()
    try:
        breakup = json.loads(candidate['appointment_breakup'] or '{}')
        if not isinstance(breakup, dict): breakup = {}
    except (ValueError, TypeError):
        breakup = {}
    def safe(value): return escape(str(value))
    regular = ParagraphStyle('body', fontName='LetterSans', fontSize=9.5, leading=12.5, spaceAfter=8,
                             textColor=colors.black)
    heading = ParagraphStyle('title', parent=regular, fontName='LetterSansBold', fontSize=14,
                             leading=19, spaceAfter=12, alignment=1)
    subhead = ParagraphStyle('sub', parent=regular, fontName='LetterSansBold', fontSize=10, leading=15,
                             spaceBefore=6, spaceAfter=5)
    small = ParagraphStyle('small', parent=regular, fontSize=8, leading=11, spaceAfter=5)
    def p(text, style=regular): return Paragraph(text, style)
    story = []
    def add(text, style=regular): story.append(p(text, style))
    width, height = A4
    def header(pdf, doc):
        pdf.saveState()
        if firm == 'Deva Enterprises':
            pdf.setFillColor(colors.HexColor('#bc2424'))
            pdf.setFont('Helvetica-Bold', 25)
            pdf.drawCentredString(width / 2, height - 49, 'DEVA ENTERPRISES')
            pdf.setFillColor(colors.HexColor('#172d57'))
            pdf.setFont('LetterSans', 8)
            pdf.drawCentredString(width / 2, height - 70, 'Khed Pabal Rd, Shop No. 02, Ground Floor, Yamaimata Complex, SH 54,')
            pdf.drawCentredString(width / 2, height - 83, 'Milkat No. 475, Khed, Kanhersar, Pune, Maharashtra - 410505')
            pdf.drawCentredString(width / 2, height - 96, 'Mob: 7467909090')
        else:
            path = ASSETS / ('prb_header.png' if firm == 'Prabhuram & Bichare' else 'shubham_header.png')
            pic = ImageReader(str(path)); pw, ph = pic.getSize()
            hh = min(width * ph / pw, 125)
            pdf.drawImage(pic, 0, height - hh - 10, width=width, height=hh, mask='auto')
        pdf.setStrokeColor(colors.HexColor('#63788f'))
        pdf.line(48, height - 143, width - 48, height - 143)
        pdf.restoreState()

    def formatted(value, pattern):
        try: return datetime.strptime(value, '%Y-%m-%d').strftime(pattern)
        except ValueError: return value
    shown_date = formatted(date, '%d/%m/%Y')
    shown_dob = formatted(dob, '%B %d, %Y').replace(' 0', ' ')
    firm_text = safe(firm)
    name_text = safe(name)
    add(f'Date:-{safe(shown_date)}')
    story.append(Spacer(1, 12))
    add('To,')
    add(name_text)
    add('Appointment Letter', heading)
    add(f'Dear {name_text},')
    add(f'This refers to your application and subsequent discussions with us (M/s {firm_text}).')
    add(f'You will initially work at {safe(place)}. Your appointment will be based on your medical fitness at all times.')
    clauses = [
        f'1. Designation: You are being posted as a {safe(role)}',
        f'2. Location: You will initially work at {safe(place)}.',
        f'3. Compassionate Allowance and Benefits: - Your CTC will be ₹ {safe(salary)} /- as detailed in Annexure 1 attached below. Income tax or any other statutory deductions will be made at source.',
        '4. Pay Frequency: Your pay frequency will be monthly.',
        '5. Working Hours:- Since business demands vary from location to location, your supervisor will determine the required working days at your workplace in accordance with the established working days for the company with which you are affiliated. You will adhere to the working days and hours required at your place of employment.',
        "6. Leave Policy:- You will be eligible for leave in accordance with the organization's regulations. If you are absent for 7 consecutive days without prior written permission or approved leave, you will be deemed to have voluntarily resigned and left our service. Your employment will be void and your name may be removed from the organization's list.",
        "7. Notice Period:- During the probationary period, either party may terminate this agreement by giving 30 days' notice or pay in lieu thereof. After confirmation, either party may terminate the employment at any time by stating its intention to do so in writing; but at least 1 month's notice or pay in lieu thereof must be given.",
    ]
    for clause in clauses: add(clause)
    story.append(PageBreak())
    for clause in [
        f"8. Retirement Age: - Your date of birth is declared as {safe(shown_dob)} in your documents, and you will be bound by such date of birth in all service matters with the Company. You will retire from the Company's service upon attaining the age of 58 years.",
        '9. Code of Conduct: - The Company accepts your employment with the Company, provided you abide by the Code of Conduct (including any amendments and updates) as amended from time to time. You expressly agree to abide by the Code of Conduct (including any amendments and updates); you will be provided with a copy of the current Code of Conduct upon your arrival. You agree that it is your duty to read the Code of Conduct (including any amendments and updates) and that the Code of Conduct (including any amendments and updates) is binding on you.',
        '9.1 You must keep all business information of the Company strictly confidential during your employment and after you leave the Company.',
        '9.2 While working with the Company, you must abide by its rules on conduct, discipline, and other policies and keep all information confidential.',
        "9.3 You are employed full-time by the Company. You may not be employed by any other company, provide services, with or without pay, to any natural person, legal entity, or public authority, or engage in your own business without the Company's prior written permission.",
        '9.4 The Company may dismiss you from employment without notice for any of the following reasons, including, but not limited to, the matters described above:',
        "A. Theft<br/>B. Violent behavior<br/>C. Disclosure of Company information to third parties<br/>D. Ignoring the Company's security policy<br/>E. g., going to work under the influence of drugs or alcohol<br/>E. Intentionally damaging Company property<br/>C. Any unethical behavior<br/>H. Violating Company policy",
        '9.5 The terms of this letter are strictly confidential between you and the Company, and any breach of this trust will be taken very seriously.',
        '9.6 Your appointment will be effective from the date of actual joining.',
        f'We wish you a long and happy association with the M/s. {firm_text} family.',
        'Thank you. Yours faithfully.',
    ]: add(clause)
    story.append(PageBreak())
    add(f'I accept this offer of employment with M/s. {firm_text} in accordance with the terms and conditions outlined above and the enclosed job description.')
    add(f'Name: {name_text}<br/><br/>Date: {safe(shown_date)}')
    story.append(Spacer(1, 72))
    story.append(Spacer(1, 22))
    def amount(key): return safe(breakup.get(key) or '')
    rows = [
        ['OFFER LETTER','','','',''],
        ['Name of Employee','',name_text,'',''],
        ['Sr No.','Compensation Particulars','Proposed','Designation',''],
        ['','','Monthly',safe(role),''],
        ['1','Basic',amount('basic'),'',''],
        ['2','VDA',amount('vda'),'',''],
        ['3','HRA',amount('hra'),'',''],
        ['4','SPECIAL ALLOWANCE',amount('special'),'',''],
        ['5','LWW',amount('leave'),'',''],
        ['6','BONUS',amount('bonus'),'PF 12% Ded',amount('employee_pf')],
        ['7','PF(13% OF BASIC)',amount('employer_pf'),'ESIC(.75%)',amount('employee_esic')],
        ['8','ESIC (3.25% on GROSS)',amount('employer_esic'),'PT',amount('professional_tax')],
        ['9','MLWF',amount('mlwf'),'Total Deduction',amount('total_deduction')],
        ['', 'CTC(A+B)',safe(salary),'Net Take home',amount('take_home')],
    ]
    cells = [[p(cell, small) for cell in row] for row in rows]
    table = Table(cells, colWidths=[40,175,80,120,75], rowHeights=[28,34,28,26]+[29]*10, hAlign='LEFT')
    table.setStyle(TableStyle([
        ('SPAN',(0,0),(-1,0)),('SPAN',(0,1),(1,1)),('SPAN',(2,1),(4,1)),
        ('SPAN',(0,2),(0,3)),('SPAN',(1,2),(1,3)),('SPAN',(3,2),(4,2)),('SPAN',(3,3),(4,3)),
        ('GRID',(0,0),(-1,-1),0.75,colors.black),('VALIGN',(0,0),(-1,-1),'MIDDLE'),
        ('LEFTPADDING',(0,0),(-1,-1),6),('RIGHTPADDING',(0,0),(-1,-1),5),
    ]))
    story.append(table)
    doc = SimpleDocTemplate(output, pagesize=A4, leftMargin=52, rightMargin=52,
                            topMargin=155, bottomMargin=48, title=f'Appointment letter - {name}')
    doc.build(story, onFirstPage=header)
    output.seek(0)
    return output
