import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, PatientProfile, Doctor, PharmacyProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: any | null;
  isLoading: boolean;
  login: (identifier: string, pass: string) => Promise<{ success: boolean; redirectUrl?: string; error?: string; pendingApproval?: boolean }>;
  logout: () => Promise<void>;
  switchUser: (role: 'patient' | 'doctor' | 'pharmacy' | 'admin') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check saved session
    const savedUser = localStorage.getItem('smartcare_user');
    const savedProfile = localStorage.getItem('smartcare_profile');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        if (savedProfile) {
          setProfile(JSON.parse(savedProfile));
        }
      } catch (e) {
        console.error('Session parse error', e);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (identifier: string, pass: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password: pass })
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: data.error || 'Login failed',
          pendingApproval: data.pendingApproval
        };
      }

      setUser(data.user);
      setProfile(data.profile);
      localStorage.setItem('smartcare_user', JSON.stringify(data.user));
      if (data.profile) {
        localStorage.setItem('smartcare_profile', JSON.stringify(data.profile));
      }

      return {
        success: true,
        redirectUrl: data.redirectUrl
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  };

  const logout = async () => {
    if (user) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, username: user.username })
        });
      } catch (e) {
        console.error('Logout error', e);
      }
    }
    setUser(null);
    setProfile(null);
    localStorage.removeItem('smartcare_user');
    localStorage.removeItem('smartcare_profile');
  };

  // Quick switch utility for instant evaluation & testing of the 4 roles
  const switchUser = async (role: 'patient' | 'doctor' | 'pharmacy' | 'admin') => {
    const creds: Record<string, { id: string; p: string }> = {
      admin: { id: 'admin@smartcare.com', p: 'admin123' },
      doctor: { id: 'dr.arun@smartcare.com', p: 'doctor123' },
      patient: { id: 'patient@smartcare.com', p: 'patient123' },
      pharmacy: { id: 'apollo@smartcare.com', p: 'pharmacy123' }
    };
    const c = creds[role];
    await login(c.id, c.p);
  };

  return (
    <AuthContext.Provider value={{ user, profile, isLoading, login, logout, switchUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
