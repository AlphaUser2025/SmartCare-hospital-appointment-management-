import React, { useState, useEffect } from 'react';
import { Department } from '../../types';
import { Building2, Search, ArrowRight, Stethoscope } from 'lucide-react';

interface DeptDirectoryProps {
  onNavigate: (tab: string, extra?: any) => void;
}

export const DepartmentsDirectoryPage: React.FC<DeptDirectoryProps> = ({ onNavigate }) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('All');

  useEffect(() => {
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
    'Ear, Nose, and Throat',
    'Eye Care',
    'Digestive System and Liver',
    'Lungs and Respiratory System',
    'Kidney and Urinary System',
    "Women's Health",
    'Child Healthcare',
    'Cancer Care',
    'Hormones and Metabolism',
    'Mental Health',
    'Dental Care',
    'Diagnostic and Laboratory',
    'Other Specialized Departments'
  ];

  const filtered = departments.filter(d => {
    const matchCat = activeCategory === 'All' || d.category === activeCategory;
    const matchSearch = !search ||
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      (d.description && d.description.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Complete Medical Departments Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Browse all 97 healthcare departments. Choose any specialty to book an online or hospital appointment.
          </p>
        </div>

        {/* Filter bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search across all 97 departments..."
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors ${activeCategory === cat ? 'bg-teal-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Departments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(dept => (
            <div
              key={dept.id}
              onClick={() => onNavigate('book-appointment', { departmentId: dept.id })}
              className="p-5 bg-white hover:bg-teal-50/40 rounded-xl border border-slate-200 hover:border-teal-300 shadow-sm cursor-pointer transition-all space-y-2 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-sm">{dept.name}</h3>
                  <span className="text-[10px] text-teal-800 bg-teal-50 px-2 py-0.5 rounded font-medium border border-teal-200">
                    {dept.doctor_count || 1} Doctor(s)
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-medium block mt-0.5">{dept.category}</span>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">{dept.description}</p>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs font-semibold text-teal-700 border-t border-slate-100">
                <span>Book Appointment</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
