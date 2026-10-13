import React, { useState, useEffect } from 'react';
import {
  Calendar, Video, Building2, FileText, Pill, ShieldCheck, Star,
  Search, ArrowRight, Clock, MapPin, CheckCircle2, Stethoscope,
  Users, Activity, Sparkles, AlertCircle
} from 'lucide-react';
import { Doctor, Department } from '../../types';

interface HomePageProps {
  onNavigate: (tab: string, extra?: any) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  useEffect(() => {
    fetch('/api/doctors')
      .then(r => r.json())
      .then(data => setDoctors(data.slice(0, 4)))
      .catch(console.error);

    fetch('/api/departments')
      .then(r => r.json())
      .then(data => setDepartments(data))
      .catch(console.error);
  }, []);

  const categories = [
    'All',
    'General and Primary Care',
    'Heart, Brain, and Nervous System',
    'Bones, Muscles, and Rehabilitation',
    'Skin, Hair, and Allergy',
    "Women's Health",
    'Child Healthcare'
  ];

  const filteredDepts = selectedCategory === 'All'
    ? departments.slice(0, 12)
    : departments.filter(d => d.category === selectedCategory).slice(0, 12);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-teal-50/60 via-slate-50 to-white pt-16 pb-20 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-teal-800 bg-teal-100/70 px-3 py-1 rounded-full">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                <span>Next-Gen Healthcare · Online &amp; In-Hospital Care</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
                Your Health, Your Time, Your Choice.
              </h1>

              <p className="text-lg sm:text-xl text-slate-600 leading-relaxed max-w-2xl">
                Book trusted doctors online or visit them at the hospital. Manage consultations, prescriptions, and medicines in one secure platform.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={() => onNavigate('book-appointment')}
                  className="px-6 py-3.5 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Book Appointment</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onNavigate('doctors')}
                  className="px-6 py-3.5 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors flex items-center gap-2"
                >
                  <Search className="w-4 h-4 text-slate-500" />
                  <span>Find a Doctor</span>
                </button>
              </div>

