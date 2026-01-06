import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import NoSleep from 'nosleep.js';
import { ShieldCheck, AlertCircle, Users, Laptop, Zap, ZapOff } from 'lucide-react';

const MODEL_URL = import.meta.env.BASE_URL + 'models';

const RearProctoring = () => {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('userId') || "Peserta";
  const webcamRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [detections, setDetections] = useState([]);
  const [noSleepEnabled, setNoSleepEnabled] = useState(false);
  
  // Inisialisasi NoSleep
  const noSleep = useRef(new NoSleep());

  // Handler untuk mengaktifkan NoSleep (Harus via interaksi user)
  const enableNoSleep = () => {
    noSleep.current.enable();
    setNoSleepEnabled(true);
  };

  useEffect(() => {
    const loadModels = async () => {
      // TinyFaceDetector sangat ringan untuk HP & bisa deteksi kepala meski tak liat kamera
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      setIsLoaded(true);
    };
    loadModels();

    // Cleanup saat komponen unmount
    return () => {
      noSleep.current.disable();
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const interval = setInterval(async () => {
      if (webcamRef.current?.video?.readyState === 4) {
        const video = webcamRef.current.video;
        // Score threshold rendah agar deteksi kepala dari samping tetap kena
        const results = await faceapi.detectAllFaces(
          video,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.3 })
        );
        setDetections(results);
      }
    }, 600); // 1.5 FPS cukup agar HP tidak panas/lemot
    return () => clearInterval(interval);
  }, [isLoaded]);

  const personCount = detections.length;
  const isSafe = personCount === 1;

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-500 ${isSafe ? 'bg-slate-950' : 'bg-red-950'}`}>
      
      {/* OVERLAY AKTIVASI NOSLEEP */}
      {!noSleepEnabled && (
        <div className="fixed inset-0 z-50 bg-indigo-600 flex flex-col items-center justify-center p-8 text-center">
          <Zap size={60} className="text-white mb-6 animate-pulse" />
          <h2 className="text-white text-2xl font-black mb-2">SIAP MONITORING?</h2>
          <p className="text-indigo-100 mb-8 text-sm">Klik tombol di bawah untuk mencegah HP mati (Auto-Lock) selama ujian berlangsung.</p>
          <button 
            onClick={enableNoSleep}
            className="bg-white text-indigo-600 font-black px-10 py-4 rounded-2xl shadow-xl active:scale-95 transition-all"
          >
            AKTIFKAN SENSOR
          </button>
        </div>
      )}

      {/* COMPACT HEADER */}
      <div className="p-4 flex justify-between items-center bg-black/20 backdrop-blur-sm">
        <div className="flex flex-col">
          <span className="text-slate-500 text-[8px] uppercase font-black tracking-widest">Live Monitor</span>
          <h1 className="text-white font-black text-lg leading-none">REAR-CAM</h1>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${isSafe ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-red-500 text-white animate-pulse'}`}>
          {isSafe ? <ShieldCheck size={12}/> : <AlertCircle size={12}/>}
          <span className="text-[10px] font-black uppercase">{isSafe ? "Safe" : "Warning"}</span>
        </div>
      </div>

      {/* WEBCAM VIEW (Lebih Fokus) */}
      <div className="flex-1 flex flex-col justify-center p-4">
        <div className={`relative aspect-[3/4] w-full max-w-sm mx-auto rounded-[2.5rem] overflow-hidden border-2 shadow-2xl ${isSafe ? 'border-slate-800' : 'border-red-500'}`}>
          <Webcam 
            ref={webcamRef} 
            audio={false} 
            videoConstraints={{ facingMode: "environment" }}
            className="w-full h-full object-cover" 
          />
          
          {/* Status Label Overlay */}
          <div className="absolute top-4 left-4 bg-black/40 backdrop-blur-sm px-3 py-1 rounded-lg">
             <p className="text-white text-[9px] font-bold">USER: {userId}</p>
          </div>

          {/* Indicator Dot */}
          <div className={`absolute top-4 right-4 w-2 h-2 rounded-full ${isSafe ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
        </div>
      </div>

      {/* COMPACT BOTTOM STATUS */}
      <div className="p-4 bg-black/30 grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white/5 p-3 rounded-xl border border-white/5">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <Users size={14}/>
            <span className="text-[9px] font-bold uppercase">Person</span>
          </div>
          <span className={`text-sm font-black ${isSafe ? 'text-emerald-400' : 'text-white'}`}>{personCount} Terdeteksi</span>
        </div>

        <div className="bg-white/5 p-3 rounded-xl border border-white/5">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
            <Zap size={14}/>
            <span className="text-[9px] font-bold uppercase">Stay Awake</span>
          </div>
          <span className="text-sm font-black text-emerald-400">AKTIF</span>
        </div>
      </div>

      <p className="text-[8px] text-center text-slate-600 pb-6 px-10 uppercase tracking-widest font-bold">
        Sistem ini mendeteksi keberadaan fisik peserta di area ujian secara berkala.
      </p>
    </div>
  );
};

export default RearProctoring;