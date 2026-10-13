import React, { useState } from 'react';
import { Pill, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';

interface PharmacyRegisterProps {
  onNavigate: (tab: string) => void;
}

export const PharmacyRegister: React.FC<PharmacyRegisterProps> = ({ onNavigate }) => {
  const [formData, setFormData] = useState({
    shopName: '',
    ownerName: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    licenseNo: '',
    address: '',
    city: 'Bangalore',
    state: 'Karnataka',
    pincode: '560103',
    openingHours: '08:00 AM - 10:00 PM'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/register-pharmacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      setIsSubmitting(false);

      if (!res.ok) {
        setError(data.error || 'Pharmacy registration failed');
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
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="mx-auto w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md">
            <Pill className="w-7 h-7" />
          </div>
          <h2 className="mt-4 text-2xl font-extrabold text-slate-900">
            Pharmacy Store Registration
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Join the SmartCare pharmacy fulfillment network. Accounts require drug license verification by Administrator.
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
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h3 className="font-bold text-slate-900 text-base">Pharmacy Registration Submitted</h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                Your pharmacy store details and Drug License Number ({formData.licenseNo}) are under administrator verification. You will be notified once activated.
              </p>
              <button
                onClick={() => onNavigate('login')}
                className="mt-4 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
              >
                Back to Login Portal
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Valid State Pharmacy Council License (Form 20/21) required for prescription dispensing authorization.
                </span>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                  1. Medical Store Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Pharmacy / Medical Store Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.shopName}
                      onChange={e => setFormData({ ...formData, shopName: e.target.value })}
                      placeholder="e.g. MedPlus Chemist &amp; Druggist"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Owner / Chief Pharmacist *</label>
                    <input
                      type="text"
                      required
                      value={formData.ownerName}
                      onChange={e => setFormData({ ...formData, ownerName: e.target.value })}
                      placeholder="e.g. Ramesh Kumar, B.Pharm"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Drug License Number *</label>
                    <input
                      type="text"
                      required
                      value={formData.licenseNo}
                      onChange={e => setFormData({ ...formData, licenseNo: e.target.value })}
                      placeholder="e.g. KA-BGL-PH-2024-9912"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone *</label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 80 2345 6789"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                  2. Portal Login Credentials
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Username *</label>
                    <input
                      type="text"
                      required
                      value={formData.username}
                      onChange={e => setFormData({ ...formData, username: e.target.value })}
                      placeholder="e.g. medplus_bellandur"
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
                      placeholder="store@medplus.com"
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
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                  3. Store Location &amp; Hours
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Shop Address *</label>
                    <input
                      type="text"
                      required
                      value={formData.address}
                      onChange={e => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Shop #12, Ground Floor, Main Road"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">City *</label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={e => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Pincode *</label>
                    <input
                      type="text"
                      required
                      value={formData.pincode}
                      onChange={e => setFormData({ ...formData, pincode: e.target.value })}
                      placeholder="560103"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Opening Hours</label>
                    <input
                      type="text"
                      value={formData.openingHours}
                      onChange={e => setFormData({ ...formData, openingHours: e.target.value })}
                      placeholder="08:00 AM - 10:00 PM"
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
                  className="px-6 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Registering...' : 'Submit Pharmacy Registration'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
