import unittest
import sqlite3
from app import app, init_db, get_db

class JSWWorkflowVerification(unittest.TestCase):
    def setUp(self):
        app.config['TESTING'] = True
        app.config['WTF_CSRF_ENABLED'] = False
        self.client = app.test_client()
        init_db()

    def test_complete_recruitment_lifecycle(self):
        """
        Lifecycle Verification:
        1. Public Candidate Submission
        2. Admin Authentication Terminal
        3. Dossier Parameter Processing (KYC, Lineage, Permanent Coordinates)
        4. Print Dossier Structural Inspection
        """
        # Step 1: Public Submission
        payload = {
            'full_name': 'VIKASH KUMAR',
            'mobile': '9876543210',
            'qualification': 'ITI FITTER',
            'role_id': '1'
        }
        res_submit = self.client.post('/apply', data=payload, follow_redirects=True)
        self.assertEqual(res_submit.status_code, 200)

        # Retrieve Record
        conn = get_db()
        applicant = conn.execute(
            'SELECT * FROM applicants WHERE mobile = ? ORDER BY id DESC LIMIT 1', 
            (payload['mobile'],)
        ).fetchone()
        conn.close()
        
        self.assertIsNotNone(applicant)
        app_id = applicant['id']
        self.assertEqual(applicant['status'], 'New Request')

        # Step 2: Admin Login
        res_login = self.client.post('/login', data={'password': '982288'}, follow_redirects=True)
        self.assertIn(b'Workforce Dashboard', res_login.data)

        # Step 3: Admin Dossier Processing
        process_payload = {
            'dob': '2000-01-15',
            'aadhar': '[Aadhaar Redacted]',
            'doj': '2026-03-01',
            'blood_group': 'B+VE',
            'uan': '100987654321',
            'esic': '31000987650001',
            'father_name': 'VIDYA SAW',
            'mother_name': 'SANJU DEVI',
            'wife_name': 'N/A',
            'alt_mobile': '9123456780',
            'religion': 'HINDU',
            'caste': 'OBC',
            'marital_status': 'Single',
            'department': 'CCL-3 & CAL FINISHING',
            'designation': 'APL OPERATOR',
            'identification_mark': 'MOLE ON RIGHT ARM',
            'place': 'VASIND',
            'experience': '3 YEARS',
            'reference': 'DIRECT DESK',
            'relation': 'NONE',
            'replacement_for': 'NEW REQUIREMENT',
            'perm_village': 'MANER BALUPAR',
            'perm_post': 'BALUPAR',
            'perm_taluka': 'MANER',
            'perm_district': 'PATNA',
            'perm_state': 'BIHAR',
            'perm_pin': '801108'
        }
        
        res_process = self.client.post(
            f'/admin/process/{app_id}', 
            data=process_payload, 
            follow_redirects=True
        )
        self.assertEqual(res_process.status_code, 200)

        # Step 4: Validate Print Dossier Output
        res_print = self.client.get(f'/admin/print/{app_id}')
        self.assertEqual(res_print.status_code, 200)
        
        content = res_print.data.decode('utf-8')
        
        # Verify Page 1 Fields
        self.assertIn('INTERVIEW ASSESMENT FORM', content)
        self.assertIn('MVS ACMEI TECHNOLOGY PVT LTD', content)
        self.assertIn('VIKASH KUMAR', content)
        
        # Verify Page 2 Fields
        self.assertIn('Employee Registration Form', content)
        self.assertIn('VSND/24-25/9100185997', content)
        self.assertIn('VIDYA SAW', content)
        self.assertIn('SANJU DEVI', content)
        
        # Verify Page 3 Fields
        self.assertIn('Languages Known:', content)
        self.assertIn('MOLE ON RIGHT ARM', content)
        self.assertIn('MANER BALUPAR', content)
        self.assertIn('PATNA', content)
        self.assertIn('For Safety Department use only', content)
        self.assertIn('For Registration Desk use only', content)

if __name__ == '__main__':
    unittest.main()