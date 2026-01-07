import React, { useState, useEffect, useRef } from "react";
import * as faceapi from "@vladmandic/face-api";
import { BookOpen, Timer, LogOut, Globe, Award, Loader2 } from "lucide-react";
import useProctoring from "../components/hooks/useProctoring";
import ProctoringMonitor from "../components/ProctoringMonitor";

const QUESTIONS = [
  {
    id: 1,
    question: "Apa nama planet terbesar di tata surya kita?",
    options: ["Mars", "Saturnus", "Yupiter", "Neptunus"],
    correct: 2,
  },
  {
    id: 2,
    question: "Siapakah pencipta lagu kebangsaan Indonesia Raya?",
    options: ["W.R. Supratman", "Ismail Marzuki", "Moh. Hatta", "Sudirman"],
    correct: 0,
  },
  {
    id: 3,
    question: "Negara mana yang memiliki wilayah terluas di dunia?",
    options: ["Amerika Serikat", "Tiongkok", "Kanada", "Rusia"],
    correct: 3,
  },
];

const DURATION = 600;

const Exam = ({ onLogout }) => {
  const webcamRef = useRef(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [isAiReady, setIsAiReady] = useState(false);

  const [user] = useState(() => {
    const loggedInUser = sessionStorage.getItem("loggedInUser");
    return loggedInUser ? JSON.parse(loggedInUser) : { name: "Peserta" };
  });

  /* ===============================
     AI ENGINE INIT
  =============================== */
  useEffect(() => {
    const initAI = async () => {
      try {
        await faceapi.tf.ready();
        setIsAiReady(true);
      } catch (err) {
        console.error("AI initialization failed:", err);
      }
    };
    initAI();
  }, []);

  /* ===============================
     PROCTORING HOOK
  =============================== */
  const handleSubmit = () => {
    let correctCount = 0;
    QUESTIONS.forEach((q) => {
      if (answers[q.id] === q.correct) correctCount++;
    });
    setScore(Math.round((correctCount / QUESTIONS.length) * 100));
    setCurrentStep(1);
  };

  const { proctorStatus, violations, violationEvidence } = useProctoring(
    webcamRef,
    isAiReady,
    currentStep,
    handleSubmit
  );

  /* ===============================
     3. TIMER & HANDLERS
  =============================== */
  useEffect(() => {
    if (currentStep === 1 || timeLeft <= 0) return;
    const itv = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) handleSubmit();
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(itv);
  }, [currentStep]);

  // UI RENDER (STEP 1: RESULT)
  if (currentStep === 1) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-center">
        <div className="bg-white p-12 rounded-[4rem] shadow-[0_0_50px_rgba(99,102,241,0.2)] max-w-md w-full border border-indigo-100">
          <Award
            size={80}
            className="mx-auto text-indigo-600 mb-6 animate-bounce"
          />
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic">
            Exam Result
          </h2>
          <div className="my-8 py-10 bg-indigo-50 rounded-[3rem] border-2 border-dashed border-indigo-200">
            <h1 className="text-8xl font-black text-indigo-600 tracking-tighter">
              {score}
            </h1>
            <p className="text-slate-400 font-black uppercase text-[10px] mt-2 tracking-[0.3em]">
              Total Score
            </p>
          </div>
          <button
            onClick={onLogout}
            className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-indigo-600 transition-all shadow-xl"
          >
            Keluar Sistem
          </button>
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
          <p className="font-black text-xs uppercase tracking-[0.3em] text-slate-400">
            Booting AI Guard...
          </p>
        </div>
      )}

      {/* HEADER */}
      <header className="w-full bg-indigo-600 shadow-xl px-8 py-5 flex justify-between items-center text-white sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-md">
            <Globe size={22} />
          </div>
          <div>
            <p className="text-[10px] uppercase font-black opacity-60 tracking-[0.2em] mb-1 leading-none">
              Smart Proctoring v2
            </p>
            <p className="text-xl font-black leading-none italic uppercase tracking-tighter">
              {user.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div
            className={`px-6 py-2.5 rounded-2xl font-mono font-black flex items-center gap-3 border-2 transition-all shadow-inner ${
              timeLeft < 60
                ? "bg-red-500 border-red-400 animate-pulse"
                : "bg-black/20 border-white/10"
            }`}
          >
            <Timer size={20} />
            <span className="text-lg">
              {Math.floor(timeLeft / 60)}:
              {(timeLeft % 60).toString().padStart(2, "0")}
            </span>
          </div>
          <button
            onClick={onLogout}
            className="bg-white/10 p-2.5 rounded-2xl hover:bg-red-500 transition-all border border-white/10"
          >
            <LogOut size={22} />
          </button>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row max-w-[90rem] mx-auto w-full p-8 gap-10">
        {/* PANEL KIRI: SOAL */}
        <div className="flex-1">
          <div className="bg-white p-12 rounded-[3.5rem] border border-slate-200 shadow-2xl shadow-slate-200/50">
            <div className="flex items-center gap-3 text-indigo-600 font-black uppercase text-xs tracking-[0.3em] mb-12 italic">
              <BookOpen size={20} /> <span>Core Examination</span>
            </div>

            <div className="space-y-6">
              {QUESTIONS.map((q, idx) => (
                <div key={q.id} className="relative group">
                  <h3 className="text-lg font-black text-slate-800 mb-2 leading-tight flex items-start gap-2">
                    <span className="flex-shrink-0 w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center text-md italic">
                      {idx + 1}
                    </span>
                    {q.question}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {q.options.map((opt, oIdx) => (
                      <button
                        key={oIdx}
                        onClick={() => setAnswers({ ...answers, [q.id]: oIdx })}
                        className={`group p-2 rounded-[1.5rem] border-2 text-left font-black transition-all duration-300 flex items-center gap-2 ${
                          answers[q.id] === oIdx
                            ? "border-indigo-600 bg-indigo-600 text-white shadow-xl shadow-indigo-100"
                            : "border-slate-50 bg-slate-50/50 hover:border-indigo-200 text-slate-400 hover:bg-white"
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center text-[10px] ${
                            answers[q.id] === oIdx
                              ? "border-white bg-white/20"
                              : "border-slate-200 text-slate-300"
                          }`}
                        >
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
        <ProctoringMonitor
          webcamRef={webcamRef}
          proctorStatus={proctorStatus}
          violations={violations}
          violationEvidence={violationEvidence}
        />
      </div>
    </div>
  );
};

export default Exam;
