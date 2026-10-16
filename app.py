import os
from functools import lru_cache
import gzip
import re
import sqlite3
import time
import json
from queue import Queue, Empty, Full
from threading import Lock
from datetime import datetime
from io import BytesIO
from zipfile import ZipFile, ZIP_DEFLATED
from xml.sax.saxutils import escape as xml_escape
from flask import Flask, render_template, request, redirect, url_for, jsonify, session, flash, abort, send_file, Response, stream_with_context

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'jsw_workforce.db')

app = Flask(__name__)
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'change-this-secret-before-production')
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
    SESSION_COOKIE_SECURE=os.environ.get('FLASK_ENV') == 'production',
    MAX_CONTENT_LENGTH=4 * 1024 * 1024,
    SEND_FILE_MAX_AGE_DEFAULT=3600,
)



@lru_cache(maxsize=32)
def compressed_asset(content):
    return gzip.compress(content,compresslevel=5,mtime=0)


@app.after_request
def security_headers(response):
    """Lightweight app-level headers. A production reverse proxy/WAF should add stricter policy."""
    response.headers.setdefault('X-Content-Type-Options', 'nosniff')
    response.headers.setdefault('X-Frame-Options', 'SAMEORIGIN')
    response.headers.setdefault('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.setdefault('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), xr-spatial-tracking=(self)')
    if request.path.startswith('/static/'):
        response.headers.setdefault('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
    else:
        response.headers.setdefault('Cache-Control', 'no-store' if request.path.startswith('/admin') or request.path == '/login' else 'private, max-age=0')
    if request.path.startswith('/static/') and response.status_code==200 and not request.headers.get('Range') and response.mimetype in ('text/css','application/javascript','text/javascript') and request.accept_encodings['gzip']>0:
        import gzip
        response.direct_passthrough=False
        content=response.get_data()
        if len(content)>1024:
            response.set_data(compressed_asset(content))
            response.headers['Content-Encoding']='gzip'
            response.vary.add('Accept-Encoding')
            if response.get_etag()[0]:response.set_etag(response.get_etag()[0],weak=True)
    return response

# Demo-friendly fallback. Set ADMIN_PASSWORD in the environment before real deployment.
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'devaenterprises@123')
ALLOWED_STATUSES = {'New Request', 'Form Ready', 'Processed', 'Approved', 'Joined'}
CONTRACTORS = ('Deva Enterprises', 'Shubham Services', 'Prabhuram & Bichare')
TOTAL_MANPOWER = 400  # Project-provided combined current manpower figure.
CONTRACTOR_NETWORK_LEAD = 'Dhananjay Vichare'  # Project-provided contractor owner / management lead.
VASIND_SITE_SUPERVISOR = os.environ.get('VASIND_SITE_SUPERVISOR', 'Safkat Husin').strip()  # Common personal supervisor for the three contractor firms.
PROCESS_TIME = '3–8 days'
PUNCH_CARD_TIME = '10–15 days'

# Public demo motion room used only for anonymous animation signals.
# It intentionally carries no applicant data or personal identifiers.
MOTION_CLIENTS = set()
MOTION_CLIENTS_LOCK = Lock()

def motion_room_broadcast(event_name, payload):
    packet = {'event': event_name, 'payload': payload}
    dead = []
    with MOTION_CLIENTS_LOCK:
        clients = list(MOTION_CLIENTS)
    for q in clients:
        try:
            q.put_nowait(packet)
        except Full:
            # Drop stale animation events instead of blocking request threads.
            try:
                q.get_nowait()
                q.put_nowait(packet)
            except Exception:
                dead.append(q)
    if dead:
        with MOTION_CLIENTS_LOCK:
            for q in dead:
                MOTION_CLIENTS.discard(q)

def motion_room_count():
    with MOTION_CLIENTS_LOCK:
        return len(MOTION_CLIENTS)

# RAMCO export defaults supplied for the Vasind onboarding sheet.
RAMCO_DEFAULTS = {
    'supplier_name': 'MVS ACMEI TECHNOLOGIES PVT LTD',
    'present_address_line1': 'G1/01, VBHC HILL VIEW SARMAL',
    'present_town': 'VASIND',
    'present_city': 'KALYAN',
    'present_state': 'MAHARASHTRA',
    'present_country': 'INDIA',
    'present_zip': '421601',
    'language': 'HINDI/ENGLISH',
    'religion': 'HINDU',
    'proficiency': 'JOB',
    'category': 'OPERATION',
    'nationality': 'INDIAN',
    'work_location': 'VASIND',
    'wc_policy_no': 'ILG65601',
}
DEPARTMENTS = (
    'CCL', 'CGL', 'ZINC POT', 'JSW RAILSIDE'
)


def get_db():
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA busy_timeout = 10000')
    conn.execute('PRAGMA foreign_keys = ON')
    return conn


def ensure_applicant_schema(conn):
    """Ensure all fields used by the processing screen exist, even with an older DB file."""
    required = {
        'dob':'TEXT','aadhar':'TEXT','doj':'TEXT','blood_group':'TEXT','uan':'TEXT','esic':'TEXT',
        'father_name':'TEXT','mother_name':'TEXT','wife_name':'TEXT','alt_mobile':'TEXT',
        'religion':'TEXT','caste':'TEXT','marital_status':'TEXT','department':'TEXT','designation':'TEXT',
        'identification_mark':'TEXT','place':'TEXT','experience':'TEXT','reference':'TEXT','relation':'TEXT',
        'replacement_for':'TEXT','perm_village':'TEXT','perm_post':'TEXT','perm_taluka':'TEXT',
        'perm_district':'TEXT','perm_state':'TEXT','perm_pin':'TEXT','interview_date':'TEXT','status':'TEXT',
        'gender':'TEXT','present_address_line1':'TEXT','emergency_contact_name':'TEXT','emergency_relationship':'TEXT',
        'lang1_name':'TEXT','lang1_read':'TEXT','lang1_write':'TEXT','lang1_speak':'TEXT',
        'lang2_name':'TEXT','lang2_read':'TEXT','lang2_write':'TEXT','lang2_speak':'TEXT',
        'lang3_name':'TEXT','lang3_read':'TEXT','lang3_write':'TEXT','lang3_speak':'TEXT',
        'qualification_level': 'TEXT', 'qualification_trade': 'TEXT', 'qualification_institute': 'TEXT',
        'qualification_marks': 'TEXT', 'qualification_percentage': 'TEXT', 'qualification_grade': 'TEXT', 'qualification_year': 'TEXT',
        'assessment_company': 'TEXT', 'assessment_location': 'TEXT',
        'appointment_salary': 'TEXT', 'appointment_issue_date': 'TEXT', 'appointment_location': 'TEXT',
        'appointment_breakup': 'TEXT',
        'father_age': 'TEXT', 'father_education': 'TEXT', 'father_occupation': 'TEXT', 'father_income': 'TEXT',
        'mother_age': 'TEXT', 'mother_education': 'TEXT', 'mother_occupation': 'TEXT', 'mother_income': 'TEXT'
    }
    existing = {row['name'] for row in conn.execute('PRAGMA table_info(applicants)').fetchall()}
    for col, col_type in required.items():
        if col not in existing:
            default = " DEFAULT 'New Request'" if col == 'status' else ''
            conn.execute(f'ALTER TABLE applicants ADD COLUMN {col} {col_type}{default}')
    conn.commit()


