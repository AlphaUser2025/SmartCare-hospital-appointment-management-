import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { HomePage } from './components/home/HomePage';
import { LoginPage } from './components/auth/LoginPage';
import { PatientRegister } from './components/auth/PatientRegister';
import { DoctorRegister } from './components/auth/DoctorRegister';
import { PharmacyRegister } from './components/auth/PharmacyRegister';
import { AppointmentBookingWizard } from './components/booking/AppointmentBookingWizard';
import { PatientDashboard } from './components/patient/PatientDashboard';
import { DoctorDashboard } from './components/doctor/DoctorDashboard';
import { PharmacyDashboard } from './components/pharmacy/PharmacyDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { ZoomMeetingRoom } from './components/zoom/ZoomMeetingRoom';
import { DoctorsListPage } from './components/doctors/DoctorsListPage';
import { DepartmentsDirectoryPage } from './components/departments/DepartmentsDirectoryPage';

function AppContent() {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [tabExtra, setTabExtra] = useState<any>(null);

  // When a doctor logs in or is authenticated, ensure they land directly on their Doctor Dashboard
  React.useEffect(() => {
    if (user?.role === 'doctor') {
      if (currentTab === 'home' || currentTab === 'book-appointment' || currentTab === 'doctors' || currentTab === 'departments') {
        setCurrentTab('doctor-dashboard');
      }
    }
  }, [user?.role, currentTab]);

  const handleNavigate = (tab: string, extra?: any) => {
    // Prevent doctor from accidentally opening patient appointment booking wizard or patient directory
    if (user?.role === 'doctor' && (tab === 'book-appointment' || tab === 'home' || tab === 'doctors' || tab === 'departments')) {
      setCurrentTab('doctor-dashboard');
      setTabExtra(extra || null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setCurrentTab(tab);
    setTabExtra(extra || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isFullscreenView = currentTab === 'zoom-consultation' || currentTab === 'admin-dashboard';

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {!isFullscreenView && (
        <Navbar currentTab={currentTab} onNavigate={handleNavigate} />
      )}

      <main className="flex-1">
        {currentTab === 'home' && (
          <HomePage onNavigate={handleNavigate} />
        )}

        {currentTab === 'login' && (
          <LoginPage onNavigate={handleNavigate} />
        )}

        {currentTab === 'register' && (
          <PatientRegister onNavigate={handleNavigate} />
        )}

        {currentTab === 'register-doctor' && (
          <DoctorRegister onNavigate={handleNavigate} />
        )}

        {currentTab === 'register-pharmacy' && (
          <PharmacyRegister onNavigate={handleNavigate} />
        )}

        {currentTab === 'book-appointment' && (
          <AppointmentBookingWizard
            initialDoctorId={tabExtra?.doctorId}
            initialDepartmentId={tabExtra?.departmentId}
            initialSymptom={tabExtra?.symptom}
            initialType={tabExtra?.defaultType}
            onNavigate={handleNavigate}
          />
        )}

        {currentTab === 'doctors' && (
          <DoctorsListPage onNavigate={handleNavigate} />
        )}

        {currentTab === 'departments' && (
          <DepartmentsDirectoryPage onNavigate={handleNavigate} />
        )}

        {currentTab === 'patient-dashboard' && (
          <PatientDashboard onNavigate={handleNavigate} defaultTab={tabExtra?.tab || 'overview'} />
        )}

        {currentTab === 'pharmacy-services' && (
          <PatientDashboard onNavigate={handleNavigate} defaultTab="upload-prescription" />
        )}

        {currentTab === 'doctor-dashboard' && (
          <DoctorDashboard
            onNavigate={handleNavigate}
            openConsultationId={tabExtra?.openConsultationId}
            initialTab={tabExtra?.tab}
          />
        )}

        {currentTab === 'pharmacy-dashboard' && (
          <PharmacyDashboard onNavigate={handleNavigate} />
        )}

        {currentTab === 'admin-dashboard' && (
          <AdminDashboard onNavigate={handleNavigate} />
        )}

        {currentTab === 'zoom-consultation' && tabExtra?.appointmentId && (
          <ZoomMeetingRoom
            appointmentId={tabExtra.appointmentId}
            onNavigate={handleNavigate}
          />
        )}
      </main>

      {!isFullscreenView && (
        <Footer onNavigate={handleNavigate} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
