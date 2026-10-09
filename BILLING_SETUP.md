# Billing & Payroll update

## Install on your Windows computer

1. Stop the old server first, then back up your existing project folder, especially `jsw_workforce.db`. Keep any `jsw_workforce.db-wal` and `jsw_workforce.db-shm` files together with it if present; never copy a live database by itself.
2. Extract this update into a separate folder. To keep your current employees and appointments, copy your existing `jsw_workforce.db` into this folder, replacing the bundled database. Do not replace your current database with the bundled one.
3. Open a terminal in the extracted folder and run:

   ```powershell
   py -m pip install -r requirements.txt
   py app.py
   ```

4. Open `http://127.0.0.1:5000`, sign in to Admin, and select **Billing & Payroll** in the left sidebar. The new database tables are created automatically without deleting existing records.

Use the same Python interpreter for dependency installation and starting the app. `reportlab` is included in requirements and is necessary for appointment and billing PDFs.

## Changes in this update

- Billing & Payroll is in the left sidebar. Appointment Letters remains accessible at the top; its duplicate sidebar link is removed.
- Attach a different attendance file for each wage month. Originals remain downloadable inside that batch.
- XLSX/CSV imports have an explicit sheet/header/column mapping screen and preview. Set the last employee row to exclude footers.
- Daily P/A/WO/etc. attendance can be counted using confirmed paid-day weights. Do not assume every contract treats leave and weekly off the same way.
- For OT hours, enter the agreed hours per day and multiplier. The importer converts to the day-equivalent units used by the wage profile. Do not apply the multiplier twice to already-adjusted units.
- PDF/JPG/PNG attendance can be attached as references. This update does not perform automatic OCR on scanned files; enter verified totals or supply Excel/CSV.
- Salary, OT and bank account payment PDF/Excel downloads remain separate. An attachment alone is not enough to calculate wages: confirm attendance, rates, deductions and accounts before approval.
- Main admin lists have 25 records per page; payroll pages have 15 employee editing forms. Search is across the batch; payroll totals and exports still include all employees.
- Public-page styles are bundled into one request, redundant animation scripts are removed, touch screens use reduced effects, and text assets use gzip when supported. Core menu, application and lookup handlers are retained.

Validation: supplied Deva/PRB calculation comparisons and monthly import/report tests passed. Automated browser installation was unavailable in this environment, so check the update on your actual phone before replacing your live copy.

## Monthly payroll

1. Create a batch: contractor, wage month, department and calculation reference.
2. Import the supplied Deva or PRB Zinc workbook, or download the attendance summary template. XLSX and UTF-8 CSV are accepted; maximum upload is 4 MB. For changing monthly formats, use **Attach this month’s attendance**. Select the worksheet and header row, map employee/rate/bank columns, then choose either a total paid-days column or consecutive daily attendance columns. Set and confirm the paid value of each day code. Unknown codes are flagged rather than guessed.
3. Review the import before applying it. Existing employee codes are not overwritten. Missing codes receive a temporary code for review.
4. Check rates in **Calculation rates & company payment details**. Rates are batch-specific. The reference defaults are from the supplied February Deva and March PRB workbooks, not universal rates for every month or contractor.
5. Edit employee attendance, earnings, deductions and bank details. Search employees by name/code. Enter OT in day-equivalent units, not hours, for the Deva reference. PRB ex-gratia remains within wages; a separate OT rule has not been supplied for that reference.
6. Review salary and OT separately. The Deva importer preserves the separate workbook sheets' PT and advance amounts as editable overrides. These remain fixed after changing attendance: clear PT overrides to restore automatic calculation. Combined advances can differ from split-sheet advances in the source file; review all three views.
7. Approve the batch to lock its inputs. Reopen it for corrections.
8. Download wages and bank-payment lists as separate PDF/Excel files from the appropriate Salary or Overtime tab. Bank lists require approval, company debit account, payment date and employee account/IFSC. They are payment instructions only; no money is transferred. Do not use combined and separate lists to pay the same period twice.