def save_processing_record(app_id, form):
    """Persist processing fields with schema repair and short retry for SQLite locks."""
    raw_aadhaar = re.sub(r'\D', '', form.get('aadhar', '') or '')
    raw_uan = re.sub(r'\D', '', form.get('uan', '') or '')
    raw_alt_mobile = re.sub(r'\D', '', form.get('alt_mobile', '') or '')
    if raw_aadhaar and not is_valid_aadhaar(raw_aadhaar):
        raise ValueError('Aadhaar number failed the 12-digit checksum validation.')
    if raw_uan and not is_valid_uan(raw_uan):
        raise ValueError('UAN must contain exactly 12 digits. EPFO existence verification is separate.')
    if raw_alt_mobile and not is_valid_indian_mobile(raw_alt_mobile):
        raise ValueError('Alternate mobile number must be a valid 10-digit Indian mobile number.')
    values = {
        'assessment_company': clean_text(form.get('assessment_company'), upper=True, max_len=180),
        'assessment_location': clean_text(form.get('assessment_location'), upper=True, max_len=180),
        'appointment_salary': clean_text(form.get('appointment_salary'), max_len=100),
        'appointment_issue_date': clean_text(form.get('appointment_issue_date'), max_len=20),
        'appointment_location': clean_text(form.get('appointment_location'), max_len=180),
        'father_age': clean_text(form.get('father_age'), max_len=20),
        'father_education': clean_text(form.get('father_education'), max_len=60),
        'father_occupation': clean_text(form.get('father_occupation'), max_len=80),
        'father_income': clean_text(form.get('father_income'), max_len=40),
        'mother_age': clean_text(form.get('mother_age'), max_len=20),
        'mother_education': clean_text(form.get('mother_education'), max_len=60),
        'mother_occupation': clean_text(form.get('mother_occupation'), max_len=80),
        'mother_income': clean_text(form.get('mother_income'), max_len=40),
        'dob': clean_text(form.get('dob'), max_len=20),
        'aadhar': re.sub(r'\D', '', form.get('aadhar', ''))[:12],
        'doj': clean_text(form.get('doj'), max_len=20),
        'blood_group': clean_text(form.get('blood_group'), upper=True, max_len=10),
        'uan': clean_text(form.get('uan'), max_len=30),
        'esic': clean_text(form.get('esic'), max_len=30),
        'father_name': clean_text(form.get('father_name'), upper=True),
        'mother_name': clean_text(form.get('mother_name'), upper=True),
        'wife_name': clean_text(form.get('wife_name'), upper=True),
        'alt_mobile': clean_mobile(form.get('alt_mobile')),
        'religion': clean_text(form.get('religion'), upper=True, max_len=50),
        'caste': clean_text(form.get('caste'), upper=True, max_len=50),
        'marital_status': clean_text(form.get('marital_status'), upper=True, max_len=30),
        'department': clean_text(form.get('department'), upper=True, max_len=100),
        'designation': clean_text(form.get('designation'), upper=True, max_len=120),
        'identification_mark': clean_text(form.get('identification_mark'), upper=True, max_len=180),
        'place': clean_text(form.get('place'), upper=True, max_len=100),
        'experience': clean_text(form.get('experience'), upper=True, max_len=180),
        'reference': clean_text(form.get('reference'), upper=True, max_len=120),
        'relation': clean_text(form.get('relation'), upper=True, max_len=80),
        'replacement_for': clean_text(form.get('replacement_for'), upper=True, max_len=120),
        'perm_village': clean_text(form.get('perm_village'), upper=True, max_len=100),
        'perm_post': clean_text(form.get('perm_post'), upper=True, max_len=100),
        'perm_taluka': clean_text(form.get('perm_taluka'), upper=True, max_len=100),
        'perm_district': clean_text(form.get('perm_district'), upper=True, max_len=100),
        'perm_state': clean_text(form.get('perm_state'), upper=True, max_len=100),
        'perm_pin': re.sub(r'\D', '', form.get('perm_pin', ''))[:6],
        'gender': clean_text(form.get('gender'), upper=True, max_len=20),
        'present_address_line1': clean_text(form.get('present_address_line1'), upper=True, max_len=220),
        'emergency_contact_name': clean_text(form.get('emergency_contact_name'), upper=True, max_len=120),
        'emergency_relationship': clean_text(form.get('emergency_relationship'), upper=True, max_len=60),
        'lang1_name': clean_text(form.get('lang1_name') or 'HINDI', upper=True, max_len=40),
        'lang1_read': 'YES' if form.get('lang1_read') else 'NO',
        'lang1_write': 'YES' if form.get('lang1_write') else 'NO',
        'lang1_speak': 'YES' if form.get('lang1_speak') else 'NO',
        'lang2_name': clean_text(form.get('lang2_name'), upper=True, max_len=40),
        'lang2_read': 'YES' if form.get('lang2_read') else 'NO',
        'lang2_write': 'YES' if form.get('lang2_write') else 'NO',
        'lang2_speak': 'YES' if form.get('lang2_speak') else 'NO',
        'lang3_name': clean_text(form.get('lang3_name'), upper=True, max_len=40),
        'lang3_read': 'YES' if form.get('lang3_read') else 'NO',
        'lang3_write': 'YES' if form.get('lang3_write') else 'NO',
        'lang3_speak': 'YES' if form.get('lang3_speak') else 'NO',
        'qualification_level': clean_text(form.get('qualification_level'), upper=True, max_len=80),
        'qualification_trade': clean_text(form.get('qualification_trade'), upper=True, max_len=120),
        'qualification_institute': clean_text(form.get('qualification_institute'), upper=True, max_len=180),
        'qualification_marks': clean_text(form.get('qualification_marks'), upper=True, max_len=40),
        'qualification_percentage': clean_text(form.get('qualification_percentage'), upper=True, max_len=20),
        'qualification_grade': clean_text(form.get('qualification_grade'), upper=True, max_len=30),
        'qualification_year': clean_text(form.get('qualification_year'), upper=True, max_len=10),
        'interview_date': datetime.now().strftime('%d.%m.%Y'),
    }
    last_exc = None
    for attempt in range(3):
        conn = get_db()
        try:
            ensure_applicant_schema(conn)
            row = conn.execute('SELECT status FROM applicants WHERE id=?', (app_id,)).fetchone()
            if not row:
                raise LookupError('Candidate record no longer exists.')
            assignments = ', '.join(f'{col}=?' for col in values)
            params = list(values.values()) + [app_id]
            conn.execute(f'UPDATE applicants SET {assignments} WHERE id=?', params)
            if (row['status'] or 'New Request') == 'New Request':
                conn.execute("UPDATE applicants SET status='Form Ready' WHERE id=?", (app_id,))
            conn.commit()
            return
        except sqlite3.OperationalError as exc:
            last_exc = exc
            conn.rollback()
            if 'locked' not in str(exc).lower() or attempt == 2:
                raise
            time.sleep(0.18 * (attempt + 1))
        finally:
            conn.close()
    if last_exc:
        raise last_exc


def clean_text(value, upper=False, max_len=160):
    value = (value or '').strip()
    value = re.sub(r'\s+', ' ', value)
    value = value[:max_len]
    return value.upper() if upper else value


def clean_mobile(value):
    digits = re.sub(r'\D', '', value or '')
    return digits[-10:] if len(digits) >= 10 else digits


# V25: local format/checksum validation only. These checks do not query UIDAI/EPFO databases.
def is_valid_indian_mobile(value):
    digits = re.sub(r'\D', '', value or '')
    return bool(re.fullmatch(r'[6-9]\d{9}', digits))


