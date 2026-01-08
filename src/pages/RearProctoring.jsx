import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Webcam from 'react-webcam';
import NoSleep from 'nosleep.js';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { Room, VideoPresets, RoomEvent } from 'livekit-client';
import { 
  ShieldCheck, AlertCircle, Users, Zap, Loader2, 
  RefreshCw, Smartphone, Signal, ShieldAlert 
} from 'lucide-react';

// KONFIGURASI: Ganti localhost ke IP Laptop jika diakses dari HP
const BACKEND_URL = 'http://localhost:5050';
const LIVEKIT_URL = 'ws://127.0.0.1:7880';

const RearProctoring = () => {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('userId') || 'Hafid' // `User_${Math.floor(Math.random() * 1000)}`;

  const webcamRef = useRef(null);
  const modelRef = useRef(null);
  const roomRef = useRef(null);
  const noSleep = useRef(new NoSleep());
  const multiPersonStart = useRef(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [personCount, setPersonCount] = useState(0);
  const [isSafe, setIsSafe] = useState(true);
  const [noSleepEnabled, setNoSleepEnabled] = useState(false);
  const [facingMode, setFacingMode] = useState("environment");
  const [errorMsg, setErrorMsg] = useState(null);

  // 1. Inisialisasi Sistem (AI + LiveKit)
  useEffect(() => {
    const initSystem = async () => {
      try {
        console.log("🚀 Memulai Inisialisasi...");
        
        // A. Load AI Model
        await tf.ready();
        modelRef.current = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
        console.log("✅ AI Model Loaded.");

        // B. Ambil Token dari Backend
        console.log("📡 Mengambil token dari backend...");
        const response = await fetch(`${BACKEND_URL}/get-token?roomName=exam-room&participantName=${userId}`);
        if (!response.ok) throw new Error("Gagal mengambil token dari backend. Pastikan Backend jalan di port 5000.");
        const { token } = await response.json();
        console.log("✅ Token didapat.");

        // C. Setup LiveKit Room
        const room = new Room({
          adaptiveStream: true,
          publishDefaults: { 
            videoSimulcast: true, 
            videoCodec: 'h264',
            videoEncoding: VideoPresets.h720.encoding 
          },
        });
        
        roomRef.current = room;

        // D. Connect ke LiveKit
        console.log("🔗 Menghubungkan ke LiveKit Server...");
        await room.connect(LIVEKIT_URL, token);
        console.log("✅ Terhubung ke LiveKit.");
        
        setIsConnected(true);
        setIsLoaded(true);

      } catch (err) {
        console.error("❌ Error Inisialisasi:", err);
        setErrorMsg(err.message);
      }
    };

    initSystem();

    return () => {
      noSleep.current.disable();
      roomRef.current?.disconnect();
      if (tf.disposeVariables) tf.disposeVariables(); 
    };
  }, [userId]);

  // 2. Loop Deteksi AI & Auto-Publish Video
  useEffect(() => {
    if (!isLoaded || !noSleepEnabled) return;
    
    const detectAndStream = async () => {
      const video = webcamRef.current?.video;
      if (video?.readyState === 4) {
        // Deteksi Orang
        const predictions = await modelRef.current.detect(video);
        const persons = predictions.filter(p => p.class === 'person' && p.score > 0.4);
        setPersonCount(persons.length);

        // Logika Pelanggaran (Lebih dari 1 orang > 2 detik)
        if (persons.length > 1) {
          if (!multiPersonStart.current) multiPersonStart.current = Date.now();
          if (Date.now() - multiPersonStart.current > 2000) setIsSafe(false);
        } else {
          multiPersonStart.current = null;
          setIsSafe(true);
        }

        // Auto-publish video jika belum aktif
        if (isConnected && roomRef.current) {
          const lp = roomRef.current.localParticipant;
          if (!lp.isCameraEnabled) {
            console.log("📸 Memulai publish video ke LiveKit...");
            await lp.setCameraEnabled(true);
          }
          
          // Kirim data pelanggaran ke dashboard via Data Channel
          if (!isSafe) {
            const encoder = new TextEncoder();
            const data = encoder.encode(JSON.stringify({ type: 'VIOLATION', user: userId }));
            lp.publishData(data, { reliable: true });
          }
        }
      }
    };

    const interval = setInterval(detectAndStream, 800);
    return () => clearInterval(interval);
  }, [isLoaded, isConnected, noSleepEnabled, isSafe, userId]);

  const handleStart = () => {
    noSleep.current.enable();
    setNoSleepEnabled(true);
  };

  // Tampilan Error
  if (errorMsg) return (
    <div className="h-screen bg-red-950 flex flex-col items-center justify-center p-10 text-white text-center">
      <ShieldAlert size={64} className="mb-4 text-red-500" />
      <h1 className="text-2xl font-black mb-2 uppercase">Connection Failed</h1>
      <p className="text-red-200 text-sm mb-6">{errorMsg}</p>
      <button onClick={() => window.location.reload()} className="bg-white text-red-900 px-8 py-3 rounded-full font-bold">Retry Connection</button>
    </div>
  );

  return (
    <div className={`h-screen flex flex-col transition-colors duration-700 font-sans ${isSafe ? 'bg-slate-950' : 'bg-red-900'}`}>
      
      {/* Loading Screen */}
      {!isLoaded && (
        <div className="fixed inset-0 z-[60] bg-slate-950 flex flex-col items-center justify-center text-white p-10">
          <Loader2 size={40} className="animate-spin text-indigo-500 mb-4" />
          <h2 className="text-xl font-black italic tracking-tighter uppercase">Initializing Stream...</h2>
          <p className="text-slate-500 text-[10px] mt-2 tracking-widest font-bold">CHECKING AI & SERVER NODES</p>
        </div>
      )}

      {/* Sync / Start Screen */}
      {!noSleepEnabled && isLoaded && (
        <div className="fixed inset-0 z-50 bg-indigo-600 flex flex-col items-center justify-center p-8 text-center text-white">
          <Smartphone size={64} className="mb-6 animate-bounce" />
          <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-2">Sync Success</h2>
          <p className="text-indigo-100 text-sm mb-8 opacity-80 leading-relaxed">Letakkan HP di sudut yang bisa melihat seluruh area kerja Anda.</p>
          <button onClick={handleStart} className="bg-white text-indigo-600 font-black px-12 py-5 rounded-3xl shadow-2xl active:scale-95 transition-all text-lg uppercase italic tracking-tighter">
            Aktifkan Kamera & Stream
          </button>
        </div>
      )}

      {/* HUD HEADER */}
      <div className="p-4 flex justify-between items-center bg-black/40 backdrop-blur-md border-b border-white/5">
        <div className="flex flex-col">
          <span className="text-slate-500 text-[8px] uppercase font-black tracking-widest leading-none mb-1">Live Node</span>
          <h1 className="text-white font-black text-sm italic uppercase leading-none">{userId}</h1>
        </div>
        
        <div className="flex gap-2">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${isConnected ? 'border-indigo-500/50 text-indigo-400' : 'border-slate-700 text-slate-500'}`}>
            <Signal size={12} className={isConnected ? "animate-pulse" : ""} />
            <span className="text-[10px] font-black uppercase tracking-tighter">{isConnected ? 'Live' : 'Offline'}</span>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${isSafe ? 'border-emerald-500/50 text-emerald-400' : 'bg-red-500 text-white animate-pulse'}`}>
            {isSafe ? <ShieldCheck size={12} /> : <AlertCircle size={12} />}
            <span className="text-[10px] font-black uppercase">{isSafe ? 'Secure' : 'Warning'}</span>
          </div>
        </div>
      </div>

      {/* VIEWPORT */}
      <div className="flex-1 relative flex items-center justify-center p-4">
        <div className="relative w-full aspect-[3/4] rounded-[2.5rem] overflow-hidden border-2 border-white/10 shadow-2xl bg-black">
          <Webcam
            ref={webcamRef}
            audio={false}
            mirrored={facingMode === "user"}
            videoConstraints={{ facingMode: facingMode }}
            className="w-full h-full object-cover grayscale-[0.2]"
          />
          <button 
            onClick={() => setFacingMode(p => p === "user" ? "environment" : "user")}
            className="absolute top-6 right-6 bg-black/50 p-4 rounded-2xl text-white backdrop-blur-md border border-white/10"
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {/* DASHBOARD MINI */}
      <div className="p-6 grid grid-cols-2 gap-4 bg-black/40">
        <div className="bg-white/5 p-4 rounded-3xl border border-white/5">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">AI Detection</p>
          <div className="flex items-center gap-2">
            <Users size={16} className={personCount > 1 ? "text-red-500" : "text-indigo-400"} />
            <p className={`text-2xl font-black italic ${isSafe ? 'text-white' : 'text-red-500'}`}>{personCount} <span className="text-[10px] opacity-40">Pers.</span></p>
          </div>
        </div>
        <div className="bg-white/5 p-4 rounded-3xl border border-white/5 flex flex-col justify-center">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Stream Info</p>
          <div className="flex items-center gap-2 text-emerald-400">
            <Zap size={14} /> <span className="text-[10px] font-black uppercase tracking-tighter italic">Low Latency</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RearProctoring;