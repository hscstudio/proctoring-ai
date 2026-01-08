import React, { useEffect, useState } from 'react';
import { Room, RoomEvent } from 'livekit-client';
import { Users, Video, ShieldAlert, Activity } from 'lucide-react';

const LIVEKIT_URL = 'ws://127.0.0.1:7880'; // Ganti ke IP Server jika beda perangkat
const BACKEND_URL = 'http://localhost:5050';

const AdminProctoring = () => {
  const [tracks, setTracks] = useState([]); // Menyimpan stream video peserta

  useEffect(() => {
    const initMonitor = async () => {
      // 1. Ambil token khusus Admin (Identity: 'admin_dashboard')
      const res = await fetch(`${BACKEND_URL}/get-token?roomName=exam-room&participantName=Hafid`);
      const { token } = await res.json();

      const room = new Room();
      
      // 2. Event: Saat ada peserta yang publish video
      room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        if (track.kind === 'video') {
          setTracks((prev) => [...prev, { track, participant }]);
        }
      });

      // 3. Event: Saat peserta keluar (unpublish)
      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        setTracks((prev) => prev.filter((t) => t.track !== track));
      });

      await room.connect(LIVEKIT_URL, token);
    };

    initMonitor();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-white">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black italic uppercase tracking-tighter flex items-center gap-3">
            <Activity className="text-indigo-500" /> Command Center
          </h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.3em]">Real-time Rear Proctoring Feed</p>
        </div>
        <div className="bg-white/5 px-6 py-3 rounded-2xl border border-white/10 flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-500 uppercase">Total Nodes</p>
            <p className="text-xl font-black">{tracks.length}</p>
          </div>
          <Users className="text-indigo-400" size={24} />
        </div>
      </header>

      {/* GRID VIDEO PESERTA */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {tracks.map(({ track, participant }) => (
          <VideoCard key={participant.identity} track={track} identity={participant.identity} />
        ))}

        {tracks.length === 0 && (
          <div className="col-span-full h-64 border-2 border-dashed border-white/5 rounded-[3rem] flex flex-col items-center justify-center text-slate-600">
            <Video size={48} className="mb-4 opacity-20" />
            <p className="font-black uppercase tracking-widest text-sm italic">Waiting for participants...</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Sub-komponen untuk merender video individu
const VideoCard = ({ track, identity }) => {
  const videoRef = React.useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      track.attach(videoRef.current);
    }
  }, [track]);

  return (
    <div className="bg-slate-900 rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl relative group">
      <video ref={videoRef} className="w-full aspect-[3/4] object-cover" autoPlay playsInline />
      
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
        <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
          <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Participant</p>
          <p className="text-xs font-black uppercase italic">{identity}</p>
        </div>
        <div className="bg-emerald-500 p-2 rounded-lg shadow-lg shadow-emerald-500/20">
          <ShieldAlert size={14} className="text-white" />
        </div>
      </div>

      <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="w-full bg-indigo-600 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest">
          Inspect Node
        </button>
      </div>
    </div>
  );
};

export default AdminProctoring;