def is_valid_verhoeff(value):
    digits = re.sub(r'\D', '', value or '')
    if not digits:
        return False
    d = (
        (0,1,2,3,4,5,6,7,8,9),(1,2,3,4,0,6,7,8,9,5),(2,3,4,0,1,7,8,9,5,6),(3,4,0,1,2,8,9,5,6,7),(4,0,1,2,3,9,5,6,7,8),
        (5,9,8,7,6,0,4,3,2,1),(6,5,9,8,7,1,0,4,3,2),(7,6,5,9,8,2,1,0,4,3),(8,7,6,5,9,3,2,1,0,4),(9,8,7,6,5,4,3,2,1,0),
    )
    p = (
        (0,1,2,3,4,5,6,7,8,9),(1,5,7,6,2,8,3,0,9,4),(5,8,0,3,7,9,6,1,4,2),(8,9,1,6,0,4,3,5,2,7),
        (9,4,5,3,1,2,6,8,7,0),(4,2,8,6,5,7,3,9,0,1),(2,7,9,3,8,0,6,4,1,5),(7,0,4,6,9,1,3,2,5,8),
    )
    c = 0
    try:
        for i, ch in enumerate(reversed(digits)):
            c = d[c][p[i % 8][int(ch)]]
    except (ValueError, IndexError):
        return False
    return c == 0


def is_valid_aadhaar(value):
    digits = re.sub(r'\D', '', value or '')
    return len(digits) == 12 and digits[0] not in {'0', '1'} and is_valid_verhoeff(digits)


def is_valid_uan(value):
    # UAN is a 12-digit identifier. This is format validation only;
    # existence/ownership must be verified through authorised EPFO services.
    digits = re.sub(r'\D', '', value or '')
    return len(digits) == 12


def wants_json_request():
    return (
        request.headers.get('Accept') == 'application/json'
        or request.headers.get('X-Requested-With') == 'fetch'
    )


def require_admin():
    if not session.get('admin_logged_in'):
        if wants_json_request():
            return jsonify({
                'ok': False,
                'message': 'Admin session expired. Please sign in again.',
                'login_url': url_for('login')
            }), 401
        return redirect(url_for('login'))
    return None


def init_db():
    conn = get_db()
    # WAL lets readers continue while a short write transaction commits.
    conn.execute('PRAGMA journal_mode=WAL')
    conn.execute('''CREATE TABLE IF NOT EXISTS applicants (
        id INTEGER PRIMARY KEY AUTOINCREMENT, full_name TEXT, mobile TEXT, qualification TEXT,
        contractor TEXT, requested_role TEXT, skill_level TEXT, dob TEXT, aadhar TEXT, doj TEXT,
        blood_group TEXT, uan TEXT, esic TEXT, father_name TEXT, mother_name TEXT, wife_name TEXT,
        alt_mobile TEXT, permanent_address TEXT, religion TEXT, caste TEXT, marital_status TEXT,
        department TEXT, designation TEXT, identification_mark TEXT, place TEXT,
        status TEXT DEFAULT 'New Request', interview_date TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, experience TEXT, reference TEXT,
        relation TEXT, replacement_for TEXT,
        perm_village TEXT, perm_post TEXT, perm_taluka TEXT, perm_district TEXT, perm_state TEXT, perm_pin TEXT)''')

    conn.execute('''CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, contractor TEXT, skill_level TEXT,
        salary TEXT, description TEXT, is_highlighted BOOLEAN DEFAULT 0)''')

    conn.execute('''CREATE TABLE IF NOT EXISTS news (
        id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')

    conn.execute('''CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, phone TEXT, message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)''')

    if conn.execute('SELECT COUNT(*) FROM roles').fetchone()[0] == 0:
        initial_roles = [
            ('Packer / Helper', 'Deva Enterprises', 'Unskilled', '₹12,000 – ₹16,000 / mo', 'Industrial material handling and packaging operations.', 0),
            ('APL Operator', 'Deva Enterprises', 'Skilled', '₹18,000 – ₹26,000 / mo', 'Continuous annealing and processing line machinery operation.', 0),
            ('Shift Incharge', 'Shubham Services', 'Highly Skilled', '₹25,000 – ₹32,000 / mo', 'Floor coordination and contractor operations support.', 1),
            ('Overhead Crane Operator', 'Prabhuram & Bichare', 'Skilled', '₹18,000 – ₹25,000 / mo', 'Heavy coil lifting and transfer-bay operations.', 0),
        ]
        conn.executemany('INSERT INTO roles (title, contractor, skill_level, salary, description, is_highlighted) VALUES (?, ?, ?, ?, ?, ?)', initial_roles)

    # Automatic schema migration for users upgrading from older portal ZIPs.
    required_applicant_columns = {
        'alt_mobile': 'TEXT', 'permanent_address': 'TEXT', 'religion': 'TEXT', 'caste': 'TEXT',
        'marital_status': 'TEXT', 'department': 'TEXT', 'designation': 'TEXT',
        'identification_mark': 'TEXT', 'place': 'TEXT', 'experience': 'TEXT', 'reference': 'TEXT',
        'relation': 'TEXT', 'replacement_for': 'TEXT', 'perm_village': 'TEXT', 'perm_post': 'TEXT',
        'perm_taluka': 'TEXT', 'perm_district': 'TEXT', 'perm_state': 'TEXT', 'perm_pin': 'TEXT',
        'interview_date': 'TEXT', 'gender': 'TEXT', 'present_address_line1': 'TEXT',
        'emergency_contact_name': 'TEXT', 'emergency_relationship': 'TEXT',
        'lang1_name': 'TEXT', 'lang1_read': 'TEXT', 'lang1_write': 'TEXT', 'lang1_speak': 'TEXT',
        'lang2_name': 'TEXT', 'lang2_read': 'TEXT', 'lang2_write': 'TEXT', 'lang2_speak': 'TEXT',
        'lang3_name': 'TEXT', 'lang3_read': 'TEXT', 'lang3_write': 'TEXT', 'lang3_speak': 'TEXT',
        'qualification_level': 'TEXT', 'qualification_trade': 'TEXT', 'qualification_institute': 'TEXT',
        'qualification_marks': 'TEXT', 'qualification_percentage': 'TEXT', 'qualification_grade': 'TEXT', 'qualification_year': 'TEXT'
    }
    existing_columns = {row['name'] for row in conn.execute('PRAGMA table_info(applicants)').fetchall()}
    for col, col_type in required_applicant_columns.items():
        if col not in existing_columns:
            conn.execute(f'ALTER TABLE applicants ADD COLUMN {col} {col_type}')
    ensure_applicant_schema(conn)
    conn.commit()
    conn.close()

def lookup_application_status(mobile_value):
    mobile = clean_mobile(mobile_value)
    if not is_valid_indian_mobile(mobile):
        return {'found': False, 'message': 'Enter a valid 10-digit mobile number.'}
    conn = get_db()
    app_data = conn.execute('''SELECT full_name, requested_role, designation, status
                               FROM applicants WHERE mobile=? ORDER BY id DESC LIMIT 1''', (mobile,)).fetchone()
    conn.close()
    if not app_data:
        return {'found': False, 'message': 'No application was found for that mobile number.'}
    status = app_data['status'] or 'New Request'
    stage_map = {'New Request': 0, 'Form Ready': 1, 'Processed': 2, 'Approved': 3, 'Joined': 4}
    return {
        'found': True,
        'name': app_data['full_name'],
        'role': app_data['designation'] or app_data['requested_role'],
        'status': status,
        'stage_index': stage_map.get(status, 0),
        'stages': ['Received', 'Form Ready', 'Processed', 'Approved', 'Joined']
    }


def build_applicants_xlsx(headers, rows, sheet_name='Workforce Records'):
    """Build a compact .xlsx workbook using only the Python standard library."""
    def cell_ref(col_idx, row_idx):
        n = col_idx + 1
        letters = ''
        while n:
            n, rem = divmod(n - 1, 26)
            letters = chr(65 + rem) + letters
        return f'{letters}{row_idx}'

    def inline_cell(ref, value, style=0):
        value = '' if value is None else str(value)
        value = xml_escape(value)
        return f'<c r="{ref}" t="inlineStr" s="{style}"><is><t xml:space="preserve">{value}</t></is></c>'

    sheet_rows = []
    sheet_rows.append('<row r="1" ht="26" customHeight="1">' + ''.join(
        inline_cell(cell_ref(i, 1), header, 1) for i, header in enumerate(headers)
    ) + '</row>')
    for r_idx, row in enumerate(rows, start=2):
        sheet_rows.append(f'<row r="{r_idx}">' + ''.join(
            inline_cell(cell_ref(i, r_idx), value, 0) for i, value in enumerate(row)
        ) + '</row>')

    last_col = cell_ref(len(headers) - 1, 1)[:-1]
    default_widths = [8,24,16,18,24,24,24,16,20,16,14,14,18,18,18,16,22,22,22,16,22,20,18,18,22,18,18,18,18,18,18,20,20,20,24,18,18,20]
    cols_xml = ''.join(
        f'<col min="{i}" max="{i}" width="{default_widths[i-1] if i-1 < len(default_widths) else 18}" customWidth="1"/>'
        for i in range(1, len(headers) + 1)
    )

    sheet_xml = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  <cols>{cols_xml}</cols>
  <sheetData>{''.join(sheet_rows)}</sheetData>
  <autoFilter ref="A1:{last_col}{max(1, len(rows)+1)}"/>
</worksheet>'''

    content_types = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>'''
    root_rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>'''
    workbook_xml = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="{xml_escape(sheet_name[:31])}" sheetId="1" r:id="rId1"/></sheets>
