import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Appointment, Prescription, PrescriptionMedicine } from '../../types';
import {
  Calendar, Clock, Video, Building2, User, FileText,
  CheckCircle2, Plus, Trash2, Download, Star, DollarSign,
  AlertCircle, Settings, Ban, Lock, Unlock, ShieldAlert,
  Search, Filter, Check, X, AlertTriangle, Layers, RotateCw,
  Phone, Mail, Info, ChevronRight, Eye
} from 'lucide-react';
import { generateDoctorPrescriptionPdf } from '../../utils/pdfGenerator';

interface DoctorDashboardProps {
  onNavigate: (tab: string, extra?: any) => void;
  openConsultationId?: number;
  initialTab?: string;
}

export const DoctorDashboard: React.FC<DoctorDashboardProps> = ({ onNavigate, openConsultationId, initialTab }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'appointments' | 'schedule-view' | 'slot-blocking' | 'schedule' | 'prescriptions' | 'earnings' | 'reviews'>(
    (initialTab as any) || 'appointments'
  );
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Appointments Queue Filters & Search
  const [aptFilter, setAptFilter] = useState<'all' | 'needs_action' | 'scheduled' | 'today' | 'completed' | 'cancelled'>('all');
  const [aptSearch, setAptSearch] = useState<string>('');

  // Decline Appointment Modal
  const [declineModalApt, setDeclineModalApt] = useState<Appointment | null>(null);
  const [declineReasonPreset, setDeclineReasonPreset] = useState<string>('Emergency Surgery / OT Duty');
  const [declineCustomReason, setDeclineCustomReason] = useState<string>('');
  const [isAcceptingSubmitting, setIsAcceptingSubmitting] = useState<boolean>(false);
  const [isDecliningSubmitting, setIsDecliningSubmitting] = useState<boolean>(false);

  // Patient Detail Modal
  const [detailModalApt, setDetailModalApt] = useState<Appointment | null>(null);

  // Schedule & Calendar View State
  const [scheduleViewDate, setScheduleViewDate] = useState<string>('2026-10-15');
  const [scheduleTypeFilter, setScheduleTypeFilter] = useState<'all' | 'online' | 'offline'>('all');

  // Slot Blocking State
  const [selectedSlotDate, setSelectedSlotDate] = useState<string>('2026-10-15');
  const [slotDetails, setSlotDetails] = useState<any>(null);
  const [loadingSlotDetails, setLoadingSlotDetails] = useState<boolean>(false);
  const [allBlockedSlots, setAllBlockedSlots] = useState<any[]>([]);
  const [selectedSlotsForBatch, setSelectedSlotsForBatch] = useState<string[]>([]);

  // Modal State for Slot Blocking
  const [isBlockModalOpen, setIsBlockModalOpen] = useState<boolean>(false);
  const [blockScope, setBlockScope] = useState<'single' | 'batch' | 'all_day' | 'range'>('single');
  const [modalTargetSlot, setModalTargetSlot] = useState<string>('10:00 AM');
  const [modalTargetDate, setModalTargetDate] = useState<string>('2026-10-15');
  const [rangeStartDate, setRangeStartDate] = useState<string>('2026-10-15');
  const [rangeEndDate, setRangeEndDate] = useState<string>('2026-10-17');
  const [blockReason, setBlockReason] = useState<string>('Hospital Surgery / OT');
  const [customReason, setCustomReason] = useState<string>('');
  const [isBlockingSubmitting, setIsBlockingSubmitting] = useState<boolean>(false);
  const [blockSuccessToast, setBlockSuccessToast] = useState<string | null>(null);

  // Blocked slots table filter & search
  const [blockedSearchTerm, setBlockedSearchTerm] = useState<string>('');
  const [blockedTypeFilter, setBlockedTypeFilter] = useState<'all' | 'day_leaves' | 'slots'>('all');

  // Active Consultation Modal
  const [activeConsultApt, setActiveConsultApt] = useState<Appointment | null>(null);
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [findings, setFindings] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [treatmentInstructions, setTreatmentInstructions] = useState('');
  const [followUpDate, setFollowUpDate] = useState('2026-10-25');
  const [isSubmittingConsult, setIsSubmittingConsult] = useState(false);

  // Medicine Prescription Rows
  const [medicines, setMedicines] = useState<PrescriptionMedicine[]>([
    {
      medicine_name: '',
      strength: '',
      dosage: '1 tablet',
      frequency: '2 times per day',
      times_per_day: '2',
      duration_days: 5,
      timing: 'Morning and Night',
      instructions: 'Take after meals with water',
      quantity: 10
    }
  ]);

  // Schedule State
  const [scheduleData, setScheduleData] = useState({
    workingHoursStart: '09:00',
    workingHoursEnd: '17:00',
    availableDays: 'Mon,Tue,Wed,Thu,Fri,Sat',
    onlineAvailable: true,
    offlineAvailable: true
  });
  const [scheduleSaved, setScheduleSaved] = useState(false);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab as any);
    }
  }, [initialTab]);

  useEffect(() => {
    if (user?.id) {
      loadDoctorData();
      loadDoctorProfile();
    }
  }, [user?.id]);

  useEffect(() => {
    if (openConsultationId && appointments.length > 0) {
      const target = appointments.find(a => a.id === openConsultationId);
      if (target) handleOpenConsultationModal(target);
    }
  }, [openConsultationId, appointments]);

  const loadDoctorProfile = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/doctors/${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setScheduleData({
          workingHoursStart: data.working_hours_start || '09:00',
          workingHoursEnd: data.working_hours_end || '17:00',
          availableDays: data.available_days || 'Mon,Tue,Wed,Thu,Fri,Sat',
          onlineAvailable: Boolean(data.online_available),
          offlineAvailable: Boolean(data.offline_available)
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadDoctorData = async () => {
    setIsLoading(true);
    try {
      const [aptRes, rxRes, revRes] = await Promise.all([
        fetch(`/api/appointments?doctorUserId=${user?.id}`),
        fetch(`/api/prescriptions?doctorUserId=${user?.id}`),
        fetch(`/api/feedback?doctorUserId=${user?.id}`)
      ]);
      const apts = await aptRes.json();
      setAppointments(apts);
      setPrescriptions(await rxRes.json());
      setReviews(await revRes.json());
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  const loadSlotDetailsForDate = async (date: string) => {
    if (!user?.id) return;
    setLoadingSlotDetails(true);
    try {
      const res = await fetch(`/api/doctors/${user.id}/slots?date=${date}`);
      const data = await res.json();
      setSlotDetails(data);
    } catch (e) {
      console.error(e);
    }
    setLoadingSlotDetails(false);
  };

  const loadAllBlockedSlots = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/doctors/${user.id}/blocked-slots`);
      const data = await res.json();
      setAllBlockedSlots(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (user?.id && selectedSlotDate) {
      loadSlotDetailsForDate(selectedSlotDate);
      loadAllBlockedSlots();
      setSelectedSlotsForBatch([]);
    }
  }, [user?.id, selectedSlotDate]);

  // Handle Doctor Accepting an Appointment Request
  const handleAcceptAppointment = async (apt: Appointment) => {
    if (!user?.id) return;
    setIsAcceptingSubmitting(true);
    try {
      const res = await fetch(`/api/appointments/${apt.id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      setIsAcceptingSubmitting(false);

      if (!res.ok) {
        alert(data.error || 'Failed to accept appointment');
        return;
      }

      setBlockSuccessToast(`✓ Appointment ${apt.appointment_id} for ${apt.patient_name} accepted and scheduled on your calendar.`);
      setTimeout(() => setBlockSuccessToast(null), 3500);
      loadDoctorData();
      if (selectedSlotDate) loadSlotDetailsForDate(selectedSlotDate);
    } catch (err: any) {
      setIsAcceptingSubmitting(false);
      alert(err.message || 'Error accepting appointment');
    }
  };

  // Handle Doctor Declining an Appointment Request
  const handleExecuteDecline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!declineModalApt || !user?.id) return;

    setIsDecliningSubmitting(true);
    const finalReason = declineReasonPreset === 'Other'
      ? (declineCustomReason.trim() || 'Doctor unavailable due to emergency duty')
      : declineReasonPreset;

    try {
      const res = await fetch(`/api/appointments/${declineModalApt.id}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: finalReason })
      });
      const data = await res.json();
      setIsDecliningSubmitting(false);

      if (!res.ok) {
        alert(data.error || 'Failed to decline appointment');
        return;
      }

      setBlockSuccessToast(`Appointment ${declineModalApt.appointment_id} declined. Patient has been notified.`);
      setTimeout(() => setBlockSuccessToast(null), 3500);
      setDeclineModalApt(null);
      loadDoctorData();
      if (selectedSlotDate) loadSlotDetailsForDate(selectedSlotDate);
    } catch (err: any) {
      setIsDecliningSubmitting(false);
      alert(err.message || 'Error declining appointment');
    }
  };

  // Open block modal for a specific slot
  const handleOpenBlockModalForSlot = (slotTime: string) => {
    setModalTargetDate(selectedSlotDate);
    setModalTargetSlot(slotTime);
    setBlockScope('single');
    setIsBlockModalOpen(true);
  };

  // Open block modal for full day
  const handleOpenBlockModalForFullDay = () => {
    setModalTargetDate(selectedSlotDate);
    setBlockScope('all_day');
    setIsBlockModalOpen(true);
  };

  // Open block modal for selected batch slots
  const handleOpenBlockModalForBatch = () => {
    if (selectedSlotsForBatch.length === 0) return;
    setModalTargetDate(selectedSlotDate);
    setBlockScope('batch');
    setIsBlockModalOpen(true);
  };

  // Open block modal for multi-day date range
  const handleOpenBlockModalForRange = () => {
    setRangeStartDate(selectedSlotDate);
    setRangeEndDate(selectedSlotDate);
    setBlockScope('range');
    setIsBlockModalOpen(true);
  };

  // Execute block slot(s)
  const handleExecuteBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setIsBlockingSubmitting(true);
    const finalReason = blockReason === 'Other' ? (customReason.trim() || 'Doctor Unavailable') : blockReason;

    try {
      let body: any = { reason: finalReason };

      if (blockScope === 'range') {
        body.startDate = rangeStartDate;
        body.endDate = rangeEndDate;
      } else if (blockScope === 'batch') {
        body.blockDate = modalTargetDate;
        body.slotTimes = selectedSlotsForBatch;
      } else if (blockScope === 'all_day') {
        body.blockDate = modalTargetDate;
        body.slotTime = 'ALL_DAY';
      } else {
        body.blockDate = modalTargetDate;
        body.slotTime = modalTargetSlot;
      }

      const res = await fetch(`/api/doctors/${user.id}/block-slot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      setIsBlockingSubmitting(false);

      if (!res.ok) {
        alert(data.error || 'Failed to block slot(s)');
        return;
      }

      setBlockSuccessToast(data.message || 'Slot(s) successfully blocked');
      setTimeout(() => setBlockSuccessToast(null), 4000);
      setIsBlockModalOpen(false);
      setSelectedSlotsForBatch([]);
      loadSlotDetailsForDate(selectedSlotDate);
      loadAllBlockedSlots();
    } catch (err: any) {
      setIsBlockingSubmitting(false);
      alert(err.message || 'Error blocking slot');
    }
  };

  // Unblock a single slot by ID
  const handleUnblockSlot = async (blockId: number) => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/doctors/${user.id}/blocked-slots/${blockId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setBlockSuccessToast('Slot unblocked successfully. Re-opened for patient bookings.');
        setTimeout(() => setBlockSuccessToast(null), 3000);
        loadSlotDetailsForDate(selectedSlotDate);
        loadAllBlockedSlots();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Unblock entire date
  const handleUnblockEntireDay = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/doctors/${user.id}/blocked-date?date=${selectedSlotDate}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setBlockSuccessToast(`All slots and leave for ${selectedSlotDate} unblocked successfully.`);
        setTimeout(() => setBlockSuccessToast(null), 3000);
        loadSlotDetailsForDate(selectedSlotDate);
        loadAllBlockedSlots();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Toggle batch slot selection
  const handleToggleBatchSlot = (time: string) => {
    setSelectedSlotsForBatch(prev =>
      prev.includes(time) ? prev.filter(t => t !== time) : [...prev, time]
    );
  };

  // Save Working Schedule
  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      const res = await fetch(`/api/doctors/${user.id}/schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduleData)
      });
      if (res.ok) {
        setScheduleSaved(true);
        setTimeout(() => setScheduleSaved(false), 3000);
        loadSlotDetailsForDate(selectedSlotDate);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenConsultationModal = (apt: Appointment) => {
    setActiveConsultApt(apt);
    setClinicalNotes('');
    setFindings('');
    setDiagnosis(apt.main_health_issue || '');
    setTreatmentInstructions('');
    setMedicines([
      {
        medicine_name: 'Amoxicillin & Potassium Clavulanate',
        strength: '625 mg',
        dosage: '1 tablet',
        frequency: '2 times per day',
        times_per_day: '2',
        duration_days: 5,
        timing: 'Morning and Night after meals',
        instructions: 'Complete full course even if symptoms abate',
        quantity: 10
      }
    ]);
  };

  const handleAddMedicineRow = () => {
    setMedicines(prev => [
      ...prev,
      {
        medicine_name: '',
        strength: '',
        dosage: '1 tablet',
        frequency: '1 time per day',
        times_per_day: '1',
        duration_days: 5,
        timing: 'After breakfast',
        instructions: '',
        quantity: 10
      }
    ]);
  };

  const handleRemoveMedicineRow = (index: number) => {
    setMedicines(prev => prev.filter((_, i) => i !== index));
  };

  const handleMedicineChange = (index: number, field: keyof PrescriptionMedicine, value: any) => {
    setMedicines(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSaveConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConsultApt || !user) return;

    setIsSubmittingConsult(true);
    try {
      const validMeds = medicines.filter(m => m.medicine_name.trim().length > 0);

      const res = await fetch('/api/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: activeConsultApt.id,
          doctorUserId: user.id,
          clinicalNotes,
          findings,
          diagnosis,
          treatmentInstructions,
          followUpDate,
          medicines: validMeds
        })
      });

      setIsSubmittingConsult(false);
      if (res.ok) {
        setActiveConsultApt(null);
        loadDoctorData();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to complete consultation');
      }
    } catch (e) {
      setIsSubmittingConsult(false);
      console.error(e);
    }
  };

  // Helper dates for quick selector (12 days)
  const quickDates = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(2026, 9, 15 + i); // Starts from 2026-10-15
    const iso = d.toISOString().split('T')[0];
    const isBlocked = allBlockedSlots.some(b => b.block_date === iso);
    const isFullDayBlocked = allBlockedSlots.some(b => b.block_date === iso && (b.slot_time === 'ALL_DAY' || !b.slot_time));
    const dayAptsCount = appointments.filter(a => a.appointment_date === iso && a.status !== 'Cancelled').length;
    return {
      iso,
      weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
      day: d.getDate(),
      month: d.toLocaleDateString('en-US', { month: 'short' }),
      isBlocked,
      isFullDayBlocked,
      dayAptsCount
    };
  });

  // Filtered blocked slots for the table
  const filteredBlockedSlots = allBlockedSlots.filter(b => {
    const matchesSearch =
      !blockedSearchTerm ||
      b.block_date.includes(blockedSearchTerm) ||
      (b.slot_time && b.slot_time.toLowerCase().includes(blockedSearchTerm.toLowerCase())) ||
      (b.reason && b.reason.toLowerCase().includes(blockedSearchTerm.toLowerCase()));

    const isDayLeave = b.slot_time === 'ALL_DAY' || !b.slot_time;
    if (blockedTypeFilter === 'day_leaves') return matchesSearch && isDayLeave;
    if (blockedTypeFilter === 'slots') return matchesSearch && !isDayLeave;
    return matchesSearch;
  });

  const todayStr = '2026-10-15';
  const todayApts = appointments.filter(a => a.appointment_date === todayStr);

  // Status groupings
  // 'Confirmed' means booked & paid by patient, awaiting doctor acceptance!
  const pendingAcceptanceApts = appointments.filter(a => a.status === 'Confirmed');
  // 'Scheduled' means accepted by doctor!
  const scheduledApts = appointments.filter(a => a.status === 'Scheduled');
  const completedApts = appointments.filter(a => a.status === 'Completed');
  const cancelledApts = appointments.filter(a => a.status === 'Cancelled');

  const totalEarnings = completedApts.reduce((sum, a) => sum + (a.consultation_fee || 0), 0) +
    scheduledApts.reduce((sum, a) => sum + (a.consultation_fee || 0), 0) +
    pendingAcceptanceApts.reduce((sum, a) => sum + (a.consultation_fee || 0), 0);

  // Slot calculations for selected date
  const availableSlotsCount = slotDetails?.slots?.filter((s: any) => s.isAvailable)?.length || 0;
  const blockedSlotsCount = slotDetails?.slots?.filter((s: any) => s.isBlocked)?.length || 0;
  const bookedSlotsCount = slotDetails?.slots?.filter((s: any) => s.isBooked)?.length || 0;
  const isSelectedDateFullDayBlocked = slotDetails?.isBlockedDay || false;

  // Filtered appointments queue
  const filteredAppointments = appointments.filter(apt => {
    const matchesSearch = !aptSearch ||
      apt.patient_name?.toLowerCase().includes(aptSearch.toLowerCase()) ||
      apt.appointment_id?.toLowerCase().includes(aptSearch.toLowerCase()) ||
      apt.main_health_issue?.toLowerCase().includes(aptSearch.toLowerCase()) ||
      apt.appointment_date?.includes(aptSearch);

    if (!matchesSearch) return false;

    if (aptFilter === 'needs_action') return apt.status === 'Confirmed';
    if (aptFilter === 'scheduled') return apt.status === 'Scheduled';
    if (aptFilter === 'today') return apt.appointment_date === todayStr;
    if (aptFilter === 'completed') return apt.status === 'Completed';
    if (aptFilter === 'cancelled') return apt.status === 'Cancelled';
    return true;
  });

  // Schedule View day appointments
  const scheduleDayApts = appointments.filter(a => {
    if (a.appointment_date !== scheduleViewDate) return false;
    if (scheduleTypeFilter === 'online') return a.appointment_type === 'online';
    if (scheduleTypeFilter === 'offline') return a.appointment_type === 'offline';
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 relative">
      {/* Toast Notification */}
      {blockSuccessToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-4">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="text-xs">
            <p className="font-semibold text-slate-100">Practice Update</p>
            <p className="text-slate-300 mt-0.5">{blockSuccessToast}</p>
          </div>
          <button
            onClick={() => setBlockSuccessToast(null)}
            className="text-slate-400 hover:text-white ml-auto"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Doctor Header Banner */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                Doctor Practice Portal · {user?.fullName || 'Dr. Arun Kumar'}
              </h1>
              <span className="text-xs bg-sky-50 text-sky-700 px-2.5 py-0.5 rounded font-medium border border-sky-200">
                Verified Medical Faculty
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Review patient appointment requests, accept/schedule consultations, inspect day schedules, block unavailable slots, and issue digital prescriptions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('schedule-view')}
              className="px-3.5 py-2 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>See Appointment Schedule</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('slot-blocking');
                handleOpenBlockModalForSlot('10:00 AM');
              }}
              className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Block Slot / Leave</span>
            </button>
            <button
              onClick={() => setActiveTab('schedule')}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Shift Settings</span>
            </button>
          </div>
        </div>

        {/* Doctor KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div
            className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-amber-300 transition-colors"
            onClick={() => {
              setActiveTab('appointments');
              setAptFilter('needs_action');
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Needs Acceptance</span>
              {pendingAcceptanceApts.length > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
              )}
            </div>
            <p className="text-2xl font-bold text-amber-600 mt-1 tabular-nums">{pendingAcceptanceApts.length}</p>
            <span className="text-[11px] text-amber-700 mt-0.5 block font-medium">New patient requests to accept</span>
          </div>

          <div
            className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-sky-300 transition-colors"
            onClick={() => setActiveTab('schedule-view')}
          >
            <span className="text-xs text-slate-500">Today's Schedule</span>
            <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{todayApts.length}</p>
            <span className="text-[11px] text-sky-700 mt-0.5 block font-medium">15 Oct 2026 · Click to see timeline</span>
          </div>

          <div
            className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-rose-300 transition-colors"
            onClick={() => setActiveTab('slot-blocking')}
          >
            <span className="text-xs text-slate-500 flex items-center justify-between">
              <span>Blocked Slots / Leaves</span>
              <Ban className="w-3.5 h-3.5 text-rose-500" />
            </span>
            <p className="text-2xl font-bold text-rose-700 mt-1 tabular-nums">{allBlockedSlots.length}</p>
            <span className="text-[11px] text-rose-600 mt-0.5 block font-medium">Manage unavailable periods</span>
          </div>

          <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500">Practice Earnings</span>
            <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">₹{totalEarnings}</p>
            <span className="text-[11px] text-emerald-700 mt-0.5 block font-medium">Platform Consultations</span>
          </div>
        </div>

        {/* Primary Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200">
          {[
            {
              key: 'appointments',
              label: `Patient Queue & Approval (${appointments.length})`,
              badge: pendingAcceptanceApts.length > 0 ? `${pendingAcceptanceApts.length} to accept` : undefined,
              badgeColor: 'bg-amber-100 text-amber-800'
            },
            {
              key: 'schedule-view',
              label: `Appointment Schedule & Calendar (${appointments.filter(a => a.status !== 'Cancelled').length})`
            },
            {
              key: 'slot-blocking',
              label: `Slot Blocking & Leaves (${allBlockedSlots.length})`
            },
            {
              key: 'prescriptions',
              label: `Issued Prescriptions (${prescriptions.length})`
            },
            {
              key: 'schedule',
              label: 'Availability & Working Hours'
            },
            {
              key: 'earnings',
              label: 'Earnings & Settlement'
            },
            {
              key: 'reviews',
              label: `Patient Reviews (${reviews.length})`
            }
          ].map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? tab.key === 'slot-blocking'
                      ? 'bg-rose-700 text-white shadow-sm'
                      : 'bg-sky-700 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>{tab.label}</span>
                {tab.badge && !isActive && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${tab.badgeColor}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* TAB 1: PATIENT QUEUE & ACCEPT APPOINTMENTS */}
        {activeTab === 'appointments' && (
          <div className="space-y-6">
            {/* Acceptance Announcement Banner if pending requests exist */}
            {pendingAcceptanceApts.length > 0 && (
              <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-5 h-5 text-amber-800" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-amber-950">
                      {pendingAcceptanceApts.length} New Patient Appointment(s) Awaiting Your Acceptance
                    </h3>
                    <p className="text-xs text-amber-800 mt-0.5">
                      Patients have booked and paid for consultation slots. Accept to confirm the appointment and add to your active schedule.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAptFilter('needs_action')}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors shrink-0 shadow-xs"
                >
                  Filter Pending Requests
                </button>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    Patient Consultation Queue
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Accept or decline incoming patient appointments, initiate teleconsultations, and issue medical prescriptions.
                  </p>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search patient or Apt ID..."
                      value={aptSearch}
                      onChange={e => setAptSearch(e.target.value)}
                      className="text-xs pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500 w-52"
                    />
                  </div>

                  <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setAptFilter('all')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors ${aptFilter === 'all' ? 'bg-white text-slate-800 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      All ({appointments.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAptFilter('needs_action')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors ${aptFilter === 'needs_action' ? 'bg-amber-100 text-amber-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      Needs Acceptance ({pendingAcceptanceApts.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAptFilter('scheduled')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors ${aptFilter === 'scheduled' ? 'bg-white text-slate-800 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      Scheduled ({scheduledApts.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAptFilter('today')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors ${aptFilter === 'today' ? 'bg-white text-slate-800 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      Today ({todayApts.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAptFilter('completed')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors ${aptFilter === 'completed' ? 'bg-white text-slate-800 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      Completed ({completedApts.length})
                    </button>
                  </div>
                </div>
              </div>

              {filteredAppointments.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="font-semibold text-slate-700">No appointments matching this view.</p>
                  <p className="text-slate-400 max-w-sm mx-auto">
                    Try switching filters or selecting "All Appointments".
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {filteredAppointments.map(apt => {
                    const isPendingAcceptance = apt.status === 'Confirmed';
                    const isScheduled = apt.status === 'Scheduled';
                    const isCompleted = apt.status === 'Completed';
                    const isCancelled = apt.status === 'Cancelled';

                    return (
                      <div key={apt.id} className="py-4.5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="space-y-2 max-w-2xl">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">{apt.patient_name}</span>
                            <span className="text-slate-500">
                              ({apt.patient_age || 30} Y / {apt.patient_gender || 'Male'})
                            </span>

                            {/* Mode Badge */}
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${apt.appointment_type === 'online' ? 'bg-sky-100 text-sky-800' : 'bg-teal-100 text-teal-800'}`}>
                              {apt.appointment_type === 'online' ? 'Zoom Telehealth' : 'In-Person Hospital'}
                            </span>

                            {/* Status Badge */}
                            {isPendingAcceptance && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping" />
                                <span>Awaiting Doctor Acceptance</span>
                              </span>
                            )}
                            {isScheduled && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                Accepted &amp; Scheduled
                              </span>
                            )}
                            {isCompleted && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                Consultation Completed
                              </span>
                            )}
                            {isCancelled && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                                Cancelled / Declined
                              </span>
                            )}
                          </div>

                          <p className="text-slate-800">
                            <span className="font-semibold text-slate-900">Chief Complaint:</span> {apt.main_health_issue || 'General Medical Evaluation'}
                          </p>

                          {apt.symptoms && (
                            <p className="text-slate-600 text-[11px]">
                              <span className="font-medium text-slate-700">Reported Symptoms:</span> {apt.symptoms}
                            </p>
                          )}

                          <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-4 pt-0.5">
                            <span className="flex items-center gap-1 text-slate-600 font-medium">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>{apt.appointment_date}</span>
                            </span>
                            <span className="flex items-center gap-1 text-slate-600 font-medium">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>{apt.appointment_time}</span>
                            </span>
                            <span>Fee: <strong className="text-slate-700">₹{apt.consultation_fee}</strong> (Paid)</span>
                            <span className="font-mono text-slate-500">ID: {apt.appointment_id}</span>
                          </div>
                        </div>

                        {/* Action Buttons Zone */}
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {/* Case 1: Pending Doctor Acceptance */}
                          {isPendingAcceptance && (
                            <>
                              <button
                                type="button"
                                disabled={isAcceptingSubmitting}
                                onClick={() => handleAcceptAppointment(apt)}
                                className="px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Accept Appointment</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setDeclineModalApt(apt)}
                                className="px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-lg transition-colors flex items-center gap-1"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Decline</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setDetailModalApt(apt)}
                                className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                                title="View Patient Details"
                              >
                                <Info className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {/* Case 2: Accepted & Scheduled */}
                          {isScheduled && (
                            <>
                              {apt.appointment_type === 'online' && (
                                <button
                                  onClick={() => onNavigate('zoom-consultation', { appointmentId: apt.id })}
                                  className="px-3.5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                                >
                                  <Video className="w-3.5 h-3.5" />
                                  <span>Start Zoom</span>
                                </button>
                              )}

                              <button
                                onClick={() => handleOpenConsultationModal(apt)}
                                className="px-3.5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Conduct Consult &amp; Rx</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setDetailModalApt(apt)}
                                className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                                title="View Patient Details"
                              >
                                <Info className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {/* Case 3: Completed */}
                          {isCompleted && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                                Completed
                              </span>
                              <button
                                type="button"
                                onClick={() => setDetailModalApt(apt)}
                                className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                                title="View Case Record"
                              >
                                <Info className="w-4 h-4" />
                              </button>
                            </div>
                          )}

                          {/* Case 4: Cancelled */}
                          {isCancelled && (
                            <span className="text-xs text-rose-600 font-medium bg-rose-50 px-2.5 py-1 rounded">
                              Cancelled
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: APPOINTMENT SCHEDULE & CALENDAR VIEW */}
        {activeTab === 'schedule-view' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    Appointment Schedule &amp; Daily Practice Timeline
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                  Inspect your consultation schedule by date. Review patient bookings, check slot occupancy, and accept new requests on your timeline.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('slot-blocking')}
                  className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Block Slots / Leaves</span>
                </button>
              </div>
            </div>

            {/* Date Selection Strip for Schedule */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-sky-600" />
                    <span>Choose Schedule Date</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Viewing schedule for {new Date(scheduleViewDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs text-slate-500 font-medium">Jump to:</label>
                    <input
                      type="date"
                      value={scheduleViewDate}
                      onChange={e => setScheduleViewDate(e.target.value)}
                      className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setScheduleTypeFilter('all')}
                      className={`px-2.5 py-1 rounded-md font-medium ${scheduleTypeFilter === 'all' ? 'bg-white text-slate-800 shadow-2xs font-semibold' : 'text-slate-600'}`}
                    >
                      All Types
                    </button>
                    <button
                      type="button"
                      onClick={() => setScheduleTypeFilter('online')}
                      className={`px-2.5 py-1 rounded-md font-medium ${scheduleTypeFilter === 'online' ? 'bg-white text-slate-800 shadow-2xs font-semibold' : 'text-slate-600'}`}
                    >
                      Zoom Online
                    </button>
                    <button
                      type="button"
                      onClick={() => setScheduleTypeFilter('offline')}
                      className={`px-2.5 py-1 rounded-md font-medium ${scheduleTypeFilter === 'offline' ? 'bg-white text-slate-800 shadow-2xs font-semibold' : 'text-slate-600'}`}
                    >
                      Hospital Walk-In
                    </button>
                  </div>
                </div>
              </div>

              {/* Fast Date Buttons */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1">
                {quickDates.map(item => {
                  const isCur = scheduleViewDate === item.iso;
                  return (
                    <button
                      key={item.iso}
                      type="button"
                      onClick={() => setScheduleViewDate(item.iso)}
                      className={`relative px-4 py-2.5 rounded-xl text-xs font-medium text-center shrink-0 border transition-all ${
                        isCur
                          ? 'bg-sky-700 text-white border-sky-700 shadow-sm ring-2 ring-sky-300'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      {item.dayAptsCount > 0 && (
                        <span className={`absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold ${isCur ? 'bg-emerald-400 text-slate-900' : 'bg-emerald-600 text-white'}`}>
                          {item.dayAptsCount}
                        </span>
                      )}

                      <p className={`text-[10px] uppercase font-bold tracking-wider ${isCur ? 'text-sky-100' : 'text-slate-400'}`}>
                        {item.weekday}
                      </p>
                      <p className="text-sm font-bold mt-0.5 tabular-nums">
                        {item.day} {item.month}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Daily Timeline Schedule View */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>Schedule Timeline: {scheduleViewDate}</span>
                    <span className="text-xs font-semibold bg-sky-50 text-sky-800 px-2.5 py-0.5 rounded border border-sky-200">
                      {scheduleDayApts.length} Scheduled Patient(s)
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Chronological consultation queue for {scheduleViewDate}.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium">
                    {scheduleDayApts.filter(a => a.status === 'Confirmed').length} Awaiting Acceptance
                  </span>
                  <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-medium">
                    {scheduleDayApts.filter(a => a.status === 'Scheduled').length} Confirmed Scheduled
                  </span>
                </div>
              </div>

              {scheduleDayApts.length === 0 ? (
                <div className="py-12 text-center bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="font-semibold text-slate-700 text-xs">No appointments scheduled for {scheduleViewDate}.</p>
                  <p className="text-slate-500 text-[11px] max-w-sm mx-auto">
                    Your working slots remain open for patients to book, or you may block them if you have hospital surgery/leaves.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSlotDate(scheduleViewDate);
                      setActiveTab('slot-blocking');
                    }}
                    className="mt-2 px-3.5 py-1.5 text-xs font-semibold text-rose-700 bg-white hover:bg-rose-50 border border-rose-300 rounded-lg transition-colors inline-flex items-center gap-1"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Block Slots on this Date</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {scheduleDayApts.map(apt => {
                    const isPending = apt.status === 'Confirmed';
                    const isAccepted = apt.status === 'Scheduled';
                    const isComp = apt.status === 'Completed';

                    return (
                      <div
                        key={apt.id}
                        className={`p-4 rounded-xl border transition-all text-xs flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                          isPending
                            ? 'bg-amber-50/50 border-amber-300 shadow-2xs ring-1 ring-amber-300'
                            : isAccepted
                            ? 'bg-white border-slate-200 shadow-2xs hover:border-slate-300'
                            : 'bg-slate-50/70 border-slate-200 opacity-80'
                        }`}
                      >
                        {/* Time & Patient Info */}
                        <div className="flex items-start gap-4">
                          <div className="text-center w-24 shrink-0 bg-slate-100 rounded-lg p-2 border border-slate-200">
                            <span className="font-bold text-slate-900 text-sm block">
                              {apt.appointment_time}
                            </span>
                            <span className={`text-[10px] font-bold block mt-0.5 ${apt.appointment_type === 'online' ? 'text-sky-700' : 'text-teal-700'}`}>
                              {apt.appointment_type === 'online' ? 'Zoom Telehealth' : 'In-Person Hospital'}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">{apt.patient_name}</span>
                              <span className="text-slate-500">
                                ({apt.patient_age || 30} Y / {apt.patient_gender || 'Male'})
                              </span>

                              {isPending && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                  Action Required: Accept Appointment
                                </span>
                              )}
                              {isAccepted && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  Scheduled
                                </span>
                              )}
                              {isComp && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700">
                                  Completed
                                </span>
                              )}
                            </div>

                            <p className="text-slate-700">
                              <span className="font-medium text-slate-900">Concern:</span> {apt.main_health_issue || 'General Medical Consultation'}
                            </p>
                            {apt.symptoms && (
                              <p className="text-slate-500 text-[11px]">
                                Symptoms: {apt.symptoms}
                              </p>
                            )}
                            <p className="text-[10px] text-slate-400 font-mono">
                              Apt Code: {apt.appointment_id} · Fee Paid: ₹{apt.consultation_fee}
                            </p>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-wrap items-center gap-2 shrink-0 md:self-center">
                          {isPending && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleAcceptAppointment(apt)}
                                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Accept Appointment</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeclineModalApt(apt)}
                                className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-lg transition-colors flex items-center gap-1"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Decline</span>
                              </button>
                            </>
                          )}

                          {isAccepted && (
                            <>
                              {apt.appointment_type === 'online' && (
                                <button
                                  type="button"
                                  onClick={() => onNavigate('zoom-consultation', { appointmentId: apt.id })}
                                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                                >
                                  <Video className="w-3.5 h-3.5" />
                                  <span>Start Zoom</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleOpenConsultationModal(apt)}
                                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Conduct Consult &amp; Rx</span>
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => setDetailModalApt(apt)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                            title="Patient Health Details"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: SLOT BLOCKING & LEAVES MANAGEMENT */}
        {activeTab === 'slot-blocking' && (
          <div className="space-y-6">
            {/* Main Slot Blocking Header & Actions */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                    <Ban className="w-4 h-4" />
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    Slot Blocking &amp; Doctor Leave Management
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                  Block specific 30-minute time slots or entire days for emergency procedures, hospital OT duty, conferences, or personal leave. Blocked slots are automatically hidden from patients in real-time.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenBlockModalForSlot('10:00 AM')}
                  className="px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Block Specific Slot</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenBlockModalForFullDay}
                  className="px-3.5 py-2 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Mark Full Day Leave</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenBlockModalForRange}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Block Multi-Day Range</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    loadSlotDetailsForDate(selectedSlotDate);
                    loadAllBlockedSlots();
                  }}
                  className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  title="Refresh Slots"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Date Picker Strip */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-sky-600" />
                    <span>Select Practice Date to Inspect Slots</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Click any date below or use the date picker to manage that day's consultation availability.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500 font-medium whitespace-nowrap">Jump to Date:</label>
                  <input
                    type="date"
                    value={selectedSlotDate}
                    onChange={e => setSelectedSlotDate(e.target.value)}
                    className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* Horizontal Scrollable Date Chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1">
                {quickDates.map(item => {
                  const isCurrent = selectedSlotDate === item.iso;
                  return (
                    <button
                      key={item.iso}
                      type="button"
                      onClick={() => setSelectedSlotDate(item.iso)}
                      className={`relative px-4 py-2.5 rounded-xl text-xs font-medium text-center shrink-0 border transition-all ${
                        isCurrent
                          ? 'bg-sky-700 text-white border-sky-700 shadow-sm ring-2 ring-sky-300'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      {item.isFullDayBlocked && (
                        <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-600 text-white shadow-xs">
                          Leave
                        </span>
                      )}
                      {!item.isFullDayBlocked && item.isBlocked && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
                      )}

                      <p className={`text-[10px] uppercase font-bold tracking-wider ${isCurrent ? 'text-sky-100' : 'text-slate-400'}`}>
                        {item.weekday}
                      </p>
                      <p className="text-sm font-bold mt-0.5 tabular-nums">
                        {item.day} {item.month}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Selected Day Status Bar */}
              <div className="pt-2 border-t border-slate-100">
                {isSelectedDateFullDayBlocked ? (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-rose-200 text-rose-800 flex items-center justify-center shrink-0 mt-0.5">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-bold text-rose-900">
                          Full Day Blocked: Dr. {user?.fullName || 'Arun Kumar'} is on leave on {selectedSlotDate}
                        </p>
                        <p className="text-rose-700 mt-0.5">
                          Reason: <strong className="font-semibold">{slotDetails?.blockReason || 'Doctor Unavailable'}</strong>. Patients cannot book any appointment on this entire date.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleUnblockEntireDay}
                      className="px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 shadow-xs"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Unblock Entire Day</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-semibold text-slate-800">
                        {new Date(selectedSlotDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-500">
                        Shift: <strong>{slotDetails?.workingHours || '09:00 - 17:00'}</strong>
                      </span>
                      <span className="text-slate-400">·</span>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {availableSlotsCount} Open
                        </span>
                        <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-medium border border-rose-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          {blockedSlotsCount} Blocked by You
                        </span>
                        <span className="inline-flex items-center gap-1 text-sky-700 bg-sky-50 px-2 py-0.5 rounded font-medium border border-sky-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                          {bookedSlotsCount} Booked by Patients
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleOpenBlockModalForFullDay}
                        className="px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>Block Entire Day</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Batch Action Strip */}
            {selectedSlotsForBatch.length > 0 && (
              <div className="bg-slate-900 text-white rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs shadow-lg animate-in fade-in">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-rose-500 flex items-center justify-center font-bold text-white text-[11px]">
                    {selectedSlotsForBatch.length}
                  </div>
                  <span className="font-medium text-slate-200">
                    slots selected on {selectedSlotDate}: <strong className="text-white">{selectedSlotsForBatch.join(', ')}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSlotsForBatch([])}
                    className="px-2.5 py-1 text-slate-300 hover:text-white text-xs"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenBlockModalForBatch}
                    className="px-3.5 py-1.5 font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg flex items-center gap-1.5 shadow-xs"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Block {selectedSlotsForBatch.length} Selected Slots</span>
                  </button>
                </div>
              </div>
            )}

            {/* Interactive Day Slot Grid */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-teal-600" />
                    <span>Time Slots Grid for {selectedSlotDate}</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Click "Block Slot" on any available time to lock it, or click "Unblock" to reopen it.
                  </p>
                </div>

                <span className="text-[11px] text-slate-400">
                  {slotDetails?.slots?.length || 0} Total 30-min Intervals
                </span>
              </div>

              {loadingSlotDetails ? (
                <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                  <RotateCw className="w-5 h-5 animate-spin text-slate-400" />
                  <span>Loading slot availability...</span>
                </div>
              ) : isSelectedDateFullDayBlocked ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                    <Ban className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Entire Day is Currently Blocked</h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                      No individual slots are open because you marked this full date as leave/unavailable. Reason: {slotDetails?.blockReason || 'Doctor on leave'}.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleUnblockEntireDay}
                    className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs inline-flex items-center gap-1.5"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Re-Open This Day (Unblock All Slots)</span>
                  </button>
                </div>
              ) : slotDetails?.slots?.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {slotDetails.slots.map((s: any) => {
                    const isBatchSelected = selectedSlotsForBatch.includes(s.time);

                    if (s.isBlocked) {
                      return (
                        <div
                          key={s.time}
                          className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/70 text-xs flex flex-col justify-between gap-3 shadow-2xs hover:border-rose-300 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                <Ban className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                <span>{s.time}</span>
                              </span>
                              <span className="mt-1 inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-rose-200/80 text-rose-800">
                                Blocked by Doctor
                              </span>
                            </div>
                            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-1" />
                          </div>

                          <div className="text-[11px] text-slate-600 bg-white/70 rounded-lg p-2 border border-rose-100">
                            <span className="text-slate-400 block text-[10px]">Reason:</span>
                            <span className="font-medium text-slate-800 truncate block">
                              {s.blockReason || 'Doctor Unavailable'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleUnblockSlot(s.blockId)}
                            className="w-full py-1.5 px-2 text-xs font-semibold text-rose-700 bg-white hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            <span>Unblock Slot</span>
                          </button>
                        </div>
                      );
                    }

                    if (s.isBooked) {
                      return (
                        <div
                          key={s.time}
                          className="p-3.5 rounded-xl border border-sky-200 bg-sky-50/60 text-xs flex flex-col justify-between gap-3 shadow-2xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                                <span>{s.time}</span>
                              </span>
                              <span className="mt-1 inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-sky-200/80 text-sky-800">
                                Booked by Patient
                              </span>
                            </div>
                            <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0 mt-1" />
                          </div>

                          <div className="text-[11px] text-slate-600 bg-white/70 rounded-lg p-2 border border-sky-100">
                            <span className="text-slate-400 block text-[10px]">Patient:</span>
                            <span className="font-bold text-slate-800 truncate block">
                              {s.patientName || 'Confirmed Patient'}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {s.appointmentId}
                            </span>
                          </div>

                          <div className="py-1 text-center text-[10px] font-medium text-slate-400 italic">
                            Cannot block active booking
                          </div>
                        </div>
                      );
                    }

                    // Available Slot
                    return (
                      <div
                        key={s.time}
                        className={`p-3.5 rounded-xl border text-xs flex flex-col justify-between gap-3 transition-all ${
                          isBatchSelected
                            ? 'bg-rose-50/40 border-rose-400 shadow-sm ring-1 ring-rose-400'
                            : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isBatchSelected}
                              onChange={() => handleToggleBatchSlot(s.time)}
                              className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                            />
                            <span className="font-bold text-slate-900 text-sm">
                              {s.time}
                            </span>
                          </label>
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Available
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-500">
                          Open for online or offline patient appointment booking.
                        </p>

                        <button
                          type="button"
                          onClick={() => handleOpenBlockModalForSlot(s.time)}
                          className="w-full py-1.5 px-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>Block Slot</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 text-center bg-slate-50 rounded-xl text-slate-500 text-xs">
                  {slotDetails?.reason || 'No working hours scheduled on this date.'}
                </div>
              )}
            </div>

            {/* Comprehensive Blocked Slots History Table */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-rose-600" />
                    <span>All Scheduled Blocked Slots &amp; Leaves ({allBlockedSlots.length})</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Complete registry of blocked time intervals and full day leaves across all dates.
                  </p>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search date or reason..."
                      value={blockedSearchTerm}
                      onChange={e => setBlockedSearchTerm(e.target.value)}
                      className="text-xs pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg bg-slate-50 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500 w-48"
                    />
                  </div>

                  <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setBlockedTypeFilter('all')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors ${blockedTypeFilter === 'all' ? 'bg-white text-slate-800 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      All ({allBlockedSlots.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setBlockedTypeFilter('day_leaves')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors ${blockedTypeFilter === 'day_leaves' ? 'bg-white text-slate-800 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      Full Days
                    </button>
                    <button
                      type="button"
                      onClick={() => setBlockedTypeFilter('slots')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors ${blockedTypeFilter === 'slots' ? 'bg-white text-slate-800 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      Time Slots
                    </button>
                  </div>
                </div>
              </div>

              {filteredBlockedSlots.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500/40 mx-auto" />
                  <p className="font-semibold text-slate-700">No blocked slots match your filter.</p>
                  <p className="text-slate-400 max-w-sm mx-auto">
                    Your practice calendar is open for patients to book during scheduled working hours.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-y border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Time Slot</th>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Reason / Notes</th>
                        <th className="py-3 px-4">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredBlockedSlots.map(b => {
                        const isDay = b.slot_time === 'ALL_DAY' || !b.slot_time;
                        return (
                          <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-4 font-semibold text-slate-900">
                              {b.block_date}
                            </td>
                            <td className="py-3 px-4">
                              {isDay ? (
                                <span className="font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px]">
                                  Entire Day (All Slots)
                                </span>
                              ) : (
                                <span className="font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[11px] flex items-center gap-1 w-fit">
                                  <Clock className="w-3 h-3" />
                                  <span>{b.slot_time}</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isDay ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>
                                {isDay ? 'Full Day Leave' : 'Hourly Block'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-700 max-w-xs truncate">
                              {b.reason || 'Doctor Unavailable'}
                            </td>
                            <td className="py-3 px-4">
                              <button
                                type="button"
                                onClick={() => handleUnblockSlot(b.id)}
                                className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-white hover:bg-rose-50 border border-rose-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
                              >
                                <Unlock className="w-3 h-3" />
                                <span>Unblock</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: ISSUED PRESCRIPTIONS */}
        {activeTab === 'prescriptions' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Prescription History
            </h2>

            {prescriptions.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">No prescriptions created yet.</p>
            ) : (
              <div className="space-y-4">
                {prescriptions.map(rx => (
                  <div key={rx.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-teal-800 text-sm">{rx.prescription_id}</span>
                        <span className="text-slate-500 ml-2">Patient: {rx.patient_name}</span>
                      </div>
                      <button
                        onClick={() => generateDoctorPrescriptionPdf(rx)}
                        className="px-3 py-1.5 text-xs font-semibold text-teal-700 bg-white hover:bg-teal-50 border border-teal-200 rounded-lg flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download PDF</span>
                      </button>
                    </div>

                    <p className="text-slate-600">Diagnosis: {rx.diagnosis || 'Clinical review'}</p>
                    <p className="text-slate-500 text-[11px]">{rx.medicines?.length || 0} medicines prescribed</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: SCHEDULE SETTINGS */}
        {activeTab === 'schedule' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6 max-w-2xl">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Doctor Schedule &amp; Working Hours Settings
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Configure your daily working hours, online teleconsultation availability, and hospital clinic slots.
              </p>
            </div>

            {scheduleSaved && (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Working schedule updated and persisted successfully.</span>
              </div>
            )}

            <form onSubmit={handleSaveSchedule} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Shift Start Time</label>
                  <input
                    type="time"
                    value={scheduleData.workingHoursStart}
                    onChange={e => setScheduleData({ ...scheduleData, workingHoursStart: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Shift End Time</label>
                  <input
                    type="time"
                    value={scheduleData.workingHoursEnd}
                    onChange={e => setScheduleData({ ...scheduleData, workingHoursEnd: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Available Working Days (Comma-separated)</label>
                <input
                  type="text"
                  value={scheduleData.availableDays}
                  onChange={e => setScheduleData({ ...scheduleData, availableDays: e.target.value })}
                  placeholder="e.g. Mon,Tue,Wed,Thu,Fri,Sat"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50"
                />
              </div>

              <div className="pt-2 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scheduleData.onlineAvailable}
                    onChange={e => setScheduleData({ ...scheduleData, onlineAvailable: e.target.checked })}
                    className="rounded text-teal-600 w-4 h-4"
                  />
                  <span className="font-medium text-slate-800">Accept Online Zoom Consultations</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scheduleData.offlineAvailable}
                    onChange={e => setScheduleData({ ...scheduleData, offlineAvailable: e.target.checked })}
                    className="rounded text-teal-600 w-4 h-4"
                  />
                  <span className="font-medium text-slate-800">Accept Offline Hospital Walk-In Slots</span>
                </label>
              </div>

              <button
                type="submit"
                className="mt-4 px-6 py-2.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors shadow-sm"
              >
                Save Schedule Changes
              </button>
            </form>
          </div>
        )}

        {/* TAB 6: EARNINGS */}
        {activeTab === 'earnings' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Practice Earnings &amp; Financial Summary
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="text-slate-500">Gross Total</span>
                <p className="text-2xl font-bold text-slate-900 mt-1">₹{totalEarnings}.00</p>
                <span className="text-teal-700 mt-0.5 block">Online + Hospital Fees</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="text-slate-500">Online Telehealth</span>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  ₹{appointments.filter(a => a.appointment_type === 'online').reduce((s, a) => s + a.consultation_fee, 0)}.00
                </p>
                <span className="text-sky-700 mt-0.5 block">Zoom Consultations</span>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="text-slate-500">In-Person Hospital</span>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  ₹{appointments.filter(a => a.appointment_type === 'offline').reduce((s, a) => s + a.consultation_fee, 0)}.00
                </p>
                <span className="text-teal-700 mt-0.5 block">Clinical Visits</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: PATIENT REVIEWS */}
        {activeTab === 'reviews' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Verified Patient Feedback &amp; Ratings
            </h2>

            {reviews.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">No feedback records found.</p>
            ) : (
              <div className="space-y-3">
                {reviews.map(r => (
                  <div key={r.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{r.patient_name}</span>
                      <div className="flex items-center gap-1 text-amber-500 font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-400" />
                        <span>{r.rating} / 5</span>
                      </div>
                    </div>
                    <p className="text-slate-700 italic">"{r.review_text}"</p>
                    <span className="text-[10px] text-slate-400 block">{new Date(r.created_at).toLocaleDateString('en-GB')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL: DECLINE APPOINTMENT */}
      {declineModalApt && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <X className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Decline Appointment Request
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {declineModalApt.appointment_id} · {declineModalApt.patient_name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeclineModalApt(null)}
                className="text-slate-400 hover:text-slate-700 text-xs font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteDecline} className="space-y-4 text-xs">
              <p className="text-slate-600">
                Please specify the reason for declining this appointment. The patient will be notified immediately.
              </p>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Decline Reason *
                </label>
                <select
                  value={declineReasonPreset}
                  onChange={e => setDeclineReasonPreset(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Emergency Surgery / OT Duty">Emergency Surgery / Operation Theatre Duty</option>
                  <option value="Doctor Unavailable / Sick Leave">Doctor Unavailable / Medical Leave</option>
                  <option value="Time Slot Conflict with Hospital Duty">Time Slot Conflict with Hospital Rounds</option>
                  <option value="Specialty Mismatch">Specialty Mismatch / Recommend Different Department</option>
                  <option value="Other">Other (Custom Reason)</option>
                </select>
              </div>

              {declineReasonPreset === 'Other' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Custom Reason *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={declineCustomReason}
                    onChange={e => setDeclineCustomReason(e.target.value)}
                    placeholder="Enter reason for patient notification..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              )}

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setDeclineModalApt(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Keep Appointment
                </button>
                <button
                  type="submit"
                  disabled={isDecliningSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                >
                  {isDecliningSubmitting ? 'Declining...' : 'Confirm Decline & Cancel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW FULL PATIENT HEALTH & APPOINTMENT DETAILS */}
      {detailModalApt && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-8">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Patient Medical Case Profile</span>
                  <span className="text-xs font-mono font-medium text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                    {detailModalApt.appointment_id}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Scheduled for {detailModalApt.appointment_date} at {detailModalApt.appointment_time}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalApt(null)}
                className="text-slate-400 hover:text-slate-700 text-xs font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 block">Patient Name</span>
                  <span className="font-bold text-slate-900 text-sm">{detailModalApt.patient_name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Age &amp; Gender</span>
                  <span className="font-medium text-slate-800">{detailModalApt.patient_age || 30} Y / {detailModalApt.patient_gender || 'Male'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Consultation Type</span>
                  <span className="font-semibold text-slate-900 capitalize">{detailModalApt.appointment_type}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Status</span>
                  <span className="font-bold text-teal-700">{detailModalApt.status}</span>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-700 block mb-1">Chief Health Complaint:</span>
                <p className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800">
                  {detailModalApt.main_health_issue || 'General Medical Evaluation'}
                </p>
              </div>

              {detailModalApt.symptoms && (
                <div>
                  <span className="text-[11px] font-bold text-slate-700 block mb-1">Reported Symptoms:</span>
                  <p className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
                    {detailModalApt.symptoms}
                  </p>
                </div>
              )}

              {detailModalApt.problem_description && (
                <div>
                  <span className="text-[11px] font-bold text-slate-700 block mb-1">Detailed Description:</span>
                  <p className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
                    {detailModalApt.problem_description}
                  </p>
                </div>
              )}

              {detailModalApt.medical_history && (
                <div>
                  <span className="text-[11px] font-bold text-slate-700 block mb-1">Past Medical History:</span>
                  <p className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
                    {detailModalApt.medical_history}
                  </p>
                </div>
              )}

              {detailModalApt.current_medications && (
                <div>
                  <span className="text-[11px] font-bold text-slate-700 block mb-1">Current Medications:</span>
                  <p className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
                    {detailModalApt.current_medications}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              {detailModalApt.status === 'Confirmed' && (
                <button
                  type="button"
                  onClick={() => {
                    const target = detailModalApt;
                    setDetailModalApt(null);
                    handleAcceptAppointment(target);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Accept This Appointment</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setDetailModalApt(null)}
                className="ml-auto px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BLOCK TIME SLOTS OR DAYS */}
      {isBlockModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 my-8">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <Ban className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Block Slot / Mark Doctor Leave
                  </h3>
                  <p className="text-xs text-slate-500">
                    Prevent patients from booking during this timeframe
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBlockModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-xs font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteBlock} className="space-y-4 text-xs">
              {/* Blocking Scope Selector */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Blocking Scope
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBlockScope('single')}
                    className={`p-2.5 rounded-lg border text-left transition-colors ${
                      blockScope === 'single'
                        ? 'border-rose-500 bg-rose-50/70 text-rose-900 font-semibold ring-1 ring-rose-400'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="block font-bold">Single Time Slot</span>
                    <span className="text-[10px] text-slate-500 block">e.g. 10:00 AM on date</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBlockScope('all_day')}
                    className={`p-2.5 rounded-lg border text-left transition-colors ${
                      blockScope === 'all_day'
                        ? 'border-rose-500 bg-rose-50/70 text-rose-900 font-semibold ring-1 ring-rose-400'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="block font-bold">Entire Day</span>
                    <span className="text-[10px] text-slate-500 block">Mark full date as leave</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBlockScope('batch')}
                    disabled={selectedSlotsForBatch.length === 0}
                    className={`p-2.5 rounded-lg border text-left transition-colors ${
                      blockScope === 'batch'
                        ? 'border-rose-500 bg-rose-50/70 text-rose-900 font-semibold ring-1 ring-rose-400'
                        : selectedSlotsForBatch.length === 0
                        ? 'opacity-50 border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="block font-bold">Batch Selected Slots</span>
                    <span className="text-[10px] text-slate-500 block">
                      {selectedSlotsForBatch.length > 0 ? `${selectedSlotsForBatch.length} slots picked` : 'Pick slots from grid'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBlockScope('range')}
                    className={`p-2.5 rounded-lg border text-left transition-colors ${
                      blockScope === 'range'
                        ? 'border-rose-500 bg-rose-50/70 text-rose-900 font-semibold ring-1 ring-rose-400'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="block font-bold">Date Range (Leave)</span>
                    <span className="text-[10px] text-slate-500 block">Multiple consecutive days</span>
                  </button>
                </div>
              </div>

              {/* Date & Slot Inputs based on scope */}
              {blockScope === 'range' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Start Date *</label>
                    <input
                      type="date"
                      required
                      value={rangeStartDate}
                      onChange={e => setRangeStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">End Date *</label>
                    <input
                      type="date"
                      required
                      value={rangeEndDate}
                      onChange={e => setRangeEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Target Date *</label>
                    <input
                      type="date"
                      required
                      value={modalTargetDate}
                      onChange={e => setModalTargetDate(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                    />
                  </div>

                  {blockScope === 'single' && (
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Time Slot *</label>
                      <select
                        value={modalTargetSlot}
                        onChange={e => setModalTargetSlot(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                      >
                        {[
                          '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM',
                          '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
                          '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM',
                          '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM'
                        ].map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {blockScope === 'batch' && (
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Selected Slots</label>
                      <p className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-800 font-semibold truncate">
                        {selectedSlotsForBatch.join(', ')}
                      </p>
                    </div>
                  )}

                  {blockScope === 'all_day' && (
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Time Interval</label>
                      <p className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 font-bold">
                        Full Working Day (All Slots)
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Reason Presets */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reason for Blocking / Leave *
                </label>
                <select
                  value={blockReason}
                  onChange={e => setBlockReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Hospital Surgery / OT">Emergency Surgery / Operation Theatre (OT)</option>
                  <option value="Hospital Ward Rounds / IPD">Hospital Inpatient Ward Rounds &amp; IPD Duty</option>
                  <option value="Medical Conference / Seminar">Medical Conference / CME Seminar</option>
                  <option value="Personal Emergency / Leave">Personal Emergency / Family Leave</option>
                  <option value="Lunch & Midday Break">Lunch &amp; Midday Clinical Break</option>
                  <option value="Travel / Out of Station">Travel / Out of Station</option>
                  <option value="Sick Leave / Rest">Sick Leave / Health Rest</option>
                  <option value="Administrative Meeting">Hospital Faculty &amp; Administrative Meeting</option>
                  <option value="Other">Other (Specify Custom Reason)</option>
                </select>
              </div>

              {blockReason === 'Other' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Custom Reason Details *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Attending off-site medical workshop"
                    value={customReason}
                    onChange={e => setCustomReason(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              )}

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 space-y-1">
                <p className="font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Real-Time Patient Protection:</span>
                </p>
                <p>
                  Blocked slots are removed from the booking calendar immediately. Patients browsing SmartCare will see these slots marked as unavailable.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsBlockModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBlockingSubmitting}
                  className="px-6 py-2.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isBlockingSubmitting ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Block...</span>
                    </>
                  ) : (
                    <>
                      <Ban className="w-3.5 h-3.5" />
                      <span>Confirm &amp; Block Slot(s)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL CLINICAL CONSULTATION & DIGITAL PRESCRIPTION BUILDER MODAL */}
      {activeConsultApt && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 my-8">
            <div className="flex items-start justify-between pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span>Clinical Consultation &amp; Digital Prescription</span>
                  <span className="text-xs text-teal-800 bg-teal-50 px-2 py-0.5 rounded font-mono font-medium">
                    {activeConsultApt.appointment_id}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Patient: <strong className="text-slate-800">{activeConsultApt.patient_name}</strong> ({activeConsultApt.patient_age || 30} Y / {activeConsultApt.patient_gender || 'Male'})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveConsultApt(null)}
                className="text-slate-400 hover:text-slate-700 text-xs font-semibold"
              >
                Close ✕
              </button>
            </div>

            <form onSubmit={handleSaveConsultation} className="space-y-6">
              {/* Clinical Assessment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Diagnosis *</label>
                  <input
                    type="text"
                    required
                    value={diagnosis}
                    onChange={e => setDiagnosis(e.target.value)}
                    placeholder="e.g. Acute Allergic Contact Dermatitis"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Follow-Up Date</label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={e => setFollowUpDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Clinical Findings &amp; Examination</label>
                  <textarea
                    rows={2}
                    value={findings}
                    onChange={e => setFindings(e.target.value)}
                    placeholder="Observations, vital signs, physical exam notes..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Treatment &amp; Dietary Advice</label>
                  <textarea
                    rows={2}
                    value={treatmentInstructions}
                    onChange={e => setTreatmentInstructions(e.target.value)}
                    placeholder="Instructions for patient, hydration, resting, caution..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Digital Prescription Medicines Table */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="text-teal-700 font-serif font-bold text-base">Rx</span>
                    <span>Prescribed Medications</span>
                  </h4>
                  <button
                    type="button"
                    onClick={handleAddMedicineRow}
                    className="px-3 py-1 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Medicine</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {medicines.map((m, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs items-center">
                      <div className="sm:col-span-4">
                        <label className="text-[10px] text-slate-500 block mb-0.5">Medicine Name *</label>
                        <input
                          type="text"
                          required
                          value={m.medicine_name}
                          onChange={e => handleMedicineChange(idx, 'medicine_name', e.target.value)}
                          placeholder="e.g. Paracetamol 650mg"
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[10px] text-slate-500 block mb-0.5">Strength</label>
                        <input
                          type="text"
                          value={m.strength}
                          onChange={e => handleMedicineChange(idx, 'strength', e.target.value)}
                          placeholder="e.g. 500 mg"
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[10px] text-slate-500 block mb-0.5">Dosage</label>
                        <input
                          type="text"
                          value={m.dosage}
                          onChange={e => handleMedicineChange(idx, 'dosage', e.target.value)}
                          placeholder="1 tablet"
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[10px] text-slate-500 block mb-0.5">Frequency</label>
                        <input
                          type="text"
                          value={m.frequency}
                          onChange={e => handleMedicineChange(idx, 'frequency', e.target.value)}
                          placeholder="2 times / day"
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <label className="text-[10px] text-slate-500 block mb-0.5">Days</label>
                        <input
                          type="number"
                          value={m.duration_days}
                          onChange={e => handleMedicineChange(idx, 'duration_days', parseInt(e.target.value, 10))}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                      <div className="sm:col-span-1 flex items-end justify-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveMedicineRow(idx)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 rounded"
                          title="Remove Row"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="sm:col-span-6 mt-1">
                        <input
                          type="text"
                          value={m.timing}
                          onChange={e => handleMedicineChange(idx, 'timing', e.target.value)}
                          placeholder="Timing: Morning and Night after food"
                          className="w-full px-2.5 py-1 border border-slate-200 rounded text-[11px] bg-white"
                        />
                      </div>
                      <div className="sm:col-span-6 mt-1">
                        <input
                          type="text"
                          value={m.instructions}
                          onChange={e => handleMedicineChange(idx, 'instructions', e.target.value)}
                          placeholder="Special instructions: Take with water, avoid dairy"
                          className="w-full px-2.5 py-1 border border-slate-200 rounded text-[11px] bg-white"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveConsultApt(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingConsult}
                  className="px-6 py-2.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                >
                  {isSubmittingConsult ? 'Generating Official Prescription...' : 'Complete Consultation & Issue Digital Rx'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
