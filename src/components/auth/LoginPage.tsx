import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { HeartPulse, Lock, User as UserIcon, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

interface LoginPageProps {
  onNavigate: (tab: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPendingApproval(false);
    setIsSubmitting(true);

    const result = await login(identifier, password);
    setIsSubmitting(false);

    if (result.success) {
      if (result.redirectUrl?.includes('patient')) onNavigate('patient-dashboard');
      else if (result.redirectUrl?.includes('doctor')) onNavigate('doctor-dashboard');
      else if (result.redirectUrl?.includes('pharmacy')) onNavigate('pharmacy-dashboard');
      else if (result.redirectUrl?.includes('admin')) onNavigate('admin-dashboard');
      else onNavigate('patient-dashboard');
    } else {
      if (result.pendingApproval) {
        setPendingApproval(true);
      }
      setError(result.error || 'Failed to authenticate.');
    }
  };

  const handleFillDemo = (type: 'patient' | 'doctor' | 'pharmacy' | 'admin') => {
    setError(null);
    setPendingApproval(false);
    if (type === 'patient') {
      setIdentifier('patient@smartcare.com');
      setPassword('patient123');
    } else if (type === 'doctor') {
      setIdentifier('dr.arun@smartcare.com');
      setPassword('doctor123');
    } else if (type === 'pharmacy') {
      setIdentifier('apollo@smartcare.com');
      setPassword('pharmacy123');
    } else if (type === 'admin') {
      setIdentifier('admin@smartcare.com');
      setPassword('admin123');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Brand Header */}
        <div className="text-center">
          <div className="mx-auto w-12 h-12 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-md">
            <HeartPulse className="w-7 h-7" />
          </div>
          <h2 className="mt-4 text-2xl font-extrabold text-slate-900 tracking-tight">
            Sign in to SmartCare
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            One common portal for Patients, Doctors, Pharmacies, and Administrators.
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Automatic role detection via database record</span>
          </div>
        </div>

        {/* Demo Fast-Fill Bar */}
        <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-sm space-y-2">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">
            Quick Fill Demo Accounts (Click to test):
          </p>
          <div className="grid grid-cols-4 gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => handleFillDemo('patient')}
              className="py-1.5 px-2 bg-slate-50 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300 border border-slate-200 rounded-md font-medium text-slate-700 transition-colors text-center truncate"
            >
              Patient
            </button>
            <button
              type="button"
              onClick={() => handleFillDemo('doctor')}
              className="py-1.5 px-2 bg-slate-50 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300 border border-slate-200 rounded-md font-medium text-slate-700 transition-colors text-center truncate"
            >
              Doctor
            </button>
            <button
              type="button"
              onClick={() => handleFillDemo('pharmacy')}
              className="py-1.5 px-2 bg-slate-50 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300 border border-slate-200 rounded-md font-medium text-slate-700 transition-colors text-center truncate"
            >
              Pharmacy
            </button>
            <button
              type="button"
              onClick={() => handleFillDemo('admin')}
              className="py-1.5 px-2 bg-slate-50 hover:bg-teal-50 hover:text-teal-700 hover:border-teal-300 border border-slate-200 rounded-md font-medium text-slate-700 transition-colors text-center truncate"
            >
              Admin
            </button>
          </div>
        </div>

        {/* Login Form */}
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-2xl">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <p className="font-semibold">{error}</p>
                  {pendingApproval && (
                    <p className="mt-1 text-[11px] text-rose-600">
                      Doctor and Pharmacy accounts require Administrator verification before accessing the clinical network.
                    </p>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email or Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. patient@smartcare.com or username"
                  className="block w-full pl-9 pr-3 py-2.5 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => alert('Password reset link sent to registered email address.')}
                  className="text-[11px] font-medium text-teal-600 hover:text-teal-700"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your account password"
                  className="block w-full pl-9 pr-3 py-2.5 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 focus:ring-4 focus:ring-teal-100 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Registration Links */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center space-y-2 text-xs">
            <p className="text-slate-500">
              Don't have an account yet?{' '}
              <button
                type="button"
                onClick={() => onNavigate('register')}
                className="font-semibold text-teal-600 hover:text-teal-700"
              >
                Register as Patient
              </button>
            </p>

            <div className="flex items-center justify-center gap-4 text-[11px] text-slate-400 pt-1">
              <button
                type="button"
                onClick={() => onNavigate('register-doctor')}
                className="hover:text-teal-700 underline"
              >
                Doctor Registration
              </button>
              <span>·</span>
              <button
                type="button"
                onClick={() => onNavigate('register-pharmacy')}
                className="hover:text-teal-700 underline"
              >
                Pharmacy Registration
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