</workbook>'''
    workbook_rels = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>'''
    styles_xml = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2"><font><sz val="10"/><name val="Aptos"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="10"/><name val="Aptos"/></font></fonts>
  <fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0B2A44"/><bgColor indexed="64"/></patternFill></fill></fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf></cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>'''

    out = BytesIO()
    with ZipFile(out, 'w', ZIP_DEFLATED) as zf:
        zf.writestr('[Content_Types].xml', content_types)
        zf.writestr('_rels/.rels', root_rels)
        zf.writestr('xl/workbook.xml', workbook_xml)
        zf.writestr('xl/_rels/workbook.xml.rels', workbook_rels)
        zf.writestr('xl/styles.xml', styles_xml)
        zf.writestr('xl/worksheets/sheet1.xml', sheet_xml)
    out.seek(0)
    return out


init_db()


@app.route('/')
def landing_page():
    conn = get_db()
    news = conn.execute('SELECT * FROM news ORDER BY id DESC LIMIT 3').fetchall()
    roles = conn.execute('SELECT * FROM roles ORDER BY is_highlighted DESC, contractor, title').fetchall()
    all_roles = conn.execute('SELECT id, title, contractor, skill_level, description FROM roles ORDER BY contractor, title').fetchall()
    contractor_roles = {contractor: [] for contractor in CONTRACTORS}
    for role in all_roles:
        contractor_roles.setdefault(role['contractor'], []).append(role)
    conn.close()
    return render_template(
        'landing.html',
        news=news,
        featured_roles=roles,
        contractor_roles=contractor_roles,
        total_manpower=TOTAL_MANPOWER,
        contractor_network_lead=CONTRACTOR_NETWORK_LEAD,
        site_supervisor=VASIND_SITE_SUPERVISOR,
        process_time=PROCESS_TIME,
        punch_card_time=PUNCH_CARD_TIME,
        departments=DEPARTMENTS,
    )


@app.route('/contractors')
def contractors_page():
    conn = get_db()
    contractor_stats = []
    for contractor in CONTRACTORS:
        roles = conn.execute('''SELECT id, title, skill_level, description, is_highlighted
                                FROM roles WHERE contractor=?
                                ORDER BY is_highlighted DESC, title''', (contractor,)).fetchall()
        contractor_stats.append({'name': contractor, 'roles': roles})
    conn.close()
    return render_template('contractors.html', contractor_stats=contractor_stats, total_manpower=TOTAL_MANPOWER, contractor_network_lead=CONTRACTOR_NETWORK_LEAD, site_supervisor=VASIND_SITE_SUPERVISOR, departments=DEPARTMENTS)


@app.route('/jobs')
def jobs_page():
    conn = get_db()
    roles = conn.execute('SELECT * FROM roles ORDER BY contractor, is_highlighted DESC, title').fetchall()
    conn.close()
    grouped_roles = {}
    for role in roles:
        grouped_roles.setdefault(role['contractor'], []).append(role)
    return render_template('jobs.html', grouped_roles=grouped_roles, all_roles=roles)


@app.route('/apply_form')
def apply_form():
    conn = get_db()
    roles = conn.execute('SELECT * FROM roles ORDER BY contractor, title').fetchall()
    conn.close()
    grouped_roles = {}
    for role in roles:
        grouped_roles.setdefault(role['contractor'], []).append(role)
    return render_template('application_form.html', grouped_roles=grouped_roles)


