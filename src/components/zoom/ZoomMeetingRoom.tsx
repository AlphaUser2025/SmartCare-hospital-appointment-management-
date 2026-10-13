import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Appointment } from '../../types';
import {
  Video, VideoOff, Mic, MicOff, MessageSquare, FileText,
  User, CheckCircle2, PhoneOff, Share2, Sparkles, AlertCircle
} from 'lucide-react';

interface ZoomProps {
  appointmentId: number;
  onNavigate: (tab: string, extra?: any) => void;
}

export const ZoomMeetingRoom: React.FC<ZoomProps> = ({ appointmentId, onNavigate }) => {
  const { user } = useAuth();
  const [apt, setApt] = useState<Appointment | null>(null);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [activeSideTab, setActiveSideTab] = useState<'notes' | 'chat'>('notes');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; text: string; time: string }>>([
    { sender: 'System', text: 'Encrypted Zoom Teleconsultation Session Initialized.', time: '10:30 AM' }
  ]);
  const [newMsg, setNewMsg] = useState('');
  const [doctorNotes, setDoctorNotes] = useState('');
  const [meetingStatus, setMeetingStatus] = useState<'scheduled' | 'started' | 'completed'>('started');

  useEffect(() => {
    fetch(`/api/appointments/${appointmentId}`)
      .then(r => r.json())
      .then(data => {
        setApt(data);
      })
      .catch(console.error);
  }, [appointmentId]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages(prev => [...prev, { sender: user?.fullName || 'User', text: newMsg, time }]);
    setNewMsg('');
  };

  const handleCompleteConsultation = async () => {
    if (!apt) return;
    try {
      await fetch(`/api/appointments/${apt.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Completed' })
      });
      setMeetingStatus('completed');
    } catch (e) {
      console.error(e);
    }
  };

  if (!apt) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center text-xs">
        Loading Zoom Consultation Room...
      </div>
    );
  }

  const isDoctor = user?.role === 'doctor';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-sky-600 flex items-center justify-center text-white">
            <Video className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
              <span>Zoom Teleconsultation</span>
              <span className="text-[10px] text-sky-400 bg-sky-950 px-2 py-0.5 rounded border border-sky-800 font-mono">
                {apt.appointment_id}
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">
              Dr. {apt.doctor_name} · Patient: {apt.patient_name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Encrypted Room</span>
          </div>

          {isDoctor && meetingStatus !== 'completed' && (
            <button
              onClick={() => onNavigate('doctor-dashboard', { openConsultationId: apt.id })}
              className="px-3 py-1.5 text-xs font-semibold text-teal-400 bg-teal-950/80 border border-teal-800 rounded-lg hover:bg-teal-900 transition-colors flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Issue Prescription</span>
            </button>
          )}

          <button
            onClick={() => onNavigate(isDoctor ? 'doctor-dashboard' : 'patient-dashboard')}
            className="px-3 py-1.5 text-xs font-semibold text-rose-300 bg-rose-950/80 border border-rose-900 rounded-lg hover:bg-rose-900 transition-colors flex items-center gap-1.5"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span>Leave Room</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left / Center Video Stage */}
        <div className="lg:col-span-8 p-4 flex flex-col justify-between bg-slate-900/60 relative">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            {/* Doctor Video Feed Tile */}
            <div className="relative aspect-video sm:aspect-auto sm:h-full bg-slate-800 rounded-2xl overflow-hidden border border-slate-700/60 flex flex-col items-center justify-center p-4">
              <div className="w-16 h-16 rounded-full bg-sky-900/60 border border-sky-600/40 flex items-center justify-center text-sky-300 text-lg font-bold mb-2">
                DR
              </div>
              <p className="text-xs font-bold text-slate-200">Dr. {apt.doctor_name}</p>
              <p className="text-[11px] text-slate-400">{apt.department_name}</p>
              <div className="absolute bottom-3 left-3 bg-slate-900/80 px-2 py-0.5 rounded text-[10px] text-slate-300">
                Host / Consultant
              </div>
            </div>

            {/* Patient Video Feed Tile */}
            <div className="relative aspect-video sm:aspect-auto sm:h-full bg-slate-800 rounded-2xl overflow-hidden border border-slate-700/60 flex flex-col items-center justify-center p-4">
              {isVideoOn ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-teal-900/60 border border-teal-600/40 flex items-center justify-center text-teal-300 text-lg font-bold mb-2">
                    PT
                  </div>
                  <p className="text-xs font-bold text-slate-200">{apt.patient_name}</p>
                  <p className="text-[11px] text-slate-400">Patient Feed Active</p>
                </>
              ) : (
                <div className="text-center text-slate-500 text-xs">
                  <VideoOff className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Video is Paused</p>
                </div>
              )}
              <div className="absolute bottom-3 left-3 bg-slate-900/80 px-2 py-0.5 rounded text-[10px] text-slate-300">
                Patient (You)
              </div>
            </div>
          </div>

          {/* Bottom Video Controls Toolbar */}
          <div className="h-16 mt-4 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-center gap-3 px-4">
            <button
              onClick={() => setIsAudioOn(!isAudioOn)}
              className={`p-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${isAudioOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-rose-900 text-rose-200'}`}
            >
              {isAudioOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              <span className="hidden sm:inline">{isAudioOn ? 'Mute' : 'Unmute'}</span>
            </button>

            <button
              onClick={() => setIsVideoOn(!isVideoOn)}
              className={`p-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${isVideoOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-rose-900 text-rose-200'}`}
            >
              {isVideoOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
              <span className="hidden sm:inline">{isVideoOn ? 'Stop Video' : 'Start Video'}</span>
            </button>

            <button
              onClick={() => setActiveSideTab(activeSideTab === 'chat' ? 'notes' : 'chat')}
              className="p-2.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700 text-xs font-semibold flex items-center gap-1.5"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">In-Call Chat</span>
            </button>

            {isDoctor && (
              <button
                onClick={handleCompleteConsultation}
                className="p-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark Completed</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Sidebar: Medical Notes / In-Call Chat */}
        <div className="lg:col-span-4 bg-slate-900 border-l border-slate-800 flex flex-col h-full">
          <div className="flex border-b border-slate-800">
            <button
              onClick={() => setActiveSideTab('notes')}
              className={`flex-1 py-3 text-xs font-semibold text-center border-b-2 transition-colors ${activeSideTab === 'notes' ? 'border-sky-500 text-sky-400 bg-slate-800/50' : 'border-transparent text-slate-400 hover:text-white'}`}
            >
              Clinical Details
            </button>
            <button
              onClick={() => setActiveSideTab('chat')}
              className={`flex-1 py-3 text-xs font-semibold text-center border-b-2 transition-colors ${activeSideTab === 'chat' ? 'border-sky-500 text-sky-400 bg-slate-800/50' : 'border-transparent text-slate-400 hover:text-white'}`}
            >
              Live Chat
            </button>
          </div>

          {activeSideTab === 'notes' ? (
            <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60 space-y-1.5">
                <p className="font-bold text-white text-xs">Reported Chief Complaints:</p>
                <p className="text-slate-300 leading-relaxed">{apt.main_health_issue || 'General routine consultation'}</p>
                {apt.symptoms && (
                  <p className="text-[11px] text-slate-400 pt-1">Symptoms: {apt.symptoms}</p>
                )}
              </div>

              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60 space-y-1.5">
                <p className="font-bold text-white text-xs">Patient Details:</p>
                <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-300">
                  <div>Age: {apt.patient_age || 30} Y</div>
                  <div>Gender: {apt.patient_gender || 'Male'}</div>
                  <div>Blood Group: {apt.patient_blood_group || 'O+'}</div>
                  <div>Contact: {apt.patient_phone || '+91 98765 43210'}</div>
                </div>
              </div>

              {isDoctor ? (
                <div className="space-y-2">
                  <label className="block font-bold text-white text-xs">Consultation Clinical Notes:</label>
                  <textarea
                    rows={4}
                    value={doctorNotes}
                    onChange={e => setDoctorNotes(e.target.value)}
                    placeholder="Record real-time diagnosis, vital signs, recommendations..."
                    className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:ring-1 focus:ring-sky-500"
                  />
                  <button
                    onClick={() => onNavigate('doctor-dashboard', { openConsultationId: apt.id })}
                    className="w-full py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold"
                  >
                    Open Digital Prescription Builder
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-sky-950/60 border border-sky-800/80 rounded-xl text-sky-200 text-xs">
                  <p className="font-bold">Telemedicine Notice:</p>
                  <p className="text-[11px] mt-1 text-sky-300/80 leading-relaxed">
                    The doctor will examine and issue an authenticated digital prescription upon conclusion of the call.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col h-full p-3">
              <div className="flex-1 overflow-y-auto space-y-2 mb-2 pr-1">
                {chatMessages.map((m, idx) => (
                  <div key={idx} className="bg-slate-800/80 p-2 rounded-lg text-xs">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                      <span className="font-bold text-sky-300">{m.sender}</span>
                      <span>{m.time}</span>
                    </div>
                    <p className="text-slate-200 text-xs">{m.text}</p>
                  </div>
                ))}
              </div>
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={newMsg}
                  onChange={e => setNewMsg(e.target.value)}
                  placeholder="Type message..."
                  className="flex-1 px-3 py-1.5 text-xs bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold"
                >
                  Send
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
