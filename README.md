# SMARTCARE – ONLINE AND OFFLINE DOCTOR APPOINTMENT & PHARMACY MANAGEMENT SYSTEM

SmartCare is a comprehensive, production-grade healthcare platform connecting Patients, Medical Specialists, Pharmacies, and Administrators.

---

## 1. System Features & Architecture

- **Common Login Page**: Automatically identifies user role (Patient, Doctor, Pharmacy, Administrator) from the relational database without any role dropdown selector.
- **97 Medical Departments**: Fully populated and configurable directory of clinical departments.
- **Smart Department Recommendation**: Real-time symptom analysis mapping chief complaints to corresponding departments, complete with emergency warning alerts.
- **Appointment Booking & Slot Management**: 30-minute slot calendar, double-booking prevention, online Zoom teleconsultations vs. in-person hospital visits.
- **Payment Gateway Integration**: Sandbox payment simulation (Razorpay, UPI, Cards, Net Banking) with transaction auditing and automated slot release.
- **Protected Zoom Consultation Portal**: End-to-end encrypted video consultation room for doctors and patients with live chat and clinical notes.
- **Official Digital Prescriptions**: Doctors issue prescriptions with itemized dosages, frequencies, and durations, exported as verifiable PDF documents.
- **Prescription Upload & OCR Processing**: Patients can upload paper prescriptions or e-prescriptions; the OCR scanner extracts medicine details for pharmacy review.
- **Pharmacy Workflow & Local Pickup**: Pharmacists verify prescriptions, provide quotations, pack medicines, and confirm pickup via contactless QR code verification.
- **Administrator Dashboard**: Comprehensive control panel featuring patient management, doctor approval, pharmacy verification, department management, analytics, and **dedicated Login History tracking**.
- **Downloadable PDF Documents**:
  1. Appointment Booking Confirmation
  2. Appointment Payment Receipt
  3. Doctor Digital Prescription
  4. Pharmacy Payment Receipt
  5. Medicine Collection Confirmation

---

## 2. Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, jsPDF, QRCode
- **Backend (Development & AI Studio Runtime)**: Node.js (v22), Express, `node:sqlite` (SQLite relational database with foreign keys, transactions, and seeding)
- **Backend (Python / Django Standalone)**: Python 3.10+, Django 5.x, Django REST Framework, ReportLab, PostgreSQL / SQLite
- **Authentication**: Session & database-backed password hashing, role-based authorization

---

## 3. Pre-Seeded Demo Accounts

Use these accounts to test each role on the login page:

| Role | Username / Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@smartcare.com` | `admin123` | Full administrative controls & login history |
| **Doctor (Approved)** | `dr.arun@smartcare.com` | `doctor123` | Dr. Arun Kumar (Cardiology) |
| **Doctor (Pending)** | `dr.neha@smartcare.com` | `doctor123` | Dr. Neha Singh (Pediatrics - awaiting approval) |
| **Patient** | `patient@smartcare.com` | `patient123` | Madhur Sathya |
| **Pharmacy (Approved)** | `apollo@smartcare.com` | `pharmacy123` | Apollo Life Pharmacy |
| **Pharmacy (Pending)** | `greenline@smartcare.com` | `pharmacy123` | Greenline Chemist (awaiting approval) |

---

## 4. Local Setup & Execution Instructions

### A. Running the AI Studio Interactive App (Node + Express + SQLite + React)

The interactive application in this repository runs with Express and SQLite (`smartcare.db`):

```bash
# 1. Install dependencies
npm install

# 2. Start full-stack development server (runs on port 3000)
npm run dev

# 3. Build for production
npm run build
npm start
```

Open your browser at `http://localhost:3000`.
The Django admin is available at `http://localhost:3000/admin/` when the Django
server is running (see below).

---

### B. Running the Standalone Python / Django Backend (`smartcare_django/`)

The repository includes the complete standalone Django codebase located in `smartcare_django/`.
The Django admin includes the Django database records and a read-only view of the
main app's SQLite tables. Import the current SmartCare records with
`python manage.py import_smartcare_data`. By default, it reads `smartcare.db` from
the project root; set `SMARTCARE_DATABASE_PATH` if the Node app uses a different
database file.

