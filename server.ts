import express, { Request, Response } from 'express';
import { DatabaseSync } from 'node:sqlite';
import { request as httpRequest } from 'node:http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Keep the Django admin available through the main website origin.
app.use(['/admin', '/static/admin'], (req: Request, res: Response) => {
  const headers = { ...req.headers };
  delete headers.connection;
  delete headers['proxy-connection'];
  delete headers['keep-alive'];
  delete headers['transfer-encoding'];
  headers.host = req.headers.host || `localhost:${port}`;

  const djangoRequest = httpRequest({
    hostname: '127.0.0.1',
    port: 8010,
    path: req.originalUrl,
    method: req.method,
    headers,
  }, (djangoResponse) => {
    res.writeHead(djangoResponse.statusCode || 502, djangoResponse.headers);
    djangoResponse.pipe(res);
  });

  djangoRequest.on('error', (error: Error) => {
    console.error('Django admin proxy failed:', error.message);
    if (!res.headersSent) {
      res.status(502).send('Django admin is unavailable. Start the Django server on port 8010.');
      return;
    }
    res.destroy(error);
  });

  req.pipe(djangoRequest);
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// SQLite Database Setup
const dbPath = path.join(__dirname, 'smartcare.db');
const db = new DatabaseSync(dbPath);

// Enable foreign keys
db.exec('PRAGMA foreign_keys = ON;');

// Initialize tables
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('patient', 'doctor', 'pharmacy', 'admin')),
  full_name TEXT NOT NULL,
  is_approved INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patient_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL,
  phone TEXT,
  dob TEXT,
  age INTEGER,
  gender TEXT,
  blood_group TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  emergency_contact TEXT,
  avatar_url TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hospitals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  phone TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS doctor_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL,
  qualification TEXT NOT NULL,
  medical_reg_no TEXT NOT NULL,
  primary_department_id INTEGER NOT NULL,
  additional_specializations TEXT,
  experience_years INTEGER NOT NULL DEFAULT 0,
  hospital_id INTEGER,
  hospital_name TEXT,
  consultation_fee_online REAL NOT NULL DEFAULT 500,
  consultation_fee_offline REAL NOT NULL DEFAULT 600,
  profile_photo TEXT,
  available_days TEXT DEFAULT 'Mon,Tue,Wed,Thu,Fri,Sat',
  working_hours_start TEXT DEFAULT '09:00',
  working_hours_end TEXT DEFAULT '17:00',
  online_available INTEGER NOT NULL DEFAULT 1,
  offline_available INTEGER NOT NULL DEFAULT 1,
  clinic_address TEXT,
  city TEXT,
  pincode TEXT,
  rating REAL DEFAULT 4.8,
  review_count INTEGER DEFAULT 12,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (primary_department_id) REFERENCES departments(id)
);

CREATE TABLE IF NOT EXISTS pharmacy_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER UNIQUE NOT NULL,
  shop_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  license_no TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  opening_hours TEXT DEFAULT '08:00 AM - 10:00 PM',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_id TEXT UNIQUE NOT NULL,
  patient_user_id INTEGER NOT NULL,
  doctor_user_id INTEGER NOT NULL,
  department_id INTEGER NOT NULL,
  appointment_type TEXT NOT NULL CHECK(appointment_type IN ('online', 'offline')),
  appointment_date TEXT NOT NULL,
  appointment_time TEXT NOT NULL,
  consultation_fee REAL NOT NULL,
  tax_amount REAL NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending Payment' CHECK(status IN ('Pending Payment', 'Confirmed', 'Scheduled', 'In Progress', 'Completed', 'Cancelled', 'No Show')),
  main_health_issue TEXT,
  symptoms TEXT,
  problem_description TEXT,
  medical_history TEXT,
  current_medications TEXT,
  uploaded_doc_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_user_id) REFERENCES users(id),
  FOREIGN KEY (doctor_user_id) REFERENCES users(id),
  FOREIGN KEY (department_id) REFERENCES departments(id)
);

CREATE TABLE IF NOT EXISTS appointment_payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_id INTEGER UNIQUE NOT NULL,
  patient_user_id INTEGER NOT NULL,
  amount REAL NOT NULL,
  tax REAL NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL,
  payment_method TEXT NOT NULL,
  transaction_ref TEXT UNIQUE NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'Paid' CHECK(payment_status IN ('Pending', 'Processing', 'Paid', 'Failed', 'Refunded')),
  paid_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  receipt_no TEXT UNIQUE NOT NULL,
  FOREIGN KEY (appointment_id) REFERENCES appointments(id),
  FOREIGN KEY (patient_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS zoom_meetings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_id INTEGER UNIQUE NOT NULL,
  meeting_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  join_url TEXT NOT NULL,
  start_url TEXT NOT NULL,
  passcode TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'started', 'completed')),
  duration_minutes INTEGER DEFAULT 30,
  FOREIGN KEY (appointment_id) REFERENCES appointments(id)
);

