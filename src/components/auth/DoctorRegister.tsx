import React, { useState, useEffect } from 'react';
import { Department } from '../../types';
import { Stethoscope, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';

interface DoctorRegisterProps {
  onNavigate: (tab: string) => void;
}

export const DoctorRegister: React.FC<DoctorRegisterProps> = ({ onNavigate }) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    mobileNumber: '',
    qualification: '',
    medicalRegNo: '',
    primaryDepartmentId: '',
    additionalSpecializations: '',
    experienceYears: 5,
    hospitalClinic: 'SmartCare Hospital',
    consultationFeeOnline: 600,
    consultationFeeOffline: 800,
    availableDays: 'Mon,Tue,Wed,Thu,Fri',
    workingHoursStart: '09:00',
    workingHoursEnd: '17:00',
    onlineAvailable: true,
    offlineAvailable: true,
    clinicAddress: '',
    city: 'Bangalore',
    pincode: '560001'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/departments')
      .then(r => r.json())
      .then(data => {
        setDepartments(data);
        if (data.length > 0) {
          setFormData(prev => ({ ...prev, primaryDepartmentId: String(data[0].id) }));
        }
      })
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/register-doctor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      setIsSubmitting(false);

      if (!res.ok) {
        setError(data.error || 'Registration failed');
        return;
      }

      setSuccess(true);
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err.message || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="mx-auto w-12 h-12 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-md">
            <Stethoscope className="w-7 h-7" />
          </div>
          <h2 className="mt-4 text-2xl font-extrabold text-slate-900">
            Medical Practitioner Application
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Apply to join SmartCare's clinical network. Doctor accounts undergo administrator credential verification.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
          {error && (
            <div className="mb-6 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div className="p-6 bg-sky-50 border border-sky-200 rounded-xl text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-sky-600 mx-auto" />
              <h3 className="font-bold text-slate-900 text-base">Application Submitted Successfully</h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                Your medical registration number and credentials have been submitted for Administrator review. You will receive an email confirmation upon approval.
              </p>
              <button
                onClick={() => onNavigate('login')}
                className="mt-4 px-5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors"
              >
                Back to Login Portal
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Mandatory: Medical council registration number is checked against medical authority registries.
                </span>
              </div>

              {/* 1. Practitioner Credentials */}
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                  1. Clinical Identity &amp; Login
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Doctor Full Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder="e.g. Dr. Rajesh Sharma"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Username *</label>
                    <input
                      type="text"
                      required
                      value={formData.username}
                      onChange={e => setFormData({ ...formData, username: e.target.value })}
                      placeholder="e.g. dr.rajesh"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      placeholder="e.g. dr.rajesh@smartcare.com"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Password *</label>
                    <input
                      type="password"
                      required
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Secure password"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Medical Qualifications */}
              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                  2. Qualifications &amp; Specialization
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Qualifications *</label>
                    <input
                      type="text"
                      required
                      value={formData.qualification}
                      onChange={e => setFormData({ ...formData, qualification: e.target.value })}
                      placeholder="e.g. MBBS, MD, DM (Cardiology)"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Medical Council Reg. No. *</label>
                    <input
                      type="text"
                      required
                      value={formData.medicalRegNo}
                      onChange={e => setFormData({ ...formData, medicalRegNo: e.target.value })}
                      placeholder="e.g. MCI-2024-CARD-9912"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Department *</label>
                    <select
                      value={formData.primaryDepartmentId}
                      onChange={e => setFormData({ ...formData, primaryDepartmentId: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    >
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.category})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Experience (Years) *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={formData.experienceYears}
                      onChange={e => setFormData({ ...formData, experienceYears: parseInt(e.target.value, 10) })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Sub-Specializations / Interests</label>
                    <input
                      type="text"
                      value={formData.additionalSpecializations}
                      onChange={e => setFormData({ ...formData, additionalSpecializations: e.target.value })}
                      placeholder="e.g. Interventional Stenting, Heart Failure, Lipidology"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Consultation Fees & Practice */}
              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                  3. Practice Settings &amp; Fees
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Online Consultation Fee (₹) *</label>
                    <input
                      type="number"
                      required
                      value={formData.consultationFeeOnline}
                      onChange={e => setFormData({ ...formData, consultationFeeOnline: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Offline Hospital Fee (₹) *</label>
                    <input
                      type="number"
                      required
                      value={formData.consultationFeeOffline}
                      onChange={e => setFormData({ ...formData, consultationFeeOffline: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Available Days</label>
                    <input
                      type="text"
                      value={formData.availableDays}
                      onChange={e => setFormData({ ...formData, availableDays: e.target.value })}
                      placeholder="e.g. Mon,Tue,Wed,Thu,Fri"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Hospital / Clinic Name</label>
                    <input
                      type="text"
                      value={formData.hospitalClinic}
                      onChange={e => setFormData({ ...formData, hospitalClinic: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onNavigate('login')}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel &amp; Return to Login
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting Application...' : 'Submit Doctor Registration'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
