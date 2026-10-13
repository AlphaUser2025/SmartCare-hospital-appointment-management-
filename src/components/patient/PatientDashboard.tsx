import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Appointment, Prescription, PharmacyOrder, PharmacyProfile } from '../../types';
import {
  Calendar, Clock, Video, Building2, Pill, FileText,
  CreditCard, User, HeartPulse, Star, Upload, MapPin,
  CheckCircle2, ArrowRight, Download, QrCode, AlertCircle
} from 'lucide-react';
import {
  generateAppointmentConfirmationPdf,
  generateAppointmentPaymentReceiptPdf,
  generateDoctorPrescriptionPdf,
  generatePharmacyPaymentReceiptPdf,
  generateMedicineCollectionConfirmationPdf
} from '../../utils/pdfGenerator';
import QRCode from 'qrcode';

interface PatientDashboardProps {
  onNavigate: (tab: string, extra?: any) => void;
  defaultTab?: string;
}

export const PatientDashboard: React.FC<PatientDashboardProps> = ({ onNavigate, defaultTab = 'overview' }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>(defaultTab);

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [pharmacyOrders, setPharmacyOrders] = useState<PharmacyOrder[]>([]);
  const [pharmacies, setPharmacies] = useState<PharmacyProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Review Doctor Modal
  const [reviewModalApt, setReviewModalApt] = useState<Appointment | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  // OCR Upload State
  const [ocrFile, setOcrFile] = useState<string | null>(null);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrMedicines, setOcrMedicines] = useState<any[]>([]);
  const [selectedPharmacyForOcr, setSelectedPharmacyForOcr] = useState<number | null>(null);
  const [ocrUploadSuccess, setOcrUploadSuccess] = useState(false);

  // Collection QR Code Modal
  const [qrModalOrder, setQrModalOrder] = useState<PharmacyOrder | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // Pincode Search for Nearby Shops
  const [pincodeFilter, setPincodeFilter] = useState('560103');

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [aptRes, rxRes, ordRes, pharmRes] = await Promise.all([
        fetch(`/api/appointments?patientUserId=${user?.id}`),
        fetch(`/api/prescriptions?patientUserId=${user?.id}`),
        fetch(`/api/pharmacy-orders?patientUserId=${user?.id}`),
        fetch('/api/pharmacies')
      ]);

      setAppointments(await aptRes.json());
      setPrescriptions(await rxRes.json());
      setPharmacyOrders(await ordRes.json());
      const pList = await pharmRes.json();
      setPharmacies(pList);
      if (pList.length > 0) setSelectedPharmacyForOcr(pList[0].userId);
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  const handleOpenQrModal = async (order: PharmacyOrder) => {
    setQrModalOrder(order);
    try {
      const url = await QRCode.toDataURL(order.qr_code_data || `SMARTCARE:${order.order_id}:PICKUP`);
      setQrDataUrl(url);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSimulateOcrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setOcrFile(e.target.files[0].name);
      setIsOcrProcessing(true);
      // Simulate intelligent OCR extraction pipeline
      setTimeout(() => {
        setIsOcrProcessing(false);
        setOcrMedicines([
          { medicine_name: 'Amoxicillin & Potassium Clavulanate 625mg', strength: '625 mg', dosage: '1 tablet', frequency: '2 times per day', timesPerDay: '2', duration: 5, timing: 'Morning and Night', quantity: 10, unitPrice: 22 },
          { medicine_name: 'Paracetamol 650mg Tablets', strength: '650 mg', dosage: '1 tablet', frequency: '3 times per day', timesPerDay: '3', duration: 3, timing: 'As needed for fever', quantity: 10, unitPrice: 4 },
          { medicine_name: 'Pantoprazole Gastro-Resistant 40mg', strength: '40 mg', dosage: '1 capsule', frequency: '1 time per day', timesPerDay: '1', duration: 7, timing: 'Morning before breakfast', quantity: 7, unitPrice: 12 }
        ]);
      }, 900);
    }
  };

  const handleSubmitOcrOrder = async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/pharmacy/upload-prescription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientUserId: user.id,
          originalDocumentUrl: ocrFile || 'scanned_prescription.jpg',
          rawText: 'OCR extraction verified by patient.',
          selectedPharmacyId: selectedPharmacyForOcr
        })
      });
      if (res.ok) {
        setOcrUploadSuccess(true);
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePayPharmacyOrder = async (orderId: number) => {
    try {
      const res = await fetch(`/api/pharmacy-orders/${orderId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod: 'UPI' })
      });
      if (res.ok) {
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModalApt || !user) return;

    setReviewSubmitting(true);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: reviewModalApt.id,
          doctorUserId: reviewModalApt.doctor_user_id,
          patientUserId: user.id,
          rating,
          reviewText
        })
      });

      setReviewSubmitting(false);
      if (res.ok) {
        setReviewSuccess(true);
        setTimeout(() => {
          setReviewModalApt(null);
          setReviewSuccess(false);
          setReviewText('');
        }, 1200);
      } else {
        const err = await res.json();
        alert(err.error || 'Review failed');
      }
    } catch (e) {
      setReviewSubmitting(false);
      console.error(e);
    }
  };

  const upcomingApts = appointments.filter(a => a.status === 'Confirmed' || a.status === 'Scheduled');
  const pastApts = appointments.filter(a => a.status === 'Completed' || a.status === 'Cancelled');

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Welcome Banner */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                Welcome back, {user?.fullName || 'Patient'}
              </h1>
              <span className="text-xs bg-teal-50 text-teal-700 px-2.5 py-0.5 rounded font-medium border border-teal-200">
                Patient Account
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Manage your healthcare consultations, digital prescriptions, and local pharmacy orders.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('book-appointment')}
              className="px-4 py-2.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Calendar className="w-4 h-4" />
              <span>Book New Appointment</span>
            </button>
            <button
              onClick={() => setActiveTab('upload-prescription')}
              className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Prescription</span>
            </button>
          </div>
        </div>

        {/* Dashboard Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'appointments', label: `My Appointments (${appointments.length})` },
            { key: 'prescriptions', label: `Digital Prescriptions (${prescriptions.length})` },
            { key: 'upload-prescription', label: 'Upload Prescription & OCR' },
            { key: 'pharmacy-orders', label: `Pharmacy Orders (${pharmacyOrders.length})` },
            { key: 'nearby-shops', label: 'Nearby Medical Shops' },
            { key: 'payments', label: 'Payment Receipts' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${activeTab === tab.key ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                <span className="text-xs text-slate-500">Upcoming Visits</span>
                <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{upcomingApts.length}</p>
                <span className="text-[11px] text-teal-700 mt-0.5 block font-medium">Scheduled</span>
              </div>
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                <span className="text-xs text-slate-500">Active Prescriptions</span>
                <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{prescriptions.length}</p>
                <span className="text-[11px] text-teal-700 mt-0.5 block font-medium">Official Digital Rx</span>
              </div>
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                <span className="text-xs text-slate-500">Pharmacy Orders</span>
                <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{pharmacyOrders.length}</p>
                <span className="text-[11px] text-emerald-700 mt-0.5 block font-medium">Fulfillment Tracking</span>
              </div>
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                <span className="text-xs text-slate-500">Completed Care</span>
                <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{pastApts.length}</p>
                <span className="text-[11px] text-slate-500 mt-0.5 block">Total Consultations</span>
              </div>
            </div>

            {/* Upcoming Appointments Highlight */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm">Upcoming Consultations</h3>
                <button onClick={() => setActiveTab('appointments')} className="text-xs text-teal-700 font-semibold hover:underline">
                  View All
                </button>
              </div>

              {upcomingApts.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No upcoming appointments scheduled.</p>
              ) : (
                <div className="space-y-3">
                  {upcomingApts.map(apt => (
                    <div key={apt.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">Dr. {apt.doctor_name}</span>
                          <span className="text-teal-700 font-medium">({apt.department_name})</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${apt.appointment_type === 'online' ? 'bg-sky-100 text-sky-800' : 'bg-teal-100 text-teal-800'}`}>
                            {apt.appointment_type === 'online' ? 'Zoom Telehealth' : 'Hospital Visit'}
                          </span>
                        </div>
                        <p className="text-slate-500 mt-1">
                          Date: <span className="font-semibold text-slate-700">{apt.appointment_date}</span> at <span className="font-semibold text-slate-700">{apt.appointment_time}</span>
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Ref ID: {apt.appointment_id}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {apt.appointment_type === 'online' ? (
                          <button
                            onClick={() => onNavigate('zoom-consultation', { appointmentId: apt.id })}
                            className="px-3.5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors flex items-center gap-1.5"
                          >
                            <Video className="w-3.5 h-3.5" />
                            <span>Join Zoom Consultation</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => generateAppointmentConfirmationPdf(apt)}
                            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download Pass</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Digital Prescriptions */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm">Recent Digital Prescriptions</h3>
                <button onClick={() => setActiveTab('prescriptions')} className="text-xs text-teal-700 font-semibold hover:underline">
                  View All
                </button>
              </div>

              {prescriptions.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No digital prescriptions issued yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {prescriptions.slice(0, 2).map(rx => (
                    <div key={rx.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-slate-900">{rx.prescription_id}</p>
                          <p className="text-slate-500">Dr. {rx.doctor_name} · {rx.department_name}</p>
                        </div>
                        <button
                          onClick={() => generateDoctorPrescriptionPdf(rx)}
                          className="p-1.5 text-teal-700 hover:bg-teal-50 rounded transition-colors"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-100">
                        <span className="font-semibold text-slate-700">Diagnosis:</span> {rx.diagnosis || 'Clinical evaluation'}
                        <div className="mt-1 text-slate-500">
                          {rx.medicines?.length || 0} prescribed medicines
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-slate-400">
                          Issued: {new Date(rx.created_at).toLocaleDateString('en-GB')}
                        </span>
                        <button
                          onClick={() => generateDoctorPrescriptionPdf(rx)}
                          className="text-xs text-teal-700 font-semibold hover:underline"
                        >
                          Download Official PDF →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: MY APPOINTMENTS */}
        {activeTab === 'appointments' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                All Appointment Records
              </h2>
              <button
                onClick={() => onNavigate('book-appointment')}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg"
              >
                + Book Another
              </button>
            </div>

            {appointments.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">No appointments found.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {appointments.map(apt => (
                  <div key={apt.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">Dr. {apt.doctor_name}</span>
                        <span className="text-slate-500">({apt.department_name})</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${apt.status === 'Completed' ? 'bg-slate-100 text-slate-700' : 'bg-emerald-100 text-emerald-800'}`}>
                          {apt.status}
                        </span>
                      </div>
                      <p className="text-slate-600">
                        Date: <span className="font-semibold">{apt.appointment_date}</span> · Time: <span className="font-semibold">{apt.appointment_time}</span> · Mode: <span className="capitalize">{apt.appointment_type}</span>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Appointment ID: {apt.appointment_id} · Paid: ₹{apt.total_amount} ({apt.payment_status || 'Paid'})
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {apt.appointment_type === 'online' && apt.status !== 'Completed' && (
                        <button
                          onClick={() => onNavigate('zoom-consultation', { appointmentId: apt.id })}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Join Zoom Call</span>
                        </button>
                      )}

                      <button
                        onClick={() => generateAppointmentConfirmationPdf(apt)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1"
                        title="Confirmation PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Confirmation</span>
                      </button>

                      <button
                        onClick={() => generateAppointmentPaymentReceiptPdf(apt)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1"
                        title="Payment Receipt PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Receipt</span>
                      </button>

                      {apt.status === 'Completed' && (
                        <button
                          onClick={() => setReviewModalApt(apt)}
                          className="px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          <span>Rate Doctor</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DIGITAL PRESCRIPTIONS */}
        {activeTab === 'prescriptions' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Official Doctor Prescriptions
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Authenticated e-prescriptions generated by registered practitioners with digital signature and pharmacy QR.
              </p>
            </div>

            {prescriptions.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">No prescriptions currently on file.</p>
            ) : (
              <div className="space-y-4">
                {prescriptions.map(rx => (
                  <div key={rx.id} className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-teal-800 text-sm font-mono">{rx.prescription_id}</span>
                          <span className="text-xs text-slate-500">· Issued {new Date(rx.created_at).toLocaleDateString('en-GB')}</span>
                        </div>
                        <p className="text-xs text-slate-700 font-medium">
                          Dr. {rx.doctor_name} ({rx.doctor_qualification}) · Reg: {rx.medical_reg_no}
                        </p>
                      </div>

                      <button
                        onClick={() => generateDoctorPrescriptionPdf(rx)}
                        className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 self-start sm:self-auto"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download Prescription PDF</span>
                      </button>
                    </div>

                    <div className="text-xs text-slate-700 space-y-1">
                      <p><span className="font-bold">Diagnosis:</span> {rx.diagnosis || 'Clinical review completed'}</p>
                      {rx.clinical_notes && <p><span className="font-bold">Notes:</span> {rx.clinical_notes}</p>}
                      {rx.follow_up_date && <p><span className="font-bold">Follow-Up:</span> {rx.follow_up_date}</p>}
                    </div>

                    {/* Medicines List */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-200/60 text-slate-700 font-semibold">
                          <tr>
                            <th className="py-2 px-3">Medicine &amp; Strength</th>
                            <th className="py-2 px-3">Dosage</th>
                            <th className="py-2 px-3">Frequency &amp; Timing</th>
                            <th className="py-2 px-3">Duration</th>
                            <th className="py-2 px-3">Instructions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {rx.medicines?.map((m, idx) => (
                            <tr key={idx} className="hover:bg-white/80">
                              <td className="py-2 px-3 font-semibold text-slate-900">{m.medicine_name} {m.strength && `(${m.strength})`}</td>
                              <td className="py-2 px-3">{m.dosage}</td>
                              <td className="py-2 px-3">{m.frequency} · {m.timing}</td>
                              <td className="py-2 px-3">{m.duration_days} days</td>
                              <td className="py-2 px-3 text-slate-500">{m.instructions || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: UPLOAD PRESCRIPTION & OCR */}
        {activeTab === 'upload-prescription' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Prescription Upload &amp; Intelligent OCR Scanner
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Upload physical or digital prescriptions. Our OCR engine parses medicine names, dosages, and frequencies for pharmacy verification.
              </p>
            </div>

            {ocrUploadSuccess ? (
              <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h3 className="font-bold text-slate-900 text-sm">Prescription Sent to Pharmacy</h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  The pharmacist will review the prescription and submit pricing. You can track this under "Pharmacy Orders".
                </p>
                <button
                  onClick={() => {
                    setOcrUploadSuccess(false);
                    setActiveTab('pharmacy-orders');
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg"
                >
                  View Pharmacy Orders
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Upload Box */}
                <div className="p-6 border-2 border-dashed border-slate-300 hover:border-teal-400 rounded-2xl text-center bg-slate-50 transition-colors">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-800">
                    Upload Prescription Image or PDF
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Supports JPG, PNG, PDF up to 10MB
                  </p>
                  <label className="mt-3 inline-block px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg cursor-pointer transition-colors">
                    <span>Browse File</span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleSimulateOcrUpload}
                      className="hidden"
                    />
                  </label>
                  {ocrFile && (
                    <p className="text-xs font-semibold text-teal-800 mt-2">
                      Selected: {ocrFile}
                    </p>
                  )}
                </div>

                {isOcrProcessing && (
                  <div className="py-6 text-center text-xs text-slate-500 space-y-2">
                    <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p>Executing Optical Character Recognition (OCR)...</p>
                  </div>
                )}

                {/* OCR Extracted Details Side-by-Side */}
                {ocrMedicines.length > 0 && !isOcrProcessing && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <span className="text-xs font-bold text-slate-900">
                        OCR Extracted Medicines (Subject to Pharmacy Verification)
                      </span>
                      <span className="text-[11px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded font-medium">
                        3 Medicines Detected
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-700">
                          <tr>
                            <th className="py-2 px-3">Medicine</th>
                            <th className="py-2 px-3">Strength</th>
                            <th className="py-2 px-3">Dosage</th>
                            <th className="py-2 px-3">Frequency</th>
                            <th className="py-2 px-3">Duration</th>
                            <th className="py-2 px-3">Est. Qty</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {ocrMedicines.map((m, idx) => (
                            <tr key={idx}>
                              <td className="py-2 px-3 font-semibold text-slate-900">{m.medicine_name}</td>
                              <td className="py-2 px-3">{m.strength}</td>
                              <td className="py-2 px-3">{m.dosage}</td>
                              <td className="py-2 px-3">{m.frequency}</td>
                              <td className="py-2 px-3">{m.duration} days</td>
                              <td className="py-2 px-3">{m.quantity} units</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Select Pharmacy Destination */}
                    <div className="pt-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Select Fulfilling Pharmacy Store
                      </label>
                      <select
                        value={selectedPharmacyForOcr || ''}
                        onChange={e => setSelectedPharmacyForOcr(parseInt(e.target.value, 10))}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
                      >
                        {pharmacies.map(p => (
                          <option key={p.userId} value={p.userId}>
                            {p.shopName} ({p.address}, {p.city}) - Open: {p.openingHours}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={handleSubmitOcrOrder}
                      className="w-full py-2.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"
                    >
                      Confirm Extracted Prescription &amp; Submit Order
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: PHARMACY ORDERS */}
        {activeTab === 'pharmacy-orders' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Prescription Pharmacy Orders &amp; Collection
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Track verification, pay for medicines, and view pickup QR codes.
              </p>
            </div>

            {pharmacyOrders.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">No pharmacy orders placed yet.</p>
            ) : (
              <div className="space-y-4">
                {pharmacyOrders.map(order => (
                  <div key={order.id} className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4 text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{order.order_id}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${order.status === 'Collected' ? 'bg-slate-200 text-slate-800' : order.status === 'Ready for Pickup' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                            {order.status}
                          </span>
                        </div>
                        <p className="text-slate-500 text-[11px] mt-0.5">
                          Pharmacy: <span className="font-semibold text-slate-700">{order.shop_name || 'Apollo Life Pharmacy'}</span>
                        </p>
                      </div>

                      <div className="text-right sm:text-right">
                        <span className="text-[11px] text-slate-500">Total Bill</span>
                        <p className="font-bold text-teal-800 text-sm">₹{order.total_amount}.00</p>
                      </div>
                    </div>

                    {/* Order Items Breakdown */}
                    {order.items && order.items.length > 0 && (
                      <div className="bg-white p-3 rounded-lg border border-slate-100 space-y-1">
                        <span className="text-[11px] font-bold text-slate-600 uppercase">Items:</span>
                        {order.items.map((it, i) => (
                          <div key={i} className="flex justify-between text-slate-700 text-[11px]">
                            <span>{it.medicine_name} (x{it.quantity})</span>
                            <span className="font-semibold">₹{it.total_price}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between pt-1 gap-2">
                      <span className="text-[11px] text-slate-400">
                        Placed: {new Date(order.created_at).toLocaleString('en-GB')}
                      </span>

                      <div className="flex items-center gap-2">
                        {order.status === 'Payment Pending' && (
                          <button
                            onClick={() => handlePayPharmacyOrder(order.id)}
                            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm"
                          >
                            Pay Online (₹{order.total_amount})
                          </button>
                        )}

                        {(order.status === 'Paid' || order.status === 'Processing' || order.status === 'Ready for Pickup' || order.status === 'Collected') && (
                          <>
                            <button
                              onClick={() => handleOpenQrModal(order)}
                              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg flex items-center gap-1.5 shadow-sm"
                            >
                              <QrCode className="w-3.5 h-3.5 text-teal-600" />
                              <span>View Pickup QR</span>
                            </button>

                            <button
                              onClick={() => generatePharmacyPaymentReceiptPdf(order)}
                              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg flex items-center gap-1.5 shadow-sm"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Receipt PDF</span>
                            </button>
                          </>
                        )}

                        {order.status === 'Collected' && (
                          <button
                            onClick={() => generateMedicineCollectionConfirmationPdf(order)}
                            className="px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Collection Certificate</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: NEARBY MEDICAL SHOPS */}
        {activeTab === 'nearby-shops' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Approved Nearby Medical Stores
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Find certified SmartCare pharmacies near your residential pincode or city.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={pincodeFilter}
                  onChange={e => setPincodeFilter(e.target.value)}
                  placeholder="Filter Pincode"
                  className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg w-28"
                />
                <button
                  onClick={loadData}
                  className="px-3 py-1.5 text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-lg"
                >
                  Locate
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {pharmacies.map(pharm => (
                <div key={pharm.userId} className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                  <div className="flex items-start justify-between">
                    <h4 className="font-bold text-slate-900 text-sm">{pharm.shopName}</h4>
                    <span className="text-[10px] text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded font-medium">
                      Verified
                    </span>
                  </div>
                  <p className="text-slate-600">{pharm.address}, {pharm.city} - {pharm.pincode}</p>
                  <p className="text-[11px] text-slate-500">Contact: {pharm.phone}</p>
                  <p className="text-[11px] text-teal-700 font-medium">Hours: {pharm.openingHours}</p>
                  <p className="text-[10px] text-slate-400">License: {pharm.licenseNo}</p>

                  <button
                    onClick={() => {
                      setSelectedPharmacyForOcr(pharm.userId);
                      setActiveTab('upload-prescription');
                    }}
                    className="w-full mt-2 py-1.5 text-xs font-semibold text-teal-700 bg-white hover:bg-teal-50 border border-teal-200 rounded-lg transition-colors text-center"
                  >
                    Select Store for Rx Upload
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 7: PAYMENT RECEIPTS */}
        {activeTab === 'payments' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Payment History &amp; Official Invoices
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Verified payment receipts for all consultations and pharmacy orders.
              </p>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {appointments.filter(a => a.payment_status === 'Paid').map(apt => (
                <div key={apt.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900">Doctor Consultation: Dr. {apt.doctor_name}</p>
                    <p className="text-slate-400 text-[11px]">{apt.receipt_no || 'RCP-2026-XXXX'} · Ref: {apt.transaction_ref || 'TXN-RZP-9912048'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-800">₹{apt.total_amount}.00</span>
                    <button
                      onClick={() => generateAppointmentPaymentReceiptPdf(apt)}
                      className="p-1.5 text-teal-700 hover:bg-teal-50 rounded"
                      title="Download PDF"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {pharmacyOrders.filter(o => o.status === 'Paid' || o.status === 'Collected').map(ord => (
                <div key={ord.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900">Medicine Order: {ord.order_id}</p>
                    <p className="text-slate-400 text-[11px]">{ord.shop_name} · Ref: {ord.transaction_ref || 'TXN-RX-7712391'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-800">₹{ord.total_amount}.00</span>
                    <button
                      onClick={() => generatePharmacyPaymentReceiptPdf(ord)}
                      className="p-1.5 text-teal-700 hover:bg-teal-50 rounded"
                      title="Download PDF"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Review Doctor Modal */}
      {reviewModalApt && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">
              Rate Consultation with Dr. {reviewModalApt.doctor_name}
            </h3>
            <p className="text-xs text-slate-500">
              Your genuine review helps maintain healthcare quality standards across the platform.
            </p>

            {reviewSuccess ? (
              <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold text-center">
                Review submitted successfully! Thank you.
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Star Rating (1 - 5)</label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map(st => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setRating(st)}
                        className="p-1 text-amber-400 hover:scale-110 transition-transform"
                      >
                        <Star className={`w-6 h-6 ${st <= rating ? 'fill-amber-400' : 'text-slate-200'}`} />
                      </button>
                    ))}
                    <span className="text-xs font-bold text-slate-700 ml-2">{rating} Stars</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Written Feedback *</label>
                  <textarea
                    rows={3}
                    required
                    value={reviewText}
                    onChange={e => setReviewText(e.target.value)}
                    placeholder="Share your consultation experience, doctor attentiveness, prescription efficacy..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReviewModalApt(null)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={reviewSubmitting}
                    className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg"
                  >
                    {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Collection QR Code Modal */}
      {qrModalOrder && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-xl border border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm">
              Medicine Pickup QR Code
            </h3>
            <p className="text-xs text-slate-500">
              Present this code at {qrModalOrder.shop_name} for order verification and medicine handover.
            </p>

            {qrDataUrl && (
              <div className="p-4 bg-slate-50 rounded-xl inline-block border border-slate-200">
                <img src={qrDataUrl} alt="Pickup QR" className="w-48 h-48 mx-auto" />
                <p className="text-xs font-mono font-bold text-slate-800 mt-2">
                  {qrModalOrder.order_id}
                </p>
              </div>
            )}

            <button
              onClick={() => setQrModalOrder(null)}
              className="w-full py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
