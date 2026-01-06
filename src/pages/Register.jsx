import React, { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, User, Lock, UserCircle, ArrowLeft, ShieldPlus, CheckCircle2, RotateCcw } from 'lucide-react';

const Register = ({ onDone }) => {
  const [formData, setFormData] = useState({ username: '', password: '', name: '' });
  const [photo, setPhoto] = useState(null);
  const [isCaptured, setIsCaptured] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const webcamRef = useRef(null);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    setPhoto(imageSrc);
    setIsCaptured(true);
  }, [webcamRef]);

  const handleRegister = (e) => {
    e.preventDefault();
    if (!photo) {
      setMsg({ type: 'error', text: 'Wajib mengambil foto wajah untuk verifikasi!' });
      return;
    }

    const existingUsers = JSON.parse(localStorage.getItem('users') || '[]');
    if (existingUsers.find(u => u.username === formData.username)) {
      setMsg({ type: 'error', text: 'Username sudah digunakan!' });
      return;
    }

    const newUser = { ...formData, photo };
    existingUsers.push(newUser);
    localStorage.setItem('users', JSON.stringify(existingUsers));

    setMsg({ type: 'success', text: 'Akun berhasil dibuat! Mengalihkan...' });
    setTimeout(() => onDone(), 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-100 via-slate-50 to-slate-200 p-4 md:p-10">
      <div className="bg-white/80 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(79,70,229,0.15)] border border-white flex flex-col md:flex-row max-w-5xl w-full overflow-hidden">
        
        {/* Sisi Kiri: Visual & Webcam */}
        <div className="md:w-1/2 bg-slate-900 p-8 md:p-12 flex flex-col justify-center relative text-white">
          <div className="relative z-10 mb-8">
            <div className="bg-indigo-500 w-fit p-3 rounded-2xl mb-4 shadow-lg shadow-indigo-500/20">
              <ShieldPlus size={28} />
            </div>
            <h2 className="text-3xl font-bold tracking-tight">Biometric Registration</h2>
            <p className="text-slate-400 mt-2">Pastikan wajah terlihat jelas untuk proses verifikasi AI nanti.</p>
          </div>

          {/* Webcam Frame */}
          <div className="relative group aspect-video rounded-3xl overflow-hidden border-2 border-slate-700 bg-black shadow-2xl transition-all duration-500 hover:border-indigo-500/50">
            {!isCaptured ? (
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                className="w-full h-full object-cover grayscale-[0.2]"
              />
            ) : (
              <img src={photo} alt="Captured" className="w-full h-full object-cover border-4 border-indigo-500/30" />
            )}
            
            {/* Overlay Scan Effect */}
            {!isCaptured && <div className="absolute inset-0 border-[1px] border-white/10 pointer-events-none animate-pulse"></div>}
          </div>

          <button
            type="button"
            onClick={isCaptured ? () => setIsCaptured(false) : capture}
            className={`mt-6 flex items-center justify-center gap-3 py-4 rounded-2xl font-bold transition-all active:scale-95 shadow-lg ${
              isCaptured 
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' 
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'
            }`}
          >
            {isCaptured ? <><RotateCcw size={20} /> Ambil Ulang</> : <><Camera size={20} /> Ambil Foto Wajah</>}
          </button>
        </div>

        {/* Sisi Kanan: Form */}
        <div className="md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-white/40">
          <button 
            onClick={onDone}
            className="group flex items-center gap-2 text-slate-400 hover:text-indigo-600 font-semibold text-sm mb-10 transition-colors w-fit"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> Kembali ke Login
          </button>

          <h3 className="text-2xl font-extrabold text-slate-900 mb-2">Lengkapi Data</h3>
          <p className="text-slate-500 mb-8 font-medium">Buat akun untuk mulai ujian online.</p>

          {msg.text && (
            <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 text-sm font-bold border animate-in fade-in slide-in-from-top-4 ${
              msg.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'
            }`}>
              {msg.type === 'success' ? <CheckCircle2 size={18} /> : null}
              {msg.text}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-5">
            <div className="group relative">
              <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
              <input
                type="text"
                placeholder="Nama Lengkap"
                className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>

            <div className="group relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
              <input
                type="text"
                placeholder="Username"
                className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                required
              />
            </div>

            <div className="group relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
              <input
                type="password"
                placeholder="Password"
                className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-slate-900 hover:bg-indigo-600 text-white py-4 rounded-2xl font-black text-lg transition-all duration-300 shadow-xl hover:shadow-indigo-500/30 active:scale-[0.98] mt-4"
            >
              Daftar Akun
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;