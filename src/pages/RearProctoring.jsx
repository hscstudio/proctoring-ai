import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Webcam from 'react-webcam';
import NoSleep from 'nosleep.js';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

import {
  ShieldCheck,
  AlertCircle,
  Users,
  Zap,
  Loader2,
  CameraOff
} from 'lucide-react';

const RearProctoring = () => {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('userId') || 'Peserta';

  const webcamRef = useRef(null);
  const modelRef = useRef(null);
  const noSleep = useRef(new NoSleep());

  // Logic Refs (Backend timing)
  const multiPersonStart = useRef(null);
  const lastSeenPerson = useRef(null);

  // State Management
  const [isLoaded, setIsLoaded] = useState(false);
  const [personCount, setPersonCount] = useState(0);
  const [isSafe, setIsSafe] = useState(true);
  const [noSleepEnabled, setNoSleepEnabled] = useState(false);
  const [isFirstLockDone, setIsFirstLockDone] = useState(false);

  const enableNoSleep = () => {
    noSleep.current.enable();
    setNoSleepEnabled(true);
  };

  /* ===============================
     1. INITIALIZE AI (COCO-SSD)
  =============================== */
  useEffect(() => {
    const loadModel = async () => {
      try {
        await tf.ready();
        modelRef.current = await cocoSsd.load({
          base: 'lite_mobilenet_v2', 
        });
        setIsLoaded(true);
      } catch (err) {
        console.error("Gagal load AI:", err);
      }
    };
    loadModel();
    return () => noSleep.current.disable();
  }, []);

  /* ===============================
     2. DETECTION LOOP
  =============================== */
  useEffect(() => {
    if (!isLoaded) return;

    const interval = setInterval(async () => {
      const video = webcamRef.current?.video;
      if (!video || video.readyState !== 4) return;

      const predictions = await modelRef.current.detect(video);
      
      // Filter 'person' dengan threshold sensitif (0.2)
      const persons = predictions.filter(p => p.class === 'person' && p.score > 0.2);
      const count = persons.length;
      setPersonCount(count);

      const now = Date.now();

      // KASUS A: TERDETEKSI 1 ORANG (NORMAL)
      if (count === 1) {
        lastSeenPerson.current = now;
        multiPersonStart.current = null;
        setIsSafe(true);
        if (!isFirstLockDone) setIsFirstLockDone(true);
      } 
      // KASUS B: TERDETEKSI > 1 ORANG (PELANGGARAN)
      else if (count > 1) {
        if (!multiPersonStart.current) multiPersonStart.current = now;
        if (now - multiPersonStart.current > 2000) { // Toleransi 2 detik saja untuk kerumunan
          setIsSafe(false);
        }
      } 
      // KASUS C: 0 ORANG (KOSONG/SEMBUNYI)
      else {
        if (!isFirstLockDone) {
          // Masih mencari orang untuk pertama kali
          setIsSafe(true);
        } else {
          // Sudah pernah lock, hitung masa toleransi sebelum berubah merah
          const gap = now - (lastSeenPerson.current || now);
          if (gap > 4000) { // Jeda 4 detik sebelum alarm merah
            setIsSafe(false);
          } else {
            setIsSafe(true); // Masih dalam masa tunggu (layar tetap hijau)
          }
        }
        multiPersonStart.current = null;
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isLoaded, isFirstLockDone]);

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-700 ${isSafe ? 'bg-slate-950' : 'bg-red-950'}`}>
      
      {/* LOADING */}
      {!isLoaded && (
        <div className="fixed inset-0 z-[60] bg-slate-950 flex flex-col items-center justify-center text-white p-10 text-center">
          <Loader2 size={40} className="animate-spin text-indigo-500 mb-4" />
          <h2 className="text-xl font-black mb-2 tracking-tighter uppercase italic">Preparing AI</h2>
        </div>
      )}

      {/* ACTIVATION */}
      {isLoaded && !noSleepEnabled && (
        <div className="fixed inset-0 z-50 bg-indigo-600 flex flex-col items-center justify-center p-8 text-center">
          <Zap size={60} className="text-white mb-6 animate-pulse" />
          <h2 className="text-white text-3xl font-black mb-2 uppercase italic tracking-tighter">Proctor Cam</h2>
          <p className="text-indigo-100 mb-8 text-sm opacity-80 leading-relaxed max-w-xs">
            Pastikan kamera menghadap ke arah Anda dari samping/belakang.
          </p>
          <button
            onClick={enableNoSleep}
            className="bg-white text-indigo-600 font-black px-12 py-4 rounded-2xl shadow-2xl active:scale-95 transition-all uppercase tracking-widest text-xs"
          >
            Mulai Sinkronisasi
          </button>
        </div>
      )}

      {/* HEADER */}
      <div className="p-4 flex justify-between items-center bg-black/40 backdrop-blur-md border-b border-white/5">
        <div className="flex flex-col">
          <span className="text-slate-500 text-[8px] uppercase font-black tracking-widest mb-1">Status Node</span>
          <h1 className="text-white font-black text-lg leading-none italic uppercase">Rear-Shield</h1>
        </div>

        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-500 ${
            isSafe ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-red-500 border-red-400 text-white animate-pulse'
          }`}
        >
          {isSafe ? <ShieldCheck size={12} /> : <AlertCircle size={12} />}
          <span className="text-[10px] font-black uppercase tracking-tight">
            {isSafe ? 'Monitoring' : 'Alert'}
          </span>
        </div>
      </div>

      {/* CAMERA VIEWPORT */}
      <div className="flex-1 flex flex-col justify-center p-6">
        <div className={`relative aspect-[3/4] w-full max-w-sm mx-auto rounded-[3rem] overflow-hidden border-2 shadow-2xl transition-all duration-700 ${
            isSafe ? 'border-slate-800 shadow-black' : 'border-red-500 shadow-red-900/40 scale-[1.02]'
          }`}
        >
          <Webcam
            ref={webcamRef}
            audio={false}
            videoConstraints={{ facingMode: 'environment' }}
            className="w-full h-full object-cover grayscale-[30%]"
          />

          <div className="absolute top-6 left-6 bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
            <p className="text-white text-[9px] font-black tracking-widest italic opacity-80 uppercase">ID: {userId}</p>
          </div>

          <div className={`absolute top-6 right-6 w-3 h-3 rounded-full shadow-lg ${
              personCount > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`}
          />
        </div>
      </div>

      {/* DASHBOARD STATUS */}
      <div className="p-6 bg-black/40 grid grid-cols-2 gap-4 border-t border-white/5">
        <div className={`p-4 rounded-3xl border transition-all duration-500 ${isSafe ? 'bg-white/5 border-white/5' : 'bg-red-500/20 border-red-500/50'}`}>
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Users size={14} />
            <span className="text-[9px] font-black uppercase tracking-widest italic">Presence</span>
          </div>
          <span className={`text-sm font-black transition-all ${isSafe ? 'text-emerald-400' : 'text-red-400'}`}>
            {/* LOGIKA TEXT DINAMIS */}
            {personCount > 0 && `${personCount} Person`}
            {personCount === 0 && !isFirstLockDone && "Searching..."}
            {personCount === 0 && isFirstLockDone && isSafe && "0 Person (Waiting)"}
            {personCount === 0 && isFirstLockDone && !isSafe && "0 Person (Missing)"}
          </span>
        </div>

        <div className="bg-white/5 p-4 rounded-3xl border border-white/5 flex flex-col justify-center">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Zap size={14} />
            <span className="text-[9px] font-black uppercase tracking-widest italic">System</span>
          </div>
          <span className="text-sm font-black text-emerald-400 uppercase tracking-tighter italic">Secured</span>
        </div>
      </div>
      
      <p className="text-[8px] text-center text-slate-700 pb-8 px-12 uppercase font-black tracking-widest opacity-30 italic">
        Keep your body within the camera frame at all times.
      </p>
    </div>
  );
};

export default RearProctoring;