#### On Windows (Command Prompt / PowerShell):

```cmd
cd smartcare_django

:: 1. Create Python virtual environment
python -m venv venv

:: 2. Activate virtual environment
:: Command Prompt:
venv\Scripts\activate.bat
:: PowerShell:
venv\Scripts\Activate.ps1

:: 3. Install required packages
pip install -r requirements.txt

:: 4. Run database migrations
python manage.py makemigrations accounts departments doctors patients appointments prescriptions pharmacy login_history
python manage.py migrate

:: 5. Create superuser administrator
python manage.py createsuperuser

:: 6. Import the main app data into Django
python manage.py import_smartcare_data

:: 7. Start Django development server (keep the Node app running on port 3000)
python manage.py runserver 8010
```

Visit `http://localhost:3000/admin/` to use Django admin through the main
website. Sign in with the Django superuser created above.

#### On Linux / macOS (Bash):

```bash
cd smartcare_django

# 1. Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# 2. Install requirements
pip install -r requirements.txt

# 3. Apply database migrations
python manage.py makemigrations
python manage.py migrate

# 4. Create superuser
python manage.py createsuperuser

# 5. Import the main app data into Django
python manage.py import_smartcare_data

# 6. Run development server (keep the Node app running on port 3000)
python manage.py runserver 0.0.0.0:8010
```

Visit `http://localhost:3000/admin/` to use Django admin through the main
website. Sign in with the Django superuser created above.

---

## 5. Environment Variables Configuration

Copy `.env.example` to `.env` and set:

```env
PORT=3000
DATABASE_ENGINE=sqlite
DB_NAME=smartcare_db
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DJANGO_SECRET_KEY=smartcare-super-secret-key-2026
DEBUG=True
ZOOM_API_KEY=your_zoom_key
ZOOM_API_SECRET=your_zoom_secret
RAZORPAY_KEY_ID=rzp_test_key
RAZORPAY_KEY_SECRET=rzp_test_secret
```

---

## 6. Project Directory Structure

```
smartcare/
├── server.ts                    # Full-stack Node + Express + SQLite server
├── smartcare.db                 # SQLite relational database
├── src/
│   ├── types/index.ts           # TypeScript interfaces & types
│   ├── context/AuthContext.tsx  # Authentication & auto-role redirection
│   ├── utils/pdfGenerator.ts    # Client-side 5 official PDF documents generator
│   ├── components/
│   │   ├── layout/              # Top Bar & Footer components
│   │   ├── home/                # Landing page with 10 sections
│   │   ├── auth/                # Login, Patient, Doctor & Pharmacy register
│   │   ├── booking/             # 6-step appointment booking wizard
│   │   ├── patient/             # Patient dashboard
│   │   ├── doctor/              # Doctor practice & consultation builder
│   │   ├── pharmacy/            # Pharmacy fulfillment & OCR verification
│   │   ├── admin/               # Administrator console & Login History
│   │   ├── zoom/                # Online teleconsultation meeting room
│   │   ├── doctors/             # Doctor directory search
│   │   └── departments/         # 97 clinical departments list
├── smartcare_django/            # Full standalone Django project
│   ├── manage.py
│   ├── config/settings.py
│   ├── config/urls.py
│   ├── accounts/
│   ├── departments/
│   ├── doctors/
│   ├── patients/
│   ├── appointments/
│   ├── prescriptions/
│   ├── pharmacy/
│   ├── login_history/
│   └── reports/pdf_generator.py # ReportLab PDF generator
└── package.json
```

---

## 7. Compliance and Testing

- **Doctor & Pharmacy Approval**: Unapproved doctors or pharmacies cannot access clinical functions until an administrator approves their credentials.
- **Login History Security**: Successful logins, failed authentication attempts, and logouts are logged with IP addresses, user agents, and session duration.
- **Slot Uniqueness**: Slots cannot be double-booked; backend validation enforces atomic reservations.
