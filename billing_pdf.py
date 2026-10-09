"""Printable payroll, bank-payment lists and contractor invoices."""
from decimal import Decimal, ROUND_HALF_UP
from io import BytesIO
from pathlib import Path
from xml.sax.saxutils import escape
import json
from contractor_profiles import CONTRACTOR_PROFILES
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, Image

FONT_DIR=Path(__file__).parent/'static'/'appointment'
for name,file in [('Billing','NotoSans-Regular.ttf'),('BillingBold','NotoSans-Bold.ttf')]:
    if name not in pdfmetrics.getRegisteredFontNames():pdfmetrics.registerFont(TTFont(name,str(FONT_DIR/file)))
INK=colors.HexColor('#172d48'); LIGHT=colors.HexColor('#eaf0f6'); LINE=colors.HexColor('#c1ccd8')

def p(value,size=8,bold=False):
    return Paragraph(escape(str(value or '')).replace('\n','<br/>'),ParagraphStyle('cell',fontName='BillingBold' if bold else 'Billing',fontSize=size,leading=size*1.4,textColor=INK,spaceAfter=0,wordWrap='CJK'))

def amount(v):return f"{Decimal(str(v)).quantize(Decimal('.01'),rounding=ROUND_HALF_UP):,.2f}"

def table(headers,rows,widths,size=7,right=()):
    cells=[[p(h,size,True) for h in headers]]+[[p(v,size) for v in row] for row in rows]
    t=Table(cells,colWidths=widths,repeatRows=1,hAlign='LEFT')
    commands=[('BACKGROUND',(0,0),(-1,0),LIGHT),('VALIGN',(0,0),(-1,-1),'TOP'),('GRID',(0,0),(-1,-1),.4,LINE),('LEFTPADDING',(0,0),(-1,-1),5),('RIGHTPADDING',(0,0),(-1,-1),5),('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6)]
    for col in right:
        for row in cells[1:]:row[col].style=ParagraphStyle('number',parent=row[col].style,alignment=2)
    t.setStyle(TableStyle(commands));return t

def footer(canvas,doc):
    canvas.saveState();canvas.setFont('Billing',7);canvas.setFillColor(INK)
    canvas.drawString(doc.leftMargin,20,'Page '+str(doc.page));canvas.drawRightString(doc.pagesize[0]-doc.rightMargin,20,'DW · Billing & Payroll');canvas.restoreState()

def report_pdf(batch,mode,kind,headers,data,items):
    out=BytesIO();page=landscape(A4);width=page[0]-56
    doc=SimpleDocTemplate(out,pagesize=page,rightMargin=28,leftMargin=28,topMargin=26,bottomMargin=36)
    def heading(section):
        return [p(batch['contractor'],16,True),Spacer(1,5),p(f"{mode.upper()} {kind.upper()} · {batch['month']} · {batch['department']}",10,True),p(f"{section} · {batch['status']}",8),Spacer(1,12)]
    if kind=='bank':
        story=heading('Bank payment list')
        weights=[.04,.085,.135,.14,.17,.12,.12,.115,.075];weights=[x/sum(weights)*width for x in weights]
        story.append(table(headers,data,weights,6.7,right=(1,)))
        story.extend([Spacer(1,15),p(f"Payment date: {batch['payment_date']}     Cheque / reference: {batch['cheque'] or '—'}",9),Spacer(1,30),p('Authorized signature / stamp',9)])
    else:
        # Three readable sections; full detail is also available in one Excel sheet.
        sections=[('Earnings',[0,1,2,3,4,5,6,7,8,9,10,11,12,13]),
                  ('Deductions & net pay',[0,1,13,14,15,16,17,18,19,20,21]),
                  ('Employer contributions & cost'+(' estimate' if batch['profile']=='zinc' else ''),[0,1,13,22,23,24,25,26])]
        story=[]
        for si,(label,cols) in enumerate(sections):
            if si:story.append(PageBreak())
            story+=heading(label)
            selected=[[row[i] for i in cols] for row in data]
            n=len(cols);namewidth=122;codewidth=65;other=(width-namewidth-codewidth)/(n-2)
            widths=[codewidth,namewidth]+[other]*(n-2)
            story.append(table([headers[i] for i in cols],selected,widths,6.5 if n>11 else 7.5,right=tuple(range(2,n))))
    doc.build(story,onFirstPage=footer,onLaterPages=footer);out.seek(0);return out

def make_invoice(invoice,totals):
    out=BytesIO();doc=SimpleDocTemplate(out,pagesize=A4,rightMargin=38,leftMargin=38,topMargin=32,bottomMargin=40)
    width=A4[0]-76;subtotal,taxes,total=totals
    profile=CONTRACTOR_PROFILES[invoice['contractor']]
    header=Image(str(Path(__file__).parent/'static'/profile['header']))
    header.drawHeight=width*header.imageHeight/header.imageWidth;header.drawWidth=width
    story=[header,Spacer(1,12),p('TAX INVOICE'+(' · DRAFT' if invoice['status']=='Draft' else ''),17,True),Spacer(1,8),p('GSTIN: '+(invoice['seller_gstin'] or '—'),9),Spacer(1,12)]
    if invoice['seller_address']!=profile['address']:
        story.extend([p('Seller address on saved invoice: '+invoice['seller_address'],8),Spacer(1,8)])
    story.append(table(['Invoice details','Bill to'],[[f"Invoice no.: {invoice['invoice_no']}\nDate: {invoice['invoice_date']}\nPO: {invoice['po_number'] or '—'}",f"{invoice['buyer']}\n{invoice['buyer_address']}\nGSTIN: {invoice['buyer_gstin'] or '—'}"]],[width*.44,width*.56],9))
    story.append(Spacer(1,18));rows=[]
    for i,line in enumerate(json.loads(invoice['lines']),1):
        rows.append([i,line['description'],line['sac'],line['quantity'],amount(line['rate']),amount(Decimal(line['quantity'])*Decimal(line['rate']))])
    story.append(table(['No.','Description / work period','SAC','Quantity','Rate (₹)','Amount (₹)'],rows,[25,width-265,50,60,60,70],8,right=(3,4,5)))
    sums=[['Taxable value',amount(subtotal)]]+[[f"{key.upper()} @ {invoice[key]}%",amount(value)] for key,value in taxes.items()]+[['Round off',amount(total-subtotal-sum(taxes.values()))],['TOTAL (₹)',amount(total)]]
    story.extend([Spacer(1,14),table(['Summary','Amount (₹)'],sums,[width-115,115],9,right=(1,)),Spacer(1,18),p(f"Bank account: {invoice['bank_account'] or '—'}\nIFSC: {invoice['ifsc'] or '—'}",9),KeepTogether([Spacer(1,24),p('For '+invoice['contractor'],9,True),Spacer(1,26),p('Authorized signature / stamp',9)])])
    doc.build(story,onFirstPage=footer,onLaterPages=footer);out.seek(0);return out
