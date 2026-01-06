import React, { useState, useEffect, useRef } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from '@vladmandic/face-api'; // Ganti ke vladmandic
import { 
  BookOpen, Timer, Send, Award, CheckCircle2, LogOut, 
  Globe, AlertTriangle, User, Users, Eye, MicOff, ShieldAlert, Loader2 
} from 'lucide-react';

const QUESTIONS = [
  { id: 1, question: "Apa nama planet terbesar di tata surya kita?", options: ["Mars", "Saturnus", "Yupiter", "Neptunus"], correct: 2 },
  { id: 2, question: "Siapakah pencipta lagu kebangsaan Indonesia Raya?", options: ["W.R. Supratman", "Ismail Marzuki", "Moh. Hatta", "Sudirman"], correct: 0 },
  { id: 3, question: "Negara mana yang memiliki wilayah terluas di dunia?", options: ["Amerika Serikat", "Tiongkok", "Kanada", "Rusia"], correct: 3 },
];

const DURATION = 600;

const Exam = ({ onLogout }) => {
  const webcamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  
  // Refs untuk logika deteksi
  const violationTimers = useRef({ faceMissing: null, multiplePeople: null, notFocus: null, noise: null });
  const lastViolationTime = useRef({}); 
  // const audioGraceTimer = useRef(null);

  const [currentStep, setCurrentStep] = useState(0); 
  const [answers, setAnswers] = useState({});
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [violations, setViolations] = useState(0);
  const [isAiReady, setIsAiReady] = useState(false);
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

  /* ===============================
     1. AUDIO & AI ENGINE INIT
  =============================== */
  useEffect(() => {
    const initSystem = async () => {
      try {
        // Audio Init
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
        analyserRef.current.fftSize = 512;

        // AI Init (Gunakan engine yang sama agar tidak tabrakan)
        await faceapi.tf.ready();
        setIsAiReady(true);
      } catch (err) { console.error("Sistem gagal inisialisasi:", err); }
    };
    initSystem();
    return () => {
        audioContextRef.current?.close();
        // Clear all timers
        Object.values(violationTimers.current).forEach(t => clearTimeout(t));
    };
  }, []);

  /* ===============================
     2. AI PROCTORING LOOP (Optimized)
  =============================== */
  useEffect(() => {
    if (currentStep === 1 || !isAiReady) return;

    const checkViolation = (condition, type, delay = 2500, cooldown = 5000) => {
      const now = Date.now();
      if (!condition) {
        if (!violationTimers.current[type]) {
          violationTimers.current[type] = now;
        } else if (now - violationTimers.current[type] > delay) {
          if (!lastViolationTime.current[type] || now - lastViolationTime.current[type] > cooldown) {
            setViolations(v => {
                const newVal = v + 1;
                if (newVal >= 10) handleSubmit(); // Auto-submit jika melampaui limit
                return newVal;
            });
            lastViolationTime.current[type] = now;
            violationTimers.current[type] = null; 
          }
        }
      } else {
        violationTimers.current[type] = null;
      }
    };

    const runDetection = async () => {
      const video = webcamRef.current?.video;
      if (video && video.readyState === 4) {
        // Gunakan SsdMobilenetv1 untuk akurasi tinggi di halaman ujian
        const detections = await faceapi.detectAllFaces(video).withFaceLandmarks();

        let facePresent = detections.length > 0;
        let singlePerson = detections.length <= 1;
        let lookingCenter = true;

        if (facePresent) {
          const landmarks = detections[0].landmarks;
          const nose = landmarks.getNose();
          const leftEye = landmarks.getLeftEye();
          const rightEye = landmarks.getRightEye();
          
          // Kalkulasi kemiringan wajah sederhana
          const distL = Math.abs(nose[0].x - leftEye[0].x);
          const distR = Math.abs(nose[0].x - rightEye[3].x);
          const ratio = distL / distR;
          if (ratio < 0.4 || ratio > 2.5) lookingCenter = false;
        }

        // Audio Detection
        let quiet = true;
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          let vocalEnergy = dataArray.slice(10, 60).reduce((a, b) => a + b, 0);
          if (vocalEnergy / 50 > 35) quiet = false;
        }

        setProctorStatus({
          faceDetected: facePresent,
          lookingCenter: lookingCenter,
          singlePerson: singlePerson,
          isQuiet: quiet
        });

        checkViolation(facePresent, 'faceMissing');
        checkViolation(lookingCenter, 'notFocus');
        checkViolation(singlePerson, 'multiplePeople');
        checkViolation(quiet, 'noise', 2000, 6000);
      }
    };

    const interval = setInterval(runDetection, 600); // 1.5 FPS sudah cukup & irit baterai
    return () => clearInterval(interval);
  }, [isAiReady, currentStep]);

  /* ===============================
     3. TIMER & HANDLERS
  =============================== */
  useEffect(() => {
    if (currentStep === 1 || timeLeft <= 0) return;
    const itv = setInterval(() => {
        setTimeLeft(t => {
            if (t <= 1) handleSubmit();
            return t - 1;
        });
    }, 1000);
    return () => clearInterval(itv);
  }, [currentStep]);

  const handleSubmit = () => {
    let correctCount = 0;
    QUESTIONS.forEach((q) => { if (answers[q.id] === q.correct) correctCount++; });
    setScore(Math.round((correctCount / QUESTIONS.length) * 100));
    setCurrentStep(1);
  };

  // UI RENDER (STEP 1: RESULT)
  if (currentStep === 1) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
        <div className="bg-white p-12 rounded-[4rem] shadow-[0_0_50px_rgba(99,102,241,0.2)] max-w-md w-full border border-indigo-100">
          <Award size={80} className="mx-auto text-indigo-600 mb-6 animate-bounce" />
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">Exam Result</h2>
          <div className="my-8 py-10 bg-indigo-50 rounded-[3rem] border-2 border-dashed border-indigo-200">
            <h1 className="text-8xl font-black text-indigo-600 tracking-tighter">{score}</h1>
            <p className="text-slate-400 font-black uppercase text-[10px] mt-2 tracking-[0.3em]">Total Score</p>
          </div>
          <button onClick={onLogout} className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-indigo-600 transition-all shadow-xl">Keluar Sistem</button>
        </div>
      </div>
    );
  }

  // UI RENDER (EXAM PAGE)
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-indigo-100">
      
      {/* LOADING OVERLAY */}
      {!isAiReady && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
            <p className="font-black text-xs uppercase tracking-[0.3em] text-slate-400">Booting AI Guard...</p>
        </div>
      )}

      {/* HEADER */}
      <header className="w-full bg-indigo-600 shadow-xl px-8 py-5 flex justify-between items-center text-white sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-md"><Globe size={22} /></div>
          <div>
            <p className="text-[10px] uppercase font-black opacity-60 tracking-[0.2em] mb-1 leading-none">Smart Proctoring v2</p>
            <p className="text-xl font-black leading-none italic uppercase tracking-tighter">{user.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className={`px-6 py-2.5 rounded-2xl font-mono font-black flex items-center gap-3 border-2 transition-all shadow-inner ${timeLeft < 60 ? 'bg-red-500 border-red-400 animate-pulse' : 'bg-black/20 border-white/10'}`}>
            <Timer size={20} /> 
            <span className="text-lg">{Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2,'0')}</span>
          </div>
          <button onClick={onLogout} className="bg-white/10 p-2.5 rounded-2xl hover:bg-red-500 transition-all border border-white/10"><LogOut size={22}/></button>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row max-w-[90rem] mx-auto w-full p-8 gap-10">
        
        {/* PANEL KIRI: SOAL */}
        <div className="flex-1">
          <div className="bg-white p-12 rounded-[3.5rem] border border-slate-200 shadow-2xl shadow-slate-200/50">
            <div className="flex items-center gap-3 text-indigo-600 font-black uppercase text-xs tracking-[0.3em] mb-12 italic">
              <BookOpen size={20}/> <span>Core Examination</span>
            </div>
            
            <div className="space-y-6">
                {QUESTIONS.map((q, idx) => (
                <div key={q.id} className="relative group">
                    <h3 className="text-lg font-black text-slate-800 mb-2 leading-tight flex items-start gap-2">
                    <span className="flex-shrink-0 w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-md italic">{idx + 1}</span> 
                    {q.question}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {q.options.map((opt, oIdx) => (
                        <button
                        key={oIdx}
                        onClick={() => setAnswers({...answers, [q.id]: oIdx})}
                        className={`group p-2 rounded-[1.5rem] border-2 text-left font-black transition-all duration-300 flex items-center gap-2 ${
                            answers[q.id] === oIdx 
                            ? 'border-indigo-600 bg-indigo-600 text-white shadow-xl shadow-indigo-100' 
                            : 'border-slate-50 bg-slate-50/50 hover:border-indigo-200 text-slate-400 hover:bg-white'
                        }`}
                        >
                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center text-[10px] ${answers[q.id] === oIdx ? 'border-white bg-white/20' : 'border-slate-200 text-slate-300'}`}>
                            {String.fromCharCode(65 + oIdx)}
                        </div>
                        {opt}
                        </button>
                    ))}
                    </div>
                </div>
                ))}
            </div>

            <button 
              onClick={handleSubmit} 
              disabled={Object.keys(answers).length < QUESTIONS.length}
              className="w-full mt-8 bg-indigo-600 hover:bg-indigo-700 text-white py-6 rounded-[2rem] font-black text-lg disabled:bg-slate-100 disabled:text-slate-300 shadow-[0_20px_40px_rgba(79,70,229,0.3)] transition-all active:scale-[0.98] uppercase tracking-widest italic"
            >
              Finish & Submit
            </button>
          </div>
        </div>

        {/* PANEL KANAN: MONITOR */}
        <div className="w-full lg:w-96">
          <div className="bg-white p-8 rounded-[3.5rem] border border-slate-200 sticky top-32 shadow-2xl shadow-slate-200/60">
            <div className="relative aspect-video rounded-[2.5rem] overflow-hidden bg-slate-950 border-4 border-white shadow-2xl mb-8 group">
              <Webcam ref={webcamRef} audio={false} mirrored={true} className="w-full h-full object-cover opacity-80" />
              <div className="absolute top-5 left-5 bg-red-600 text-[9px] text-white px-4 py-2 rounded-full font-black flex items-center gap-2 shadow-xl tracking-widest uppercase italic">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></div> AI Guard Active
              </div>
            </div>

            <div className="space-y-3">
              <StatusItem icon={<User size={16}/>} label="Wajah" status={proctorStatus.faceDetected} />
              <StatusItem icon={<Eye size={16}/>} label="Fokus" status={proctorStatus.lookingCenter} />
              <StatusItem icon={<Users size={16}/>} label="Person" status={proctorStatus.singlePerson} />
              <StatusItem icon={<MicOff size={16}/>} label="Voice" status={proctorStatus.isQuiet} />
            </div>

            <div className="mt-10 p-8 bg-slate-900 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group hover:scale-[1.02] transition-transform">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full"></div>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] italic mb-2 opacity-50">Violation Meter</p>
              <div className="flex items-end justify-between">
                <h2 className={`text-6xl font-black leading-none italic tracking-tighter ${violations > 7 ? 'text-red-500' : 'text-indigo-400'}`}>{violations}</h2>
                <p className="text-[11px] text-slate-500 mb-1 font-black tracking-[0.2em]">MAX: 10</p>
              </div>
              <div className="w-full bg-white/5 h-3 rounded-full mt-6 overflow-hidden border border-white/5">
                <div className="bg-indigo-500 h-full transition-all duration-1000 ease-out shadow-[0_0_20px_#6366f1]" style={{width: `${(violations/10)*100}%`}}></div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

// Sub-component Status
const StatusItem = ({ icon, label, status }) => (
  <div className={`flex items-center justify-between p-4 rounded-[1.5rem] border-2 transition-all duration-500 ${status ? 'bg-slate-50 border-slate-50' : 'bg-red-50 border-red-100 shadow-lg translate-x-2'}`}>
    <div className="flex items-center gap-4">
      <div className={`${status ? 'text-slate-400' : 'text-red-500'} transition-colors`}>{icon}</div>
      <span className={`text-xs font-black uppercase tracking-widest ${status ? 'text-slate-600' : 'text-red-700 italic'}`}>{label}</span>
    </div>
    <div className={`w-3 h-3 rounded-full shadow-lg ${status ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}></div>
  </div>
);

export default Exam;