@app.route('/apply', methods=['POST'])
def apply():
    wants_json = request.headers.get('Accept') == 'application/json' or request.headers.get('X-Requested-With') == 'fetch'
    full_name = clean_text(request.form.get('full_name'), upper=True, max_len=120)
    mobile = clean_mobile(request.form.get('mobile'))
    qualification_level = clean_text(request.form.get('qualification_level'), upper=True, max_len=80)
    qualification_trade = clean_text(request.form.get('qualification_trade'), upper=True, max_len=120)
    qualification_institute = clean_text(request.form.get('qualification_institute'), upper=True, max_len=180)
    qualification_marks = clean_text(request.form.get('qualification_marks'), upper=True, max_len=40)
    qualification_percentage = clean_text(request.form.get('qualification_percentage'), upper=True, max_len=20)
    qualification_grade = clean_text(request.form.get('qualification_grade'), upper=True, max_len=30)
    qualification_year = clean_text(request.form.get('qualification_year'), upper=True, max_len=10)
    qualification = qualification_level
    if qualification_trade:
        qualification = f"{qualification_level} - {qualification_trade}"
    role_id = request.form.get('role_id', '').strip()

    if not full_name:
        if wants_json:
            return jsonify({'ok': False, 'field': 'full_name', 'message': 'Enter the candidate full name.'}), 400
        return 'Please provide a valid name, 10-digit mobile number, qualification and role.', 400
    if len(mobile) != 10:
        if wants_json:
            return jsonify({'ok': False, 'field': 'mobile', 'message': 'Enter a valid 10-digit mobile number.'}), 400
        return 'Please provide a valid name, 10-digit mobile number, qualification and role.', 400
    if not qualification:
        if wants_json:
            return jsonify({'ok': False, 'field': 'qualification', 'message': 'Enter the highest qualification.'}), 400
        return 'Please provide a valid name, 10-digit mobile number, qualification and role.', 400
    if not role_id.isdigit():
        if wants_json:
            return jsonify({'ok': False, 'field': 'role_id', 'message': 'Choose an open role.'}), 400
        return 'Please provide a valid name, 10-digit mobile number, qualification and role.', 400

    conn = get_db()
    role_data = conn.execute('SELECT * FROM roles WHERE id = ?', (role_id,)).fetchone()
    if not role_data:
        conn.close()
        if wants_json:
            return jsonify({'ok': False, 'field': 'role_id', 'message': 'Selected role does not exist.'}), 400
        return 'Selected role does not exist.', 400

    duplicate = conn.execute("""SELECT id FROM applicants
                                WHERE mobile=? AND requested_role=? AND status IN ('New Request','Form Ready','Processed')
                                ORDER BY id DESC LIMIT 1""", (mobile, role_data['title'])).fetchone()
    if duplicate:
        conn.close()
        if wants_json:
            return jsonify({
                'ok': True,
                'existing': True,
                'message': 'An active application already exists for this mobile number and role.',
                'status_url': url_for('status_page')
            })
        return redirect(url_for('jobs_page', applied='existing'))

    ensure_applicant_schema(conn)
    cur = conn.execute("""INSERT INTO applicants
                    (full_name, mobile, qualification, qualification_level, qualification_trade,
                     qualification_institute, qualification_marks, qualification_percentage,
                     qualification_grade, qualification_year, contractor, requested_role, skill_level, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'New Request')""",
                 (full_name, mobile, qualification, qualification_level, qualification_trade,
                  qualification_institute, qualification_marks, qualification_percentage,
                  qualification_grade, qualification_year, role_data['contractor'], role_data['title'],
                  role_data['skill_level']))
    applicant_id = cur.lastrowid
    conn.commit()
    conn.close()
    if wants_json:
        return jsonify({
            'ok': True,
            'applicant_id': applicant_id,
            'message': 'Application created. Keep the same mobile number to check progress.',
            'status_url': url_for('status_page')
        })
    return redirect(url_for('jobs_page', applied='true'))


@app.route('/contact', methods=['POST'])
def contact():
    name = clean_text(request.form.get('name'), max_len=100)
    phone = clean_mobile(request.form.get('phone'))
    message = clean_text(request.form.get('message'), max_len=1000)
    if name and message:
        conn = get_db()
        conn.execute('INSERT INTO messages (name, phone, message) VALUES (?, ?, ?)', (name, phone, message))
        conn.commit()
        conn.close()
    return redirect(url_for('landing_page') + '#contact')


@app.route('/api/motion-room/stream')
def motion_room_stream():
    """Server-Sent Events stream for anonymous shared animation pulses."""
    # Decorative live streams must not occupy a request thread per visitor.
    return Response(status=204)


@app.route('/api/motion-room/pulse', methods=['POST'])
def motion_room_pulse():
    """Broadcast a tiny anonymous visual event; no candidate data is accepted."""
    now = time.time()
    last = float(session.get('motion_last_pulse', 0) or 0)
    if now - last < 0.55:
        return jsonify({'ok': False, 'message': 'Please wait a moment before sending another pulse.'}), 429
    session['motion_last_pulse'] = now

    data = request.get_json(silent=True) or {}
    try:
        accent = max(0, min(3, int(data.get('accent', 0))))
    except (TypeError, ValueError):
        accent = 0
    payload = {
        'accent': accent,
        'stamp': int(now * 1000),
    }
    motion_room_broadcast('pulse', payload)
    return jsonify({'ok': True, 'count': motion_room_count()})


@app.route('/api/track_status', methods=['POST'])
def track_status():
    payload = request.get_json(silent=True) or request.form or {}
    value = payload.get('search_val') or payload.get('mobile') or ''
    return jsonify(lookup_application_status(value))


@app.route('/status', methods=['GET', 'POST'])
def status_page():
    status_result = None
    submitted_mobile = ''
    if request.method == 'POST':
        submitted_mobile = clean_mobile(request.form.get('mobile'))
        status_result = lookup_application_status(submitted_mobile)
    return render_template('status.html', status_result=status_result, submitted_mobile=submitted_mobile)


@app.route('/faq')
def faq_page():
    return render_template('faq.html')


@app.route('/privacy')
def privacy_page():
    return render_template('privacy.html')


@app.route('/login', methods=['GET', 'POST'])
def login():
    if session.get('admin_logged_in'):
        return redirect(url_for('admin_dashboard'))
    if request.method == 'POST':
        attempts = int(session.get('login_attempts', 0))
        if attempts >= 8:
            flash('Too many failed attempts in this session. Close the browser and try again later.', 'error')
            return render_template('login.html'), 429
        if request.form.get('password') == ADMIN_PASSWORD:
            session.clear()
            session['admin_logged_in'] = True
            session.permanent = False
            return redirect(url_for('admin_dashboard'))
        session['login_attempts'] = attempts + 1
        flash('Access denied: invalid security PIN.', 'error')
    return render_template('login.html')


@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('landing_page'))


