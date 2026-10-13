import React, { useState, useEffect } from 'react';
import { Doctor, Department } from '../../types';
import { Search, Star, Stethoscope, Video, Building2, ArrowRight } from 'lucide-react';

interface DoctorsListProps {
  onNavigate: (tab: string, extra?: any) => void;
}

export const DoctorsListPage: React.FC<DoctorsListProps> = ({ onNavigate }) => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [search, setSearch] = useState('');
  const [onlineOnly, setOnlineOnly] = useState(false);

  useEffect(() => {
    fetch('/api/departments')
      .then(r => r.json())
      .then(data => setDepartments(data))
      .catch(console.error);

    loadDoctors();
  }, [selectedDept, onlineOnly]);

  const loadDoctors = () => {
    let url = '/api/doctors?';
    if (selectedDept) url += `departmentId=${selectedDept}&`;
    if (onlineOnly) url += 'onlineOnly=true&';
    if (search) url += `search=${encodeURIComponent(search)}&`;

    fetch(url)
      .then(r => r.json())
      .then(data => setDoctors(data))
      .catch(console.error);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadDoctors();
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Consult Specialist Doctors
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Browse verified medical practitioners across 97 clinical departments.
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-3 text-xs">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2 w-full">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by doctor name or specialization..."
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold"
            >
              Search
            </button>
          </form>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg bg-white text-xs w-full md:w-56"
            >
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            <label className="flex items-center gap-1.5 cursor-pointer whitespace-nowrap text-slate-700 font-medium">
              <input
                type="checkbox"
                checked={onlineOnly}
                onChange={e => setOnlineOnly(e.target.checked)}
                className="rounded text-teal-600"
              />
              <span>Zoom Available</span>
            </label>
          </div>
        </div>

        {/* Doctor Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map((doc, idx) => (
            <div key={doc.userId || (doc as any).user_id || `doc-${idx}`} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{doc.fullName}</h3>
                    <p className="text-xs text-teal-700 font-semibold">{doc.departmentName}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{doc.qualification}</p>
                  </div>
                  <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-xs font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{doc.rating}</span>
                  </div>
                </div>

                <div className="text-xs text-slate-600 space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Experience:</span>
                    <span className="font-medium text-slate-800">{doc.experienceYears} Years</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Hospital:</span>
                    <span className="font-medium text-slate-800 truncate max-w-[180px]">{doc.hospitalName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Consultation Fee:</span>
                    <span className="font-bold text-slate-900">
                      ₹{doc.consultationFeeOnline} (Online) · ₹{doc.consultationFeeOffline} (Offline)
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => onNavigate('book-appointment', { doctorId: doc.userId })}
                  className="w-full py-2.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition-colors text-center flex items-center justify-center gap-1.5"
                >
                  <span>Book Consultation</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
