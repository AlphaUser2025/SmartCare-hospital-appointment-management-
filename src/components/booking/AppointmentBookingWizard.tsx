import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Doctor, Department } from '../../types';
import {
  Calendar, Clock, User, HeartPulse, Video, Building2,
  CheckCircle2, AlertTriangle, ShieldCheck, CreditCard,
  FileDown, ArrowLeft, ArrowRight, Star, Sparkles
} from 'lucide-react';
import {
  generateAppointmentConfirmationPdf,
  generateAppointmentPaymentReceiptPdf
} from '../../utils/pdfGenerator';

interface WizardProps {
  initialDoctorId?: number;
  initialDepartmentId?: number;
  initialSymptom?: string;
  initialType?: 'online' | 'offline';
  onNavigate: (tab: string, extra?: any) => void;
}

export const AppointmentBookingWizard: React.FC<WizardProps> = ({
  initialDoctorId,
  initialDepartmentId,
  initialSymptom,
  initialType = 'online',
  onNavigate
}) => {
  const { user } = useAuth();

  // Wizard Steps:
  // 1: Symptoms & Department Recommendation
  // 2: Choose Doctor
  // 3: Select Date & Time Slot
  // 4: Consultation Mode & Summary
  // 5: Payment
  // 6: Confirmation
  const [step, setStep] = useState<number>(1);

  // Step 1 State
  const [patientDetails, setPatientDetails] = useState({
    name: user?.fullName || 'Madhur Sathya',
    age: 30,
    gender: 'Male',
    mainHealthIssue: initialSymptom || '',
    symptoms: '',
    description: '',
    medicalHistory: '',
    currentMedications: ''
  });

  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<number | null>(initialDepartmentId || null);
  const [recommendedDept, setRecommendedDept] = useState<Department | null>(null);
  const [isEmergency, setIsEmergency] = useState(false);
  const [emergencyMessage, setEmergencyMessage] = useState<string | null>(null);

  // Step 2 State: Doctors
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  // Step 3 State: Calendar & Slots
  const [selectedDate, setSelectedDate] = useState<string>('2026-10-15');
  const [slotsData, setSlotsData] = useState<any>(null);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Step 4 State: Mode
  const [appointmentType, setAppointmentType] = useState<'online' | 'offline'>(initialType);

  // Step 5 State: Payment
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Credit Card' | 'Debit Card' | 'Net Banking'>('UPI');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Step 6 State: Confirmed Appointment Data
  const [confirmedApt, setConfirmedApt] = useState<any>(null);

  // Fetch departments
  useEffect(() => {
    fetch('/api/departments')
      .then(r => r.json())
      .then(data => {
        setDepartments(data);
        if (initialDepartmentId) {
          const match = data.find((d: Department) => d.id === initialDepartmentId);
          if (match) {
            setSelectedDepartmentId(match.id);
            setRecommendedDept(match);
          }
        }
      })
      .catch(console.error);
  }, [initialDepartmentId]);

  // Initial Doctor Preselection
  useEffect(() => {
    if (initialDoctorId) {
      fetch(`/api/doctors/${initialDoctorId}`)
        .then(r => r.json())
        .then(doc => {
          setSelectedDoctor(doc);
          setSelectedDepartmentId(doc.primaryDepartmentId);
          setStep(3); // jump straight to slot picking if pre-selected
        })
        .catch(console.error);
    }
  }, [initialDoctorId]);

  // Handle recommendation trigger
  const triggerRecommendation = async () => {
    if (!patientDetails.mainHealthIssue && !patientDetails.symptoms) return;
    try {
      const res = await fetch('/api/department-recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mainHealthIssue: patientDetails.mainHealthIssue,
          symptoms: patientDetails.symptoms,
          description: patientDetails.description
        })
      });
      const data = await res.json();
      setRecommendedDept(data.recommendedDepartment);
      setIsEmergency(data.isEmergency);
      setEmergencyMessage(data.emergencyMessage);
      if (!selectedDepartmentId && data.recommendedDepartment) {
        setSelectedDepartmentId(data.recommendedDepartment.id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch doctors whenever department changes
  useEffect(() => {
    if (selectedDepartmentId) {
      fetch(`/api/doctors?departmentId=${selectedDepartmentId}`)
        .then(r => r.json())
        .then(data => {
          setDoctors(data);
          if (data.length > 0 && !selectedDoctor) {
            setSelectedDoctor(data[0]);
          }
        })
        .catch(console.error);
    }
  }, [selectedDepartmentId]);

  // Fetch slots whenever doctor and date change
  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      setLoadingSlots(true);
      fetch(`/api/doctors/${selectedDoctor.userId}/slots?date=${selectedDate}`)
        .then(r => r.json())
        .then(data => {
          setSlotsData(data);
          setLoadingSlots(false);
          // auto-select first available slot
          const firstAvail = data.slots?.find((s: any) => s.isAvailable);
          if (firstAvail) setSelectedSlot(firstAvail.time);
          else setSelectedSlot('');
        })
        .catch(() => setLoadingSlots(false));
    }
  }, [selectedDoctor, selectedDate]);

  // Step 1 Next: validate symptoms and route to Step 2
  const handleProceedFromSymptoms = async () => {
    await triggerRecommendation();
    setStep(2);
  };

  // Process Booking & Payment in Step 5
  const handleExecutePayment = async () => {
    if (!user) {
      alert('Please sign in to confirm your appointment.');
      onNavigate('login');
      return;
    }

    if (!selectedDoctor || !selectedSlot) {
      setPaymentError('Doctor and slot selection are required.');
      return;
    }

    setIsProcessingPayment(true);
    setPaymentError(null);

    try {
      // 1. Reserve slot on backend
      const bookRes = await fetch('/api/appointments/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientUserId: user.id,
          doctorUserId: selectedDoctor.userId,
          departmentId: selectedDepartmentId || selectedDoctor.primaryDepartmentId,
          appointmentType,
          appointmentDate: selectedDate,
          appointmentTime: selectedSlot,
          mainHealthIssue: patientDetails.mainHealthIssue,
          symptoms: patientDetails.symptoms,
          problemDescription: patientDetails.description,
          medicalHistory: patientDetails.medicalHistory,
          currentMedications: patientDetails.currentMedications
        })
      });

      const bookData = await bookRes.json();
      if (!bookRes.ok) {
        setIsProcessingPayment(false);
        setPaymentError(bookData.error || 'Slot reservation failed.');
        return;
      }

      // 2. Pay & verify payment
      const payRes = await fetch(`/api/appointments/${bookData.appointmentId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod,
          simulateFailure: false
        })
      });

      const payData = await payRes.json();
      setIsProcessingPayment(false);

      if (!payRes.ok) {
        setPaymentError(payData.error || 'Payment verification failed.');
        return;
      }

      // 3. Fetch full appointment details for confirmed screen
      const fullAptRes = await fetch(`/api/appointments/${bookData.appointmentId}`);
      const fullApt = await fullAptRes.json();

      setConfirmedApt(fullApt);
      setStep(6);
    } catch (err: any) {
      setIsProcessingPayment(false);
      setPaymentError(err.message || 'Payment processing error');
    }
  };

  const calculateFee = () => {
    if (!selectedDoctor) return { fee: 500, tax: 25, total: 525 };
    const fee = appointmentType === 'online' ? selectedDoctor.consultationFeeOnline : selectedDoctor.consultationFeeOffline;
    const tax = Math.round(fee * 0.05 * 100) / 100;
    return { fee, tax, total: fee + tax };
  };

  const { fee, tax, total } = calculateFee();

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Wizard Stepper Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
            <span>Step {step} of 6</span>
            <span className="text-teal-700">
              {step === 1 && 'Describe Health Concern'}
              {step === 2 && 'Select Doctor'}
              {step === 3 && 'Choose Date & Slot'}
              {step === 4 && 'Consultation Mode'}
              {step === 5 && 'Payment'}
              {step === 6 && 'Booking Confirmed'}
            </span>
          </div>
          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
            <div
              className="bg-teal-600 h-full transition-all duration-300"
              style={{ width: `${(step / 6) * 100}%` }}
            />
          </div>
        </div>

        {/* STEP 1: Symptoms & Automatic Department Recommendation */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800 bg-teal-50 px-3 py-1 rounded-full mb-2">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                <span>Smart Routing Assessment</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                What health concern are you experiencing?
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter your symptoms. SmartCare automatically recommends the right medical specialty while checking for emergency alerts.
              </p>
            </div>

            {/* Emergency Warning Banner if detected */}
            {isEmergency && (
              <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-800 space-y-2">
                <div className="flex items-center gap-2 font-bold text-rose-900 text-sm">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                  <span>CRITICAL EMERGENCY WARNING</span>
                </div>
                <p className="leading-relaxed">{emergencyMessage}</p>
                <p className="font-semibold text-rose-900">
                  Dial 112 / 108 immediately or seek local hospital casualty.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Patient Name</label>
                <input
                  type="text"
                  value={patientDetails.name}
                  onChange={e => setPatientDetails({ ...patientDetails, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Age</label>
                <input
                  type="number"
                  value={patientDetails.age}
                  onChange={e => setPatientDetails({ ...patientDetails, age: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Gender</label>
                <select
                  value={patientDetails.gender}
                  onChange={e => setPatientDetails({ ...patientDetails, gender: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Main Health Issue *
              </label>
              <input
                type="text"
                required
                value={patientDetails.mainHealthIssue}
                onChange={e => setPatientDetails({ ...patientDetails, mainHealthIssue: e.target.value })}
                onBlur={triggerRecommendation}
                placeholder="e.g. Chest pain, frequent migraines, skin allergy, knee swelling"
                className="w-full px-3 py-2.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Specific Symptoms &amp; Duration
              </label>
              <textarea
                rows={2}
                value={patientDetails.symptoms}
                onChange={e => setPatientDetails({ ...patientDetails, symptoms: e.target.value })}
                onBlur={triggerRecommendation}
                placeholder="e.g. Sharp pain on left side since 3 days, worsens after walking"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            {/* Department Recommendation Callout */}
            {recommendedDept && (
              <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-900">
                    Recommended Department: {recommendedDept.name}
                  </span>
                  <span className="text-[11px] text-teal-700 bg-white px-2 py-0.5 rounded font-medium border border-teal-200">
                    Matched
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {recommendedDept.description}
                </p>
                <div className="text-[11px] text-teal-800 italic">
                  * Recommendation routes you to the relevant specialty. It does not replace formal clinical diagnosis.
                </div>
              </div>
            )}

            {/* Department Override Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Selected Medical Department (Change if desired)
              </label>
              <select
                value={selectedDepartmentId || ''}
                onChange={e => {
                  const id = parseInt(e.target.value, 10);
                  setSelectedDepartmentId(id);
                  const found = departments.find(d => d.id === id);
                  if (found) setRecommendedDept(found);
                }}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="">-- Choose from 97 Active Departments --</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.category})
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={() => onNavigate('home')}
                className="text-xs text-slate-600 hover:text-slate-900 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProceedFromSymptoms}
                className="px-6 py-2.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition-colors flex items-center gap-2"
              >
                <span>Find Doctors in Department</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Doctor Selection */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Select Your Doctor
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Showing approved practitioners in {recommendedDept?.name || 'Department'}.
              </p>
            </div>

            {doctors.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-xs text-slate-500 space-y-3">
                <p>No doctors are currently available for this department.</p>
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-xs text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg font-semibold"
                >
                  Choose Another Department
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {doctors.map(doc => {
                  const isSelected = selectedDoctor?.userId === doc.userId;
                  return (
                    <div
                      key={doc.userId}
                      onClick={() => setSelectedDoctor(doc)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${isSelected ? 'border-teal-600 bg-teal-50/40 ring-2 ring-teal-600/20' : 'border-slate-200 hover:border-slate-300 bg-white'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{doc.fullName}</h4>
                          <p className="text-xs text-teal-700 font-medium">{doc.qualification}</p>
                          <p className="text-[11px] text-slate-400">Reg: {doc.medicalRegNo}</p>
                        </div>
                        <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-xs font-bold">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span>{doc.rating}</span>
                        </div>
                      </div>

                      <div className="text-xs text-slate-600 mt-3 pt-2 border-t border-slate-100 space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Experience:</span>
                          <span className="font-medium">{doc.experienceYears} Years</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Hospital:</span>
                          <span className="font-medium truncate max-w-[170px]">{doc.hospitalName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Fee:</span>
                          <span className="font-semibold text-slate-900">₹{doc.consultationFeeOnline} (Online) · ₹{doc.consultationFeeOffline} (Hospital)</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pt-4 flex items-center justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 text-xs text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <button
                type="button"
                disabled={!selectedDoctor}
                onClick={() => setStep(3)}
                className="px-6 py-2.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <span>Select Date &amp; Time Slot</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Interactive Calendar & Slot Management */}
        {step === 3 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Choose Date and Time Slot
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Consultation with {selectedDoctor?.fullName} ({selectedDoctor?.hospitalName}).
              </p>
            </div>

            {/* Date Picker Bar */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">Select Date</label>
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {['2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18', '2026-10-19', '2026-10-20'].map(d => {
                  const dateObj = new Date(d);
                  const isCur = selectedDate === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setSelectedDate(d)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-medium text-center shrink-0 border transition-all ${isCur ? 'bg-teal-600 text-white border-teal-600 shadow-sm' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                    >
                      <p className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                        {dateObj.toLocaleDateString('en-US', { weekday: 'short' })}
                      </p>
                      <p className="text-sm font-bold mt-0.5">
                        {dateObj.toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Slots Grid */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">
                  Available Slots for {selectedDate}
                </label>
                {slotsData && (
                  <span className="text-[11px] text-slate-400">
                    Doctor Hours: {slotsData.workingHours || '09:00 - 17:00'}
                  </span>
                )}
              </div>

              {loadingSlots ? (
                <div className="py-8 text-center text-xs text-slate-400">Checking slot availability...</div>
              ) : slotsData?.slots?.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                  {slotsData.slots.map((s: any) => {
                    const isSelected = selectedSlot === s.time;
                    const titleText = s.isBlocked
                      ? `Doctor Unavailable (${s.blockReason || 'Blocked by Doctor'})`
                      : s.isBooked
                      ? 'Already booked by another patient'
                      : 'Available for consultation';

                    return (
                      <button
                        key={s.time}
                        type="button"
                        disabled={!s.isAvailable}
                        onClick={() => setSelectedSlot(s.time)}
                        title={titleText}
                        className={`py-2 px-1 text-xs font-medium rounded-lg border text-center transition-all ${
                          s.isBlocked
                            ? 'bg-rose-50/70 text-rose-400 border-rose-200 cursor-not-allowed line-through'
                            : !s.isAvailable
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through'
                            : isSelected
                            ? 'bg-teal-600 text-white border-teal-600 shadow-sm font-semibold'
                            : 'bg-white text-slate-700 border-slate-300 hover:border-teal-500'
                        }`}
                      >
                        {s.time}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 bg-amber-50 rounded-xl text-amber-800 text-xs">
                  {slotsData?.reason || 'Doctor is not available on this date. Please pick another day.'}
                </div>
              )}
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 text-xs text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <button
                type="button"
                disabled={!selectedSlot}
                onClick={() => setStep(4)}
                className="px-6 py-2.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <span>Select Mode &amp; Review</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Choose Mode (Online vs Offline) & Review */}
        {step === 4 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Choose Consultation Mode
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Select between Zoom Teleconsultation or an In-Person visit at the hospital.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                onClick={() => setAppointmentType('online')}
                className={`p-5 rounded-xl border cursor-pointer transition-all space-y-2 ${appointmentType === 'online' ? 'border-sky-600 bg-sky-50/50 ring-2 ring-sky-600/20' : 'border-slate-200 bg-white hover:border-slate-300'}`}
              >
                <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                  <Video className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm">Online Zoom Consultation</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Join securely from home. Immediate meeting link, encrypted video, and instant digital prescription.
                </p>
                <p className="text-xs font-bold text-slate-800 pt-1">
                  Fee: ₹{selectedDoctor?.consultationFeeOnline || 500}
                </p>
              </div>

              <div
                onClick={() => setAppointmentType('offline')}
                className={`p-5 rounded-xl border cursor-pointer transition-all space-y-2 ${appointmentType === 'offline' ? 'border-teal-600 bg-teal-50/50 ring-2 ring-teal-600/20' : 'border-slate-200 bg-white hover:border-slate-300'}`}
              >
                <div className="w-9 h-9 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm">Offline Hospital Visit</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  In-person consultation at {selectedDoctor?.hospitalName}. Dedicated token pass and physical exam.
                </p>
                <p className="text-xs font-bold text-slate-800 pt-1">
                  Fee: ₹{selectedDoctor?.consultationFeeOffline || 600}
                </p>
              </div>
            </div>

            {/* Summary Box */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                Booking Summary
              </h4>
              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div><span className="text-slate-400">Doctor:</span> {selectedDoctor?.fullName}</div>
                <div><span className="text-slate-400">Department:</span> {recommendedDept?.name}</div>
                <div><span className="text-slate-400">Date:</span> {selectedDate}</div>
                <div><span className="text-slate-400">Time:</span> {selectedSlot}</div>
                <div><span className="text-slate-400">Patient:</span> {patientDetails.name}</div>
                <div><span className="text-slate-400">Mode:</span> {appointmentType === 'online' ? 'Online Zoom' : 'Hospital Visit'}</div>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-4 py-2 text-xs text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={() => setStep(5)}
                className="px-6 py-2.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition-colors flex items-center gap-2"
              >
                <span>Proceed to Payment (₹{total})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Payment Page */}
        {step === 5 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                Appointment Payment
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Verified payment gateway sandbox. Complete transaction to lock the appointment slot.
              </p>
            </div>

            {paymentError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                {paymentError}
              </div>
            )}

            {/* Bill Breakdown */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Doctor Consultation Fee ({selectedDoctor?.fullName})</span>
                <span className="font-semibold text-slate-800">₹{fee}.00</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Healthcare Service Tax (GST 5%)</span>
                <span className="font-semibold text-slate-800">₹{tax}.00</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-bold text-slate-900">
                <span>Total Amount Payable</span>
                <span className="text-teal-700">₹{total}.00</span>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700">
                Choose Payment Method
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['UPI', 'Credit Card', 'Debit Card', 'Net Banking'] as const).map(method => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`py-2.5 px-2 text-xs font-semibold rounded-lg border text-center transition-all ${paymentMethod === method ? 'bg-teal-600 text-white border-teal-600 shadow-sm' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                  >
                    {method}
                  </button>
                ))}
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                <div className="flex items-center gap-2 font-medium text-slate-800">
                  <CreditCard className="w-4 h-4 text-teal-600" />
                  <span>Razorpay / UPI Sandbox Gateway</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Slot is automatically released if payment fails or expires. Instant verified receipt and Zoom meeting credentials generated on success.
                </p>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(4)}
                className="px-4 py-2 text-xs text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <button
                type="button"
                disabled={isProcessingPayment}
                onClick={handleExecutePayment}
                className="px-6 py-2.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isProcessingPayment ? (
                  <span>Verifying Transaction...</span>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Pay ₹{total} &amp; Confirm Booking</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: Confirmation Screen & Downloadable PDFs */}
        {step === 6 && confirmedApt && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-6 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">
                Appointment Confirmed!
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Booking ID: <span className="font-bold text-slate-800">{confirmedApt.appointment_id}</span>
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-left max-w-lg mx-auto text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Doctor:</span>
                <span className="font-bold text-slate-900">Dr. {confirmedApt.doctor_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Department:</span>
                <span className="font-medium">{confirmedApt.department_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date &amp; Time:</span>
                <span className="font-bold text-teal-700">{confirmedApt.appointment_date} at {confirmedApt.appointment_time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Mode:</span>
                <span className="font-semibold capitalize">{confirmedApt.appointment_type}</span>
              </div>
              {confirmedApt.appointment_type === 'online' ? (
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-slate-500 text-[11px]">Zoom Meeting Link:</p>
                  <a
                    href={confirmedApt.zoom_join_url || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-600 font-semibold underline break-all text-[11px]"
                  >
                    {confirmedApt.zoom_join_url || 'https://zoom.us/j/smartcare-online'}
                  </a>
                  <p className="text-[11px] text-slate-500 mt-1">Passcode: <span className="font-bold">{confirmedApt.zoom_passcode || 'SC2026'}</span></p>
                </div>
              ) : (
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-slate-500 text-[11px]">Hospital Address:</p>
                  <p className="font-medium text-slate-800">{confirmedApt.clinic_address || 'Hospital Boulevard, Medical District'}</p>
                </div>
              )}
            </div>

            {/* PDF Download Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => generateAppointmentConfirmationPdf(confirmedApt)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-sm transition-colors flex items-center gap-2"
              >
                <FileDown className="w-4 h-4 text-teal-600" />
                <span>Download Confirmation PDF</span>
              </button>

              <button
                type="button"
                onClick={() => generateAppointmentPaymentReceiptPdf(confirmedApt)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-sm transition-colors flex items-center gap-2"
              >
                <FileDown className="w-4 h-4 text-emerald-600" />
                <span>Download Payment Receipt PDF</span>
              </button>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-4">
              {confirmedApt.appointment_type === 'online' && (
                <button
                  type="button"
                  onClick={() => onNavigate('zoom-consultation', { appointmentId: confirmedApt.id })}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Video className="w-4 h-4" />
                  <span>Enter Zoom Consultation Portal</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => onNavigate('patient-dashboard')}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"
              >
                Go to Patient Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
