import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from '@vladmandic/face-api'; // Library baru
import Webcam from 'react-webcam';
import { QRCodeSVG } from 'qrcode.react';
import { 
  ShieldCheck, LogOut, ScanFace, RefreshCw, AlertCircle, 
  CheckCircle2, UserCircle, Smartphone, Camera, Loader2
} from 'lucide-react';

const MODEL_URL = import.meta.env.BASE_URL + 'models';

const FaceVerification = ({ onVerified, onLogout }) => {
  const webcamRef = useRef(null);
  const [user] = useState(() => {
    const loggedInUser = sessionStorage.getItem('loggedInUser');
    return loggedInUser ? JSON.parse(loggedInUser) : null;
  });

  const [status, setStatus] = useState('Menginisialisasi AI...');
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [hasScannedQR, setHasScannedQR] = useState(false);
  const [facingMode, setFacingMode] = useState("user");

  const toggleCamera = () => {
    setFacingMode(prev => (prev === "user" ? "environment" : "user"));
  };

  const generateQRLink = () => {
    const fullPath = window.location.origin + window.location.pathname;
    return `${fullPath}#/rear-proctoring?userId=${user?.id || 'peserta'}`;
  };

  // 1. Load Models dengan cara yang lebih bersih
  useEffect(() => {
    let isMounted = true;

    const loadModels = async () => {
      try {
        // Inisialisasi backend agar sinkron dengan TFJS global
        setStatus('Sinkronisasi Engine...');
        await faceapi.tf.ready(); 
        
        // Load model secara paralel
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);

        if (isMounted) {
          setIsModelsLoaded(true);
          setStatus('Sistem Siap.');
        }
      } catch (err) {
        console.error("AI Load Error:", err);
        if (isMounted) setStatus('Gagal memuat AI.');
      }
    };

    loadModels();
    return () => { isMounted = false; };
  }, []);

  // 2. Logika Verifikasi yang Stabil
  const handleVerify = async () => {
    if (!isModelsLoaded || isVerifying || !hasScannedQR) return;
    
    const video = webcamRef.current?.video;
    if (!video || video.readyState !== 4) {
      setStatus('Kamera belum siap...');
      return;
    }

    setIsVerifying(true);
    setStatus('Menganalisis wajah...');

    try {
      const refImg = await faceapi.fetchImage(user.photo);
      
      // Deteksi Referensi & Webcam
      const [refDetection, webDetection] = await Promise.all([
        faceapi.detectSingleFace(refImg).withFaceLandmarks().withFaceDescriptor(),
        faceapi.detectSingleFace(video).withFaceLandmarks().withFaceDescriptor()
      ]);

      if (!refDetection || !webDetection) {
        setStatus(!refDetection ? 'Foto profil tidak valid.' : 'Wajah tidak terdeteksi!');
        setIsVerifying(false);
        return;
      }

      const distance = faceapi.euclideanDistance(refDetection.descriptor, webDetection.descriptor);
      
      // Threshold 0.55 (Aman & Akurat)
      if (distance < 0.55) {
        setStatus('Verifikasi Berhasil!');
        setTimeout(() => onVerified(), 1000);
      } else {
        setStatus('Wajah tidak cocok!');
        setIsVerifying(false);
      }
    } catch (error) {
      setStatus('Kesalahan teknis.');
      setIsVerifying(false);
      console.error("Verification System Error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="w-full bg-indigo-600 shadow-lg px-6 py-4 flex justify-between items-center text-white">
        <div className="flex items-center gap-4">
          <div className="bg-white/20 p-2 rounded-xl"><UserCircle size={24} /></div>
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold opacity-70">Identity Check</p>
            <p className="text-lg font-black tracking-tight leading-none italic">{user?.name || 'User'}</p>
          </div>
        </div>
        <button onClick={onLogout} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl flex items-center gap-2 font-bold transition-all border border-white/20 text-xs uppercase">
          <LogOut size={16} /><span>Keluar</span>
        </button>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row items-center justify-center p-6 gap-8 max-w-6xl mx-auto w-full">
        
        {/* PANEL QR */}
        <div className="w-full lg:w-1/3">
          <div className={`bg-white p-8 rounded-[2.5rem] shadow-xl border-2 transition-all ${hasScannedQR ? 'border-emerald-500' : 'border-slate-100'}`}>
            <div className="text-center mb-6">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 ${hasScannedQR ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white'}`}>
                {hasScannedQR ? <CheckCircle2 size={24}/> : <Smartphone size={24} />}
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tighter uppercase italic">1. Sinkron HP</h3>
              <p className="text-slate-400 text-[10px] font-bold mt-2 leading-relaxed px-4 uppercase tracking-widest">Scan QR untuk mengaktifkan proctoring.</p>
            </div>
            <div className="relative group p-4 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 flex justify-center items-center">
              <QRCodeSVG value={generateQRLink()} size={180} className={hasScannedQR ? 'opacity-10 grayscale' : ''} />
              {hasScannedQR && <div className="absolute inset-0 flex flex-col items-center justify-center text-emerald-600 font-black text-[10px] uppercase tracking-widest"><ShieldCheck size={48} className="mb-2" />Connected</div>}
            </div>
            <button onClick={() => setHasScannedQR(!hasScannedQR)} className={`w-full mt-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${hasScannedQR ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-900 text-white'}`}>
              {hasScannedQR ? 'Reset' : 'Sudah Scan'}
            </button>
          </div>
        </div>

        {/* PANEL WEBCAM */}
        <div className="w-full lg:w-2/3 space-y-6 flex flex-col items-center">
          <div className="w-full relative aspect-video rounded-[3rem] overflow-hidden bg-slate-900 shadow-2xl border-8 border-white ring-1 ring-slate-100">
            <Webcam ref={webcamRef} mirrored={facingMode === "user"} videoConstraints={{ facingMode: facingMode }} className="w-full h-full object-cover" />
            {hasScannedQR && !isVerifying && (
              <button onClick={toggleCamera} className="absolute top-6 right-6 z-40 bg-black/40 p-3 rounded-2xl border border-white/20 text-white transition-all active:rotate-180"><RefreshCw size={20} /></button>
            )}
            {isVerifying && <div className="absolute inset-0 z-20 pointer-events-none"><div className="w-full h-1.5 bg-indigo-500 shadow-[0_0_30px_#6366f1] animate-scan-line relative"></div></div>}
            {!hasScannedQR && <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md z-30 flex flex-col items-center justify-center text-white text-center"><AlertCircle size={44} className="text-indigo-400 mb-4 animate-pulse" /><h4 className="text-xl font-black mb-1 uppercase tracking-tighter italic">Langkah 1 Belum Selesai</h4></div>}
          </div>

          <div className="w-full max-w-md space-y-4 text-center">
            <div className="inline-flex items-center gap-3 font-black uppercase tracking-widest py-3 px-8 rounded-2xl border bg-white text-slate-400 border-slate-200 shadow-sm">
              {isVerifying ? <Loader2 className="animate-spin text-indigo-600" size={16} /> : <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping"/>}
              <span className="text-[10px]">{status}</span>
            </div>
            <button onClick={handleVerify} disabled={isVerifying || !hasScannedQR || !isModelsLoaded} className={`w-full py-5 rounded-[2.5rem] font-black text-xl flex items-center justify-center gap-4 transition-all shadow-2xl active:scale-[0.97] ${!hasScannedQR || isVerifying || !isModelsLoaded ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'}`}>
              <ScanFace size={32} /> <span className="italic uppercase tracking-tighter">{isVerifying ? 'Wait...' : 'Verify Wajah'}</span>
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes scan { 0% { top: 0; opacity: 0; } 50% { opacity: 1; } 100% { top: 100%; opacity: 0; } } .animate-scan-line { animation: scan 1.8s ease-in-out infinite; }`}</style>
    </div>
  );
};

export default FaceVerification;