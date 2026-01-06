import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import NoSleep from 'nosleep.js';
import { ShieldCheck, AlertCircle, Users, Zap, RefreshCw } from 'lucide-react';

const MODEL_URL = import.meta.env.BASE_URL + 'models';

const RearProctoring = () => {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('userId') || "Peserta";
  const webcamRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [detections, setDetections] = useState([]);
  const [noSleepEnabled, setNoSleepEnabled] = useState(false);
  
  // State untuk mode kamera (user = depan, environment = belakang)
  const [facingMode, setFacingMode] = useState("environment");

  const noSleep = useRef(new NoSleep());

  const enableNoSleep = () => {
    noSleep.current.enable();
    setNoSleepEnabled(true);
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === "user" ? "environment" : "user");
  };

  useEffect(() => {
    const loadModels = async () => {
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      setIsLoaded(true);
    };
    loadModels();
    return () => noSleep.current.disable();
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    const interval = setInterval(async () => {
      if (webcamRef.current?.video?.readyState === 4) {
        const video = webcamRef.current.video;
        const results = await faceapi.detectAllFaces(
          video,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.3 })
        );
        setDetections(results);
      }
    }, 600);
    return () => clearInterval(interval);
  }, [isLoaded]);

  const personCount = detections.length;
  const isSafe = personCount === 1;

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-500 ${isSafe ? 'bg-slate-950' : 'bg-red-950'}`}>
      
      {/* OVERLAY AKTIVASI */}
      {!noSleepEnabled && (
        <div className="fixed inset-0 z-50 bg-indigo-600 flex flex-col items-center justify-center p-8 text-center">
          <Zap size={60} className="text-white mb-6 animate-pulse" />
          <h2 className="text-white text-2xl font-black mb-2">SIAP MONITORING?</h2>
          <button 
            onClick={enableNoSleep}
            className="bg-white text-indigo-600 font-black px-10 py-4 rounded-2xl shadow-xl active:scale-95 transition-all mt-4"
          >
            AKTIFKAN SENSOR
          </button>
        </div>
      )}

      {/* COMPACT HEADER */}
      <div className="p-4 flex justify-between items-center bg-black/40 backdrop-blur-md border-b border-white/5">
        <div className="flex flex-col">
          <span className="text-slate-500 text-[8px] uppercase font-black tracking-widest leading-none mb-1">Live Monitor</span>
          <h1 className="text-white font-black text-lg leading-none">REAR-PROCTOR</h1>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${isSafe ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-red-500 text-white animate-pulse'}`}>
          {isSafe ? <ShieldCheck size={12}/> : <AlertCircle size={12}/>}
          <span className="text-[10px] font-black uppercase">{isSafe ? "Safe" : "Warning"}</span>
        </div>
      </div>

      {/* WEBCAM VIEW */}
      <div className="flex-1 flex flex-col justify-center p-6">
        <div className={`relative aspect-[3/4] w-full max-w-sm mx-auto rounded-[2.5rem] overflow-hidden border-2 shadow-2xl transition-all ${isSafe ? 'border-slate-800' : 'border-red-500 scale-[1.02]'}`}>
          <Webcam 
            ref={webcamRef} 
            audio={false} 
            screenshotFormat="image/jpeg"
            videoConstraints={{ facingMode: facingMode }}
            className="w-full h-full object-cover" 
          />
          
          {/* TOMBOL GANTI KAMERA (Floating) */}
          <button 
            onClick={toggleCamera}
            className="absolute top-4 right-4 z-30 bg-black/50 backdrop-blur-md p-3 rounded-2xl border border-white/20 text-white active:rotate-180 transition-all duration-500 shadow-lg"
          >
            <RefreshCw size={18} />
          </button>

          {/* User ID Tag */}
          <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10">
             <p className="text-white text-[9px] font-bold tracking-tight">ID: {userId}</p>
          </div>
        </div>
      </div>

      {/* STATUS FOOTER */}
      <div className="p-6 bg-black/40 grid grid-cols-2 gap-4 border-t border-white/5">
        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Users size={14}/>
            <span className="text-[9px] font-black uppercase tracking-widest">Presence</span>
          </div>
          <span className={`text-sm font-black ${isSafe ? 'text-emerald-400' : 'text-white'}`}>{personCount} Person</span>
        </div>

        <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Zap size={14}/>
            <span className="text-[9px] font-black uppercase tracking-widest">Awake Mode</span>
          </div>
          <span className="text-sm font-black text-emerald-400">ACTIVE</span>
        </div>
      </div>
    </div>
  );
};

export default RearProctoring;