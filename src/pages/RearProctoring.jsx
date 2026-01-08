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

// KONFIGURASI: 127.0.0.1 lebih stabil untuk Docker Local
const BACKEND_URL = 'http://127.0.0.1:5050';
const LIVEKIT_URL = 'ws://127.0.0.1:7880';

const RearProctoring = () => {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('userId') || `User_${Date.now().toString().slice(-4)}`;

  const webcamRef = useRef(null);
  const modelRef = useRef(null);
  const roomRef = useRef(null);
  const connectingRef = useRef(false); // Untuk mencegah double init (Strict Mode)
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
      // 1. Jika sudah ada koneksi, jangan lakukan apa-apa
      if (roomRef.current && roomRef.current.state === 'connected') {
        setIsLoaded(true);
        setIsConnected(true);
        return;
      }

      // 2. Cegah double-proses di saat yang bersamaan
      if (connectingRef.current) return;
      connectingRef.current = true;

      try {
        console.log("🚀 Memulai Inisialisasi...");
        
        // A. Load AI Model (hanya jika belum ada)
        if (!modelRef.current) {
          await tf.ready();
          modelRef.current = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
          console.log("✅ AI Model Loaded.");
        }

        // B. Ambil Token
        console.log("📡 Mengambil token...");
        const response = await fetch(`${BACKEND_URL}/get-token?roomName=exam-room&participantName=${userId}`);
        if (!response.ok) throw new Error("Gagal mengambil token.");
        const { token } = await response.json();

        // C. Setup & Connect LiveKit
        if (!roomRef.current) {
          const room = new Room({
            adaptiveStream: true,
            publishDefaults: { videoCodec: 'h264' },
          });
          roomRef.current = room;
        }

        console.log("🔗 Menghubungkan ke LiveKit Server...");
        await roomRef.current.connect(LIVEKIT_URL, token);
        
        console.log("✅ Terhubung ke LiveKit.");
        setIsConnected(true);
        setIsLoaded(true); // INI YANG AKAN MENGHILANGKAN LOADING SCREEN

      } catch (err) {
        console.error("❌ Error Inisialisasi:", err);
        setErrorMsg(err.message);
      } finally {
        connectingRef.current = false;
      }
    };

    initSystem();

    return () => {
      // JANGAN disconnect di sini saat development agar tidak putus-nyambung.
      // Cukup disconnect saat window ditutup atau navigasi manual.
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

        // Logika Pelanggaran
        if (persons.length > 1) {
          if (!multiPersonStart.current) multiPersonStart.current = Date.now();
          if (Date.now() - multiPersonStart.current > 2000) setIsSafe(false);
        } else {
          multiPersonStart.current = null;
          setIsSafe(true);
        }

        // Publish Video jika terkoneksi
        if (isConnected && roomRef.current) {
          const lp = roomRef.current.localParticipant;
          if (!lp.isCameraEnabled) {
            console.log("📸 Memulai publish video...");
            await lp.setCameraEnabled(true);
          }
          
          // Kirim data pelanggaran jika terdeteksi
          if (!isSafe) {
            const encoder = new TextEncoder();
            const data = encoder.encode(JSON.stringify({ type: 'VIOLATION', user: userId }));
            lp.publishData(data, { reliable: true });
          }
        }
      }
    };

    const interval = setInterval(detectAndStream, 1000);
    return () => clearInterval(interval);
  }, [isLoaded, isConnected, noSleepEnabled, isSafe, userId]);

  const handleStart = () => {
    noSleep.current.enable();
    setNoSleepEnabled(true);
  };

  if (errorMsg) return (
    <div className="h-screen bg-red-950 flex flex-col items-center justify-center p-10 text-white text-center">
      <ShieldAlert size={64} className="mb-4 text-red-500" />
      <h1 className="text-2xl font-black mb-2 uppercase italic tracking-tighter">Connection Failed</h1>
      <p className="text-red-200 text-xs mb-8 opacity-70">Error: {errorMsg}</p>
      <button onClick={() => window.location.reload()} className="bg-white text-red-900 px-10 py-4 rounded-3xl font-black uppercase italic text-sm shadow-2xl">Retry System</button>
    </div>
  );

  return (
    <div className={`h-screen flex flex-col transition-colors duration-700 font-sans ${isSafe ? 'bg-slate-950' : 'bg-red-900'}`}>
      
      {!isLoaded && (
        <div className="fixed inset-0 z-[60] bg-slate-950 flex flex-col items-center justify-center text-white p-10">
          <Loader2 size={40} className="animate-spin text-indigo-500 mb-4" />
          <h2 className="text-xl font-black italic tracking-tighter uppercase">Initializing Nodes...</h2>
        </div>
      )}

      {!noSleepEnabled && isLoaded && (
        <div className="fixed inset-0 z-50 bg-indigo-600 flex flex-col items-center justify-center p-8 text-center text-white">
          <Smartphone size={64} className="mb-6 animate-bounce" />
          <h2 className="text-4xl font-black uppercase italic tracking-tighter mb-2 leading-none">Ready to Stream</h2>
          <p className="text-indigo-100 text-xs mb-10 opacity-70 tracking-widest uppercase font-bold font-mono">Status: Connected to Node 7880</p>
          <button onClick={handleStart} className="bg-white text-indigo-600 font-black px-12 py-5 rounded-[2.5rem] shadow-2xl active:scale-95 transition-all text-xl uppercase italic tracking-tighter">
            Mulai Pengawasan
          </button>
        </div>
      )}

      {/* HUD HEADER */}
      <div className="p-5 flex justify-between items-center bg-black/40 backdrop-blur-xl border-b border-white/5">
        <div className="flex flex-col">
          <span className="text-slate-500 text-[9px] uppercase font-black tracking-[0.2em] leading-none mb-1">Live Participant</span>
          <h1 className="text-white font-black text-base italic uppercase leading-none tracking-tight">{userId}</h1>
        </div>
        
        <div className="flex gap-2">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border ${isConnected ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400' : 'border-slate-700 text-slate-500'}`}>
            <Signal size={14} className={isConnected ? "animate-pulse" : ""} />
            <span className="text-[10px] font-black uppercase tracking-tighter">{isConnected ? 'Live' : 'Offline'}</span>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border ${isSafe ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'bg-red-500 text-white animate-pulse'}`}>
            {isSafe ? <ShieldCheck size={14} /> : <AlertCircle size={14} />}
            <span className="text-[10px] font-black uppercase">{isSafe ? 'Secure' : 'Alert'}</span>
          </div>
        </div>
      </div>

      {/* CAMERA VIEWPORT */}
      <div className="flex-1 relative flex items-center justify-center p-6">
        <div className="relative w-full aspect-[3/4] max-w-sm rounded-[3.5rem] overflow-hidden border-2 border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-black">
          <Webcam
            ref={webcamRef}
            audio={false}
            mirrored={facingMode === "user"}
            videoConstraints={{ facingMode: facingMode }}
            className="w-full h-full object-cover grayscale-[0.1] contrast-[1.1]"
          />
          <button 
            onClick={() => setFacingMode(p => p === "user" ? "environment" : "user")}
            className="absolute top-8 right-8 bg-black/40 p-4 rounded-3xl text-white backdrop-blur-xl border border-white/10 active:scale-90 transition-transform"
          >
            <RefreshCw size={24} />
          </button>
        </div>
      </div>

      {/* DASHBOARD INFO */}
      <div className="p-8 grid grid-cols-2 gap-4 bg-black/60 backdrop-blur-2xl border-t border-white/5 rounded-t-[3rem]">
        <div className="bg-white/5 p-5 rounded-[2rem] border border-white/5 shadow-inner">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Object Counter</p>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${personCount > 1 ? 'bg-red-500 animate-ping' : 'bg-indigo-500'}`} />
            <p className={`text-3xl font-black italic tracking-tighter ${isSafe ? 'text-white' : 'text-red-500'}`}>{personCount} <span className="text-xs opacity-30 not-italic uppercase tracking-normal font-bold">Person</span></p>
          </div>
        </div>
        <div className="bg-white/5 p-5 rounded-[2rem] border border-white/5 flex flex-col justify-center shadow-inner">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Stream Node</p>
          <div className="flex items-center gap-2 text-emerald-400">
            <Zap size={18} fill="currentColor" /> <span className="text-sm font-black uppercase tracking-tighter italic">Low-Lat Optimized</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RearProctoring;