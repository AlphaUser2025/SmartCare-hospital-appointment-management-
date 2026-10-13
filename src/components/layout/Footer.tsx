import React from 'react';
import { HeartPulse, Phone, Mail, MapPin, ShieldAlert, Award } from 'lucide-react';

interface FooterProps {
  onNavigate: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand & Mission */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5 text-white font-bold text-lg">
              <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center text-white">
                <HeartPulse className="w-5 h-5" />
              </div>
              <span>SmartCare</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Complete healthcare management system uniting patients, multi-specialty doctors, diagnostic centers, and certified local pharmacies on a unified platform.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Award className="w-4 h-4 text-teal-400" />
              <span>NABH Accredited &amp; ISO 27001 Certified</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Quick Portals</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => onNavigate('book-appointment')} className="hover:text-white transition-colors">
                  Book Doctor Consultation
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('doctors')} className="hover:text-white transition-colors">
                  Find Specialists by Department
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('departments')} className="hover:text-white transition-colors">
                  Browse 97 Clinical Departments
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('pharmacy-services')} className="hover:text-white transition-colors">
                  Prescription Upload &amp; Pharmacy
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('register-doctor')} className="hover:text-white transition-colors text-teal-400">
                  Doctor Onboarding Portal
                </button>
              </li>
            </ul>
          </div>

          {/* Clinical Departments Snapshot */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Key Specializations</h4>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>Cardiology &amp; Cardiovascular Surgery</li>
              <li>Dermatology &amp; Cosmetology</li>
              <li>Orthopedics &amp; Joint Replacement</li>
              <li>Neurology &amp; Neurosurgery</li>
              <li>Pediatrics &amp; Neonatology</li>
              <li>Gastroenterology &amp; Hepatology</li>
            </ul>
          </div>

          {/* Emergency & Contacts */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Emergency &amp; Support</h4>
            <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700/60 space-y-2">
              <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>24/7 Medical Emergency: 108 / 112</span>
              </div>
              <p className="text-[11px] text-slate-400">
                For acute chest pain, trauma, or respiratory arrest, call immediately.
              </p>
            </div>
            <div className="space-y-1.5 text-xs text-slate-400 pt-1">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                <span>1800-419-CARE (Toll-Free)</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                <span>support@smartcare.health</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                <span>Medical District, Bangalore 560001</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 SmartCare Healthcare Systems. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>Telemedicine Guidelines Compliant</span>
            <span>·</span>
            <span>Drug &amp; Cosmetics Act Verified</span>
            <span>·</span>
            <span>Data Protection HIPAA &amp; DPDP</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