@app.route('/admin')
def admin_dashboard():
    auth = require_admin()
    if auth:
        return auth

    search_query = clean_text(request.args.get('q'), max_len=100)
    selected_contractor = request.args.get('contractor', 'All')
    if selected_contractor not in ('All',) + CONTRACTORS:
        selected_contractor = 'All'

    conn = get_db()
    sql = 'SELECT * FROM applicants WHERE 1=1'
    params = []
    if selected_contractor != 'All':
        sql += ' AND contractor = ?'
        params.append(selected_contractor)
    if search_query:
        sql += ' AND (full_name LIKE ? OR mobile LIKE ? OR aadhar LIKE ? OR requested_role LIKE ? OR designation LIKE ?)'
        wildcard = f'%{search_query}%'
        params.extend([wildcard] * 5)
    matching_count=conn.execute(sql.replace('SELECT *','SELECT COUNT(*)'),params).fetchone()[0]
    pages=max(1,(matching_count+24)//25);page=max(1,min(request.args.get('page',1,type=int),pages))
    sql += ' ORDER BY id DESC LIMIT 25 OFFSET ?'
    applicants = conn.execute(sql, params+[(page-1)*25]).fetchall()

    rows = conn.execute('SELECT status FROM applicants').fetchall()
    total = len(rows)
    pending = sum(1 for row in rows if row['status'] == 'New Request')
    form_ready = sum(1 for row in rows if row['status'] in ('Form Ready', 'Processed'))
    approved = sum(1 for row in rows if row['status'] in ('Approved', 'Joined'))
    roles = conn.execute('SELECT * FROM roles ORDER BY contractor, is_highlighted DESC, title').fetchall()
    news = conn.execute('SELECT * FROM news ORDER BY id DESC').fetchall()
    messages = conn.execute('SELECT * FROM messages ORDER BY id DESC').fetchall()
    conn.close()

    return render_template('admin.html', applicants=applicants, total=total, pending=pending,
                           form_ready=form_ready, approved=approved, selected_contractor=selected_contractor,
                           search_query=search_query, roles=roles, news=news, messages=messages,
                           messages_count=len(messages),matching_count=matching_count,page=page,pages=pages)


@app.route('/admin/applicant/create', methods=['POST'])
def admin_create_applicant():
    auth = require_admin()
    if auth:
        return auth
    full_name = clean_text(request.form.get('full_name'), upper=True, max_len=120)
    mobile = clean_mobile(request.form.get('mobile'))
    qualification = clean_text(request.form.get('qualification'), upper=True, max_len=100)
    contractor = request.form.get('contractor', '')
    requested_role = clean_text(request.form.get('requested_role'), upper=True, max_len=120)
    if not full_name or not is_valid_indian_mobile(mobile) or contractor not in CONTRACTORS or not requested_role:
        flash('Could not create record: check the required fields.', 'error')
        return redirect(url_for('admin_dashboard', tab='roster'))
    conn = get_db()
    conn.execute('''INSERT INTO applicants (full_name, mobile, qualification, contractor, requested_role, status)
                    VALUES (?, ?, ?, ?, ?, 'New Request')''',
                 (full_name, mobile, qualification, contractor, requested_role))
    conn.commit(); conn.close()
    return redirect(url_for('admin_dashboard', tab='roster') + '#roster')


@app.route('/admin/status/<int:id>/<string:new_status>', methods=['POST'])
def update_status(id, new_status):
    auth = require_admin()
    if auth:
        return auth
    if new_status not in ALLOWED_STATUSES:
        abort(400)
    conn = get_db()
    conn.execute('UPDATE applicants SET status=? WHERE id=?', (new_status, id))
    conn.commit(); conn.close()
    if request.headers.get('Accept') == 'application/json' or request.headers.get('X-Requested-With') == 'fetch':
        return jsonify({'ok': True, 'status': new_status})
    return redirect(request.referrer or url_for('admin_dashboard', tab='roster'))


@app.route('/admin/delete/<int:id>', methods=['POST'])
def delete_applicant(id):
    auth = require_admin()
    if auth:
        return auth
    conn = get_db(); conn.execute('DELETE FROM applicants WHERE id=?', (id,)); conn.commit(); conn.close()
    return redirect(request.referrer or url_for('admin_dashboard', tab='roster'))


@app.route('/admin/role/add', methods=['POST'])
def add_role():
    auth = require_admin()
    if auth:
        return auth
    title = clean_text(request.form.get('title'), max_len=120)
    contractor = request.form.get('contractor', '')
    skill_level = clean_text(request.form.get('skill_level'), max_len=50)
    salary = clean_text(request.form.get('salary'), max_len=80) or 'Salary to be confirmed'
    description = clean_text(request.form.get('description'), max_len=600)
    if title and contractor in CONTRACTORS and skill_level:
        conn = get_db()
        conn.execute('INSERT INTO roles (title, contractor, skill_level, salary, description) VALUES (?, ?, ?, ?, ?)',
                     (title, contractor, skill_level, salary, description))
        conn.commit(); conn.close()
    return redirect(url_for('admin_dashboard', tab='roles') + '#roles')


@app.route('/admin/role/update-salary/<int:id>', methods=['POST'])
def update_role_salary(id):
    auth = require_admin()
    if auth:
        return auth
    salary = clean_text(request.form.get('salary'), max_len=80)
    if not salary:
        flash('Enter an expected salary or salary range.', 'error')
        return redirect(url_for('admin_dashboard', tab='roles') + '#roles')
    conn = get_db()
    role = conn.execute('SELECT id FROM roles WHERE id=?', (id,)).fetchone()
    if not role:
        conn.close()
        abort(404)
    conn.execute('UPDATE roles SET salary=? WHERE id=?', (salary, id))
    conn.commit()
    conn.close()
    flash('Expected salary updated.', 'success')
    return redirect(url_for('admin_dashboard', tab='roles') + '#roles')


@app.route('/admin/role/delete/<int:id>', methods=['POST'])
def delete_role(id):
    auth = require_admin()
    if auth:
        return auth
    conn = get_db(); conn.execute('DELETE FROM roles WHERE id=?', (id,)); conn.commit(); conn.close()
    return redirect(url_for('admin_dashboard', tab='roles') + '#roles')


@app.route('/admin/role/toggle/<int:id>', methods=['POST'])
def toggle_highlight(id):
    auth = require_admin()
    if auth:
        return auth
    conn = get_db()
    row = conn.execute('SELECT is_highlighted FROM roles WHERE id=?', (id,)).fetchone()
    if row:
        conn.execute('UPDATE roles SET is_highlighted=? WHERE id=?', (0 if row['is_highlighted'] else 1, id))
        conn.commit()
    conn.close()
    return redirect(url_for('admin_dashboard', tab='roles') + '#roles')


@app.route('/admin/news/add', methods=['POST'])
def add_news():
    auth = require_admin()
    if auth:
        return auth
    title = clean_text(request.form.get('title'), max_len=160)
    content = clean_text(request.form.get('content'), max_len=1200)
    if title and content:
        conn = get_db(); conn.execute('INSERT INTO news (title, content) VALUES (?,?)', (title, content)); conn.commit(); conn.close()
    return redirect(url_for('admin_dashboard', tab='bulletins') + '#bulletins')


@app.route('/admin/news/delete/<int:id>', methods=['POST'])
def delete_news(id):
    auth = require_admin()
    if auth:
        return auth
    conn = get_db(); conn.execute('DELETE FROM news WHERE id=?', (id,)); conn.commit(); conn.close()
    return redirect(url_for('admin_dashboard', tab='bulletins') + '#bulletins')


@app.route('/admin/message/delete/<int:id>', methods=['POST'])
def delete_message(id):
    auth = require_admin()
    if auth:
        return auth
    conn = get_db(); conn.execute('DELETE FROM messages WHERE id=?', (id,)); conn.commit(); conn.close()
    return redirect(url_for('admin_dashboard', tab='inbox') + '#inbox')


def format_ramco_date(value):
    value = clean_text(value, max_len=32)
    if not value:
        return ''
    for fmt in ('%Y-%m-%d', '%d-%m-%Y', '%d.%m.%Y', '%d/%m/%Y'):
        try:
            return datetime.strptime(value, fmt).strftime('%d-%m-%Y')
        except ValueError:
            pass
    return value


def ramco_marital_status(value):
    value = clean_text(value, upper=True, max_len=30)
    if value in {'SINGLE', 'UNMARRIED'}:
        return 'UNMARRIED'
    if value == 'MARRIED':
        return 'MARRIED'
    return value


def ramco_permanent_line1(row):
    parts = [clean_text(row['perm_village'], upper=True, max_len=100), clean_text(row['perm_post'], upper=True, max_len=100)]
    return ' '.join(part for part in parts if part).strip()


def applicant_languages(row):
    names = []
    for idx in (1, 2, 3):
        key = f'lang{idx}_name'
        name = clean_text(row[key] if key in row.keys() else '', upper=True, max_len=40)
        if idx == 1 and not name:
            name = 'HINDI'
        if name and name not in names:
            names.append(name)
    return '/'.join(names) if names else RAMCO_DEFAULTS['language']


@app.route('/admin/export.xlsx')
def export_applicants_excel():
    auth = require_admin()
    if auth:
        return auth

    export_scope = (request.args.get('scope') or 'all').strip().lower()
    selected_ids = []
    if export_scope == 'selected':
        for raw_id in request.args.getlist('ids'):
            raw_id = (raw_id or '').strip()
            if raw_id.isdigit():
                selected_ids.append(int(raw_id))
        selected_ids = sorted(set(selected_ids))
        if not selected_ids:
            flash('Choose at least one candidate for RAMCO Excel export.', 'error')
            return redirect(url_for('admin_dashboard', tab='roster'))

    conn = get_db()
    ensure_applicant_schema(conn)
    if export_scope == 'selected':
        placeholders = ','.join('?' for _ in selected_ids)
        rows = conn.execute(
            f'SELECT a.* FROM applicants a WHERE a.id IN ({placeholders}) ORDER BY a.id ASC',
            selected_ids,
        ).fetchall()
    else:
        rows = conn.execute('''
            SELECT a.*
            FROM applicants a
            ORDER BY a.id ASC
        ''').fetchall()
    conn.close()

    headers = [
        'SR.NO', 'Name', 'Supplier Name', 'Grade', 'Department', 'DOJ', 'DOB', 'Job', 'Aadhaar No',
        'Gender', 'Blood Group', 'UAN No', 'ESIC No', 'Qualification', 'Marital Status', 'Father Name',
        'Mother Name', 'Spouse Name', 'Language', 'Religion', 'Proficiency', 'Category', 'Nationality',
        'Work location', 'WC Policy No', 'Permanent Address Line 1', 'Town', 'City', 'State', 'Country',
        'Zip', 'Mobile', 'Present Address Line 1', 'Town ', 'City ', 'State ', 'Country ', 'Zip ',
        'Emergency Contact Name', 'Relationship of Emergency Contact', 'Emergency Contact Phone'
    ]

    export_rows = []
    for sr_no, a in enumerate(rows, start=1):
        job = clean_text(a['designation'] or a['requested_role'], upper=True, max_len=120)
        emergency_name = clean_text(a['emergency_contact_name'] or a['father_name'], upper=True, max_len=120)
        emergency_relation = clean_text(a['emergency_relationship'], upper=True, max_len=60) or ('FATHER' if emergency_name and a['father_name'] and emergency_name == clean_text(a['father_name'], upper=True, max_len=120) else '')
        permanent_line1 = ramco_permanent_line1(a)
        permanent_town = clean_text(a['perm_district'], upper=True, max_len=100)
        permanent_city = clean_text(a['perm_taluka'], upper=True, max_len=100)
        religion = clean_text(a['religion'], upper=True, max_len=50) or RAMCO_DEFAULTS['religion']

        export_rows.append([
            sr_no,
            clean_text(a['full_name'], upper=True, max_len=120),
            RAMCO_DEFAULTS['supplier_name'],
            clean_text(a['skill_level'], upper=True, max_len=50),
            clean_text(a['department'], upper=True, max_len=100),
            format_ramco_date(a['doj']),
            format_ramco_date(a['dob']),
            job,
            clean_text(a['aadhar'], max_len=20),
            clean_text(a['gender'], upper=True, max_len=20),
            clean_text(a['blood_group'], upper=True, max_len=30),
            clean_text(a['uan'], max_len=30),
            clean_text(a['esic'], max_len=30),
            clean_text(a['qualification'], upper=True, max_len=100),
            ramco_marital_status(a['marital_status']),
            clean_text(a['father_name'], upper=True, max_len=120),
            clean_text(a['mother_name'], upper=True, max_len=120),
            clean_text(a['wife_name'], upper=True, max_len=120) or 'N/A',
            applicant_languages(a),
            religion,
            RAMCO_DEFAULTS['proficiency'],
            RAMCO_DEFAULTS['category'],
            RAMCO_DEFAULTS['nationality'],
            RAMCO_DEFAULTS['work_location'],
            RAMCO_DEFAULTS['wc_policy_no'],
            permanent_line1,
            permanent_town,
            permanent_city,
            clean_text(a['perm_state'], upper=True, max_len=100),
            RAMCO_DEFAULTS['present_country'],
            clean_text(a['perm_pin'], max_len=10),
            clean_mobile(a['mobile']),
            clean_text(a['present_address_line1'], upper=True, max_len=220) or RAMCO_DEFAULTS['present_address_line1'],
            RAMCO_DEFAULTS['present_town'],
            RAMCO_DEFAULTS['present_city'],
            RAMCO_DEFAULTS['present_state'],
            RAMCO_DEFAULTS['present_country'],
            RAMCO_DEFAULTS['present_zip'],
            emergency_name,
            emergency_relation,
            clean_mobile(a['alt_mobile'])
        ])

    workbook = build_applicants_xlsx(headers, export_rows, sheet_name='RAMCO Upload')
    scope_label = 'Selected' if export_scope == 'selected' else 'All'
    filename = f'RAMCO_Vasind_Workforce_{scope_label}_{datetime.now().strftime("%Y-%m-%d_%H%M")}.xlsx'
    return send_file(
        workbook,
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        as_attachment=True,
        download_name=filename,
        max_age=0,
    )


@app.route('/admin/joining-report')
def joining_report():
    auth = require_admin()
    if auth:
        return auth

    month = (request.args.get('month') or '').strip()
    contractor = (request.args.get('contractor') or 'All').strip()
    if contractor not in ('All',) + CONTRACTORS:
        contractor = 'All'

    if not re.fullmatch(r'\d{4}-\d{2}', month):
        month = datetime.now().strftime('%Y-%m')
    try:
        month_dt = datetime.strptime(month, '%Y-%m')
    except ValueError:
        month_dt = datetime.now()
        month = month_dt.strftime('%Y-%m')

    conn = get_db()
    ensure_applicant_schema(conn)
    all_rows = conn.execute('SELECT * FROM applicants ORDER BY id ASC').fetchall()
    conn.close()

    def row_month(row):
        raw = (row['doj'] or '').strip()
        for fmt in ('%Y-%m-%d', '%d-%m-%Y', '%d/%m/%Y', '%d.%m.%Y'):
            try:
                return datetime.strptime(raw, fmt).strftime('%Y-%m')
            except ValueError:
                pass
        return ''

    month_rows = [r for r in all_rows if row_month(r) == month]
    # Joined candidates with no DOJ must remain visible, without assigning a made-up joining date.
    missing_doj_rows = [r for r in all_rows if r['status'] == 'Joined' and not row_month(r)]
    if contractor != 'All':
        month_rows = [r for r in month_rows if r['contractor'] == contractor]
        missing_doj_rows = [r for r in missing_doj_rows if r['contractor'] == contractor]

    month_counts = {name: sum(1 for r in all_rows if row_month(r) == month and r['contractor'] == name) for name in CONTRACTORS}
    all_time_counts = {name: sum(1 for r in all_rows if r['contractor'] == name and row_month(r)) for name in CONTRACTORS}

    report_rows = []
    for row in month_rows:
        report_rows.append({
            'id': row['id'],
            'full_name': clean_text(row['full_name'], upper=True, max_len=120),
            'designation': clean_text(row['designation'] or row['requested_role'], upper=True, max_len=120),
            'doj': format_ramco_date(row['doj']),
            'contractor': row['contractor'] or '—',
        })
    missing_doj_report_rows = [{
        'id': row['id'],
        'full_name': clean_text(row['full_name'], upper=True, max_len=120),
        'designation': clean_text(row['designation'] or row['requested_role'], upper=True, max_len=120),
        'doj': '',
        'contractor': row['contractor'] or '—',
    } for row in missing_doj_rows]

    return render_template(
        'joining_report.html',
        rows=report_rows,
        missing_doj_rows=missing_doj_report_rows,
        month=month,
        month_label=month_dt.strftime('%B %Y'),
        selected_contractor=contractor,
        contractors=CONTRACTORS,
        month_counts=month_counts,
        all_time_counts=all_time_counts,
        report_total=len(month_rows),
    )


@app.route('/admin/process/<int:id>/save-json', methods=['POST'])
def process_applicant_save_json(id):
    """Dedicated JSON-only save endpoint for the admin processing screen.

    Keeping this separate from the HTML GET/POST route prevents redirects or
    error pages from being parsed as JSON by the browser.
    """
    auth = require_admin()
    if auth:
        return auth

    try:
        # Accept the normal FormData payload used by the page. A JSON payload is
        # also supported so the endpoint remains easy to test.
        payload = request.form
        if not payload:
            payload = request.get_json(silent=True) or {}
        save_processing_record(id, payload)
        return jsonify({
            'ok': True,
            'message': 'Candidate record saved.',
            'print_url': url_for('print_form', id=id),
            'appointment_url': url_for('appointment_letter', id=id),
            'process_url': url_for('process_applicant', id=id)
        })
    except ValueError as exc:
        return jsonify({'ok': False, 'message': str(exc), 'error_type': 'ValidationError'}), 400
    except Exception as exc:
        app.logger.exception('JSON save endpoint failed for candidate %s', id)
        detail = str(exc).strip() or exc.__class__.__name__
        return jsonify({
            'ok': False,
            'message': f'Save failed: {detail}',
            'error_type': exc.__class__.__name__
        }), 500


@app.route('/admin/process/<int:id>', methods=['GET', 'POST'])
def process_applicant(id):
    auth = require_admin()
    if auth:
        return auth

    if request.method == 'POST':
        action = request.form.get('action', 'save')
        try:
            save_processing_record(id, request.form)
        except ValueError as exc:
            if wants_json_request():
                return jsonify({'ok': False, 'message': str(exc)}), 400
            flash(str(exc), 'error')
            return redirect(url_for('process_applicant', id=id))
        except Exception as exc:
            app.logger.exception('Failed to save candidate processing record %s', id)
            if wants_json_request():
                # Useful for local/demo troubleshooting while still returning valid JSON.
                detail = str(exc).strip() or exc.__class__.__name__
                return jsonify({'ok': False, 'message': f'Save failed: {detail}'}), 500
            flash('The candidate record could not be saved. Please retry.', 'error')
            return redirect(url_for('process_applicant', id=id))

        if wants_json_request():
            return jsonify({
                'ok': True,
                'message': 'Candidate record saved.',
                'print_url': url_for('print_form', id=id),
                'process_url': url_for('process_applicant', id=id)
            })
        if action == 'generate':
            return redirect(url_for('print_form', id=id))
        if action == 'appointment':
            conn = get_db()
            row = conn.execute('SELECT contractor FROM applicants WHERE id=?', (id,)).fetchone()
            conn.close()
            return redirect(url_for('appointment_workspace', contractor=row['contractor'] if row else '', candidate_id=id))
        flash('Candidate record saved.', 'success')
        return redirect(url_for('process_applicant', id=id))

    conn = get_db()
    ensure_applicant_schema(conn)
    app_data = conn.execute('SELECT * FROM applicants WHERE id=?', (id,)).fetchone()
    conn.close()
    if not app_data:
        abort(404)
    return render_template('admin_process.html', app=app_data, allowed_statuses=sorted(ALLOWED_STATUSES))


@app.route('/admin/print/<int:id>')
def print_form(id):
    auth = require_admin()
    if auth:
        return auth
    conn = get_db(); ensure_applicant_schema(conn); app_data = conn.execute('SELECT * FROM applicants WHERE id=?', (id,)).fetchone(); conn.close()
    if not app_data:
        abort(404)
    return render_template('print_template.html', app=app_data)


@app.route('/admin/appointment/<int:id>')
def appointment_letter(id):
    auth = require_admin()
    if auth:
        return auth
    conn = get_db()
    ensure_applicant_schema(conn)
    candidate = conn.execute('SELECT * FROM applicants WHERE id=?', (id,)).fetchone()
    conn.close()
    if candidate is None:
        abort(404)
    return redirect(url_for('appointment_workspace', contractor=candidate['contractor'], candidate_id=id))


@app.route('/admin/appointments', methods=['GET', 'POST'])
def appointment_workspace():
    auth = require_admin()
    if auth:
        return auth
    contractor = (request.values.get('contractor') or '').strip()
    if contractor and contractor not in CONTRACTORS:
        abort(400)
    conn = get_db()
    ensure_applicant_schema(conn)
    if request.method == 'POST':
        try:
            candidate_id = int(request.form.get('candidate_id', ''))
        except ValueError:
            candidate_id = -1
        candidate = conn.execute('SELECT * FROM applicants WHERE id=? AND contractor=? AND status=?',
                                 (candidate_id, contractor, 'Joined')).fetchone()
        if candidate is None:
            conn.close()
            flash('Choose a Joined candidate from the selected contractor.', 'error')
            return redirect(url_for('appointment_workspace', contractor=contractor))
        salary = clean_text(request.form.get('appointment_salary'), max_len=100)
        from appointment_pdf import PAY_FIELDS, compensation_totals
        breakup = {key: clean_text(request.form.get(key), max_len=30) for key, _ in PAY_FIELDS}
        if request.form.get('auto_totals')=='yes':
            try:salary,breakup['total_deduction'],breakup['take_home']=compensation_totals(breakup)
            except ValueError as e:
                conn.close();flash(str(e),'error')
                return redirect(url_for('appointment_workspace',contractor=contractor,candidate_id=candidate_id))
        person_name = clean_text(request.form.get('full_name'), max_len=180)
        designation = clean_text(request.form.get('designation'), max_len=120)
        birth_date = clean_text(request.form.get('dob'), max_len=20)
        location = clean_text(request.form.get('appointment_location'), max_len=180)
        issue_date = clean_text(request.form.get('appointment_issue_date'), max_len=20)
        joining_date = clean_text(request.form.get('doj'), max_len=20)
        if not all((person_name, designation, birth_date, salary, location, issue_date, joining_date)):
            conn.close()
            flash('Enter name, designation, date of birth, CTC, letter date, joining date and reporting location.', 'error')
            return redirect(url_for('appointment_workspace', contractor=contractor, candidate_id=candidate_id))
        try:
            datetime.strptime(issue_date, '%Y-%m-%d')
            datetime.strptime(joining_date, '%Y-%m-%d')
            datetime.strptime(birth_date, '%Y-%m-%d')
        except ValueError:
            conn.close()
            flash('Enter valid letter and joining dates.', 'error')
            return redirect(url_for('appointment_workspace', contractor=contractor, candidate_id=candidate_id))
        conn.execute('''UPDATE applicants SET full_name=?, designation=?, dob=?, appointment_salary=?,
                        appointment_issue_date=?, appointment_location=?, doj=?, appointment_breakup=? WHERE id=?''',
                     (person_name, designation, birth_date, salary, issue_date, location,
                      joining_date, json.dumps(breakup), candidate_id))
        conn.commit()
        candidate = conn.execute('SELECT * FROM applicants WHERE id=?', (candidate_id,)).fetchone()
        conn.close()
        from appointment_pdf import make_appointment_pdf
        return send_file(make_appointment_pdf(candidate), mimetype='application/pdf',
                         as_attachment=True, download_name=f'appointment_{candidate_id}.pdf')

    candidates = (conn.execute('''SELECT * FROM applicants WHERE contractor=? AND status='Joined'
                                 ORDER BY full_name, id''', (contractor,)).fetchall() if contractor else [])
    conn.close()
    return render_template('admin_appointments.html', contractors=CONTRACTORS,
                           contractor=contractor, candidates=candidates,
                           selected_id=request.args.get('candidate_id', type=int))


# Billing & Payroll module intentionally disabled in this admin portal build.


if __name__ == '__main__':
    from portal_server import run_portal
    run_portal(app)
