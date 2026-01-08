import React, { useEffect, useRef, useState } from 'react';
import { Room, RoomEvent } from 'livekit-client';
import { Users, Video, ShieldAlert, Activity, Loader2, Wifi } from 'lucide-react';

const LIVEKIT_URL = 'ws://127.0.0.1:7880';
const BACKEND_URL = 'http://127.0.0.1:5050';

const AdminProctoring = () => {
  const [participants, setParticipants] = useState([]); 
  const [isConnecting, setIsConnecting] = useState(true);
  const roomRef = useRef(null);

  useEffect(() => {
    // Mencegah inisialisasi ganda
    if (roomRef.current) return;

    const initMonitor = async () => {
      try {
        // 1. Ambil token khusus Admin
        const res = await fetch(`${BACKEND_URL}/get-token?roomName=exam-room&participantName=ADMIN_DASHBOARD_${Math.floor(Math.random() * 100)}`);
        const { token } = await res.json();

        const room = new Room({
          adaptiveStream: true, // Hemat bandwidth, hanya tarik kualitas tinggi jika video besar
        });
        roomRef.current = room;

        // 2. Event: Saat ada video masuk
        room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
          if (track.kind === 'video') {
            updateParticipant(participant, track, true);
          }
        });

        // 3. Event: Saat peserta berhenti kirim video
        room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
          updateParticipant(participant, null, false);
        });

        // 4. Event: Saat peserta keluar ruangan
        room.on(RoomEvent.ParticipantDisconnected, (participant) => {
          setParticipants(prev => prev.filter(p => p.sid !== participant.sid));
        });

        // 5. Event: Menerima DATA Pelanggaran (dari AI HP Peserta)
        room.on(RoomEvent.DataReceived, (payload, participant) => {
          const decoder = new TextDecoder();
          const data = JSON.parse(decoder.decode(payload));
          if (data.type === 'VIOLATION') {
            triggerAlert(participant.identity);
          }
        });

        await room.connect(LIVEKIT_URL, token);
        setIsConnecting(false);
      } catch (error) {
        console.error("Gagal koneksi admin:", error);
        setIsConnecting(false);
      }
    };

    // Helper untuk update list peserta di state
    const updateParticipant = (participant, track, isAdding) => {
      setParticipants(prev => {
        const existing = prev.find(p => p.sid === participant.sid);
        if (isAdding) {
          if (existing) return prev.map(p => p.sid === participant.sid ? { ...p, track } : p);
          return [...prev, { sid: participant.sid, identity: participant.identity, track, isAlert: false }];
        } else {
          return prev.filter(p => p.sid !== participant.sid);
        }
      });
    };

    const triggerAlert = (identity) => {
      setParticipants(prev => prev.map(p => 
        p.identity === identity ? { ...p, isAlert: true } : p
      ));
      // Reset alert setelah 3 detik
      setTimeout(() => {
        setParticipants(prev => prev.map(p => 
          p.identity === identity ? { ...p, isAlert: false } : p
        ));
      }, 3000);
    };

    initMonitor();

    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white font-sans">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter flex items-center gap-3">
            <Activity className="text-indigo-500 animate-pulse" /> Command Center
          </h1>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em]">Integrated Proctoring System v1.0</p>
        </div>
        
        <div className="flex gap-4">
          <div className="bg-white/5 px-6 py-3 rounded-[2rem] border border-white/5 flex items-center gap-4 backdrop-blur-md">
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active Nodes</p>
              <p className="text-2xl font-black italic leading-none">{participants.length}</p>
            </div>
            <Users className="text-indigo-400" size={28} />
          </div>
        </div>
      </header>

      {/* GRID VIEW */}
      {isConnecting ? (
        <div className="h-[60vh] flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-indigo-500 mb-4" size={48} />
          <p className="font-black uppercase italic tracking-widest animate-pulse">Establishing Secure Uplink...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {participants.map((p) => (
            <VideoCard 
              key={p.sid} 
              track={p.track} 
              identity={p.identity} 
              isAlert={p.isAlert} 
            />
          ))}

          {participants.length === 0 && (
            <div className="col-span-full h-80 border-2 border-dashed border-white/5 rounded-[3.5rem] flex flex-col items-center justify-center text-slate-700 bg-white/[0.01]">
              <Video size={64} className="mb-4 opacity-10" />
              <p className="font-black uppercase tracking-[0.3em] text-xs italic">No participants detected in network</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// SUB-KOMPONEN VIDEO CARD
const VideoCard = ({ track, identity, isAlert }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && track) {
      track.attach(videoRef.current);
    }
    return () => {
      if (track) track.detach();
    };
  }, [track]);

  return (
    <div className={`transition-all duration-500 rounded-[2.5rem] overflow-hidden border-2 relative group shadow-2xl ${
      isAlert ? 'border-red-500 shadow-red-500/20 scale-[1.02]' : 'border-white/5 bg-slate-900'
    }`}>
      {/* Badge Pelanggaran */}
      {isAlert && (
        <div className="absolute inset-0 bg-red-600/20 z-10 pointer-events-none animate-pulse" />
      )}

      <video 
        ref={videoRef} 
        className="w-full aspect-[3/4] object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all duration-700" 
        autoPlay 
        playsInline 
      />
      
      {/* Overlay Info */}
      <div className="absolute top-5 left-5 right-5 flex justify-between items-start z-20">
        <div className="bg-black/70 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/10">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Node Identity</p>
          <p className="text-xs font-black uppercase italic tracking-tight">{identity}</p>
        </div>
        
        <div className={`p-2.5 rounded-xl shadow-xl transition-colors duration-300 ${
          isAlert ? 'bg-red-500 animate-bounce' : 'bg-indigo-500'
        }`}>
          {isAlert ? <ShieldAlert size={16} className="text-white" /> : <Wifi size={16} className="text-white" />}
        </div>
      </div>

      {/* Footer Card */}
      <div className="absolute bottom-0 inset-x-0 p-5 bg-gradient-to-t from-black via-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
        <div className="flex gap-2">
          <button className="flex-1 bg-white text-black py-3 rounded-2xl font-black text-[10px] uppercase tracking-tighter hover:bg-indigo-400 transition-colors">
            View Detail
          </button>
          <button className="px-4 bg-red-500/20 border border-red-500/50 rounded-2xl text-red-500">
            <ShieldAlert size={16} />
          </button>
        </div>
      </div>

      {/* Indikator Alert Teks */}
      {isAlert && (
        <div className="absolute bottom-20 inset-x-0 text-center z-20">
          <span className="bg-red-600 text-white px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] animate-bounce shadow-2xl">
            Multi-Person Detected
          </span>
        </div>
      )}
    </div>
  );
};

export default AdminProctoring;