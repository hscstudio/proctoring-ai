import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';
import Webcam from 'react-webcam';
import { QRCodeSVG } from 'qrcode.react'; // Pastikan sudah install qrcode.react
import { 
  ShieldCheck, LogOut, ScanFace, RefreshCw, AlertCircle, 
  CheckCircle2, UserCircle, Camera, Smartphone, ChevronRight 
} from 'lucide-react';

const MODEL_URL = import.meta.env.BASE_URL + 'models';

const FaceVerification = ({ onVerified, onLogout }) => {
  const webcamRef = useRef(null);
  
  const [user] = useState(() => {
    const loggedInUser = sessionStorage.getItem('loggedInUser');
    return loggedInUser ? JSON.parse(loggedInUser) : null;
  });

  const [status, setStatus] = useState('Memulai Sistem AI...');
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  
  // State baru untuk kunci koneksi HP
  const [hasScannedQR, setHasScannedQR] = useState(false);

  const generateQRLink = () => {
    // window.location.origin = https://hscstudio.github.io
    // window.location.pathname = /proctoring-ai/
    const fullPath = window.location.origin + window.location.pathname;
    return `${fullPath}#/rear-proctoring?userId=${user?.id || 'peserta'}`;
  };

  // Generate link dinamis untuk QR Code (Mendukung HashRouter GitHub Pages)
  const qrLink = generateQRLink(); //`${window.location.origin}${window.location.pathname}#/rear-proctoring?userId=${user?.id || 'user'}`;

  useEffect(() => {
    const loadModels = async () => {
      try {
        // const MODEL_URL = window.location.origin + '/models';
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setIsModelsLoaded(true);
        setStatus('Sistem Siap. Silakan hubungkan kamera sekunder.');
      } catch (err) {
        setStatus('Gagal memuat model AI.');
        console.log(err);
      }
    };
    loadModels();
  }, []);

  const handleVerify = async () => {
    if (!isModelsLoaded || isVerifying || !hasScannedQR) return;
    setIsVerifying(true);
    setStatus('Sedang membandingkan wajah...');

    try {
      const refImg = await faceapi.fetchImage(user.photo);
      const refDetection = await faceapi.detectSingleFace(refImg).withFaceLandmarks().withFaceDescriptor();
      
      const video = webcamRef.current.video;
      const webDetection = await faceapi.detectSingleFace(video).withFaceLandmarks().withFaceDescriptor();

      if (!refDetection || !webDetection) {
        setStatus(!refDetection ? 'Foto referensi tidak terbaca.' : 'Wajah tidak terdeteksi!');
        setIsVerifying(false);
        return;
      }

      const distance = faceapi.euclideanDistance(refDetection.descriptor, webDetection.descriptor);
      if (distance < 0.6) {
        setStatus('Verifikasi Berhasil!');
        setTimeout(() => onVerified(), 1500);
      } else {
        setStatus('Wajah tidak cocok!');
        setIsVerifying(false);
      }
    } catch (error) {
      setStatus('Terjadi kesalahan teknis.');
      setIsVerifying(false);
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* HEADER */}
      <header className="w-full bg-indigo-600 shadow-lg px-6 py-4 flex justify-between items-center text-white">
        <div className="flex items-center gap-4">
          <div className="bg-white/20 p-2 rounded-xl"><UserCircle size={24} /></div>
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold opacity-80">Verifikasi Identitas</p>
            <p className="text-lg font-black tracking-tight leading-none">{user?.name || 'User'}</p>
          </div>
        </div>
        <button onClick={onLogout} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl flex items-center gap-2 font-bold transition-all border border-white/20">
          <LogOut size={18} /><span>Keluar</span>
        </button>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row items-center justify-center p-6 gap-8 max-w-6xl mx-auto w-full">
        
        {/* PANEL KIRI: QR CODE & INSTRUKSI */}
        <div className="w-full lg:w-1/3 space-y-6">
          <div className={`bg-white p-8 rounded-[2.5rem] shadow-xl border-2 transition-all ${hasScannedQR ? 'border-emerald-500 shadow-emerald-100' : 'border-slate-100'}`}>
            <div className="text-center mb-6">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 ${hasScannedQR ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white'}`}>
                {hasScannedQR ? <CheckCircle2 size={24}/> : <Smartphone size={24} />}
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Kamera Sekunder</h3>
              <p className="text-slate-500 text-[11px] font-medium mt-2 leading-relaxed px-4">
                Wajib aktifkan kamera pengawas dari HP sebelum memulai ujian.
              </p>
            </div>

            <div className="relative group p-4 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 flex justify-center items-center">
              <QRCodeSVG value={qrLink} size={180} className={hasScannedQR ? 'opacity-20 grayscale' : ''} />
              {hasScannedQR && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-emerald-600">
                  <CheckCircle2 size={48} className="mb-2" />
                  <span className="font-black text-xs uppercase tracking-widest">Connected</span>
                </div>
              )}
            </div>

            <button 
              onClick={() => setHasScannedQR(!hasScannedQR)}
              className={`w-full mt-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                hasScannedQR ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              {hasScannedQR ? 'Tersambung (Reset)' : 'Konfirmasi Sudah Scan'}
            </button>
          </div>
        </div>

        {/* PANEL KANAN: WEBCAM UTAMA */}
        <div className="w-full lg:w-2/3 space-y-6 flex flex-col items-center">
          <div className="w-full relative group aspect-video rounded-[3rem] overflow-hidden bg-slate-900 shadow-2xl border-8 border-white ring-1 ring-slate-200">
            <Webcam ref={webcamRef} mirrored={true} className="w-full h-full object-cover" />
            
            {/* Animasi Scan jika sedang memproses */}
            {isVerifying && (
              <div className="absolute inset-0 z-20 pointer-events-none">
                <div className="w-full h-1 bg-indigo-500 shadow-[0_0_20px_indigo] animate-scan-line relative"></div>
                <div className="absolute inset-0 bg-indigo-600/5 animate-pulse"></div>
              </div>
            )}

            {/* Overlay jika QR belum dikonfirmasi */}
            {!hasScannedQR && (
              <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center text-white p-12 text-center">
                <div className="bg-white/10 p-4 rounded-full mb-4">
                   <AlertCircle size={40} className="text-indigo-400" />
                </div>
                <h4 className="text-xl font-black mb-2">Akses Terkunci</h4>
                <p className="text-sm opacity-70 font-medium">Scan QR Code di samping dan aktifkan kamera HP untuk membuka kunci verifikasi wajah.</p>
              </div>
            )}
          </div>

          {/* Status & Action */}
          <div className="w-full max-w-md space-y-4 text-center">
            <div className={`inline-flex items-center gap-2 font-bold py-3 px-6 rounded-2xl border transition-all ${
              status.includes('Berhasil') ? 'bg-green-50 text-green-700 border-green-100' : 'bg-white text-slate-700 border-slate-200 shadow-sm'
            }`}>
              {isVerifying ? <RefreshCw className="animate-spin text-indigo-600" size={18} /> : <div className="w-2 h-2 rounded-full bg-indigo-500"></div>}
              <span className="text-sm">{status}</span>
            </div>

            <button 
              onClick={handleVerify}
              disabled={isVerifying || !hasScannedQR}
              className={`w-full py-5 rounded-[2rem] font-black text-xl flex items-center justify-center gap-3 transition-all shadow-2xl active:scale-[0.98] ${
                !hasScannedQR || isVerifying 
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
              }`}
            >
              <ScanFace size={28} />
              {isVerifying ? 'Verifikasi...' : 'Mulai Verifikasi'}
            </button>
          </div>
        </div>

      </div>

      <style>{`
        @keyframes scan { 0% { top: 0; opacity: 0; } 50% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
        .animate-scan-line { animation: scan 2s linear infinite; }
      `}</style>
    </div>
  );
};

export default FaceVerification;