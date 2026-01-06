import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Webcam from 'react-webcam';
import NoSleep from 'nosleep.js';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { ShieldCheck, AlertCircle, Users, Zap, Loader2, RefreshCw, Smartphone } from 'lucide-react';

const RearProctoring = () => {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('userId') || 'Peserta';

  const webcamRef = useRef(null);
  const modelRef = useRef(null);
  const noSleep = useRef(new NoSleep());
  const multiPersonStart = useRef(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [personCount, setPersonCount] = useState(0);
  const [isSafe, setIsSafe] = useState(true);
  const [noSleepEnabled, setNoSleepEnabled] = useState(false);
  const [facingMode, setFacingMode] = useState("environment");

  // 1. Inisialisasi Backend yang Benar (Cegah Crash)
  useEffect(() => {
    const initAI = async () => {
      try {
        await tf.ready();
        // Gunakan backend 'wasm' atau 'webgl' secara otomatis
        modelRef.current = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
        setIsLoaded(true);
      } catch (err) {
        console.error("AI Load Error:", err);
      }
    };
    initAI();

    return () => {
      noSleep.current.disable();
      // Penting: Bersihkan memori AI saat HP ditutup
      tf.disposeVariables(); 
    };
  }, []);

  // 2. Loop Deteksi yang Lebih Irit Baterai
  useEffect(() => {
    if (!isLoaded) return;
    
    const detect = async () => {
      const video = webcamRef.current?.video;
      if (video?.readyState === 4) {
        const predictions = await modelRef.current.detect(video);
        const persons = predictions.filter(p => p.class === 'person' && p.score > 0.4);
        setPersonCount(persons.length);

        // Logika Pelanggaran: Jika lebih dari 1 orang terdeteksi selama 2 detik
        if (persons.length > 1) {
          if (!multiPersonStart.current) multiPersonStart.current = Date.now();
          if (Date.now() - multiPersonStart.current > 2000) setIsSafe(false);
        } else {
          multiPersonStart.current = null;
          setIsSafe(true);
        }
      }
    };

    // Gunakan interval yang tidak terlalu rapat (800ms) agar HP tidak panas
    const interval = setInterval(detect, 800);
    return () => clearInterval(interval);
  }, [isLoaded]);

  const enableNoSleep = () => {
    noSleep.current.enable();
    setNoSleepEnabled(true);
  };

  return (
    <div className={`h-screen flex flex-col transition-colors duration-700 ${isSafe ? 'bg-slate-950' : 'bg-red-900'}`}>
      
      {!isLoaded && (
        <div className="fixed inset-0 z-[60] bg-slate-950 flex flex-col items-center justify-center text-white p-10">
          <Loader2 size={40} className="animate-spin text-indigo-500 mb-4" />
          <h2 className="text-xl font-black italic tracking-tighter">BOOTING AI GUARD...</h2>
        </div>
      )}

      {!noSleepEnabled && isLoaded && (
        <div className="fixed inset-0 z-50 bg-indigo-600 flex flex-col items-center justify-center p-8 text-center text-white">
          <Smartphone size={64} className="mb-6 animate-bounce" />
          <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-2">Sync Completed</h2>
          <p className="text-indigo-100 text-sm mb-8 opacity-80">Letakkan HP di samping belakang Anda untuk pengawasan sudut lebar.</p>
          <button onClick={enableNoSleep} className="bg-white text-indigo-600 font-black px-12 py-5 rounded-[2rem] shadow-2xl active:scale-95 transition-all text-lg">
            AKTIFKAN SENSOR
          </button>
        </div>
      )}

      {/* COMPACT HUD FOR MOBILE */}
      <div className="p-4 flex justify-between items-center bg-black/40 backdrop-blur-md border-b border-white/5">
        <div className="flex flex-col">
          <span className="text-slate-500 text-[8px] uppercase font-black tracking-widest">Node ID</span>
          <h1 className="text-white font-black text-sm italic uppercase">{userId}</h1>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${isSafe ? 'border-emerald-500/50 text-emerald-400' : 'bg-red-500 text-white animate-pulse'}`}>
          {isSafe ? <ShieldCheck size={12} /> : <AlertCircle size={12} />}
          <span className="text-[10px] font-black uppercase">{isSafe ? 'Active' : 'Warning'}</span>
        </div>
      </div>

      {/* CAMERA VIEW */}
      <div className="flex-1 relative flex items-center justify-center p-4">
        <div className="relative w-full aspect-[3/4] rounded-[2.5rem] overflow-hidden border-2 border-white/10 shadow-2xl bg-black">
          <Webcam
            ref={webcamRef}
            audio={false}
            videoConstraints={{ facingMode: facingMode }}
            className="w-full h-full object-cover grayscale-[0.3]"
          />
          <button 
            onClick={() => setFacingMode(p => p === "user" ? "environment" : "user")}
            className="absolute top-4 right-4 bg-black/50 p-3 rounded-2xl text-white backdrop-blur-md"
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {/* DASHBOARD MINI */}
      <div className="p-6 grid grid-cols-2 gap-3 bg-black/40">
        <div className="bg-white/5 p-4 rounded-3xl border border-white/5">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Detection</p>
          <p className={`text-xl font-black ${isSafe ? 'text-white' : 'text-red-500'}`}>{personCount} <span className="text-xs opacity-50">Pers.</span></p>
        </div>
        <div className="bg-white/5 p-4 rounded-3xl border border-white/5">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Battery Save</p>
          <div className="flex items-center gap-2 text-emerald-400">
            <Zap size={14} /> <span className="text-xs font-black uppercase">Optimized</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RearProctoring;