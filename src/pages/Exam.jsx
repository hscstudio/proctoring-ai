import React, { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import { 
  BookOpen, Timer, Send, Award, CheckCircle2, LogOut, 
  Globe, AlertTriangle, User, Users, Eye, MicOff, ShieldAlert 
} from 'lucide-react';

const QUESTIONS = [
  { id: 1, question: "Apa nama planet terbesar di tata surya kita?", options: ["Mars", "Saturnus", "Yupiter", "Neptunus"], correct: 2 },
  { id: 2, question: "Siapakah pencipta lagu kebangsaan Indonesia Raya?", options: ["W.R. Supratman", "Ismail Marzuki", "Moh. Hatta", "Sudirman"], correct: 0 },
  { id: 3, question: "Negara mana yang memiliki wilayah terluas di dunia?", options: ["Amerika Serikat", "Tiongkok", "Kanada", "Rusia"], correct: 3 },
  // { id: 4, question: "Gas apa yang paling banyak terkandung dalam atmosfer Bumi?", options: ["Oksigen", "Nitrogen", "Karbon Dioksida", "Hidrogen"], correct: 1 },
  // { id: 5, question: "Benua terkecil di dunia adalah...", options: ["Eropa", "Antartika", "Australia", "Asia"], correct: 2 }
];

const DURATION = 600

const Exam = ({ onLogout }) => {
  const webcamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  
  // Refs untuk logika deteksi (Menghindari re-render yang tidak perlu)
  const violationTimers = useRef({ faceMissing: null, multiplePeople: null, notFocus: null, noise: null });
  const lastViolationTime = useRef({}); 
  const audioGraceTimer = useRef(null);

  const [currentStep, setCurrentStep] = useState(0); 
  const [answers, setAnswers] = useState({});
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [violations, setViolations] = useState(0);
  const [proctorStatus, setProctorStatus] = useState({
    faceDetected: true,
    lookingCenter: true,
    singlePerson: true,
    isQuiet: true
  });

  const [user] = useState(() => {
    const loggedInUser = sessionStorage.getItem('loggedInUser');
    return loggedInUser ? JSON.parse(loggedInUser) : { name: 'Peserta' };
  });

  // 1. Inisialisasi Audio dengan Noise Suppression Hardware
  useEffect(() => {
    const startAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true, // Meredam suara kipas/AC dari sisi browser
            autoGainControl: false 
          } 
        });
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
        analyserRef.current.fftSize = 512;
      } catch (err) { console.error("Mic access error:", err); }
    };
    startAudio();
    return () => audioContextRef.current?.close();
  }, []);

  // 2. Logika Utama AI Monitoring
  useEffect(() => {
    if (currentStep === 1) return;

    const checkViolation = (condition, type, delay = 2000, cooldown = 4000) => {
      const now = Date.now();
      
      if (!condition) {
        if (type === 'noise' && audioGraceTimer.current) {
          clearTimeout(audioGraceTimer.current);
          audioGraceTimer.current = null;
        }

        if (!violationTimers.current[type]) {
          violationTimers.current[type] = now;
        } else if (now - violationTimers.current[type] > delay) {
          if (!lastViolationTime.current[type] || now - lastViolationTime.current[type] > cooldown) {
            setViolations(v => v + 1);
            lastViolationTime.current[type] = now;
            violationTimers.current[type] = null; 
          }
        }
      } else {
        if (type === 'noise' && violationTimers.current[type]) {
          if (!audioGraceTimer.current) {
            audioGraceTimer.current = setTimeout(() => {
              violationTimers.current[type] = null;
              audioGraceTimer.current = null;
            }, 800); // Memberikan jeda napas 0.8 detik bagi suara vokal
          }
        } else {
          violationTimers.current[type] = null;
        }
      }
    };

    const proctorLoop = async () => {
      if (webcamRef.current?.video?.readyState === 4) {
        const video = webcamRef.current.video;
        const detections = await faceapi.detectAllFaces(video, new faceapi.SsdMobilenetv1Options()).withFaceLandmarks();

        // --- Deteksi Wajah & Pose ---
        let facePresent = detections.length > 0;
        let singlePerson = detections.length <= 1;
        let lookingCenter = true;

        if (facePresent) {
          const landmarks = detections[0].landmarks;
          const leftEye = landmarks.getLeftEye();
          const rightEye = landmarks.getRightEye();
          const nose = landmarks.getNose();
          const distL = Math.abs(nose[0].x - leftEye[0].x);
          const distR = Math.abs(nose[0].x - rightEye[3].x);
          const ratio = distL / distR;
          if (ratio < 0.45 || ratio > 2.2) lookingCenter = false;
        }

        // --- Filter Frekuensi Suara Manusia (Vocal Band-pass) ---
        let quiet = true;
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          
          // Mengambil rentang frekuensi 300Hz - 3000Hz (Indeks 10 - 60)
          // Mengabaikan frekuensi rendah (suara kipas/angin)
          let vocalEnergy = 0;
          for (let i = 10; i < 60; i++) { vocalEnergy += dataArray[i]; }
          const averageVocal = vocalEnergy / 50;
          
          if (averageVocal > 38) quiet = false; // Threshold sensitivitas suara manusia
        }

        setProctorStatus({
          faceDetected: facePresent,
          lookingCenter: lookingCenter,
          singlePerson: singlePerson,
          isQuiet: quiet
        });

        checkViolation(facePresent, 'faceMissing', 2000);
        checkViolation(lookingCenter, 'notFocus', 2500);
        checkViolation(singlePerson, 'multiplePeople', 1500);
        checkViolation(quiet, 'noise', 1500, 5000); 

        if (violations >= 10) handleSubmit(); 
      }
      setTimeout(() => {
        requestAnimationFrame(proctorLoop);
      }, 200);
    };

    const startTimer = setTimeout(proctorLoop, 2000);
    return () => clearTimeout(startTimer);
  }, [currentStep, violations]);

  useEffect(() => {
    if (currentStep === 1 || timeLeft <= 0) return;
    const itv = setInterval(() => setTimeLeft(p => p - 1), 1000);
    if (timeLeft === 0) handleSubmit();
    return () => clearInterval(itv);
  }, [timeLeft, currentStep]);

  const handleSubmit = () => {
    let correctCount = 0;
    QUESTIONS.forEach((q) => { if (answers[q.id] === q.correct) correctCount++; });
    setScore(Math.round((correctCount / QUESTIONS.length) * 100));
    setCurrentStep(1);
  };

  if (currentStep === 1) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="bg-white p-12 rounded-[3rem] shadow-2xl max-w-md w-full">
          <Award size={80} className="mx-auto text-indigo-600 mb-6" />
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Hasil Ujian</h2>
          <div className="my-8 py-8 bg-indigo-50 rounded-[2.5rem] border-2 border-dashed border-indigo-200">
            <h1 className="text-7xl font-black text-indigo-600">{score}</h1>
            <p className="text-slate-500 font-bold uppercase text-[10px] mt-2 tracking-widest">Skor Akhir</p>
          </div>
          <button onClick={onLogout} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-bold shadow-lg shadow-slate-200">Kembali ke Beranda</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-100">
      <header className="w-full bg-indigo-600 shadow-lg px-6 py-4 flex justify-between items-center text-white sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-xl"><Globe size={20} /></div>
          <div>
            <p className="text-[10px] uppercase font-black opacity-70 tracking-widest mb-0.5">Smart Proctoring</p>
            <p className="text-lg font-black leading-none">{user.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className={`px-4 py-2 rounded-xl font-mono font-black flex items-center gap-2 border transition-all ${timeLeft < (DURATION/10) ? 'bg-red-500 border-red-400 animate-pulse' : 'bg-black/20 border-white/10'}`}>
            <Timer size={18} /> {Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2,'0')}
          </div>
          <button onClick={onLogout} className="bg-white/10 p-2 rounded-xl hover:bg-red-500 transition-all border border-white/10"><LogOut size={20}/></button>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row max-w-7xl mx-auto w-full p-6 gap-8">
        
        {/* PANEL KIRI: SOAL */}
        <div className="flex-1">
          <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 text-indigo-600 font-black uppercase text-xs tracking-[0.2em] mb-10">
              <BookOpen size={18}/> <span>Pertanyaan Pengetahuan Umum</span>
            </div>
            {QUESTIONS.map((q, idx) => (
              <div key={q.id} className="mb-3 last:mb-0 pb-3 border-b border-slate-50 last:border-0 relative">
                <h3 className="text-xl font-bold text-slate-800 mb-4 leading-relaxed">
                   <span className="text-indigo-400 mr-2">{idx + 1}.</span> {q.question}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {q.options.map((opt, oIdx) => (
                    <button
                      key={oIdx}
                      onClick={() => setAnswers({...answers, [q.id]: oIdx})}
                      className={`p-2 rounded-2xl border-2 text-left font-bold transition-all duration-300 ${
                        answers[q.id] === oIdx 
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-800 shadow-md' 
                        : 'border-slate-50 bg-slate-50/50 hover:border-slate-200 text-slate-500 hover:bg-white'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <button 
              onClick={handleSubmit} 
              disabled={Object.keys(answers).length < QUESTIONS.length}
              className="w-full mt-5 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-2xl font-black text-lg disabled:bg-slate-100 disabled:text-slate-300 shadow-2xl shadow-indigo-100 transition-all active:scale-[0.98]"
            >
              Kirim Jawaban Akhir
            </button>
          </div>
        </div>

        {/* PANEL KANAN: AI PROCTORING MONITOR */}
        <div className="w-full lg:w-80">
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 sticky top-24 shadow-xl shadow-slate-200/40">
            <div className="relative aspect-square rounded-[2rem] overflow-hidden bg-slate-900 border-4 border-white shadow-xl mb-6">
              <Webcam ref={webcamRef} audio={false} mirrored={true} className="w-full h-full object-cover grayscale-[0.2]" />
              <div className="absolute top-4 left-4 bg-red-600 text-[10px] text-white px-3 py-1.5 rounded-full font-black animate-pulse flex items-center gap-2 shadow-lg">
                <div className="w-1.25 h-1.25 bg-white rounded-full"></div> MONITOR AKTIF
              </div>
            </div>

            <p className="font-black text-slate-400 mb-4 flex items-center gap-2 uppercase text-[9px] tracking-[0.2em] px-2">
              <ShieldAlert size={14} className="text-indigo-600" /> Sensor Integritas
            </p>

            <div className="space-y-2">
              <StatusItem icon={<User size={14}/>} label="Wajah Terdeteksi" status={proctorStatus.faceDetected} />
              <StatusItem icon={<Eye size={14}/>} label="Fokus Pandangan" status={proctorStatus.lookingCenter} />
              <StatusItem icon={<Users size={14}/>} label="Deteksi Individu" status={proctorStatus.singlePerson} />
              <StatusItem icon={<MicOff size={14}/>} label="Sensor Hening" status={proctorStatus.isQuiet} />
            </div>

            <div className="mt-8 p-6 bg-slate-900 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12"></div>
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">Poin Pelanggaran</p>
              <div className="flex items-end justify-between mt-1">
                <h2 className={`text-5xl font-black leading-none ${violations > 7 ? 'text-red-500' : 'text-indigo-400'}`}>{violations}</h2>
                <p className="text-[10px] text-slate-500 mb-1 font-black tracking-widest">LIMIT: 10</p>
              </div>
              <div className="w-full bg-white/10 h-2 rounded-full mt-5 overflow-hidden">
                <div className="bg-indigo-500 h-full transition-all duration-700 ease-out shadow-[0_0_10px_#6366f1]" style={{width: `${(violations/10)*100}%`}}></div>
              </div>
              {violations >= 7 && (
                <div className="mt-4 flex items-center gap-2 text-red-400 animate-bounce">
                   <AlertTriangle size={12} />
                   <p className="text-[9px] font-black uppercase tracking-tighter">Peringatan Terakhir!</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

const StatusItem = ({ icon, label, status }) => (
  <div className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all duration-500 ${status ? 'bg-slate-50 border-slate-100' : 'bg-red-50 border-red-200 shadow-md translate-x-1'}`}>
    <div className="flex items-center gap-3">
      <div className={status ? 'text-slate-400' : 'text-red-600'}>{icon}</div>
      <span className={`text-[11px] font-black ${status ? 'text-slate-600' : 'text-red-700 uppercase italic'}`}>{label}</span>
    </div>
    <div className={`w-2.5 h-2.5 rounded-full ${status ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)] animate-pulse'}`}></div>
  </div>
);

export default Exam;