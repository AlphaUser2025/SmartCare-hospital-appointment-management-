import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Department, Doctor, PharmacyProfile, Appointment, LoginHistoryEntry } from '../../types';
import {
  LayoutDashboard, Users, Stethoscope, Building2, Pill,
  Calendar, CreditCard, FileText, ShoppingBag, History,
  MessageSquare, BarChart3, Settings, LogOut, CheckCircle2,
  XCircle, Search, Filter, ShieldCheck, AlertTriangle, Eye, RefreshCw
} from 'lucide-react';

interface AdminDashboardProps {
  onNavigate: (tab: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const { user, logout } = useAuth();
  const [activeModule, setActiveModule] = useState<string>('dashboard');

  const [stats, setStats] = useState<any>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [pharmacies, setPharmacies] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([]);
  const [loginSummary, setLoginSummary] = useState<any>(null);
  const [feedbackList, setFeedbackList] = useState<any[]>([]);

  // Department modal state
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCategory, setNewDeptCategory] = useState('General and Primary Care');
  const [newDeptDesc, setNewDeptDesc] = useState('');
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);

  // Login History Filter State
  const [historyRoleFilter, setHistoryRoleFilter] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('');
  const [historySearch, setHistorySearch] = useState('');

  // Appointment Filter State
  const [aptTypeFilter, setAptTypeFilter] = useState('');
  const [aptStatusFilter, setAptStatusFilter] = useState('');

  useEffect(() => {
    loadAllAdminData();
  }, []);

  const loadAllAdminData = async () => {
    try {
      const [statsRes, docRes, deptRes, pharmRes, aptRes, logRes, fbRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/doctors?adminMode=true'),
        fetch('/api/departments?all=true'),
        fetch('/api/pharmacies?adminMode=true'),
        fetch('/api/appointments'),
        fetch('/api/admin/login-history'),
        fetch('/api/feedback')
      ]);

      setStats(await statsRes.json());
      setDoctors(await docRes.json());
      setDepartments(await deptRes.json());
      setPharmacies(await pharmRes.json());
      setAppointments(await aptRes.json());
      const logData = await logRes.json();
      setLoginHistory(logData.logs);
      setLoginSummary(logData.summary);
      setFeedbackList(await fbRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  const handleDoctorApproval = async (docUserId: number, isApproved: boolean) => {
    try {
      await fetch(`/api/admin/doctors/${docUserId}/approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isApproved })
      });
      loadAllAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  const handlePharmacyApproval = async (pharmUserId: number, isApproved: boolean) => {
    try {
      await fetch(`/api/admin/pharmacies/${pharmUserId}/approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isApproved })
      });
      loadAllAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleDepartment = async (dept: Department) => {
    try {
      await fetch(`/api/departments/${dept.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: dept.name,
          category: dept.category,
          description: dept.description,
          isActive: !dept.is_active
        })
      });
      loadAllAdminData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;

    try {
      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newDeptName,
          category: newDeptCategory,
          description: newDeptDesc,
          isActive: true
        })
      });
      if (res.ok) {
        setShowAddDeptModal(false);
        setNewDeptName('');
        setNewDeptDesc('');
        loadAllAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filterLoginHistory = () => {
    return loginHistory.filter(l => {
      const matchRole = !historyRoleFilter || l.role === historyRoleFilter;
      const matchStatus = !historyStatusFilter || l.login_status === historyStatusFilter;
      const matchSearch = !historySearch ||
        l.username_attempted.toLowerCase().includes(historySearch.toLowerCase()) ||
        (l.user_name && l.user_name.toLowerCase().includes(historySearch.toLowerCase())) ||
        l.ip_address.includes(historySearch);
      return matchRole && matchStatus && matchSearch;
    });
  };

  const filterAppointments = () => {
    return appointments.filter(a => {
      const matchType = !aptTypeFilter || a.appointment_type === aptTypeFilter;
      const matchStatus = !aptStatusFilter || a.status === aptStatusFilter;
      return matchType && matchStatus;
    });
  };

  const sidebarLinks = [
    { key: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
    { key: 'doctors', label: `Doctors Management (${doctors.filter(d => !d.is_approved).length} Pending)`, icon: Stethoscope },
    { key: 'departments', label: `Departments (${departments.length})`, icon: Building2 },
    { key: 'pharmacies', label: `Pharmacies (${pharmacies.filter(p => !p.is_approved).length} Pending)`, icon: Pill },
    { key: 'appointments', label: `Appointments (${appointments.length})`, icon: Calendar },
    { key: 'login-history', label: 'Login History & Security', icon: History },
    { key: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
    { key: 'feedback', label: 'Feedback Moderation', icon: MessageSquare }
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row text-slate-800">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-sm tracking-tight">SmartCare Admin</h2>
            <p className="text-[11px] text-teal-400 font-medium">Administrator Console</p>
          </div>
          <ShieldCheck className="w-5 h-5 text-teal-400" />
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto text-xs">
          {sidebarLinks.map(link => {
            const Icon = link.icon;
            const isCur = activeModule === link.key;
            return (
              <button
                key={link.key}
                onClick={() => setActiveModule(link.key)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg font-medium transition-colors text-left ${isCur ? 'bg-teal-700 text-white shadow-sm font-semibold' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'}`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{link.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs">
          <div className="truncate">
            <p className="text-white font-semibold truncate">{user?.fullName || 'Administrator'}</p>
            <p className="text-slate-500 text-[11px]">Superuser</p>
          </div>
          <button
            onClick={async () => {
              await logout();
              onNavigate('home');
            }}
            className="p-1.5 text-slate-400 hover:text-rose-400 rounded transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl">
        {/* MODULE 1: DASHBOARD OVERVIEW */}
        {activeModule === 'dashboard' && stats && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Platform Analytics Overview</h1>
                <p className="text-xs text-slate-500 mt-1">Live metrics derived directly from SQLite relational records.</p>
              </div>
              <button
                onClick={loadAllAdminData}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Live Counts</span>
              </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                <span className="text-xs text-slate-500">Registered Patients</span>
                <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{stats.totalPatients}</p>
                <span className="text-[11px] text-teal-700 mt-0.5 block font-medium">Active Profiles</span>
              </div>
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                <span className="text-xs text-slate-500">Approved Doctors</span>
                <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{stats.totalApprovedDoctors}</p>
                <span className="text-[11px] text-amber-700 mt-0.5 block font-medium">
                  {stats.pendingDoctors} Pending Review
                </span>
              </div>
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                <span className="text-xs text-slate-500">Total Consultations</span>
                <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{stats.totalAppointments}</p>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  {stats.onlineAppointments} Zoom · {stats.offlineAppointments} In-Hospital
                </span>
              </div>
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                <span className="text-xs text-slate-500">Gross Appointments Volume</span>
                <p className="text-2xl font-bold text-emerald-800 mt-1 tabular-nums">₹{stats.appointmentRevenue}</p>
                <span className="text-[11px] text-emerald-700 mt-0.5 block font-medium">Verified Payments</span>
              </div>
            </div>

            {/* Quick Action Tables for Approvals */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pending Doctors */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    Doctor Credential Applications
                  </h3>
                  <button onClick={() => setActiveModule('doctors')} className="text-xs text-teal-700 font-semibold hover:underline">
                    View All
                  </button>
                </div>

                {doctors.filter(d => !d.is_approved).length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No doctor applications awaiting approval.</p>
                ) : (
                  <div className="space-y-3">
                    {doctors.filter(d => !d.is_approved).map(doc => (
                      <div key={doc.user_id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-900">{doc.full_name}</p>
                          <p className="text-slate-500 text-[11px]">{doc.department_name} · Reg: {doc.medical_reg_no}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleDoctorApproval(doc.user_id, true)}
                            className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleDoctorApproval(doc.user_id, false)}
                            className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pending Pharmacies */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    Pharmacy Drug License Verification
                  </h3>
                  <button onClick={() => setActiveModule('pharmacies')} className="text-xs text-teal-700 font-semibold hover:underline">
                    View All
                  </button>
                </div>

                {pharmacies.filter(p => !p.is_approved).length === 0 ? (
                  <p className="text-xs text-slate-400 py-4 text-center">No pharmacies awaiting approval.</p>
                ) : (
                  <div className="space-y-3">
                    {pharmacies.filter(p => !p.is_approved).map(pharm => (
                      <div key={pharm.user_id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-900">{pharm.shop_name}</p>
                          <p className="text-slate-500 text-[11px]">License: {pharm.license_no} · {pharm.city}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handlePharmacyApproval(pharm.user_id, true)}
                            className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handlePharmacyApproval(pharm.user_id, false)}
                            className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODULE 2: DOCTORS MANAGEMENT */}
        {activeModule === 'doctors' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Doctor Accounts &amp; Credential Directory
            </h2>

            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-700 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Doctor</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Registration No</th>
                    <th className="py-2.5 px-3">Experience</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {doctors.map(doc => (
                    <tr key={doc.user_id}>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {doc.full_name}
                        <span className="block text-[11px] text-slate-400 font-normal">{doc.qualification}</span>
                      </td>
                      <td className="py-2.5 px-3">{doc.department_name}</td>
                      <td className="py-2.5 px-3 font-mono">{doc.medical_reg_no}</td>
                      <td className="py-2.5 px-3">{doc.experience_years} Years</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${doc.is_approved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {doc.is_approved ? 'Approved' : 'Pending'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {doc.is_approved ? (
                          <button
                            onClick={() => handleDoctorApproval(doc.user_id, false)}
                            className="text-xs text-rose-600 hover:underline"
                          >
                            Suspend
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDoctorApproval(doc.user_id, true)}
                            className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded hover:bg-emerald-100 border border-emerald-200"
                          >
                            Approve Doctor
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODULE 3: DEPARTMENTS DIRECTORY (All 97 Departments) */}
        {activeModule === 'departments' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Clinical Departments Directory ({departments.length} Departments)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Administrator-managed directory of all medical and surgical disciplines.
                </p>
              </div>
              <button
                onClick={() => setShowAddDeptModal(true)}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm"
              >
                + Add Department
              </button>
            </div>

            <div className="overflow-x-auto text-xs max-h-[600px] overflow-y-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-700 font-semibold sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3">Department Name</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Associated Doctors</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {departments.map(dept => (
                    <tr key={dept.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{dept.name}</td>
                      <td className="py-2.5 px-3 text-slate-600">{dept.category}</td>
                      <td className="py-2.5 px-3">{dept.doctor_count || 0} Doctor(s)</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${dept.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
                          {dept.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <button
                          onClick={() => handleToggleDepartment(dept)}
                          className={`text-xs font-semibold ${dept.is_active ? 'text-rose-600 hover:underline' : 'text-teal-700 hover:underline'}`}
                        >
                          {dept.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODULE 4: PHARMACIES MANAGEMENT */}
        {activeModule === 'pharmacies' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Pharmacy Store Management
            </h2>

            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-700 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Store Name</th>
                    <th className="py-2.5 px-3">Owner</th>
                    <th className="py-2.5 px-3">Drug License</th>
                    <th className="py-2.5 px-3">City &amp; Pincode</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pharmacies.map(p => (
                    <tr key={p.user_id}>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{p.shop_name}</td>
                      <td className="py-2.5 px-3">{p.owner_name}</td>
                      <td className="py-2.5 px-3 font-mono">{p.license_no}</td>
                      <td className="py-2.5 px-3">{p.city} - {p.pincode}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.is_approved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {p.is_approved ? 'Approved' : 'Pending Review'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <button
                          onClick={() => handlePharmacyApproval(p.user_id, !p.is_approved)}
                          className={`text-xs font-semibold ${p.is_approved ? 'text-rose-600 hover:underline' : 'text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded hover:bg-emerald-100 border border-emerald-200'}`}
                        >
                          {p.is_approved ? 'Suspend Store' : 'Approve License'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODULE 5: APPOINTMENTS FILTERING */}
        {activeModule === 'appointments' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">All Patient Consultations</h2>
                <p className="text-xs text-slate-500">Filter appointments across entire clinical network.</p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <select
                  value={aptTypeFilter}
                  onChange={e => setAptTypeFilter(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">All Modes</option>
                  <option value="online">Online Zoom</option>
                  <option value="offline">In-Person</option>
                </select>

                <select
                  value={aptStatusFilter}
                  onChange={e => setAptStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">All Statuses</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-700 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Apt ID</th>
                    <th className="py-2.5 px-3">Patient</th>
                    <th className="py-2.5 px-3">Doctor</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Date &amp; Time</th>
                    <th className="py-2.5 px-3">Mode</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filterAppointments().map(apt => (
                    <tr key={apt.id}>
                      <td className="py-2.5 px-3 font-mono font-bold text-teal-800">{apt.appointment_id}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{apt.patient_name}</td>
                      <td className="py-2.5 px-3">Dr. {apt.doctor_name}</td>
                      <td className="py-2.5 px-3 text-slate-600">{apt.department_name}</td>
                      <td className="py-2.5 px-3">{apt.appointment_date} · {apt.appointment_time}</td>
                      <td className="py-2.5 px-3 capitalize">{apt.appointment_type}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${apt.status === 'Completed' ? 'bg-slate-100 text-slate-700' : 'bg-emerald-100 text-emerald-800'}`}>
                          {apt.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODULE 6: DEDICATED ADMIN LOGIN HISTORY & AUDITING (SECTION 20) */}
        {activeModule === 'login-history' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Administrator Login History &amp; Session Audit</h2>
              <p className="text-xs text-slate-500 mt-1">
                Real-time security auditing tracking authentication signals for Patients, Doctors, Pharmacies, and Admins.
              </p>
            </div>

            {/* Login Summary Cards */}
            {loginSummary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs text-slate-500">Total Attempts</span>
                  <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{loginSummary.totalAttempts}</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs text-slate-500">Successful Logins</span>
                  <p className="text-2xl font-bold text-emerald-700 mt-1 tabular-nums">{loginSummary.successfulLogins}</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs text-slate-500">Failed Attempts</span>
                  <p className="text-2xl font-bold text-rose-700 mt-1 tabular-nums">{loginSummary.failedLogins}</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <span className="text-xs text-slate-500">Active Sessions</span>
                  <p className="text-2xl font-bold text-teal-700 mt-1 tabular-nums">{loginSummary.activeSessions}</p>
                </div>
              </div>
            )}

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 text-xs items-center justify-between">
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <select
                  value={historyRoleFilter}
                  onChange={e => setHistoryRoleFilter(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">All Roles</option>
                  <option value="patient">Patient</option>
                  <option value="doctor">Doctor</option>
                  <option value="pharmacy">Pharmacy</option>
                  <option value="admin">Administrator</option>
                </select>

                <select
                  value={historyStatusFilter}
                  onChange={e => setHistoryStatusFilter(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">All Statuses</option>
                  <option value="Success">Success</option>
                  <option value="Failed">Failed</option>
                </select>
              </div>

              <div className="w-full sm:w-64">
                <input
                  type="text"
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  placeholder="Search user, IP, username..."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-slate-700 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">History ID</th>
                      <th className="py-2.5 px-3">Username / Identifier</th>
                      <th className="py-2.5 px-3">Role</th>
                      <th className="py-2.5 px-3">Event Type</th>
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">IP Address</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Session Duration / Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filterLoginHistory().map(log => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono text-slate-400">#{log.id}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">
                          {log.username_attempted}
                          {log.user_name && <span className="block text-[11px] text-slate-400 font-normal">{log.user_name}</span>}
                        </td>
                        <td className="py-2.5 px-3 capitalize font-medium">{log.role || 'Unknown'}</td>
                        <td className="py-2.5 px-3">{log.event_type}</td>
                        <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString('en-GB')}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">{log.ip_address}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${log.login_status === 'Success' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                            {log.login_status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {log.failure_reason ? (
                            <span className="text-rose-600">{log.failure_reason}</span>
                          ) : (
                            log.session_duration || 'Active'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MODULE 7: REPORTS & ANALYTICS */}
        {activeModule === 'reports' && stats && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Healthcare Analytics &amp; Revenue Reports
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h3 className="font-bold text-slate-900 text-sm">Consultation Breakdown</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Online Zoom Consultations</span>
                    <strong className="text-sky-700">{stats.onlineAppointments}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>In-Person Hospital Consultations</span>
                    <strong className="text-teal-700">{stats.offlineAppointments}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Completed &amp; Prescriptions Issued</span>
                    <strong className="text-emerald-700">{stats.completedConsultations}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Cancelled / No-Show</span>
                    <strong className="text-rose-700">{stats.cancelledAppointments}</strong>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <h3 className="font-bold text-slate-900 text-sm">Revenue Realization</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Total Consultation Fees Collected</span>
                    <strong className="text-slate-900">₹{stats.appointmentRevenue}.00</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Pharmacy Prescription Gross Sales</span>
                    <strong className="text-slate-900">₹{stats.pharmacyPayments}.00</strong>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200 text-sm">
                    <span className="font-bold">Total Platform Gross</span>
                    <strong className="text-teal-800">₹{stats.appointmentRevenue + stats.pharmacyPayments}.00</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODULE 8: FEEDBACK MODERATION */}
        {activeModule === 'feedback' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Doctor Ratings &amp; Patient Feedback Moderation
            </h2>

            <div className="divide-y divide-slate-100 text-xs">
              {feedbackList.map(fb => (
                <div key={fb.id} className="py-3 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="font-bold text-slate-900">
                      {fb.patient_name} reviewed Dr. {fb.doctor_name} ({fb.rating} Stars)
                    </p>
                    <p className="text-slate-600 italic">"{fb.review_text}"</p>
                    <span className="text-[10px] text-slate-400">{new Date(fb.created_at).toLocaleString('en-GB')}</span>
                  </div>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                    Approved
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ADD DEPARTMENT MODAL */}
      {showAddDeptModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Add Medical Department</h3>

            <form onSubmit={handleCreateDepartment} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Department Name *</label>
                <input
                  type="text"
                  required
                  value={newDeptName}
                  onChange={e => setNewDeptName(e.target.value)}
                  placeholder="e.g. Pediatric Oncology"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                <select
                  value={newDeptCategory}
                  onChange={e => setNewDeptCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                >
                  <option value="General and Primary Care">General and Primary Care</option>
                  <option value="Heart, Brain, and Nervous System">Heart, Brain, and Nervous System</option>
                  <option value="Bones, Muscles, and Rehabilitation">Bones, Muscles, and Rehabilitation</option>
                  <option value="Skin, Hair, and Allergy">Skin, Hair, and Allergy</option>
                  <option value="Women's Health">Women's Health</option>
                  <option value="Child Healthcare">Child Healthcare</option>
                  <option value="Cancer Care">Cancer Care</option>
                  <option value="Dental Care">Dental Care</option>
                  <option value="Diagnostic and Laboratory Departments">Diagnostic and Laboratory</option>
                  <option value="Other Specialized Departments">Other Specialized Departments</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newDeptDesc}
                  onChange={e => setNewDeptDesc(e.target.value)}
                  placeholder="Clinical scope and patient guidance description"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddDeptModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg"
                >
                  Save Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