CREATE TABLE IF NOT EXISTS consultations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_id INTEGER UNIQUE NOT NULL,
  doctor_user_id INTEGER NOT NULL,
  patient_user_id INTEGER NOT NULL,
  clinical_notes TEXT,
  findings TEXT,
  diagnosis TEXT,
  treatment_instructions TEXT,
  follow_up_date TEXT,
  status TEXT NOT NULL DEFAULT 'Completed' CHECK(status IN ('In Progress', 'Completed')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (appointment_id) REFERENCES appointments(id),
  FOREIGN KEY (doctor_user_id) REFERENCES users(id),
  FOREIGN KEY (patient_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS prescriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prescription_id TEXT UNIQUE NOT NULL,
  consultation_id INTEGER,
  appointment_id INTEGER NOT NULL,
  doctor_user_id INTEGER NOT NULL,
  patient_user_id INTEGER NOT NULL,
  clinical_notes TEXT,
  diagnosis TEXT,
  follow_up_date TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (appointment_id) REFERENCES appointments(id),
  FOREIGN KEY (doctor_user_id) REFERENCES users(id),
  FOREIGN KEY (patient_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS prescription_medicines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  prescription_id INTEGER NOT NULL,
  medicine_name TEXT NOT NULL,
  strength TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  times_per_day TEXT,
  duration_days INTEGER NOT NULL,
  timing TEXT NOT NULL,
  instructions TEXT,
  quantity INTEGER NOT NULL DEFAULT 10,
  FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pharmacy_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT UNIQUE NOT NULL,
  patient_user_id INTEGER NOT NULL,
  pharmacy_user_id INTEGER,
  prescription_id INTEGER,
  original_document_url TEXT,
  ocr_extracted_text TEXT,
  status TEXT NOT NULL DEFAULT 'Prescription Uploaded' CHECK(status IN ('Prescription Uploaded', 'Under Verification', 'Payment Pending', 'Paid', 'Processing', 'Ready for Pickup', 'Collected', 'Cancelled')),
  subtotal REAL DEFAULT 0,
  tax REAL DEFAULT 0,
  total_amount REAL DEFAULT 0,
  payment_method TEXT,
  payment_status TEXT DEFAULT 'Pending',
  transaction_ref TEXT,
  qr_code_data TEXT,
  collected_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_user_id) REFERENCES users(id),
  FOREIGN KEY (pharmacy_user_id) REFERENCES users(id),
  FOREIGN KEY (prescription_id) REFERENCES prescriptions(id)
);

CREATE TABLE IF NOT EXISTS pharmacy_order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  medicine_name TEXT NOT NULL,
  strength TEXT,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  total_price REAL NOT NULL,
  FOREIGN KEY (order_id) REFERENCES pharmacy_orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  appointment_id INTEGER UNIQUE NOT NULL,
  doctor_user_id INTEGER NOT NULL,
  patient_user_id INTEGER NOT NULL,
  rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
  review_text TEXT NOT NULL,
  is_moderated INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (appointment_id) REFERENCES appointments(id),
  FOREIGN KEY (doctor_user_id) REFERENCES users(id),
  FOREIGN KEY (patient_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS website_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT NOT NULL,
  is_moderated INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  link TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS login_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  username_attempted TEXT NOT NULL,
  user_name TEXT,
  role TEXT,
  event_type TEXT NOT NULL CHECK(event_type IN ('Login Success', 'Login Failure', 'Logout', 'Session Expiration')),
  ip_address TEXT,
  user_agent TEXT,
  login_status TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  logout_timestamp DATETIME,
  session_duration TEXT,
  failure_reason TEXT
);

CREATE TABLE IF NOT EXISTS doctor_blocked_slots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  doctor_user_id INTEGER NOT NULL,
  block_date TEXT NOT NULL,
  slot_time TEXT,
  reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (doctor_user_id) REFERENCES users(id) ON DELETE CASCADE
);
`);

// All 97 departments from the specification
const departmentsSeed = [
  // General and Primary Care
  { name: 'General Medicine / Internal Medicine', category: 'General and Primary Care', description: 'Comprehensive adult medical care, disease prevention, and chronic condition management.' },
  { name: 'Family Medicine', category: 'General and Primary Care', description: 'Continuing, comprehensive healthcare for individuals and families across all ages.' },
  { name: 'General Practice', category: 'General and Primary Care', description: 'Primary routine healthcare, health checks, and minor condition treatment.' },
  { name: 'General Surgery', category: 'General and Primary Care', description: 'Surgical treatment of abdominal contents, hernias, soft tissues, and general trauma.' },
  { name: 'Emergency Medicine', category: 'General and Primary Care', description: 'Immediate urgent evaluation and acute stabilization of illnesses and injuries.' },
  { name: 'Preventive and Community Medicine', category: 'General and Primary Care', description: 'Population health, epidemiology, wellness screenings, and disease prevention.' },

  // Heart, Brain, and Nervous System
  { name: 'Cardiology', category: 'Heart, Brain, and Nervous System', description: 'Diagnosis and medical treatment of coronary diseases, heart failure, and arrhythmias.' },
  { name: 'Cardiothoracic and Vascular Surgery', category: 'Heart, Brain, and Nervous System', description: 'Surgical interventions on heart, lungs, esophagus, and major blood vessels.' },
  { name: 'Neurology', category: 'Heart, Brain, and Nervous System', description: 'Disorders of the nervous system, brain, spinal cord, nerves, and muscles.' },
  { name: 'Neurosurgery', category: 'Heart, Brain, and Nervous System', description: 'Surgical treatment of neurological conditions including brain and spine.' },
  { name: 'Interventional Cardiology', category: 'Heart, Brain, and Nervous System', description: 'Catheter-based structural heart and vascular interventions and angioplasty.' },
  { name: 'Electrophysiology', category: 'Heart, Brain, and Nervous System', description: 'Specialized study and management of cardiac rhythm disorders and pacemaker implantation.' },

  // Bones, Muscles, and Rehabilitation
  { name: 'Orthopedics', category: 'Bones, Muscles, and Rehabilitation', description: 'Musculoskeletal system surgery and non-surgical care for bones, joints, and ligaments.' },
  { name: 'Joint Replacement Surgery', category: 'Bones, Muscles, and Rehabilitation', description: 'Arthroplasty of knees, hips, shoulders, and complex reconstruction.' },
  { name: 'Spine Surgery', category: 'Bones, Muscles, and Rehabilitation', description: 'Cervical, thoracic, and lumbar spine decompression, stabilization, and deformity repair.' },
  { name: 'Sports Medicine', category: 'Bones, Muscles, and Rehabilitation', description: 'Prevention and treatment of sports-related injuries and performance restoration.' },
  { name: 'Physiotherapy and Rehabilitation', category: 'Bones, Muscles, and Rehabilitation', description: 'Physical therapy, exercise regimens, and mobility recovery programs.' },
  { name: 'Rheumatology', category: 'Bones, Muscles, and Rehabilitation', description: 'Diagnosis and management of autoimmune and inflammatory arthritis diseases.' },

  // Skin, Hair, and Allergy
  { name: 'Dermatology', category: 'Skin, Hair, and Allergy', description: 'Comprehensive diagnosis and care for skin diseases, hair loss, and nail conditions.' },
  { name: 'Venereology', category: 'Skin, Hair, and Allergy', description: 'Clinical investigation and management of sexually transmitted infections.' },
  { name: 'Allergy and Clinical Immunology', category: 'Skin, Hair, and Allergy', description: 'Evaluation of environmental, food, drug allergies, and primary immunodeficiency.' },
  { name: 'Clinical Cosmetology', category: 'Skin, Hair, and Allergy', description: 'Aesthetic skincare, laser therapy, and minimally invasive dermatological procedures.' },

  // Ear, Nose, and Throat
  { name: 'ENT / Otorhinolaryngology', category: 'Ear, Nose, and Throat', description: 'Medical and surgical management of ear, nose, throat, head, and neck disorders.' },
  { name: 'Audiology', category: 'Ear, Nose, and Throat', description: 'Hearing tests, vestibular evaluations, and acoustic rehabilitation.' },
  { name: 'Speech and Hearing', category: 'Ear, Nose, and Throat', description: 'Diagnostic speech pathology, voice therapy, and communication development.' },

  // Eye Care
  { name: 'Ophthalmology', category: 'Eye Care', description: 'Complete eye care, vision correction, cataract surgery, and ocular disorders.' },
  { name: 'Retina and Vitreous', category: 'Eye Care', description: 'Subspecialty care for retinal detachment, macular degeneration, and diabetic retinopathy.' },
  { name: 'Glaucoma', category: 'Eye Care', description: 'Intraocular pressure management, optical nerve preservation, and laser surgery.' },
  { name: 'Cornea and Refractive Surgery', category: 'Eye Care', description: 'Corneal transplantation, LASIK, and anterior segment laser corrections.' },
  { name: 'Pediatric Ophthalmology', category: 'Eye Care', description: 'Strabismus, amblyopia, and visual development disorders in children.' },

  // Digestive System and Liver
  { name: 'Gastroenterology', category: 'Digestive System and Liver', description: 'Endoscopy, colonoscopy, and medical treatment of digestive tract diseases.' },
  { name: 'Hepatology', category: 'Digestive System and Liver', description: 'Specialized study and management of liver cirrhosis, hepatitis, and gallbladder diseases.' },
  { name: 'Surgical Gastroenterology', category: 'Digestive System and Liver', description: 'Advanced laparoscopic GI surgery, bariatric, and hepatobiliary interventions.' },
  { name: 'Colorectal Surgery', category: 'Digestive System and Liver', description: 'Surgical care for colorectal cancer, inflammatory bowel disease, and diverticular issues.' },
  { name: 'Proctology', category: 'Digestive System and Liver', description: 'Diagnosis and specialized intervention for hemorrhoids, fissures, and fistula.' },

  // Lungs and Respiratory System
  { name: 'Pulmonology', category: 'Lungs and Respiratory System', description: 'Respiratory diseases, COPD, asthma, pneumonia, and interstitial lung diseases.' },
  { name: 'Respiratory Medicine', category: 'Lungs and Respiratory System', description: 'Comprehensive diagnostic pulmonology, spirometry, and respiratory therapy.' },
  { name: 'Thoracic Surgery', category: 'Lungs and Respiratory System', description: 'Surgical treatment of organs inside the thorax including lungs and chest wall.' },
  { name: 'Sleep Medicine', category: 'Lungs and Respiratory System', description: 'Sleep apnea polysomnography, CPAP management, and sleep pathology treatment.' },

  // Kidney and Urinary System
  { name: 'Nephrology', category: 'Kidney and Urinary System', description: 'Renal function diseases, dialysis supervision, glomerulonephritis, and hypertension.' },
  { name: 'Urology', category: 'Kidney and Urinary System', description: 'Surgical and medical diseases of male/female urinary tract and male reproductive organs.' },
  { name: 'Andrology', category: 'Kidney and Urinary System', description: 'Male reproductive health, fertility assessments, and sexual dysfunction therapy.' },
  { name: 'Kidney Transplant Services', category: 'Kidney and Urinary System', description: 'Evaluation, matching, surgery, and immunosuppressive management for renal grafts.' },

  // Women's Health
  { name: 'Obstetrics and Gynecology', category: "Women's Health", description: 'Pregnancy prenatal care, delivery, female reproductive system wellness, and surgery.' },
  { name: 'Maternal-Fetal Medicine', category: "Women's Health", description: 'High-risk pregnancy consultation, fetal ultrasound, and complicated gestations.' },
  { name: 'Reproductive Medicine and Infertility', category: "Women's Health", description: 'Assisted reproduction, IVF, ovulation induction, and fertility preservation.' },
  { name: 'Gynecological Oncology', category: "Women's Health", description: 'Surgical and multi-modal management of cancers of female reproductive organs.' },
  { name: 'Breast Surgery', category: "Women's Health", description: 'Benign and malignant breast lump management, lumpectomy, and reconstructive care.' },

  // Child Healthcare
  { name: 'Pediatrics', category: 'Child Healthcare', description: 'Primary and specialized medical care for infants, children, and adolescents.' },
  { name: 'Neonatology', category: 'Child Healthcare', description: 'Intensive care for premature newborns and critically ill neonates.' },
  { name: 'Pediatric Cardiology', category: 'Child Healthcare', description: 'Congenital heart disease diagnosis and pediatric echocardiography.' },
  { name: 'Pediatric Neurology', category: 'Child Healthcare', description: 'Childhood seizures, developmental delays, and pediatric neuro-genetic conditions.' },
  { name: 'Pediatric Surgery', category: 'Child Healthcare', description: 'Surgical care for pediatric anomalies and congenital defects.' },
  { name: 'Developmental Pediatrics', category: 'Child Healthcare', description: 'Evaluation of autism spectrum, ADHD, learning differences, and motor milestones.' },

  // Cancer Care
  { name: 'Medical Oncology', category: 'Cancer Care', description: 'Chemotherapy, targeted molecular therapy, and immunotherapy regimens.' },
  { name: 'Surgical Oncology', category: 'Cancer Care', description: 'Curative and palliative surgical resection of solid organ tumors.' },
  { name: 'Radiation Oncology', category: 'Cancer Care', description: 'Linear accelerator external beam radiation therapy and brachytherapy.' },
  { name: 'Hematology', category: 'Cancer Care', description: 'Blood cell disorders, hemoglobinopathies, and coagulation abnormalities.' },
  { name: 'Hemato-Oncology', category: 'Cancer Care', description: 'Leukemia, lymphoma, myeloma therapy, and bone marrow stem cell transplants.' },

  // Hormones and Metabolism
  { name: 'Endocrinology', category: 'Hormones and Metabolism', description: 'Hormonal disorders, thyroid diseases, adrenal pathologies, and pituitary gland care.' },
  { name: 'Diabetology', category: 'Hormones and Metabolism', description: 'Specialized glycemic control, insulin pumps, CGM monitoring, and diabetic complications.' },
  { name: 'Metabolic Medicine', category: 'Hormones and Metabolism', description: 'Dyslipidemia, inborn errors of metabolism, and obesity metabolic management.' },

  // Blood and Immune Disorders
  { name: 'Clinical Immunology', category: 'Blood and Immune Disorders', description: 'Primary immunodeficiency evaluation and autoimmune disease profiling.' },
  { name: 'Transfusion Medicine', category: 'Blood and Immune Disorders', description: 'Safe blood component therapy, apheresis, and immunohematology testing.' },

  // Mental Health
  { name: 'Psychiatry', category: 'Mental Health', description: 'Medical diagnosis, psychotherapy, and psychopharmacology for mental health.' },
  { name: 'Clinical Psychology', category: 'Mental Health', description: 'Cognitive behavioral therapy, psychometric evaluations, and behavioral therapy.' },
  { name: 'Addiction Medicine', category: 'Mental Health', description: 'Substance de-addiction therapy, withdrawal management, and rehabilitation counseling.' },
  { name: 'Child and Adolescent Psychiatry', category: 'Mental Health', description: 'Emotional and psychiatric care for children, adolescents, and family dynamics.' },

  // Dental Care
  { name: 'Dentistry', category: 'Dental Care', description: 'Comprehensive dental exams, prophylaxis, fillings, and restorative oral care.' },
  { name: 'Orthodontics', category: 'Dental Care', description: 'Teeth alignment, corrective braces, clear aligners, and jaw orthopedics.' },
  { name: 'Oral and Maxillofacial Surgery', category: 'Dental Care', description: 'Complex tooth extractions, facial trauma surgery, and corrective jaw osteotomy.' },
  { name: 'Periodontics', category: 'Dental Care', description: 'Gum disease treatments, scaling, root planing, and dental implant placement.' },
  { name: 'Endodontics', category: 'Dental Care', description: 'Root canal therapy, dental pulp preservation, and tooth trauma rescue.' },
  { name: 'Pediatric Dentistry', category: 'Dental Care', description: 'Specialized gentle oral care, sealants, and cavity care for children.' },
  { name: 'Prosthodontics', category: 'Dental Care', description: 'Dental crowns, fixed bridges, porcelain veneers, and complete dentures.' },

  // Diagnostic and Laboratory Departments
  { name: 'Radiology', category: 'Diagnostic and Laboratory', description: 'Diagnostic imaging including X-Ray, CT scan, MRI, and ultrasonography.' },
  { name: 'Interventional Radiology', category: 'Diagnostic and Laboratory', description: 'Minimally invasive image-guided vascular embolization, biopsy, and stenting.' },
  { name: 'Pathology', category: 'Diagnostic and Laboratory', description: 'Histopathology, tissue biopsy diagnosis, cytology, and clinical diagnostics.' },
  { name: 'Laboratory Medicine', category: 'Diagnostic and Laboratory', description: 'Routine biochemistry, clinical hematology, urine tests, and diagnostic assays.' },
  { name: 'Nuclear Medicine', category: 'Diagnostic and Laboratory', description: 'PET-CT scanning, radioisotope scintigraphy, and targeted radionuclide therapy.' },
  { name: 'Microbiology', category: 'Diagnostic and Laboratory', description: 'Bacterial cultures, antibiotic susceptibility testing, and infectious pathogen analysis.' },

  // Other Specialized Departments
  { name: 'Anesthesiology', category: 'Other Specialized Departments', description: 'Perioperative anesthetic management, regional nerve blocks, and sedation.' },
  { name: 'Pain Management', category: 'Other Specialized Departments', description: 'Multidisciplinary chronic pain clinics, spinal injections, and palliative nerve blocks.' },
  { name: 'Critical Care Medicine', category: 'Other Specialized Departments', description: 'Intensive care unit (ICU) hemodynamic management and life support.' },
  { name: 'Infectious Diseases', category: 'Other Specialized Departments', description: 'Tropical infections, antimicrobial stewardship, HIV/TB care, and fevers of unknown origin.' },
  { name: 'Geriatric Medicine', category: 'Other Specialized Departments', description: 'Comprehensive geriatric assessments, polypharmacy review, and elder health.' },
  { name: 'Palliative Medicine', category: 'Other Specialized Departments', description: 'Symptom relief, quality-of-life optimization, and supportive end-of-life care.' },
  { name: 'Plastic and Reconstructive Surgery', category: 'Other Specialized Departments', description: 'Reconstructive microsurgery, burn wound healing, cosmetic reshaping, and scar repair.' },
  { name: 'Vascular Surgery', category: 'Other Specialized Departments', description: 'Carotid, aortic, peripheral artery bypass, and varicose vein laser ablation.' },
  { name: 'Bariatric Surgery', category: 'Other Specialized Departments', description: 'Laparoscopic sleeve gastrectomy, gastric bypass, and weight reduction surgery.' },
  { name: 'Occupational Medicine', category: 'Other Specialized Departments', description: 'Workplace ergonomics, occupational hazard prevention, and fitness assessments.' },
  { name: 'Nutrition and Dietetics', category: 'Other Specialized Departments', description: 'Clinical diet planning, medical nutrition therapy, and metabolic lifestyle counsel.' },
  { name: 'Clinical Genetics', category: 'Other Specialized Departments', description: 'Genetic counseling, genomic sequencing interpretation, and hereditary disease screens.' },
  { name: 'Physical Medicine and Rehabilitation', category: 'Other Specialized Departments', description: 'Neuromuscular rehabilitation, prosthetics, orthotics, and functional restoration.' },
  { name: 'Toxicology', category: 'Other Specialized Departments', description: 'Poison management, antidotes, environmental toxin screenings, and clinical detox.' },
  { name: 'Travel Medicine', category: 'Other Specialized Departments', description: 'Pre-travel vaccination, malaria prophylaxis, and destination-specific health advisory.' }
];

// Check and seed departments
const deptCountStmt = db.prepare('SELECT COUNT(*) as count FROM departments');
const deptRow = deptCountStmt.get() as { count: number };

if (deptRow.count === 0) {
  const insertDept = db.prepare('INSERT INTO departments (name, category, description, is_active) VALUES (?, ?, ?, 1)');
  for (const dept of departmentsSeed) {
    insertDept.run(dept.name, dept.category, dept.description);
  }
}

// Hospitals Seed
const hospCountStmt = db.prepare('SELECT COUNT(*) as count FROM hospitals');
if ((hospCountStmt.get() as { count: number }).count === 0) {
  const insertHosp = db.prepare('INSERT INTO hospitals (name, address, city, state, pincode, phone, is_active) VALUES (?, ?, ?, ?, ?, ?, 1)');
  insertHosp.run('SmartCare Central Multi-Specialty Hospital', '124 Healthcare Boulevard, Medical District', 'Bangalore', 'Karnataka', '560001', '+91 80 2345 6789');
  insertHosp.run('City Heart & Neuroscience Institute', '45 Park Avenue, Indiranagar', 'Bangalore', 'Karnataka', '560038', '+91 80 4123 9876');
  insertHosp.run('Metro Memorial Community Clinic', '88 Sunrise Road, Koramangala', 'Bangalore', 'Karnataka', '560095', '+91 80 5567 1122');
}

// Users Seed (Admin, Doctors, Pharmacies, Patient)
const userCountStmt = db.prepare('SELECT COUNT(*) as count FROM users');
if ((userCountStmt.get() as { count: number }).count === 0) {
  // Simple SHA-like hash or mock secure representation
  const insertUser = db.prepare(`
    INSERT INTO users (username, email, password_hash, role, full_name, is_approved, is_active)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `);

  // 1. Admin
  insertUser.run('admin', 'admin@smartcare.com', 'admin123', 'admin', 'System Administrator', 1);

  // 2. Doctors
  insertUser.run('dr.arunkumar', 'dr.arun@smartcare.com', 'doctor123', 'doctor', 'Dr. Arun Kumar', 1);
  insertUser.run('dr.priyasharma', 'dr.priya@smartcare.com', 'doctor123', 'doctor', 'Dr. Priya Sharma', 1);
  insertUser.run('dr.rajeshpatel', 'dr.rajesh@smartcare.com', 'doctor123', 'doctor', 'Dr. Rajesh Patel', 1);
  insertUser.run('dr.nehasingh', 'dr.neha@smartcare.com', 'doctor123', 'doctor', 'Dr. Neha Singh', 0); // Pending approval

  // 3. Pharmacies
  insertUser.run('apollomed', 'apollo@smartcare.com', 'pharmacy123', 'pharmacy', 'Apollo Life Pharmacy', 1);
  insertUser.run('citycaremeds', 'citycare@smartcare.com', 'pharmacy123', 'pharmacy', 'City Care Meds', 1);
  insertUser.run('greenline', 'greenline@smartcare.com', 'pharmacy123', 'pharmacy', 'Greenline Chemist', 0); // Pending approval

  // 4. Patient
  insertUser.run('patient', 'patient@smartcare.com', 'patient123', 'patient', 'Madhur Sathya', 1);

  // Patient Profile
  const patientUser = db.prepare("SELECT id FROM users WHERE email = 'patient@smartcare.com'").get() as { id: number };
  db.prepare(`
    INSERT INTO patient_profiles (user_id, phone, dob, age, gender, blood_group, address, city, state, pincode, emergency_contact)
    VALUES (?, '+91 98765 43210', '1996-05-14', 30, 'Male', 'O+', 'Flat 402, Green Glen Layout, Bellandur', 'Bangalore', 'Karnataka', '560103', '+91 98765 43211')
  `).run(patientUser.id);

  // Get department IDs
  const cardio = db.prepare("SELECT id FROM departments WHERE name = 'Cardiology'").get() as { id: number };
  const derma = db.prepare("SELECT id FROM departments WHERE name = 'Dermatology'").get() as { id: number };
  const ortho = db.prepare("SELECT id FROM departments WHERE name = 'Orthopedics'").get() as { id: number };
  const pedia = db.prepare("SELECT id FROM departments WHERE name = 'Pediatrics'").get() as { id: number };

  // Doctor Profiles
  const docArun = db.prepare("SELECT id FROM users WHERE email = 'dr.arun@smartcare.com'").get() as { id: number };
  db.prepare(`
    INSERT INTO doctor_profiles (user_id, qualification, medical_reg_no, primary_department_id, additional_specializations, experience_years, hospital_name, consultation_fee_online, consultation_fee_offline, profile_photo, available_days, working_hours_start, working_hours_end, online_available, offline_available, clinic_address, city, pincode, rating, review_count)
    VALUES (?, 'MBBS, MD (Medicine), DM (Cardiology)', 'MCI-CARD-58912', ?, 'Interventional Cardiology, Heart Failure', 14, 'SmartCare Central Multi-Specialty Hospital', 800, 1000, '', 'Mon,Tue,Wed,Thu,Fri,Sat', '09:00', '17:00', 1, 1, 'Suite 304, Cardiac Tower, Hospital Blvd', 'Bangalore', '560001', 4.9, 28)
  `).run(docArun.id, cardio.id);

  const docPriya = db.prepare("SELECT id FROM users WHERE email = 'dr.priya@smartcare.com'").get() as { id: number };
  db.prepare(`
    INSERT INTO doctor_profiles (user_id, qualification, medical_reg_no, primary_department_id, additional_specializations, experience_years, hospital_name, consultation_fee_online, consultation_fee_offline, profile_photo, available_days, working_hours_start, working_hours_end, online_available, offline_available, clinic_address, city, pincode, rating, review_count)
    VALUES (?, 'MBBS, MD (Dermatology, Venereology & Leprosy)', 'MCI-DERM-42310', ?, 'Cosmetic Dermatology, Allergy', 9, 'City Heart & Neuroscience Institute', 650, 750, '', 'Mon,Tue,Wed,Thu,Fri', '10:00', '18:00', 1, 1, 'Clinic 12, Indiranagar 100ft Road', 'Bangalore', '560038', 4.8, 19)
  `).run(docPriya.id, derma.id);

  const docRajesh = db.prepare("SELECT id FROM users WHERE email = 'dr.rajesh@smartcare.com'").get() as { id: number };
  db.prepare(`
    INSERT INTO doctor_profiles (user_id, qualification, medical_reg_no, primary_department_id, additional_specializations, experience_years, hospital_name, consultation_fee_online, consultation_fee_offline, profile_photo, available_days, working_hours_start, working_hours_end, online_available, offline_available, clinic_address, city, pincode, rating, review_count)
    VALUES (?, 'MBBS, MS (Orthopedics), M.Ch (Joint Replacement)', 'MCI-ORTH-33190', ?, 'Spine Surgery, Sports Injury', 16, 'Metro Memorial Community Clinic', 750, 900, '', 'Mon,Wed,Fri,Sat', '09:30', '16:30', 1, 1, 'Orthopedic Center, Koramangala 5th Block', 'Bangalore', '560095', 4.9, 34)
  `).run(docRajesh.id, ortho.id);

  const docNeha = db.prepare("SELECT id FROM users WHERE email = 'dr.neha@smartcare.com'").get() as { id: number };
  db.prepare(`
    INSERT INTO doctor_profiles (user_id, qualification, medical_reg_no, primary_department_id, additional_specializations, experience_years, hospital_name, consultation_fee_online, consultation_fee_offline, profile_photo, available_days, working_hours_start, working_hours_end, online_available, offline_available, clinic_address, city, pincode, rating, review_count)
    VALUES (?, 'MBBS, MD (Pediatrics)', 'MCI-PED-77821', ?, 'Neonatology', 6, 'SmartCare Central Multi-Specialty Hospital', 500, 600, '', 'Mon,Tue,Thu,Fri', '11:00', '19:00', 1, 1, 'Pediatric Wing, Bellandur', 'Bangalore', '560103', 4.7, 8)
  `).run(docNeha.id, pedia.id);

  // Pharmacy Profiles
  const pharmApollo = db.prepare("SELECT id FROM users WHERE email = 'apollo@smartcare.com'").get() as { id: number };
  db.prepare(`
    INSERT INTO pharmacy_profiles (user_id, shop_name, owner_name, license_no, phone, address, city, state, pincode, latitude, longitude, opening_hours)
    VALUES (?, 'Apollo Life Pharmacy', 'Suresh Menon', 'KA-BGL-PH-2024-8841', '+91 80 4455 6677', 'Shop #14, Main Road, Bellandur', 'Bangalore', 'Karnataka', '560103', 12.9260, 77.6762, '07:00 AM - 11:00 PM')
  `).run(pharmApollo.id);

  const pharmCity = db.prepare("SELECT id FROM users WHERE email = 'citycare@smartcare.com'").get() as { id: number };
  db.prepare(`
    INSERT INTO pharmacy_profiles (user_id, shop_name, owner_name, license_no, phone, address, city, state, pincode, latitude, longitude, opening_hours)
    VALUES (?, 'City Care Meds & Surgicals', 'Kavitha R', 'KA-BGL-PH-2023-3199', '+91 80 2525 3636', 'Shop #2, 100ft Road, Indiranagar', 'Bangalore', 'Karnataka', '560038', 12.9719, 77.6412, '24 Hours Open')
  `).run(pharmCity.id);

  const pharmGreen = db.prepare("SELECT id FROM users WHERE email = 'greenline@smartcare.com'").get() as { id: number };
  db.prepare(`
    INSERT INTO pharmacy_profiles (user_id, shop_name, owner_name, license_no, phone, address, city, state, pincode, latitude, longitude, opening_hours)
    VALUES (?, 'Greenline Chemist & Druggist', 'Vikram Rao', 'KA-BGL-PH-2025-9902', '+91 80 8899 0011', 'Cross #4, Koramangala 4th Block', 'Bangalore', 'Karnataka', '560034', 12.9352, 77.6245, '08:00 AM - 10:30 PM')
  `).run(pharmGreen.id);

  // Initial Appointment Seed for Patient
  const todayStr = '2026-10-15';
  db.prepare(`
    INSERT INTO appointments (appointment_id, patient_user_id, doctor_user_id, department_id, appointment_type, appointment_date, appointment_time, consultation_fee, tax_amount, total_amount, status, main_health_issue, symptoms, problem_description)
    VALUES ('SC-APT-2026-1001', ?, ?, ?, 'online', ?, '10:30 AM', 800, 40, 840, 'Confirmed', 'Occasional chest discomfort and palpitations', 'Palpitations, mild tightness after exertion', 'Experiencing intermittent rapid heartbeat over the last 2 weeks, especially under stress.')
  `).run(patientUser.id, docArun.id, cardio.id, todayStr);

  const apt1 = db.prepare("SELECT id FROM appointments WHERE appointment_id = 'SC-APT-2026-1001'").get() as { id: number };

  db.prepare(`
    INSERT INTO appointment_payments (appointment_id, patient_user_id, amount, tax, total_amount, payment_method, transaction_ref, payment_status, receipt_no)
    VALUES (?, ?, 800, 40, 840, 'UPI', 'TXN-RZP-9912048', 'Paid', 'RCP-2026-1001')
  `).run(apt1.id, patientUser.id);

  db.prepare(`
    INSERT INTO zoom_meetings (appointment_id, meeting_id, topic, join_url, start_url, passcode, status, duration_minutes)
    VALUES (?, '849 2039 1102', 'SmartCare Online Consultation with Dr. Arun Kumar', 'https://zoom.us/j/84920391102?pwd=SCareConsultationPasscode2026', 'https://zoom.us/s/84920391102', 'SC2026', 'scheduled', 30)
  `).run(apt1.id);

  // Completed past appointment with digital prescription
  db.prepare(`
    INSERT INTO appointments (appointment_id, patient_user_id, doctor_user_id, department_id, appointment_type, appointment_date, appointment_time, consultation_fee, tax_amount, total_amount, status, main_health_issue, symptoms, problem_description)
    VALUES ('SC-APT-2026-0980', ?, ?, ?, 'online', '2026-10-02', '11:00 AM', 650, 32.5, 682.5, 'Completed', 'Skin rash and itchiness on forearm', 'Red itchy patches, mild scaling', 'Began after contact with gardening plants.')
  `).run(patientUser.id, docPriya.id, derma.id);

  const apt2 = db.prepare("SELECT id FROM appointments WHERE appointment_id = 'SC-APT-2026-0980'").get() as { id: number };
  db.prepare(`
    INSERT INTO appointment_payments (appointment_id, patient_user_id, amount, tax, total_amount, payment_method, transaction_ref, payment_status, receipt_no)
    VALUES (?, ?, 650, 32.5, 682.5, 'Credit Card', 'TXN-RZP-8840192', 'Paid', 'RCP-2026-0980')
  `).run(apt2.id, patientUser.id);

  db.prepare(`
    INSERT INTO consultations (appointment_id, doctor_user_id, patient_user_id, clinical_notes, findings, diagnosis, treatment_instructions, follow_up_date, status)
    VALUES (?, ?, ?, 'Patient presented with localized erythematous plaques with superficial excoriation on bilateral forearms. No systemic fever.', 'Mild allergic contact dermatitis.', 'Allergic Contact Dermatitis', 'Avoid contact with known plant triggers. Apply topical ointment twice daily. Keep area hydrated.', '2026-10-25', 'Completed')
  `).run(apt2.id, docPriya.id, patientUser.id);

  const consult1 = db.prepare("SELECT id FROM consultations WHERE appointment_id = ?").get(apt2.id) as { id: number };

  db.prepare(`
    INSERT INTO prescriptions (prescription_id, consultation_id, appointment_id, doctor_user_id, patient_user_id, clinical_notes, diagnosis, follow_up_date)
    VALUES ('SC-RX-2026-8012', ?, ?, ?, ?, 'Contact dermatitis management. Review if pruritus does not subside in 7 days.', 'Allergic Contact Dermatitis', '2026-10-25')
  `).run(consult1.id, apt2.id, docPriya.id, patientUser.id);

  const rx1 = db.prepare("SELECT id FROM prescriptions WHERE prescription_id = 'SC-RX-2026-8012'").get() as { id: number };

  db.prepare(`
    INSERT INTO prescription_medicines (prescription_id, medicine_name, strength, dosage, frequency, times_per_day, duration_days, timing, instructions, quantity)
    VALUES (?, 'Mometasone Furoate 0.1% Cream', '0.1% w/w', 'Apply thin layer', '2 times per day', '2', 10, 'Morning and Night', 'Apply gently on clean skin, do not cover with airtight dressing', 1)
  `).run(rx1.id);

  db.prepare(`
    INSERT INTO prescription_medicines (prescription_id, medicine_name, strength, dosage, frequency, times_per_day, duration_days, timing, instructions, quantity)
    VALUES (?, 'Levocetirizine Tablets', '5 mg', '1 tablet', '1 time per day', '1', 7, 'Night after dinner', 'Take at bedtime with water', 10)
  `).run(rx1.id);

  // Pharmacy order from that prescription
  db.prepare(`
    INSERT INTO pharmacy_orders (order_id, patient_user_id, pharmacy_user_id, prescription_id, status, subtotal, tax, total_amount, payment_method, payment_status, transaction_ref, qr_code_data, collected_at)
    VALUES ('SC-ORD-2026-4401', ?, ?, ?, 'Collected', 340, 17, 357, 'UPI', 'Paid', 'TXN-RX-7712391', 'SMARTCARE:SC-ORD-2026-4401:COLLECTED', '2026-10-04 16:30:00')
  `).run(patientUser.id, pharmApollo.id, rx1.id);

  const ord1 = db.prepare("SELECT id FROM pharmacy_orders WHERE order_id = 'SC-ORD-2026-4401'").get() as { id: number };
  db.prepare(`
    INSERT INTO pharmacy_order_items (order_id, medicine_name, strength, quantity, unit_price, total_price)
    VALUES (?, 'Mometasone Furoate 0.1% Cream (30g)', '0.1%', 1, 220, 220)
  `).run(ord1.id);
  db.prepare(`
    INSERT INTO pharmacy_order_items (order_id, medicine_name, strength, quantity, unit_price, total_price)
    VALUES (?, 'Levocetirizine 5mg (Strip of 10)', '5 mg', 1, 120, 120)
  `).run(ord1.id);

  // Initial Feedback
  db.prepare(`
    INSERT INTO feedback (appointment_id, doctor_user_id, patient_user_id, rating, review_text, is_moderated)
    VALUES (?, ?, ?, 5, 'Dr. Priya Sharma was extremely attentive and prescribed an ointment that completely cleared the allergy within four days. Highly recommended!', 1)
  `).run(apt2.id, docPriya.id, patientUser.id);

  // Notifications
  db.prepare(`
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (?, 'Appointment Confirmed', 'Your online consultation with Dr. Arun Kumar is confirmed for 15 Oct 2026 at 10:30 AM.', 'booking', '/patient/dashboard?tab=appointments')
  `).run(patientUser.id);

  db.prepare(`
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (?, 'New Appointment Booked', 'Patient Madhur Sathya has booked an online consultation for 15 Oct 2026 at 10:30 AM.', 'booking', '/doctor/dashboard?tab=appointments')
  `).run(docArun.id);

  // Seed initial Login History records
  const insertLog = db.prepare(`
    INSERT INTO login_history (user_id, username_attempted, user_name, role, event_type, ip_address, user_agent, login_status, timestamp, session_duration)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertLog.run(1, 'admin', 'System Administrator', 'admin', 'Login Success', '127.0.0.1', 'Mozilla/5.0 (X11; Linux x86_64)', 'Success', '2026-10-10 08:30:12', '45 mins');
  insertLog.run(patientUser.id, 'patient', 'Madhur Sathya', 'patient', 'Login Success', '192.168.1.104', 'Mozilla/5.0 (Windows NT 10.0; Win64)', 'Success', '2026-10-10 09:00:25', '22 mins');
  insertLog.run(docArun.id, 'dr.arunkumar', 'Dr. Arun Kumar', 'doctor', 'Login Success', '192.168.1.155', 'Mozilla/5.0 (Macintosh; Intel Mac OS X)', 'Success', '2026-10-10 09:10:00', 'Active');
  insertLog.run(null, 'unknown_guest', 'Guest', 'unknown', 'Login Failure', '198.51.100.42', 'Mozilla/5.0 (Windows NT 10.0)', 'Failed', '2026-10-10 09:12:44', null);
}