Enter bank accounts as text to retain leading zeros and long numbers. The template formats identity/bank columns as text. Missing or ambiguous bank details must be confirmed manually. The PRB sample has a bank beneficiary name mismatch; that account is deliberately left blank on import.

### Calculation details

- Deva: reference daily rates, HRA, rounded daily leave/bonus amounts, PF ceiling, ESIC, PT and deductions. Safety and service margin are cost components. Salary and OT deduction rounding is separate. Combined net can differ from the sum of split net.
- PRB Zinc: present days, ex-gratia, HRA, holiday factor, leave, bonus, washing allowance, PF, ESIC and fixed employee PT. Employer cost is an estimate using the configurable employer rates; it is not a verified billing amount from the source workbook.
- Screen and exported totals sum displayed employee amounts to two decimal places.
- Wages PDFs split earnings, deductions/net pay and employer cost into readable sections. Excel contains all columns in one sheet.
- Shubham has no separate verified wage reference in this update. Use an existing calculation profile only if its rules have been confirmed to match.

## Company invoices

Create an invoice with contractor, buyer, addresses, invoice number/date, PO, work period in the description, SAC, quantities, rates and applicable tax rates. Amounts/taxes calculate automatically. Optionally round the final amount to whole rupees, as in the supplied PRB bill. Review and edit the draft, then issue it to lock it. PDF includes signature/stamp space.

Invoices are entered from agreed billing quantities/rates; payroll net pay does not automatically become an invoice amount. Payment receipt tracking and bank submission are not part of this update.

## Appointment offer-table calculations

The appointment editor has an optional **Calculate CTC, total deduction and take-home** checkbox. Enter every component, using zero when not applicable. It sums the existing table's nine CTC components, three employee deductions, and six earning components for take-home. Component rates are still editable; letter wording and its three-page layout are unchanged.

## Invoice letterheads

Deva, Shubham and PRB invoices use the supplied letterhead artwork. Seller addresses automatically follow the selected contractor and are fixed when saving a new invoice or draft. PRB uses the Parikh Shopping Center address on the supplied letterhead, as requested, rather than the different address on the sample tax invoice. Existing issued invoice records are not rewritten.

## Multi-user and template download update

- Stop the previous Python process before starting the update. Use `START_PORTAL.bat` on Windows, or install requirements and run `py app.py`. The launcher checks dependencies and starts the Waitress server with 8 request threads. Running through `flask run` bypasses this server setup.
- Default address remains `http://127.0.0.1:5000`. For phones on the same trusted local network, set `PORTAL_HOST=0.0.0.0` before starting, then use the laptop's LAN IP and port 5000. A phone's 127.0.0.1 is the phone itself. This update does not publish the portal to the internet.
- A hosted WSGI service uses its own worker settings; launching Waitress locally does not increase the hosting provider's capacity.
- SQLite now uses WAL so reads can proceed during writes. Writes are still serialized; no unlimited-user claim is made. Stop the application before copying/backing up the database, or use SQLite's backup API for an online backup.
- The attendance template is bundled in `resources/Attendance_Import_Template.xlsx` and downloaded as a real file. Template download no longer generates 500 rows or imports openpyxl on every request. Keep the resources folder when extracting the update.
- Candidate processing uses local precompiled CSS, so it no longer waits for the external Tailwind script or generates styling in the phone's browser. Optional external GSAP animation downloads are removed. The public hero uses a bundled local image, and touch devices skip more animation work.
- Legacy decorative live-stream connections return immediately to avoid occupying server threads. Static compression results are reused.
- Validation: 60 local HTTP requests with 12 concurrent clients passed, including 20 database writes and template downloads. Local median was 0.083 seconds and p95 was 0.270 seconds. These figures do not measure your phone, hotspot or hosting connection.

If a download still fails after using this full update, capture the Python terminal error and browser download message; the exact reported error was not supplied, so the original device-specific cause cannot be confirmed.
