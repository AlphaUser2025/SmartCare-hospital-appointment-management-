export type UserRole = 'patient' | 'doctor' | 'pharmacy' | 'admin';

export interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  isApproved: boolean;
  isActive?: boolean;
}

export interface PatientProfile {
  id: number;
  userId: number;
  phone: string;
  dob: string;
  age: number;
  gender: string;
  bloodGroup: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  emergencyContact: string;
  avatarUrl?: string;
}

export interface Doctor {
  userId: number;
  fullName: string;
  email: string;
  qualification: string;
  medicalRegNo: string;
  primaryDepartmentId: number;
  departmentName: string;
  departmentCategory?: string;
  additionalSpecializations: string;
  experienceYears: number;
  hospitalName: string;
  consultationFeeOnline: number;
  consultationFeeOffline: number;
  profilePhoto?: string;
  availableDays: string;
  workingHoursStart: string;
  workingHoursEnd: string;
  onlineAvailable: boolean;
  offlineAvailable: boolean;
  clinicAddress: string;
  city: string;
  pincode: string;
  rating: number;
  reviewCount: number;
  isApproved: boolean;
}

export interface DoctorBlockedSlot {
  id: number;
  doctor_user_id: number;
  block_date: string;
  slot_time: string; // 'ALL_DAY' or specific time like '10:00 AM'
  reason?: string;
  created_at?: string;
}

export interface Department {
  id: number;
  name: string;
  category: string;
  description: string;
  is_active: number | boolean;
  doctor_count?: number;
}

export interface Appointment {
  id: number;
  appointment_id: string;
  patient_user_id: number;
  doctor_user_id: number;
  department_id: number;
  appointment_type: 'online' | 'offline';
  appointment_date: string;
  appointment_time: string;
  consultation_fee: number;
  tax_amount: number;
  total_amount: number;
  status: 'Pending Payment' | 'Confirmed' | 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled' | 'No Show';
  main_health_issue: string;
  symptoms: string;
  problem_description: string;
  medical_history?: string;
  current_medications?: string;
  uploaded_doc_url?: string;
  doctor_name: string;
  doctor_email?: string;
  patient_name: string;
  patient_email?: string;
  patient_phone?: string;
  patient_age?: number;
  patient_gender?: string;
  patient_blood_group?: string;
  department_name: string;
  hospital_name?: string;
  clinic_address?: string;
  clinic_city?: string;
  zoom_join_url?: string;
  zoom_start_url?: string;
  zoom_meeting_id?: string;
  zoom_passcode?: string;
  transaction_ref?: string;
  payment_status?: string;
  receipt_no?: string;
  payment_method?: string;
  created_at: string;
}

export interface PrescriptionMedicine {
  id?: number;
  prescription_id?: number;
  medicine_name: string;
  strength: string;
  dosage: string;
  frequency: string;
  times_per_day?: string;
  duration_days: number;
  timing: string;
  instructions: string;
  quantity: number;
}

export interface Prescription {
  id: number;
  prescription_id: string;
  consultation_id?: number;
  appointment_id: number;
  doctor_user_id: number;
  patient_user_id: number;
  doctor_name: string;
  patient_name: string;
  patient_age?: number;
  patient_gender?: string;
  doctor_qualification?: string;
  medical_reg_no?: string;
  hospital_name?: string;
  clinic_address?: string;
  department_name?: string;
  appointment_code?: string;
  appointment_date?: string;
  clinical_notes?: string;
  diagnosis?: string;
  follow_up_date?: string;
  created_at: string;
  medicines: PrescriptionMedicine[];
}

export interface PharmacyProfile {
  userId: number;
  shopName: string;
  ownerName: string;
  licenseNo: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
  openingHours: string;
  isApproved: boolean;
}

export interface PharmacyOrderItem {
  id?: number;
  order_id?: number;
  medicine_name: string;
  strength?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface PharmacyOrder {
  id: number;
  order_id: string;
  patient_user_id: number;
  pharmacy_user_id?: number;
  prescription_id?: number;
  original_document_url?: string;
  ocr_extracted_text?: string;
  status: 'Prescription Uploaded' | 'Under Verification' | 'Payment Pending' | 'Paid' | 'Processing' | 'Ready for Pickup' | 'Collected' | 'Cancelled';
  subtotal: number;
  tax: number;
  total_amount: number;
  payment_method?: string;
  payment_status?: string;
  transaction_ref?: string;
  qr_code_data?: string;
  created_at: string;
  collected_at?: string;
  patient_name?: string;
  patient_phone?: string;
  patient_address?: string;
  patient_pincode?: string;
  shop_name?: string;
  pharmacy_address?: string;
  pharmacy_phone?: string;
  opening_hours?: string;
  items?: PharmacyOrderItem[];
}

export interface LoginHistoryEntry {
  id: number;
  user_id: number | null;
  username_attempted: string;
  user_name: string | null;
  role: string | null;
  event_type: 'Login Success' | 'Login Failure' | 'Logout' | 'Session Expiration';
  ip_address: string;
  user_agent: string;
  login_status: string;
  timestamp: string;
  logout_timestamp?: string;
  session_duration?: string;
  failure_reason?: string;
}

export interface FeedbackEntry {
  id: number;
  appointment_id: number;
  doctor_user_id: number;
  patient_user_id: number;
  rating: number;
  review_text: string;
  is_moderated: number;
  created_at: string;
  patient_name?: string;
  doctor_name?: string;
}

export interface NotificationItem {
  id: number;
  user_id: number;
  title: string;
  message: string;
  type: string;
  is_read: number;
  link?: string;
  created_at: string;
}