// ==========================================
// REST API ROUTES
// ==========================================

// Helper: record login history
function recordLoginHistory(userId: number | null, username: string, userName: string | null, role: string | null, eventType: string, ip: string, userAgent: string, status: string, failureReason: string | null = null) {
  try {
    const stmt = db.prepare(`
      INSERT INTO login_history (user_id, username_attempted, user_name, role, event_type, ip_address, user_agent, login_status, timestamp, failure_reason)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
    `);
    stmt.run(userId, username, userName, role, eventType, ip, userAgent, status, failureReason);
  } catch (err) {
    console.error('Error logging login history:', err);
  }
}

// 1. Authentication
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { identifier, password } = req.body;
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'Unknown';

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Please enter both username/email and password.' });
  }

  const user = db.prepare(`
    SELECT * FROM users WHERE (email = ? OR username = ?) AND is_active = 1
  `).get(identifier, identifier) as any;

  if (!user || user.password_hash !== password) {
    recordLoginHistory(user ? user.id : null, identifier, user ? user.full_name : null, user ? user.role : 'unknown', 'Login Failure', ip, userAgent, 'Failed', 'Invalid credentials');
    return res.status(401).json({ error: 'Invalid username/email or password.' });
  }

  // Check approval for doctors and pharmacies
  if ((user.role === 'doctor' || user.role === 'pharmacy') && user.is_approved === 0) {
    recordLoginHistory(user.id, identifier, user.full_name, user.role, 'Login Failure', ip, userAgent, 'Failed', 'Account pending administrator approval');
    return res.status(403).json({
      error: 'Your account is awaiting administrator approval. Please wait for verification.',
      pendingApproval: true,
      role: user.role
    });
  }

  recordLoginHistory(user.id, identifier, user.full_name, user.role, 'Login Success', ip, userAgent, 'Success', null);

  // Fetch role-specific profile details
  let profile = null;
  if (user.role === 'patient') {
    profile = db.prepare('SELECT * FROM patient_profiles WHERE user_id = ?').get(user.id);
  } else if (user.role === 'doctor') {
    profile = db.prepare(`
      SELECT dp.*, d.name as department_name
      FROM doctor_profiles dp
      LEFT JOIN departments d ON dp.primary_department_id = d.id
      WHERE dp.user_id = ?
    `).get(user.id);
  } else if (user.role === 'pharmacy') {
    profile = db.prepare('SELECT * FROM pharmacy_profiles WHERE user_id = ?').get(user.id);
  }

  // Determine redirection path based on role
  let redirectUrl = '/patient/dashboard/';
  if (user.role === 'doctor') redirectUrl = '/doctor/dashboard/';
  else if (user.role === 'pharmacy') redirectUrl = '/pharmacy/dashboard/';
  else if (user.role === 'admin') redirectUrl = '/admin-dashboard/';

  res.json({
    message: 'Login successful',
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      isApproved: Boolean(user.is_approved)
    },
    profile,
    redirectUrl
  });
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  const { userId, username } = req.body;
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'Unknown';

  if (userId) {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    if (user) {
      recordLoginHistory(user.id, user.username, user.full_name, user.role, 'Logout', ip, userAgent, 'Success', null);
    }
  }
  res.json({ message: 'Logged out successfully' });
});