              {/* Trust Indicators */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-200/80 text-xs text-slate-600">
                <div>
                  <p className="text-xl font-bold text-slate-900 tabular-nums">97+</p>
                  <p className="text-slate-500 mt-0.5">Clinical Specialties</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900 tabular-nums">100%</p>
                  <p className="text-slate-500 mt-0.5">Verified Practitioners</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900 tabular-nums">Instant</p>
                  <p className="text-slate-500 mt-0.5">Zoom &amp; Rx Access</p>
                </div>
              </div>
            </div>

            {/* Right Card / Visual Showcase */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-2xl p-6 shadow-xl border border-slate-200/80 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 text-slate-900 font-semibold text-sm">
                    <Stethoscope className="w-4 h-4 text-teal-600" />
                    <span>Quick Symptom Routing</span>
                  </div>
                  <span className="text-xs text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded font-medium">AI Assisted</span>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  Enter what you are experiencing. SmartCare automatically guides you to the right specialty department:
                </p>

                <div className="space-y-2.5">
                  <div
                    onClick={() => onNavigate('book-appointment', { symptom: 'chest discomfort or palpitations' })}
                    className="p-3 bg-slate-50 hover:bg-teal-50/60 border border-slate-200/80 hover:border-teal-300 rounded-xl cursor-pointer transition-colors flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">Chest discomfort or palpitations</p>
                      <p className="text-[11px] text-teal-700 font-medium mt-0.5">→ Cardiology Specialist</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </div>

                  <div
                    onClick={() => onNavigate('book-appointment', { symptom: 'skin rash or acne' })}
                    className="p-3 bg-slate-50 hover:bg-teal-50/60 border border-slate-200/80 hover:border-teal-300 rounded-xl cursor-pointer transition-colors flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">Skin rash, allergies, or acne</p>
                      <p className="text-[11px] text-teal-700 font-medium mt-0.5">→ Dermatology Clinic</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </div>

                  <div
                    onClick={() => onNavigate('book-appointment', { symptom: 'knee or joint pain' })}
                    className="p-3 bg-slate-50 hover:bg-teal-50/60 border border-slate-200/80 hover:border-teal-300 rounded-xl cursor-pointer transition-colors flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">Bone, joint, or knee stiffness</p>
                      <p className="text-[11px] text-teal-700 font-medium mt-0.5">→ Orthopedics &amp; Sports Care</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>

                <button
                  onClick={() => onNavigate('book-appointment')}
                  className="w-full py-2.5 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100/80 rounded-lg transition-colors text-center"
                >
                  Start Consultation Booking Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. HOW IT WORKS */}
      <section className="py-16 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-semibold text-teal-700 tracking-wider uppercase">Seamless Healthcare Journey</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">How SmartCare Works</h2>
            <p className="text-sm text-slate-500 mt-2">
              From symptom assessment to doctor consultation and pharmacy collection in 4 simple steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm">
                01
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Describe Symptoms</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Enter your health concern. Our intelligent engine recommends the exact clinical department you need.
              </p>
            </div>

            <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm">
                02
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Choose Online or Offline</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Connect over high-definition Zoom video consultation or select an in-person slot at our certified hospital clinics.
              </p>
            </div>

            <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm">
                03
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Receive Digital Prescription</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Doctor issues an authenticated digital prescription with full clinical notes, medicine dosages, and PDF export.
              </p>
            </div>

            <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm">
                04
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Fulfill at Nearby Pharmacy</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Upload or auto-route your prescription. Verify pricing and collect medicines securely with your unique pickup QR code.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FEATURED DOCTORS */}
      <section className="py-16 bg-slate-50 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <span className="text-xs font-semibold text-teal-700 tracking-wider uppercase">Senior Medical Faculty</span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">Consult Top Specialists</h2>
              <p className="text-sm text-slate-500 mt-1">Verified medical practitioners ready for online and offline consultations.</p>
            </div>
            <button
              onClick={() => onNavigate('doctors')}
              className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1.5 self-start md:self-auto"
            >
              <span>View All Doctors</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {doctors.map((doc: any, idx) => {
              const docId = doc.userId ?? doc.user_id ?? `doc-${idx}`;
              const docName = doc.fullName || doc.full_name || 'Specialist Doctor';
              const deptName = doc.departmentName || doc.department_name || 'Department Specialist';
              const qualification = doc.qualification || 'MBBS';
              const rating = doc.rating || 4.9;
              const exp = doc.experienceYears ?? doc.experience_years ?? 10;
              const hospital = doc.hospitalName || doc.hospital_name || 'SmartCare Hospital';
              const feeOnline = doc.consultationFeeOnline ?? doc.consultation_fee_online ?? 500;
              const feeOffline = doc.consultationFeeOffline ?? doc.consultation_fee_offline ?? 600;

              return (
                <div key={docId} className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{docName}</h3>
                      <p className="text-xs text-teal-700 font-medium">{deptName}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{qualification}</p>
                    </div>
                    <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-xs font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{rating}</span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1 pt-1 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Experience:</span>
                      <span className="font-medium">{exp} Years</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Hospital:</span>
                      <span className="font-medium truncate max-w-[180px]">{hospital}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Consultation Fee:</span>
                      <span className="font-semibold text-slate-900">₹{feeOnline} (Online) / ₹{feeOffline} (Offline)</span>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center gap-2">
                    <button
                      onClick={() => onNavigate('book-appointment', { doctorId: docId })}
                      className="flex-1 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors text-center"
                    >
                      Book Appointment
                    </button>
                    <button
                      onClick={() => onNavigate('doctor-profile', { doctorId: docId })}
                      className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                    >
                      Profile
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. COMPREHENSIVE CLINICAL DEPARTMENTS DIRECTORY (97 Departments) */}
      <section className="py-16 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <span className="text-xs font-semibold text-teal-700 tracking-wider uppercase">97 Clinical Departments</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">Multi-Specialty Medical Directory</h2>
            <p className="text-sm text-slate-500 mt-2">
              Explore our complete directory of administrator-managed medical and surgical departments.
            </p>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center justify-center gap-2 overflow-x-auto pb-4 mb-8">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${selectedCategory === cat ? 'bg-teal-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Departments Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDepts.map(dept => (
              <div
                key={dept.id}
                onClick={() => onNavigate('book-appointment', { departmentId: dept.id })}
                className="p-4 bg-slate-50 hover:bg-teal-50/50 border border-slate-200/80 hover:border-teal-300 rounded-xl cursor-pointer transition-colors space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{dept.name}</h4>
                  <span className="text-[10px] text-teal-700 bg-teal-100/60 px-2 py-0.5 rounded font-medium">
                    {dept.doctor_count || 1} Doctor(s)
                  </span>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{dept.description}</p>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-teal-700 pt-1">
                  <span>Consult Specialists</span>
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <button
              onClick={() => onNavigate('departments')}
              className="px-5 py-2.5 text-xs font-semibold text-teal-700 hover:bg-teal-50 border border-teal-200 rounded-lg transition-colors"
            >
              Browse Full 97 Departments List
            </button>
          </div>
        </div>
      </section>

      {/* 5. ONLINE ZOOM VS OFFLINE APPOINTMENTS COMPARISON */}
      <section className="py-16 bg-slate-50 border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-semibold text-teal-700 tracking-wider uppercase">Flexible Consultation Modes</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">Online Telehealth or Hospital Visits</h2>
            <p className="text-sm text-slate-500 mt-2">
              Select what suits your condition best with complete appointment management.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Online Zoom Option */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                <Video className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Online Zoom Consultation</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Connect securely from anywhere. High-definition encrypted video consultation directly with the specialist.
              </p>

              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
                  <span>Instant meeting link and one-click Zoom Join portal</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
                  <span>Upload medical reports and diagnostic PDFs before consultation</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
                  <span>Immediate digital prescription generated after the call</span>
                </li>
              </ul>

              <button
                onClick={() => onNavigate('book-appointment', { defaultType: 'online' })}
                className="w-full py-2.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors text-center"
              >
                Book Online Zoom Visit
              </button>
            </div>

            {/* Offline Hospital Option */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">In-Person Hospital Appointment</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Meet the doctor in person at certified clinical facilities with zero waiting queues and pre-booked slot passes.
              </p>

              <ul className="space-y-2 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Dedicated token number &amp; hospital visit instructions</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Physical clinical examination, vitals, and diagnostic tests</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Downloadable appointment confirmation PDF with clinic maps</span>
                </li>
              </ul>

              <button
                onClick={() => onNavigate('book-appointment', { defaultType: 'offline' })}
                className="w-full py-2.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors text-center"
              >
                Book Hospital Visit
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 6. PHARMACY & PRESCRIPTION SERVICES */}
      <section className="py-16 bg-white border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-5">
              <span className="text-xs font-semibold text-teal-700 tracking-wider uppercase">Integrated Pharmacy &amp; OCR</span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Upload Prescriptions. Pay Online. Pick Up Locally.
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                Have a paper prescription or an e-prescription from SmartCare? Simply upload it. Our OCR system extracts medicine names, dosages, and quantities for swift pharmacy review.
              </p>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="font-bold text-slate-900">Smart OCR Scanner</p>
                  <p className="text-slate-500 mt-1">Extracts frequency, duration, and strength for pharmacists to verify.</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="font-bold text-slate-900">Nearby Medical Shops</p>
                  <p className="text-slate-500 mt-1">Pick up from verified local chemists with GPS and Pincode filtering.</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="font-bold text-slate-900">Secure Online Payments</p>
                  <p className="text-slate-500 mt-1">Transparent pricing, itemized invoices, UPI &amp; card support.</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="font-bold text-slate-900">Pickup QR Code</p>
                  <p className="text-slate-500 mt-1">Contactless medicine handover and verified collection receipts.</p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => onNavigate('pharmacy-services')}
                  className="px-6 py-3 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition-colors flex items-center gap-2"
                >
                  <Pill className="w-4 h-4" />
                  <span>Upload Prescription to Pharmacy</span>
                </button>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-800">Pharmacy Fulfillment Pipeline</span>
                <span className="text-[11px] text-teal-700 font-semibold">Active Tracking</span>
              </div>

              <div className="space-y-3">
                {[
                  { title: '1. Prescription Uploaded', desc: 'OCR scans medicines, strengths & dosage' },
                  { title: '2. Under Verification', desc: 'Licensed pharmacist checks validity & calculates pricing' },
                  { title: '3. Paid & Processing', desc: 'Payment verified; medicines packed in sterile environment' },
                  { title: '4. Ready for Pickup', desc: 'Patient presents unique QR code at chemist counter' },
                  { title: '5. Handover Completed', desc: 'Official medicine collection confirmation generated' }
                ].map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs">
                    <div className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      ✓
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{step.title}</p>
                      <p className="text-slate-500 text-[11px]">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. PATIENT TESTIMONIALS & REVIEWS */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-semibold text-teal-700 tracking-wider uppercase">Verified Patient Reviews</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">What Patients Say</h2>
            <p className="text-sm text-slate-500 mt-1">Real feedback from completed consultations on SmartCare.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={`rev1-star-${i}`} className="w-3.5 h-3.5 fill-amber-400" />
                ))}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed italic">
                "Dr. Priya Sharma was extremely attentive and prescribed an ointment that completely cleared the allergy within four days. Highly recommended!"
              </p>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900">Madhur Sathya</span>
                <span className="text-slate-400">Consulted Dermatology</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={`rev2-star-${i}`} className="w-3.5 h-3.5 fill-amber-400" />
                ))}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed italic">
                "The Zoom consultation was crisp and on time. Dr. Arun Kumar explained the ECG readings clearly and sent the digital prescription immediately."
              </p>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900">Ananya Rao</span>
                <span className="text-slate-400">Consulted Cardiology</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={`rev3-star-${i}`} className="w-3.5 h-3.5 fill-amber-400" />
                ))}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed italic">
                "Uploaded my prescription to Apollo Pharmacy, paid via UPI, and collected within 20 minutes showing my QR code. Incredibly smooth!"
              </p>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-900">Siddharth V.</span>
                <span className="text-slate-400">Pharmacy Order</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. CTA CALLOUT */}
      <section className="py-12 bg-teal-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <h2 className="text-2xl sm:text-3xl font-bold">Ready to Consult a Trusted Healthcare Specialist?</h2>
          <p className="text-xs sm:text-sm text-teal-100 max-w-xl mx-auto">
            Book your appointment online in under 2 minutes. Secure payment, instant receipts, and digital prescription tracking.
          </p>
          <div className="pt-2 flex items-center justify-center gap-4">
            <button
              onClick={() => onNavigate('book-appointment')}
              className="px-6 py-3 text-xs font-semibold text-teal-900 bg-white hover:bg-teal-50 rounded-lg shadow transition-colors"
            >
              Book Appointment Now
            </button>
            <button
              onClick={() => onNavigate('login')}
              className="px-6 py-3 text-xs font-semibold text-white border border-teal-400 hover:bg-teal-700 rounded-lg transition-colors"
            >
              Access Your Dashboard
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