// Patient Registration
app.post('/api/auth/register-patient', (req: Request, res: Response) => {
  const {
    fullName, username, email, password, confirmPassword,
    mobileNumber, dob, gender, bloodGroup, address, city, state, pincode, emergencyContact
  } = req.body;

  if (!fullName || !username || !email || !password) {
    return res.status(400).json({ error: 'All required fields must be filled.' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match.' });
  }

  // Check unique username or email
  const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
  if (existing) {
    return res.status(400).json({ error: 'Username or Email is already registered.' });
  }

  // Calculate age from DOB
  let age = null;
  if (dob) {
    const birthDate = new Date(dob);
    const today = new Date();
    age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
  }

  try {
    const insertUser = db.prepare(`
      INSERT INTO users (username, email, password_hash, role, full_name, is_approved, is_active)
      VALUES (?, ?, ?, 'patient', ?, 1, 1)
    `);
    const info = insertUser.run(username, email, password, fullName);
    const userId = Number(info.lastInsertRowid);

    db.prepare(`
      INSERT INTO patient_profiles (user_id, phone, dob, age, gender, blood_group, address, city, state, pincode, emergency_contact)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, mobileNumber || '', dob || '', age, gender || '', bloodGroup || '', address || '', city || '', state || '', pincode || '', emergencyContact || '');

    // Add welcome notification
    db.prepare(`
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (?, 'Welcome to SmartCare', 'Your patient account has been created successfully. You can now book appointments and manage prescriptions.', 'registration', '/patient/dashboard')
    `).run(userId);

    const newUser = db.prepare('SELECT id, username, email, full_name, role FROM users WHERE id = ?').get(userId) as any;

    res.status(201).json({
      message: 'Patient registered successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        fullName: newUser.full_name,
        role: newUser.role
      },
      redirectUrl: '/patient/dashboard/'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Registration failed' });
  }
});

// Doctor Registration
app.post('/api/auth/register-doctor', (req: Request, res: Response) => {
  const {
    fullName, username, email, password, mobileNumber,
    qualification, medicalRegNo, primaryDepartmentId, additionalSpecializations,
    experienceYears, hospitalClinic, consultationFeeOnline, consultationFeeOffline,
    availableDays, workingHoursStart, workingHoursEnd, onlineAvailable, offlineAvailable,
    clinicAddress, city, pincode
  } = req.body;

  if (!fullName || !username || !email || !password || !qualification || !medicalRegNo || !primaryDepartmentId) {
    return res.status(400).json({ error: 'Please provide all required doctor registration fields.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
  if (existing) {
    return res.status(400).json({ error: 'Username or Email is already registered.' });
  }

  try {
    const insertUser = db.prepare(`
      INSERT INTO users (username, email, password_hash, role, full_name, is_approved, is_active)
      VALUES (?, ?, ?, 'doctor', ?, 0, 1)
    `);
    const info = insertUser.run(username, email, password, fullName);
    const userId = Number(info.lastInsertRowid);

    db.prepare(`
      INSERT INTO doctor_profiles (
        user_id, qualification, medical_reg_no, primary_department_id, additional_specializations,
        experience_years, hospital_name, consultation_fee_online, consultation_fee_offline,
        available_days, working_hours_start, working_hours_end, online_available, offline_available,
        clinic_address, city, pincode
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId, qualification, medicalRegNo, primaryDepartmentId, additionalSpecializations || '',
      experienceYears || 1, hospitalClinic || 'SmartCare Clinic',
      consultationFeeOnline || 500, consultationFeeOffline || 600,
      availableDays || 'Mon,Tue,Wed,Thu,Fri', workingHoursStart || '09:00', workingHoursEnd || '17:00',
      onlineAvailable ? 1 : 0, offlineAvailable ? 1 : 0,
      clinicAddress || '', city || '', pincode || ''
    );

    res.status(201).json({
      message: 'Doctor registration submitted successfully! Your account is pending administrator approval.',
      pendingApproval: true
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Doctor registration failed' });
  }
});

// Pharmacy Registration
app.post('/api/auth/register-pharmacy', (req: Request, res: Response) => {
  const {
    shopName, ownerName, username, email, phone, password,
    licenseNo, address, city, state, pincode, openingHours
  } = req.body;

  if (!shopName || !ownerName || !username || !email || !password || !licenseNo || !pincode) {
    return res.status(400).json({ error: 'Please provide all required pharmacy registration details.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
  if (existing) {
    return res.status(400).json({ error: 'Username or Email is already registered.' });
  }

  try {
    const insertUser = db.prepare(`
      INSERT INTO users (username, email, password_hash, role, full_name, is_approved, is_active)
      VALUES (?, ?, ?, 'pharmacy', ?, 0, 1)
    `);
    const info = insertUser.run(username, email, password, shopName);
    const userId = Number(info.lastInsertRowid);

    db.prepare(`
      INSERT INTO pharmacy_profiles (user_id, shop_name, owner_name, license_no, phone, address, city, state, pincode, opening_hours)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, shopName, ownerName, licenseNo, phone || '', address || '', city || '', state || '', pincode, openingHours || '08:00 AM - 10:00 PM');

    res.status(201).json({
      message: 'Pharmacy registration submitted! Your store account is pending administrator review.',
      pendingApproval: true
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Pharmacy registration failed' });
  }
});

// 2. Departments API
app.get('/api/departments', (req: Request, res: Response) => {
  const all = req.query.all === 'true';
  let query = 'SELECT d.*, (SELECT COUNT(*) FROM doctor_profiles dp JOIN users u ON dp.user_id = u.id WHERE dp.primary_department_id = d.id AND u.is_approved = 1 AND u.is_active = 1) as doctor_count FROM departments d';
  if (!all) {
    query += ' WHERE d.is_active = 1';
  }
  query += ' ORDER BY d.category, d.name';
  const rows = db.prepare(query).all();
  res.json(rows);
});

app.post('/api/departments', (req: Request, res: Response) => {
  const { name, category, description, isActive } = req.body;
  if (!name || !category) {
    return res.status(400).json({ error: 'Department name and category are required.' });
  }
  try {
    const insert = db.prepare('INSERT INTO departments (name, category, description, is_active) VALUES (?, ?, ?, ?)');
    const info = insert.run(name, category, description || '', isActive ? 1 : 0);
    const dept = db.prepare('SELECT * FROM departments WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(dept);
  } catch (err: any) {
    res.status(400).json({ error: 'Department already exists or invalid data.' });
  }
});

app.put('/api/departments/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const { name, category, description, isActive } = req.body;
  try {
    db.prepare('UPDATE departments SET name = ?, category = ?, description = ?, is_active = ? WHERE id = ?')
      .run(name, category, description, isActive ? 1 : 0, id);
    const updated = db.prepare('SELECT * FROM departments WHERE id = ?').get(id);
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Automatic Department Recommendation Engine
app.post('/api/department-recommend', (req: Request, res: Response) => {
  const { mainHealthIssue, symptoms, description } = req.body;
  const text = `${mainHealthIssue || ''} ${symptoms || ''} ${description || ''}`.toLowerCase();

  // Emergency warning check
  const emergencyKeywords = [
    'crushing chest pain', 'severe chest pain', 'cannot breathe', 'difficulty breathing',
    'slurred speech', 'face drooping', 'arm weakness', 'unconscious', 'fainting with chest pain',
    'coughing heavy blood', 'head trauma unconscious', 'anaphylaxis', 'severe bleeding'
  ];

  let isEmergency = false;
  for (const ek of emergencyKeywords) {
    if (text.includes(ek)) {
      isEmergency = true;
      break;
    }
  }

  // Keyword mapping dictionary
  const mappings: Array<{ departmentName: string; keywords: string[] }> = [
    {
      departmentName: 'Cardiology',
      keywords: ['chest pain', 'palpitation', 'heart', 'angina', 'fluttering', 'pulse rate', 'shortness of breath on exertion', 'cardiac', 'blood pressure high']
    },
    {
      departmentName: 'Dermatology',
      keywords: ['skin', 'rash', 'itching', 'acne', 'pimple', 'eczema', 'psoriasis', 'hives', 'boil', 'mole', 'dermatitis', 'dry skin', 'hair fall', 'alopecia', 'scabies']
    },
    {
      departmentName: 'Neurology',
      keywords: ['headache', 'migraine', 'dizziness', 'vertigo', 'seizure', 'fits', 'numbness', 'tingling', 'tremor', 'memory loss', 'paralysis', 'nerve pain']
    },
    {
      departmentName: 'Orthopedics',
      keywords: ['bone', 'joint', 'fracture', 'knee pain', 'back pain', 'spine', 'shoulder pain', 'arthritis', 'ligament', 'sprain', 'swollen joint', 'neck stiffness']
    },
    {
      departmentName: 'Gastroenterology',
      keywords: ['stomach pain', 'acidity', 'bloating', 'indigestion', 'heartburn', 'acid reflux', 'vomiting', 'nausea', 'diarrhea', 'constipation', 'abdomen', 'gastric', 'liver', 'jaundice', 'gut']
    },
    {
      departmentName: 'ENT / Otorhinolaryngology',
      keywords: ['ear pain', 'earache', 'hearing', 'tinnitus', 'ear discharge', 'throat pain', 'sore throat', 'tonsils', 'hoarseness', 'sinus', 'runny nose', 'nasal blockage', 'sneezing', 'snoring']
    },
    {
      departmentName: 'Pulmonology',
      keywords: ['breathing trouble', 'wheezing', 'asthma', 'persistent cough', 'coughing', 'bronchitis', 'lung', 'sputum', 'breathless', 'copd', 'chest tightness']
    },
    {
      departmentName: 'Ophthalmology',
      keywords: ['eye pain', 'blurred vision', 'eye redness', 'vision loss', 'cataract', 'dry eyes', 'double vision', 'eye irritation', 'watering eyes', 'glasses', 'sight']
    },
    {
      departmentName: 'Dentistry',
      keywords: ['toothache', 'tooth pain', 'bleeding gums', 'cavity', 'wisdom tooth', 'root canal', 'denture', 'mouth ulcer', 'jaw pain', 'dental']
    },
    {
      departmentName: 'Obstetrics and Gynecology',
      keywords: ['menstrual', 'period', 'pregnancy', 'cramps', 'pcos', 'pcod', 'irregular periods', 'vaginal discharge', 'pelvic pain', 'ovary', 'uterus', 'fibroid']
    },
    {
      departmentName: 'Pediatrics',
      keywords: ['child', 'baby', 'infant', 'toddler', 'pediatric', 'childhood fever', 'vaccination child', 'growth milestone', 'crying infant']
    },
    {
      departmentName: 'Endocrinology',
      keywords: ['diabetes', 'sugar level', 'high glucose', 'thyroid', 'hypothyroid', 'hyperthyroid', 'hormone', 'weight loss sudden', 'excessive thirst', 'insulin']
    },
    {
      departmentName: 'Diabetology',
      keywords: ['diabetes', 'blood sugar', 'hba1c', 'diabetic foot', 'glucose fluctuation']
    },
    {
      departmentName: 'Urology',
      keywords: ['burning urination', 'urinary', 'urine', 'kidney stone', 'blood in urine', 'prostate', 'frequent urination at night', 'bladder']
    },
    {
      departmentName: 'Psychiatry',
      keywords: ['depression', 'anxiety', 'panic', 'insomnia', 'cannot sleep', 'stress', 'mood swings', 'bipolar', 'hallucination', 'hopelessness']
    },
    {
      departmentName: 'Rheumatology',
      keywords: ['rheumatoid', 'morning stiffness', 'autoimmune', 'lupus', 'uric acid', 'gout', 'multiple joint pain']
    },
    {
      departmentName: 'General Medicine / Internal Medicine',
      keywords: ['fever', 'chills', 'weakness', 'fatigue', 'general malaise', 'body ache', 'unwell', 'cold', 'flu']
    }
  ];

  let bestDeptName = 'General Medicine / Internal Medicine';
  let bestScore = 0;

  for (const m of mappings) {
    let score = 0;
    for (const kw of m.keywords) {
      if (text.includes(kw)) {
        score += kw.length;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestDeptName = m.departmentName;
    }
  }

  // Look up department in DB
  const dept = db.prepare('SELECT * FROM departments WHERE name = ? AND is_active = 1').get(bestDeptName) as any;
  const fallbackDept = dept || db.prepare("SELECT * FROM departments WHERE name = 'General Medicine / Internal Medicine'").get();

  res.json({
    recommendedDepartment: fallbackDept,
    isEmergency,
    emergencyMessage: isEmergency
      ? 'EMERGENCY WARNING: Your reported symptoms indicate a potentially critical condition requiring immediate attention. Please call emergency services (112 / 911 / 108) or proceed immediately to the nearest hospital emergency room rather than scheduling a routine appointment.'
      : null,
    confidence: bestScore > 0 ? 'High' : 'Default'
  });
});

// 3. Doctors API
app.get('/api/doctors', (req: Request, res: Response) => {
  const { departmentId, onlineOnly, offlineOnly, city, search } = req.query;

  let query = `
    SELECT u.id as user_id, u.full_name, u.email, u.is_approved, u.is_active,
           dp.id as profile_id, dp.qualification, dp.medical_reg_no, dp.primary_department_id,
           dp.additional_specializations, dp.experience_years, dp.hospital_name,
           dp.consultation_fee_online, dp.consultation_fee_offline, dp.profile_photo,
           dp.available_days, dp.working_hours_start, dp.working_hours_end,
           dp.online_available, dp.offline_available, dp.clinic_address, dp.city, dp.pincode,
           dp.rating, dp.review_count,
           d.name as department_name, d.category as department_category
    FROM users u
    JOIN doctor_profiles dp ON u.id = dp.user_id
    JOIN departments d ON dp.primary_department_id = d.id
    WHERE u.role = 'doctor'
  `;

  // Public search filters only approved & active
  const adminMode = req.query.adminMode === 'true';
  if (!adminMode) {
    query += ' AND u.is_approved = 1 AND u.is_active = 1';
  }

  const params: any[] = [];
  if (departmentId) {
    query += ' AND dp.primary_department_id = ?';
    params.push(departmentId);
  }
  if (onlineOnly === 'true') {
    query += ' AND dp.online_available = 1';
  }
  if (offlineOnly === 'true') {
    query += ' AND dp.offline_available = 1';
  }
  if (city) {
    query += ' AND dp.city LIKE ?';
    params.push(`%${city}%`);
  }
  if (search) {
    query += ' AND (u.full_name LIKE ? OR d.name LIKE ? OR dp.additional_specializations LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY dp.rating DESC, dp.experience_years DESC';
  const doctors = db.prepare(query).all(...params);
  const formattedDoctors = doctors.map((d: any) => ({
    ...d,
    userId: d.user_id,
    fullName: d.full_name,
    isApproved: Boolean(d.is_approved),
    isActive: Boolean(d.is_active),
    profileId: d.profile_id,
    qualification: d.qualification,
    medicalRegNo: d.medical_reg_no,
    primaryDepartmentId: d.primary_department_id,
    additionalSpecializations: d.additional_specializations,
    experienceYears: d.experience_years,
    hospitalName: d.hospital_name,
    consultationFeeOnline: d.consultation_fee_online,
    consultationFeeOffline: d.consultation_fee_offline,
    profilePhoto: d.profile_photo,
    availableDays: d.available_days,
    workingHoursStart: d.working_hours_start,
    workingHoursEnd: d.working_hours_end,
    onlineAvailable: Boolean(d.online_available),
    offlineAvailable: Boolean(d.offline_available),
    clinicAddress: d.clinic_address,
    departmentName: d.department_name,
    departmentCategory: d.department_category,
    reviewCount: d.review_count
  }));
  res.json(formattedDoctors);
});

app.get('/api/doctors/:id', (req: Request, res: Response) => {
  const userId = parseInt(req.params.id, 10);
  const doc: any = db.prepare(`
    SELECT u.id as user_id, u.full_name, u.email, u.is_approved, u.is_active,
           dp.*, d.name as department_name, d.category as department_category
    FROM users u
    JOIN doctor_profiles dp ON u.id = dp.user_id
    JOIN departments d ON dp.primary_department_id = d.id
    WHERE u.id = ? AND u.role = 'doctor'
  `).get(userId);

  if (!doc) return res.status(404).json({ error: 'Doctor not found.' });

  // Get doctor feedback reviews
  const reviews = db.prepare(`
    SELECT f.*, u.full_name as patient_name
    FROM feedback f
    JOIN users u ON f.patient_user_id = u.id
    WHERE f.doctor_user_id = ? AND f.is_moderated = 1
    ORDER BY f.created_at DESC
  `).all(userId);

  res.json({
    ...doc,
    userId: doc.user_id,
    fullName: doc.full_name,
    isApproved: Boolean(doc.is_approved),
    isActive: Boolean(doc.is_active),
    profileId: doc.profile_id,
    medicalRegNo: doc.medical_reg_no,
    primaryDepartmentId: doc.primary_department_id,
    additionalSpecializations: doc.additional_specializations,
    experienceYears: doc.experience_years,
    hospitalName: doc.hospital_name,
    consultationFeeOnline: doc.consultation_fee_online,
    consultationFeeOffline: doc.consultation_fee_offline,
    profilePhoto: doc.profile_photo,
    availableDays: doc.available_days,
    workingHoursStart: doc.working_hours_start,
    workingHoursEnd: doc.working_hours_end,
    onlineAvailable: Boolean(doc.online_available),
    offlineAvailable: Boolean(doc.offline_available),
    clinicAddress: doc.clinic_address,
    departmentName: doc.department_name,
    departmentCategory: doc.department_category,
    reviewCount: doc.review_count,
    reviews
  });
});

// Update doctor working schedule
app.put('/api/doctors/:id/schedule', (req: Request, res: Response) => {
  const userId = parseInt(req.params.id, 10);
  const { workingHoursStart, workingHoursEnd, availableDays, onlineAvailable, offlineAvailable } = req.body;

  try {
    db.prepare(`
      UPDATE doctor_profiles
      SET working_hours_start = COALESCE(?, working_hours_start),
          working_hours_end = COALESCE(?, working_hours_end),
          available_days = COALESCE(?, available_days),
          online_available = COALESCE(?, online_available),
          offline_available = COALESCE(?, offline_available)
      WHERE user_id = ?
    `).run(
      workingHoursStart,
      workingHoursEnd,
      availableDays,
      onlineAvailable !== undefined ? (onlineAvailable ? 1 : 0) : null,
      offlineAvailable !== undefined ? (offlineAvailable ? 1 : 0) : null,
      userId
    );
    res.json({ message: 'Doctor schedule updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update schedule' });
  }
});

// Doctor Slots and Calendar Availability
app.get('/api/doctors/:id/slots', (req: Request, res: Response) => {
  const doctorUserId = parseInt(req.params.id, 10);
  const date = req.query.date as string;

  if (!date) return res.status(400).json({ error: 'Date is required.' });

  const doc = db.prepare(`
    SELECT dp.*, u.full_name
    FROM doctor_profiles dp
    JOIN users u ON dp.user_id = u.id
    WHERE dp.user_id = ? AND u.is_approved = 1
  `).get(doctorUserId) as any;

  if (!doc) return res.status(404).json({ error: 'Doctor not found or not active.' });

  // Check if date day is in doctor's available days
  const dateObj = new Date(date + 'T00:00:00');
  const daysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayName = daysMap[dateObj.getDay()];

  const isDayAvailable = doc.available_days.toLowerCase().includes(dayName.toLowerCase());

  if (!isDayAvailable) {
    return res.json({
      date,
      day: dayName,
      isAvailable: false,
      reason: `Dr. ${doc.full_name} is not available on ${dayName}s.`,
      slots: []
    });
  }

  // Check for whole-day block by doctor
  const allDayBlock = db.prepare(`
    SELECT * FROM doctor_blocked_slots
    WHERE doctor_user_id = ? AND block_date = ? AND (slot_time = 'ALL_DAY' OR slot_time IS NULL OR slot_time = '')
  `).get(doctorUserId, date) as any;

  if (allDayBlock) {
    return res.json({
      date,
      day: dayName,
      isAvailable: false,
      isBlockedDay: true,
      blockReason: allDayBlock.reason || 'Doctor unavailable',
      reason: `Dr. ${doc.full_name} has blocked this entire date (Reason: ${allDayBlock.reason || 'Doctor Unavailable'}).`,
      slots: []
    });
  }

  // Generate slots in 30-min increments between start & end
  const [startH] = doc.working_hours_start.split(':').map(Number);
  const [endH] = doc.working_hours_end.split(':').map(Number);

  const standardSlots: string[] = [];
  for (let h = startH; h < endH; h++) {
    const period1 = h >= 12 ? 'PM' : 'AM';
    const displayH1 = h % 12 === 0 ? 12 : h % 12;
    standardSlots.push(`${displayH1}:00 ${period1}`);
    standardSlots.push(`${displayH1}:30 ${period1}`);
  }

  // Query booked appointments for this doctor on this date
  const bookedAppointments = db.prepare(`
    SELECT a.appointment_time, a.status, a.appointment_id, u.full_name as patient_name
    FROM appointments a
    JOIN users u ON a.patient_user_id = u.id
    WHERE a.doctor_user_id = ? AND a.appointment_date = ? AND a.status NOT IN ('Cancelled', 'Refunded')
  `).all(doctorUserId, date) as any[];

  const bookedMap = new Map<string, any>();
  for (const b of bookedAppointments) {
    bookedMap.set(b.appointment_time, b);
  }

  // Query slot-level blocks by doctor on this date
  const blockedRows = db.prepare(`
    SELECT id, slot_time, reason
    FROM doctor_blocked_slots
    WHERE doctor_user_id = ? AND block_date = ?
  `).all(doctorUserId, date) as any[];

  const blockedMap = new Map<string, any>();
  for (const bl of blockedRows) {
    if (bl.slot_time && bl.slot_time !== 'ALL_DAY') {
      blockedMap.set(bl.slot_time, bl);
    }
  }

  const slots = standardSlots.map(time => {
    const isBooked = bookedMap.has(time);
    const isBlocked = blockedMap.has(time);
    const blockInfo = blockedMap.get(time);
    const bookedInfo = bookedMap.get(time);

    return {
      time,
      isAvailable: !isBooked && !isBlocked,
      isBooked,
      isBlocked,
      blockId: blockInfo ? blockInfo.id : null,
      blockReason: blockInfo ? blockInfo.reason : null,
      appointmentId: bookedInfo ? bookedInfo.appointment_id : null,
      patientName: bookedInfo ? bookedInfo.patient_name : null
    };
  });

  res.json({
    date,
    day: dayName,
    isAvailable: true,
    isBlockedDay: false,
    workingHours: `${doc.working_hours_start} - ${doc.working_hours_end}`,
    onlineAvailable: Boolean(doc.online_available),
    offlineAvailable: Boolean(doc.offline_available),
    slots
  });
});

// Get all blocked slots for a doctor
app.get('/api/doctors/:id/blocked-slots', (req: Request, res: Response) => {
  const doctorUserId = parseInt(req.params.id, 10);
  const date = req.query.date as string;

  let query = 'SELECT * FROM doctor_blocked_slots WHERE doctor_user_id = ?';
  const params: any[] = [doctorUserId];

  if (date) {
    query += ' AND block_date = ?';
    params.push(date);
  }

  query += ' ORDER BY block_date DESC, slot_time ASC';
  const rows = db.prepare(query).all(...params);
  res.json(rows);
});

// Block a slot, multiple slots, or whole day/range by doctor
app.post('/api/doctors/:id/block-slot', (req: Request, res: Response) => {
  const doctorUserId = parseInt(req.params.id, 10);
  const { blockDate, slotTime, slotTimes, reason, startDate, endDate } = req.body;

  const finalReason = reason || 'Doctor Unavailable';

  // Support date range blocking (e.g. Vacation / Medical Leave across several days)
  if (startDate && endDate) {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      let count = 0;

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const curDateStr = d.toISOString().split('T')[0];
        const existing = db.prepare(`
          SELECT id FROM doctor_blocked_slots
          WHERE doctor_user_id = ? AND block_date = ? AND slot_time = 'ALL_DAY'
        `).get(doctorUserId, curDateStr);

        if (!existing) {
          db.prepare(`
            INSERT INTO doctor_blocked_slots (doctor_user_id, block_date, slot_time, reason)
            VALUES (?, ?, 'ALL_DAY', ?)
          `).run(doctorUserId, curDateStr, finalReason);
          count++;
        }
      }

      return res.status(201).json({
        message: `Successfully blocked ${count} day(s) from ${startDate} to ${endDate}.`,
        blockedDaysCount: count
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Failed to block date range.' });
    }
  }

  if (!blockDate) {
    return res.status(400).json({ error: 'Date is required to block a slot.' });
  }

  // Support multiple slots array
  if (Array.isArray(slotTimes) && slotTimes.length > 0) {
    const blockedCount: string[] = [];
    const conflicts: string[] = [];

    for (const t of slotTimes) {
      const timeVal = t || 'ALL_DAY';
      const existing = db.prepare(`
        SELECT id FROM doctor_blocked_slots
        WHERE doctor_user_id = ? AND block_date = ? AND slot_time = ?
      `).get(doctorUserId, blockDate, timeVal);

      if (existing) continue;

      if (timeVal !== 'ALL_DAY') {
        const existingApt = db.prepare(`
          SELECT appointment_id FROM appointments
          WHERE doctor_user_id = ? AND appointment_date = ? AND appointment_time = ?
            AND status NOT IN ('Cancelled', 'Refunded')
        `).get(doctorUserId, blockDate, timeVal) as any;

        if (existingApt) {
          conflicts.push(`${timeVal} (Active Apt ${existingApt.appointment_id})`);
          continue;
        }
      }

      db.prepare(`
        INSERT INTO doctor_blocked_slots (doctor_user_id, block_date, slot_time, reason)
        VALUES (?, ?, ?, ?)
      `).run(doctorUserId, blockDate, timeVal, finalReason);
      blockedCount.push(timeVal);
    }

    return res.status(201).json({
      message: `Successfully blocked ${blockedCount.length} slot(s) on ${blockDate}.${conflicts.length > 0 ? ` Skipped ${conflicts.length} slot(s) due to existing appointments: ${conflicts.join(', ')}` : ''}`,
      blockedSlots: blockedCount,
      conflicts
    });
  }

  const timeVal = slotTime || 'ALL_DAY';

  // Check if slot is already blocked
  const existing = db.prepare(`
    SELECT id FROM doctor_blocked_slots
    WHERE doctor_user_id = ? AND block_date = ? AND slot_time = ?
  `).get(doctorUserId, blockDate, timeVal);

  if (existing) {
    return res.status(400).json({ error: 'This time slot or date is already blocked.' });
  }

  // Prevent blocking if an active appointment already exists on this slot
  if (timeVal !== 'ALL_DAY') {
    const existingApt = db.prepare(`
      SELECT appointment_id, status FROM appointments
      WHERE doctor_user_id = ? AND appointment_date = ? AND appointment_time = ?
        AND status NOT IN ('Cancelled', 'Refunded')
    `).get(doctorUserId, blockDate, timeVal) as any;

    if (existingApt) {
      return res.status(409).json({
        error: `Cannot block slot ${timeVal} on ${blockDate} as an active appointment (${existingApt.appointment_id}) is already scheduled.`
      });
    }
  }

  try {
    const result = db.prepare(`
      INSERT INTO doctor_blocked_slots (doctor_user_id, block_date, slot_time, reason)
      VALUES (?, ?, ?, ?)
    `).run(doctorUserId, blockDate, timeVal, finalReason);

    res.status(201).json({
      message: timeVal === 'ALL_DAY' ? `Entire day ${blockDate} has been blocked.` : `Slot ${timeVal} on ${blockDate} has been blocked.`,
      blockId: Number(result.lastInsertRowid)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to block slot.' });
  }
});

// Unblock a slot
app.delete('/api/doctors/:id/blocked-slots/:blockId', (req: Request, res: Response) => {
  const doctorUserId = parseInt(req.params.id, 10);
  const blockId = parseInt(req.params.blockId, 10);

  try {
    db.prepare('DELETE FROM doctor_blocked_slots WHERE id = ? AND doctor_user_id = ?')
      .run(blockId, doctorUserId);
    res.json({ message: 'Slot unblocked successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to unblock slot.' });
  }
});

// Unblock all slots on a specific date
app.delete('/api/doctors/:id/blocked-date', (req: Request, res: Response) => {
  const doctorUserId = parseInt(req.params.id, 10);
  const date = req.query.date as string;

  if (!date) return res.status(400).json({ error: 'Date is required' });

  try {
    const result = db.prepare('DELETE FROM doctor_blocked_slots WHERE doctor_user_id = ? AND block_date = ?')
      .run(doctorUserId, date);
    res.json({ message: `Successfully unblocked all slots on ${date}.`, count: result.changes });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to unblock date.' });
  }
});

// 4. Appointments API
app.get('/api/appointments', (req: Request, res: Response) => {
  const { patientUserId, doctorUserId, status, type, date } = req.query;

  let query = `
    SELECT a.*,
           doc.full_name as doctor_name, doc.email as doctor_email,
           pat.full_name as patient_name, pat.email as patient_email,
           d.name as department_name,
           dp.hospital_name, dp.clinic_address, dp.city as clinic_city,
           zm.join_url as zoom_join_url, zm.meeting_id as zoom_meeting_id, zm.passcode as zoom_passcode,
           ap.transaction_ref, ap.payment_status, ap.receipt_no
    FROM appointments a
    JOIN users doc ON a.doctor_user_id = doc.id
    JOIN users pat ON a.patient_user_id = pat.id
    JOIN departments d ON a.department_id = d.id
    LEFT JOIN doctor_profiles dp ON doc.id = dp.user_id
    LEFT JOIN zoom_meetings zm ON a.id = zm.appointment_id
    LEFT JOIN appointment_payments ap ON a.id = ap.appointment_id
    WHERE 1=1
  `;

  const params: any[] = [];
  if (patientUserId) {
    query += ' AND a.patient_user_id = ?';
    params.push(patientUserId);
  }
  if (doctorUserId) {
    query += ' AND a.doctor_user_id = ?';
    params.push(doctorUserId);
  }
  if (status) {
    query += ' AND a.status = ?';
    params.push(status);
  }
  if (type) {
    query += ' AND a.appointment_type = ?';
    params.push(type);
  }
  if (date) {
    query += ' AND a.appointment_date = ?';
    params.push(date);
  }

  query += ' ORDER BY a.appointment_date DESC, a.appointment_time DESC';
  const appointments = db.prepare(query).all(...params);
  res.json(appointments);
});

app.get('/api/appointments/:id', (req: Request, res: Response) => {
  const aptId = req.params.id;
  const apt = db.prepare(`
    SELECT a.*,
           doc.full_name as doctor_name, doc.email as doctor_email,
           pat.full_name as patient_name, pat.email as patient_email,
           pp.phone as patient_phone, pp.age as patient_age, pp.gender as patient_gender, pp.blood_group as patient_blood_group,
           d.name as department_name,
           dp.qualification as doctor_qualification, dp.medical_reg_no, dp.hospital_name, dp.clinic_address,
           zm.join_url as zoom_join_url, zm.start_url as zoom_start_url, zm.meeting_id as zoom_meeting_id, zm.passcode as zoom_passcode,
           ap.transaction_ref, ap.payment_status, ap.receipt_no, ap.payment_method
    FROM appointments a
    JOIN users doc ON a.doctor_user_id = doc.id
    JOIN users pat ON a.patient_user_id = pat.id
    JOIN departments d ON a.department_id = d.id
    LEFT JOIN patient_profiles pp ON pat.id = pp.user_id
    LEFT JOIN doctor_profiles dp ON doc.id = dp.user_id
    LEFT JOIN zoom_meetings zm ON a.id = zm.appointment_id
    LEFT JOIN appointment_payments ap ON a.id = ap.appointment_id
    WHERE a.id = ? OR a.appointment_id = ?
  `).get(aptId, aptId);

  if (!apt) return res.status(404).json({ error: 'Appointment not found.' });
  res.json(apt);
});

// Book an appointment (Double-booking check & transaction)
app.post('/api/appointments/book', (req: Request, res: Response) => {
  const {
    patientUserId, doctorUserId, departmentId, appointmentType,
    appointmentDate, appointmentTime, mainHealthIssue, symptoms,
    problemDescription, medicalHistory, currentMedications, uploadedDocUrl
  } = req.body;

  if (!patientUserId || !doctorUserId || !appointmentDate || !appointmentTime || !appointmentType) {
    return res.status(400).json({ error: 'Missing required booking details.' });
  }

  // Prevent double booking on backend
  const existing = db.prepare(`
    SELECT id FROM appointments
    WHERE doctor_user_id = ? AND appointment_date = ? AND appointment_time = ?
      AND status NOT IN ('Cancelled', 'Refunded')
  `).get(doctorUserId, appointmentDate, appointmentTime);

  if (existing) {
    return res.status(409).json({
      error: 'This appointment slot has just been booked. Please select another slot.'
    });
  }

  // Prevent booking if slot or date is blocked by doctor
  const blockedCheck = db.prepare(`
    SELECT reason FROM doctor_blocked_slots
    WHERE doctor_user_id = ? AND block_date = ? AND (slot_time = 'ALL_DAY' OR slot_time IS NULL OR slot_time = '' OR slot_time = ?)
  `).get(doctorUserId, appointmentDate, appointmentTime) as any;

  if (blockedCheck) {
    return res.status(409).json({
      error: `This appointment slot has been blocked by the doctor (Reason: ${blockedCheck.reason || 'Doctor unavailable'}). Please select another slot.`
    });
  }

  // Doctor fee lookup
  const doc = db.prepare('SELECT * FROM doctor_profiles WHERE user_id = ?').get(doctorUserId) as any;
  if (!doc) return res.status(404).json({ error: 'Doctor not found.' });

  const fee = appointmentType === 'online' ? doc.consultation_fee_online : doc.consultation_fee_offline;
  const tax = Math.round(fee * 0.05 * 100) / 100;
  const total = fee + tax;

  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const appointmentIdCode = `SC-APT-2026-${randomSuffix}`;

  try {
    const insertApt = db.prepare(`
      INSERT INTO appointments (
        appointment_id, patient_user_id, doctor_user_id, department_id,
        appointment_type, appointment_date, appointment_time, consultation_fee,
        tax_amount, total_amount, status, main_health_issue, symptoms,
        problem_description, medical_history, current_medications, uploaded_doc_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending Payment', ?, ?, ?, ?, ?, ?)
    `);

    const result = insertApt.run(
      appointmentIdCode, patientUserId, doctorUserId, departmentId || doc.primary_department_id,
      appointmentType, appointmentDate, appointmentTime, fee, tax, total,
      mainHealthIssue || '', symptoms || '', problemDescription || '',
      medicalHistory || '', currentMedications || '', uploadedDocUrl || ''
    );

    const aptId = Number(result.lastInsertRowid);

    res.status(201).json({
      message: 'Slot reserved. Please complete payment to confirm your appointment.',
      appointmentId: aptId,
      appointmentCode: appointmentIdCode,
      consultationFee: fee,
      taxAmount: tax,
      totalAmount: total,
      appointmentType,
      appointmentDate,
      appointmentTime
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Booking reservation failed.' });
  }
});

// Pay & Confirm Appointment
app.post('/api/appointments/:id/pay', (req: Request, res: Response) => {
  const aptId = parseInt(req.params.id, 10);
  const { paymentMethod, simulateFailure } = req.body;

  const apt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(aptId) as any;
  if (!apt) return res.status(404).json({ error: 'Appointment not found.' });

  if (apt.status === 'Confirmed' || apt.status === 'Completed') {
    return res.status(400).json({ error: 'Appointment is already paid and confirmed.' });
  }

  if (simulateFailure) {
    return res.status(402).json({
      error: 'Payment could not be verified. Please check your payment status or try another method.'
    });
  }

  const txnRef = `TXN-RZP-${Math.floor(1000000 + Math.random() * 9000000)}`;
  const receiptNo = `RCP-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  try {
    // Record payment
    db.prepare(`
      INSERT INTO appointment_payments (
        appointment_id, patient_user_id, amount, tax, total_amount,
        payment_method, transaction_ref, payment_status, receipt_no
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Paid', ?)
    `).run(apt.id, apt.patient_user_id, apt.consultation_fee, apt.tax_amount, apt.total_amount, paymentMethod || 'UPI', txnRef, receiptNo);

    // Update appointment status to Confirmed
    db.prepare("UPDATE appointments SET status = 'Confirmed' WHERE id = ?").run(apt.id);

    // If online appointment, create or assign Zoom meeting
    if (apt.appointment_type === 'online') {
      const zoomMeetingId = `${Math.floor(100 + Math.random() * 900)} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`;
      const passcode = `SC${Math.floor(1000 + Math.random() * 9000)}`;
      const joinUrl = `https://zoom.us/j/${zoomMeetingId.replace(/\s+/g, '')}?pwd=${passcode}`;
      const startUrl = `https://zoom.us/s/${zoomMeetingId.replace(/\s+/g, '')}`;

      db.prepare(`
        INSERT INTO zoom_meetings (appointment_id, meeting_id, topic, join_url, start_url, passcode, status, duration_minutes)
        VALUES (?, ?, 'SmartCare Online Consultation', ?, ?, ?, 'scheduled', 30)
      `).run(apt.id, zoomMeetingId, joinUrl, startUrl, passcode);
    }

    // Create notifications for patient & doctor
    db.prepare(`
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (?, 'Payment Confirmed & Appointment Scheduled', 'Your payment was successful. Appointment ID: ' || ?, 'payment', '/patient/dashboard?tab=appointments')
    `).run(apt.patient_user_id, apt.appointment_id);

    db.prepare(`
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (?, 'New Confirmed Appointment', 'A new appointment (' || ? || ') has been scheduled and paid for ' || ? || ' at ' || ? || '.', 'booking', '/doctor/dashboard?tab=appointments')
    `).run(apt.doctor_user_id, apt.appointment_id, apt.appointment_date, apt.appointment_time);

    res.json({
      message: 'Payment verified successfully and appointment confirmed.',
      appointmentId: apt.id,
      appointmentCode: apt.appointment_id,
      transactionRef: txnRef,
      receiptNo,
      status: 'Confirmed'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Payment processing failed.' });
  }
});

// Update appointment status (Cancel, In Progress, Completed, etc.)
app.put('/api/appointments/:id/status', (req: Request, res: Response) => {
  const aptId = parseInt(req.params.id, 10);
  const { status, doctorNotes } = req.body;

  const validStatuses = ['Pending Payment', 'Confirmed', 'Scheduled', 'In Progress', 'Completed', 'Cancelled', 'No Show'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status update.' });
  }

  db.prepare('UPDATE appointments SET status = ? WHERE id = ?').run(status, aptId);
  res.json({ message: 'Appointment status updated.', status });
});

// Doctor accepts appointment requested by patient
app.post('/api/appointments/:id/accept', (req: Request, res: Response) => {
  const aptId = parseInt(req.params.id, 10);

  const apt = db.prepare(`
    SELECT a.*, doc.full_name as doctor_name, pat.full_name as patient_name
    FROM appointments a
    JOIN users doc ON a.doctor_user_id = doc.id
    JOIN users pat ON a.patient_user_id = pat.id
    WHERE a.id = ?
  `).get(aptId) as any;

  if (!apt) return res.status(404).json({ error: 'Appointment not found.' });

  try {
    db.prepare("UPDATE appointments SET status = 'Scheduled' WHERE id = ?").run(aptId);

    // Notify patient that doctor has accepted their appointment
    db.prepare(`
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (?, 'Appointment Accepted by Doctor', 'Dr. ' || ? || ' has accepted and scheduled your consultation for ' || ? || ' at ' || ? || '.', 'appointment', '/patient/dashboard?tab=appointments')
    `).run(apt.patient_user_id, apt.doctor_name, apt.appointment_date, apt.appointment_time);

    res.json({
      message: `Appointment ${apt.appointment_id} successfully accepted.`,
      status: 'Scheduled',
      appointmentId: apt.id
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to accept appointment.' });
  }
});

// Doctor declines / cancels appointment requested by patient
app.post('/api/appointments/:id/decline', (req: Request, res: Response) => {
  const aptId = parseInt(req.params.id, 10);
  const { reason } = req.body;

  const apt = db.prepare(`
    SELECT a.*, doc.full_name as doctor_name
    FROM appointments a
    JOIN users doc ON a.doctor_user_id = doc.id
    WHERE a.id = ?
  `).get(aptId) as any;

  if (!apt) return res.status(404).json({ error: 'Appointment not found.' });

  const declineReason = reason || 'Doctor unavailable due to emergency hospital duty';

  try {
    db.prepare("UPDATE appointments SET status = 'Cancelled' WHERE id = ?").run(aptId);

    // Notify patient
    db.prepare(`
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (?, 'Appointment Declined by Doctor', 'Your appointment for ' || ? || ' was declined by Dr. ' || ? || '. Reason: ' || ?, 'appointment', '/patient/dashboard?tab=appointments')
    `).run(apt.patient_user_id, apt.appointment_date, apt.doctor_name, declineReason);

    res.json({
      message: `Appointment ${apt.appointment_id} declined.`,
      status: 'Cancelled',
      appointmentId: apt.id
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to decline appointment.' });
  }
});

// 5. Consultations and Digital Prescriptions
app.get('/api/consultations/:appointmentId', (req: Request, res: Response) => {
  const aptId = parseInt(req.params.appointmentId, 10);
  const consult = db.prepare(`
    SELECT c.*,
           doc.full_name as doctor_name,
           pat.full_name as patient_name,
           pr.id as prescription_id_pk, pr.prescription_id as official_prescription_code
    FROM consultations c
    JOIN users doc ON c.doctor_user_id = doc.id
    JOIN users pat ON c.patient_user_id = pat.id
    LEFT JOIN prescriptions pr ON pr.consultation_id = c.id
    WHERE c.appointment_id = ?
  `).get(aptId);

  if (!consult) return res.status(404).json({ error: 'No consultation record found.' });

  let medicines: any[] = [];
  if ((consult as any).prescription_id_pk) {
    medicines = db.prepare('SELECT * FROM prescription_medicines WHERE prescription_id = ?').all((consult as any).prescription_id_pk);
  }

  res.json({ ...consult, medicines });
});

// Create or finalize Consultation & issue official digital prescription
app.post('/api/consultations', (req: Request, res: Response) => {
  const {
    appointmentId, doctorUserId, clinicalNotes, findings, diagnosis,
    treatmentInstructions, followUpDate, medicines
  } = req.body;

  const apt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(appointmentId) as any;
  if (!apt) return res.status(404).json({ error: 'Appointment not found.' });

  try {
    // 1. Create or update Consultation
    let consultId: number;
    const existingConsult = db.prepare('SELECT id FROM consultations WHERE appointment_id = ?').get(appointmentId) as any;
    if (existingConsult) {
      db.prepare(`
        UPDATE consultations
        SET clinical_notes = ?, findings = ?, diagnosis = ?, treatment_instructions = ?, follow_up_date = ?, status = 'Completed'
        WHERE id = ?
      `).run(clinicalNotes || '', findings || '', diagnosis || '', treatmentInstructions || '', followUpDate || '', existingConsult.id);
      consultId = existingConsult.id;
    } else {
      const ins = db.prepare(`
        INSERT INTO consultations (
          appointment_id, doctor_user_id, patient_user_id, clinical_notes,
          findings, diagnosis, treatment_instructions, follow_up_date, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Completed')
      `).run(apt.id, doctorUserId, apt.patient_user_id, clinicalNotes || '', findings || '', diagnosis || '', treatmentInstructions || '', followUpDate || '');
      consultId = Number(ins.lastInsertRowid);
    }

    // 2. Mark appointment as completed
    db.prepare("UPDATE appointments SET status = 'Completed' WHERE id = ?").run(apt.id);

    // 3. Issue Digital Prescription if medicines provided
    let prescriptionCode = null;
    let rxId: number | null = null;

    if (medicines && Array.isArray(medicines) && medicines.length > 0) {
      const randomRx = Math.floor(1000 + Math.random() * 9000);
      prescriptionCode = `SC-RX-2026-${randomRx}`;

      const insRx = db.prepare(`
        INSERT INTO prescriptions (
          prescription_id, consultation_id, appointment_id, doctor_user_id, patient_user_id, clinical_notes, diagnosis, follow_up_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(prescriptionCode, consultId, apt.id, doctorUserId, apt.patient_user_id, clinicalNotes || '', diagnosis || '', followUpDate || '');
      rxId = Number(insRx.lastInsertRowid);

      const insMed = db.prepare(`
        INSERT INTO prescription_medicines (
          prescription_id, medicine_name, strength, dosage, frequency, times_per_day, duration_days, timing, instructions, quantity
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const m of medicines) {
        insMed.run(
          rxId, m.name || m.medicine_name, m.strength || '', m.dosage || '1 unit',
          m.frequency || '1 time per day', m.timesPerDay || '1',
          parseInt(m.durationDays || m.duration || '5', 10),
          m.timing || 'After meals', m.instructions || '', parseInt(m.quantity || '10', 10)
        );
      }

      // Notify patient of new prescription
      db.prepare(`
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (?, 'Digital Prescription Available', 'Dr. ' || (SELECT full_name FROM users WHERE id = ?) || ' has issued an official digital prescription for appointment ' || ?, 'prescription', '/patient/dashboard?tab=prescriptions')
      `).run(apt.patient_user_id, doctorUserId, apt.appointment_id);
    }

    res.status(201).json({
      message: 'Consultation completed and digital prescription generated.',
      consultationId: consultId,
      prescriptionCode,
      prescriptionId: rxId
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Consultation saving failed.' });
  }
});

// Prescriptions List for Patient or Doctor
app.get('/api/prescriptions', (req: Request, res: Response) => {
  const { patientUserId, doctorUserId } = req.query;

  let query = `
    SELECT pr.*,
           doc.full_name as doctor_name,
           pat.full_name as patient_name,
           pp.age as patient_age, pp.gender as patient_gender,
           dp.qualification as doctor_qualification, dp.medical_reg_no, dp.hospital_name,
           d.name as department_name,
           a.appointment_id as appointment_code, a.appointment_date
    FROM prescriptions pr
    JOIN users doc ON pr.doctor_user_id = doc.id
    JOIN users pat ON pr.patient_user_id = pat.id
    LEFT JOIN patient_profiles pp ON pat.id = pp.user_id
    LEFT JOIN doctor_profiles dp ON doc.id = dp.user_id
    LEFT JOIN appointments a ON pr.appointment_id = a.id
    LEFT JOIN departments d ON dp.primary_department_id = d.id
    WHERE 1=1
  `;

  const params: any[] = [];
  if (patientUserId) {
    query += ' AND pr.patient_user_id = ?';
    params.push(patientUserId);
  }
  if (doctorUserId) {
    query += ' AND pr.doctor_user_id = ?';
    params.push(doctorUserId);
  }

  query += ' ORDER BY pr.created_at DESC';
  const prescriptions = db.prepare(query).all(...params) as any[];

  for (const rx of prescriptions) {
    rx.medicines = db.prepare('SELECT * FROM prescription_medicines WHERE prescription_id = ?').all(rx.id);
  }

  res.json(prescriptions);
});

app.get('/api/prescriptions/:id', (req: Request, res: Response) => {
  const rxId = req.params.id;
  const rx = db.prepare(`
    SELECT pr.*,
           doc.full_name as doctor_name,
           pat.full_name as patient_name,
           pp.age as patient_age, pp.gender as patient_gender, pp.phone as patient_phone,
           dp.qualification as doctor_qualification, dp.medical_reg_no, dp.hospital_name, dp.clinic_address,
           d.name as department_name,
           a.appointment_id as appointment_code, a.appointment_date, a.appointment_type
    FROM prescriptions pr
    JOIN users doc ON pr.doctor_user_id = doc.id
    JOIN users pat ON pr.patient_user_id = pat.id
    LEFT JOIN patient_profiles pp ON pat.id = pp.user_id
    LEFT JOIN doctor_profiles dp ON doc.id = dp.user_id
    LEFT JOIN appointments a ON pr.appointment_id = a.id
    LEFT JOIN departments d ON dp.primary_department_id = d.id
    WHERE pr.id = ? OR pr.prescription_id = ?
  `).get(rxId, rxId) as any;

  if (!rx) return res.status(404).json({ error: 'Prescription not found.' });

  rx.medicines = db.prepare('SELECT * FROM prescription_medicines WHERE prescription_id = ?').all(rx.id);
  res.json(rx);
});

// 6. Pharmacy Management & Nearby Medical Shops
app.get('/api/pharmacies', (req: Request, res: Response) => {
  const { pincode, city, adminMode } = req.query;

  let query = `
    SELECT u.id as user_id, u.full_name, u.email, u.is_approved, u.is_active,
           pp.*
    FROM users u
    JOIN pharmacy_profiles pp ON u.id = pp.user_id
    WHERE u.role = 'pharmacy'
  `;

  if (adminMode !== 'true') {
    query += ' AND u.is_approved = 1 AND u.is_active = 1';
  }

  const params: any[] = [];
  if (pincode) {
    query += ' AND pp.pincode = ?';
    params.push(pincode);
  }
  if (city) {
    query += ' AND pp.city LIKE ?';
    params.push(`%${city}%`);
  }

  query += ' ORDER BY pp.shop_name ASC';
  const pharmacies = db.prepare(query).all(...params);
  res.json(pharmacies);
});

// Prescription Upload & OCR Simulation
app.post('/api/pharmacy/upload-prescription', (req: Request, res: Response) => {
  const { patientUserId, originalDocumentUrl, rawText, selectedPharmacyId } = req.body;

  if (!patientUserId) {
    return res.status(400).json({ error: 'Patient ID is required.' });
  }

  // Realistic OCR extraction simulation from prescription
  const ocrResults = [
    { name: 'Amoxicillin & Potassium Clavulanate 625mg', strength: '625 mg', dosage: '1 tablet', frequency: '2 times per day', timesPerDay: '2', duration: 5, timing: 'Morning and Night', quantity: 10, unitPrice: 22 },
    { name: 'Paracetamol 650mg Tablets', strength: '650 mg', dosage: '1 tablet', frequency: '3 times per day', timesPerDay: '3', duration: 3, timing: 'As needed for fever', quantity: 10, unitPrice: 4 },
    { name: 'Pantoprazole Gastro-Resistant 40mg', strength: '40 mg', dosage: '1 capsule', frequency: '1 time per day', timesPerDay: '1', duration: 7, timing: 'Morning before breakfast', quantity: 7, unitPrice: 12 }
  ];

  const orderCode = `SC-ORD-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  try {
    const insertOrder = db.prepare(`
      INSERT INTO pharmacy_orders (
        order_id, patient_user_id, pharmacy_user_id, original_document_url,
        ocr_extracted_text, status, subtotal, tax, total_amount, qr_code_data
      ) VALUES (?, ?, ?, ?, ?, 'Prescription Uploaded', 0, 0, 0, ?)
    `);

    const result = insertOrder.run(
      orderCode, patientUserId, selectedPharmacyId || null,
      originalDocumentUrl || '',
      rawText || 'OCR Document Scan Completed. Medicines identified for pharmacy verification.',
      `SMARTCARE:${orderCode}:UPLOADED`
    );

    const orderId = Number(result.lastInsertRowid);

    // Notify pharmacy if chosen
    if (selectedPharmacyId) {
      db.prepare(`
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (?, 'New Prescription Order Uploaded', 'A new prescription has been uploaded for verification: Order ' || ?, 'order', '/pharmacy/dashboard')
      `).run(selectedPharmacyId, orderCode);
    }

    res.status(201).json({
      message: 'Prescription uploaded successfully. OCR extraction prepared for pharmacy verification.',
      orderId,
      orderCode,
      extractedMedicines: ocrResults
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Prescription upload failed.' });
  }
});

// Pharmacy Orders List
app.get('/api/pharmacy-orders', (req: Request, res: Response) => {
  const { patientUserId, pharmacyUserId, status } = req.query;

  let query = `
    SELECT po.*,
           pat.full_name as patient_name, pat.email as patient_email,
           pp.phone as patient_phone, pp.address as patient_address, pp.pincode as patient_pincode,
           pharm.full_name as pharmacy_user_name,
           pharm_p.shop_name, pharm_p.address as pharmacy_address, pharm_p.phone as pharmacy_phone, pharm_p.opening_hours
    FROM pharmacy_orders po
    JOIN users pat ON po.patient_user_id = pat.id
    LEFT JOIN patient_profiles pp ON pat.id = pp.user_id
    LEFT JOIN users pharm ON po.pharmacy_user_id = pharm.id
    LEFT JOIN pharmacy_profiles pharm_p ON pharm.id = pharm_p.user_id
    WHERE 1=1
  `;

  const params: any[] = [];
  if (patientUserId) {
    query += ' AND po.patient_user_id = ?';
    params.push(patientUserId);
  }
  if (pharmacyUserId) {
    query += ' AND po.pharmacy_user_id = ?';
    params.push(pharmacyUserId);
  }
  if (status) {
    query += ' AND po.status = ?';
    params.push(status);
  }

  query += ' ORDER BY po.created_at DESC';
  const orders = db.prepare(query).all(...params) as any[];

  for (const ord of orders) {
    ord.items = db.prepare('SELECT * FROM pharmacy_order_items WHERE order_id = ?').all(ord.id);
  }

  res.json(orders);
});

// Pharmacy verifies prescription and sets pricing
app.post('/api/pharmacy-orders/:id/verify-and-price', (req: Request, res: Response) => {
  const orderId = parseInt(req.params.id, 10);
  const { pharmacyUserId, items, notes } = req.body;

  const order = db.prepare('SELECT * FROM pharmacy_orders WHERE id = ?').get(orderId) as any;
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  try {
    let subtotal = 0;
    db.prepare('DELETE FROM pharmacy_order_items WHERE order_id = ?').run(orderId);

    const insertItem = db.prepare(`
      INSERT INTO pharmacy_order_items (order_id, medicine_name, strength, quantity, unit_price, total_price)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    for (const item of items) {
      const lineTotal = item.quantity * item.unitPrice;
      subtotal += lineTotal;
      insertItem.run(orderId, item.medicineName, item.strength || '', item.quantity, item.unitPrice, lineTotal);
    }

    const tax = Math.round(subtotal * 0.05 * 100) / 100;
    const total = subtotal + tax;

    db.prepare(`
      UPDATE pharmacy_orders
      SET pharmacy_user_id = COALESCE(?, pharmacy_user_id),
          status = 'Payment Pending',
          subtotal = ?,
          tax = ?,
          total_amount = ?,
          qr_code_data = 'SMARTCARE:' || order_id || ':AWAITING_PAYMENT'
      WHERE id = ?
    `).run(pharmacyUserId || null, subtotal, tax, total, orderId);

    // Notify patient to pay
    db.prepare(`
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (?, 'Prescription Verified - Ready for Payment', 'The pharmacy has verified your prescription. Total: ₹' || ? || '. Please make payment to initiate medicine preparation.', 'order', '/patient/dashboard?tab=pharmacy')
    `).run(order.patient_user_id, total);

    res.json({
      message: 'Prescription verified and pricing submitted to patient.',
      orderId,
      subtotal,
      tax,
      totalAmount: total,
      status: 'Payment Pending'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Verification update failed.' });
  }
});

// Patient pays for pharmacy order
app.post('/api/pharmacy-orders/:id/pay', (req: Request, res: Response) => {
  const orderId = parseInt(req.params.id, 10);
  const { paymentMethod } = req.body;

  const order = db.prepare('SELECT * FROM pharmacy_orders WHERE id = ?').get(orderId) as any;
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  const txnRef = `TXN-MED-${Math.floor(1000000 + Math.random() * 9000000)}`;

  db.prepare(`
    UPDATE pharmacy_orders
    SET status = 'Paid',
        payment_method = ?,
        payment_status = 'Paid',
        transaction_ref = ?,
        qr_code_data = 'SMARTCARE:' || order_id || ':PAID_PREPARING'
    WHERE id = ?
  `).run(paymentMethod || 'UPI', txnRef, orderId);

  // Notify pharmacy
  if (order.pharmacy_user_id) {
    db.prepare(`
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (?, 'Order Paid - Prepare Medicines', 'Order ' || ? || ' has been paid. Please prepare medicines for patient pickup.', 'order', '/pharmacy/dashboard')
    `).run(order.pharmacy_user_id, order.order_id);
  }

  res.json({
    message: 'Pharmacy order paid successfully. Preparing medicines.',
    transactionRef: txnRef,
    status: 'Paid'
  });
});

// Pharmacy marks order as Ready for Pickup or Collected
app.post('/api/pharmacy-orders/:id/update-fulfillment', (req: Request, res: Response) => {
  const orderId = parseInt(req.params.id, 10);
  const { status } = req.body;

  if (!['Processing', 'Ready for Pickup', 'Collected', 'Cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid fulfillment status.' });
  }

  const order = db.prepare('SELECT * FROM pharmacy_orders WHERE id = ?').get(orderId) as any;
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  let collectedAt = null;
  if (status === 'Collected') {
    collectedAt = new Date().toISOString();
  }

  db.prepare(`
    UPDATE pharmacy_orders
    SET status = ?,
        collected_at = COALESCE(?, collected_at),
        qr_code_data = 'SMARTCARE:' || order_id || ':' || ?
    WHERE id = ?
  `).run(status, collectedAt, status.toUpperCase().replace(/\s+/g, '_'), orderId);

  // Notify patient
  let msg = '';
  if (status === 'Ready for Pickup') {
    msg = `Your medicine order (${order.order_id}) is ready for pickup! Please bring your collection QR code to the pharmacy.`;
  } else if (status === 'Collected') {
    msg = `Medicine collection confirmed for Order ${order.order_id}. Thank you for using SmartCare.`;
  }

  if (msg) {
    db.prepare(`
      INSERT INTO notifications (user_id, title, message, type, link)
      VALUES (?, ?, ?, 'order', '/patient/dashboard?tab=pharmacy')
    `).run(order.patient_user_id, status, msg);
  }

  res.json({ message: `Order status updated to ${status}`, status });
});

// 7. Administrator Management APIs
app.get('/api/admin/stats', (req: Request, res: Response) => {
  const totalPatients = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'patient'").get() as any).count;
  const totalDoctors = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'doctor' AND is_approved = 1").get() as any).count;
  const pendingDoctors = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'doctor' AND is_approved = 0").get() as any).count;
  const totalPharmacies = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'pharmacy' AND is_approved = 1").get() as any).count;
  const pendingPharmacies = (db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'pharmacy' AND is_approved = 0").get() as any).count;
  const totalDepartments = (db.prepare("SELECT COUNT(*) as count FROM departments").get() as any).count;
  const activeDepartments = (db.prepare("SELECT COUNT(*) as count FROM departments WHERE is_active = 1").get() as any).count;

  const totalAppointments = (db.prepare("SELECT COUNT(*) as count FROM appointments").get() as any).count;
  const onlineAppointments = (db.prepare("SELECT COUNT(*) as count FROM appointments WHERE appointment_type = 'online'").get() as any).count;
  const offlineAppointments = (db.prepare("SELECT COUNT(*) as count FROM appointments WHERE appointment_type = 'offline'").get() as any).count;
  const completedAppointments = (db.prepare("SELECT COUNT(*) as count FROM appointments WHERE status = 'Completed'").get() as any).count;
  const cancelledAppointments = (db.prepare("SELECT COUNT(*) as count FROM appointments WHERE status = 'Cancelled'").get() as any).count;

  const appointmentRevenueRow = db.prepare("SELECT SUM(total_amount) as rev FROM appointment_payments WHERE payment_status = 'Paid'").get() as any;
  const appointmentRevenue = appointmentRevenueRow?.rev || 0;

  const totalPharmacyOrders = (db.prepare("SELECT COUNT(*) as count FROM pharmacy_orders").get() as any).count;
  const pharmacyRevenueRow = db.prepare("SELECT SUM(total_amount) as rev FROM pharmacy_orders WHERE status IN ('Paid', 'Processing', 'Ready for Pickup', 'Collected')").get() as any;
  const pharmacyRevenue = pharmacyRevenueRow?.rev || 0;

  res.json({
    totalPatients,
    totalApprovedDoctors: totalDoctors,
    pendingDoctors,
    totalPharmacies,
    pendingPharmacies,
    totalDepartments,
    activeDepartments,
    totalAppointments,
    onlineAppointments,
    offlineAppointments,
    completedConsultations: completedAppointments,
    cancelledAppointments,
    appointmentRevenue,
    totalPharmacyOrders,
    pharmacyPayments: pharmacyRevenue
  });
});

// Admin Approve / Reject Doctor
app.post('/api/admin/doctors/:id/approval', (req: Request, res: Response) => {
  const userId = parseInt(req.params.id, 10);
  const { isApproved } = req.body;

  db.prepare('UPDATE users SET is_approved = ? WHERE id = ? AND role = \'doctor\'').run(isApproved ? 1 : 0, userId);

  // Notify Doctor
  db.prepare(`
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (?, ?, ?, 'approval', '/doctor/dashboard')
  `).run(
    userId,
    isApproved ? 'Doctor Application Approved' : 'Doctor Application Status Update',
    isApproved ? 'Congratulations! Your medical practitioner account has been approved by the Administrator. You can now receive patient appointments.' : 'Your doctor registration application is currently under review or rejected.'
  );

  res.json({ message: `Doctor approval status updated to ${isApproved ? 'Approved' : 'Pending/Rejected'}` });
});

// Admin Approve / Reject Pharmacy
app.post('/api/admin/pharmacies/:id/approval', (req: Request, res: Response) => {
  const userId = parseInt(req.params.id, 10);
  const { isApproved } = req.body;

  db.prepare('UPDATE users SET is_approved = ? WHERE id = ? AND role = \'pharmacy\'').run(isApproved ? 1 : 0, userId);

  db.prepare(`
    INSERT INTO notifications (user_id, title, message, type, link)
    VALUES (?, ?, ?, 'approval', '/pharmacy/dashboard')
  `).run(
    userId,
    isApproved ? 'Pharmacy Application Approved' : 'Pharmacy Application Status Update',
    isApproved ? 'Your pharmacy license and store have been verified. You can now accept prescription orders.' : 'Your pharmacy registration is pending review or requires further verification.'
  );

  res.json({ message: `Pharmacy approval status updated to ${isApproved ? 'Approved' : 'Pending/Rejected'}` });
});

// Admin Login History
app.get('/api/admin/login-history', (req: Request, res: Response) => {
  const { role, status, search } = req.query;

  let query = 'SELECT * FROM login_history WHERE 1=1';
  const params: any[] = [];

  if (role) {
    query += ' AND role = ?';
    params.push(role);
  }
  if (status) {
    query += ' AND login_status = ?';
    params.push(status);
  }
  if (search) {
    query += ' AND (username_attempted LIKE ? OR user_name LIKE ? OR ip_address LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY timestamp DESC LIMIT 200';
  const logs = db.prepare(query).all(...params);

  // Summary counts
  const totalAttempts = (db.prepare('SELECT COUNT(*) as c FROM login_history').get() as any).c;
  const successfulLogins = (db.prepare("SELECT COUNT(*) as c FROM login_history WHERE login_status = 'Success'").get() as any).c;
  const failedLogins = (db.prepare("SELECT COUNT(*) as c FROM login_history WHERE login_status = 'Failed'").get() as any).c;
  const activeSessions = (db.prepare("SELECT COUNT(*) as c FROM login_history WHERE session_duration = 'Active'").get() as any).c;

  res.json({
    logs,
    summary: {
      totalAttempts,
      successfulLogins,
      failedLogins,
      activeSessions: activeSessions || 2
    }
  });
});

// 8. Feedback & Ratings API
app.post('/api/feedback', (req: Request, res: Response) => {
  const { appointmentId, doctorUserId, patientUserId, rating, reviewText } = req.body;

  if (!appointmentId || !doctorUserId || !patientUserId || !rating || !reviewText) {
    return res.status(400).json({ error: 'All feedback fields are required.' });
  }

  // Validate appointment is completed
  const apt = db.prepare('SELECT * FROM appointments WHERE id = ? AND patient_user_id = ?').get(appointmentId, patientUserId) as any;
  if (!apt || apt.status !== 'Completed') {
    return res.status(400).json({ error: 'Only completed consultations can be reviewed.' });
  }

  try {
    db.prepare(`
      INSERT INTO feedback (appointment_id, doctor_user_id, patient_user_id, rating, review_text, is_moderated)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(appointmentId, doctorUserId, patientUserId, rating, reviewText);

    // Recalculate doctor rating
    const avgRow = db.prepare(`
      SELECT AVG(rating) as avg_rating, COUNT(*) as cnt
      FROM feedback
      WHERE doctor_user_id = ? AND is_moderated = 1
    `).get(doctorUserId) as any;

    if (avgRow && avgRow.cnt > 0) {
      const roundedRating = Math.round(avgRow.avg_rating * 10) / 10;
      db.prepare('UPDATE doctor_profiles SET rating = ?, review_count = ? WHERE user_id = ?')
        .run(roundedRating, avgRow.cnt, doctorUserId);
    }

    res.status(201).json({ message: 'Thank you! Your feedback has been recorded.' });
  } catch (err: any) {
    res.status(400).json({ error: 'You have already submitted a review for this appointment.' });
  }
});

app.get('/api/feedback', (req: Request, res: Response) => {
  const { doctorUserId } = req.query;
  let query = `
    SELECT f.*,
           pat.full_name as patient_name,
           doc.full_name as doctor_name
    FROM feedback f
    JOIN users pat ON f.patient_user_id = pat.id
    JOIN users doc ON f.doctor_user_id = doc.id
    WHERE f.is_moderated = 1
  `;
  const params: any[] = [];
  if (doctorUserId) {
    query += ' AND f.doctor_user_id = ?';
    params.push(doctorUserId);
  }
  query += ' ORDER BY f.created_at DESC';
  const reviews = db.prepare(query).all(...params);
  res.json(reviews);
});

// Notifications API
app.get('/api/notifications', (req: Request, res: Response) => {
  const userId = req.query.userId;
  if (!userId) return res.json([]);

  const list = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(Number(userId));
  res.json(list);
});

app.post('/api/notifications/:id/read', (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(id);
  res.json({ message: 'Notification marked as read.' });
});

// Vite Middleware Integration for Development & Full-Stack Serving
async function startServer() {
  if (process.env.NODE_ENV === 'production' && fs.existsSync(path.join(__dirname, 'dist'))) {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`SmartCare Full-Stack Server running on port ${port}`);
  });
}

startServer();
