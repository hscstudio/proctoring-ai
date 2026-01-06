import React, { useState } from 'react';
import { User, Lock, LogIn, ShieldCheck } from 'lucide-react';

const Login = ({ onLoginSuccess, onGoToRegister }) => {
  const [creds, setCreds] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const found = users.find(u => u.username === creds.username && u.password === creds.password);

    if (found) {
      sessionStorage.setItem('loggedInUser', JSON.stringify(found));
      onLoginSuccess(found);
    } else {
      setError('Username atau password tidak sesuai.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-slate-200 via-slate-50 to-indigo-100 p-6">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="flex justify-center mb-8">
          <div className="bg-indigo-600 p-3 rounded-2xl shadow-xl shadow-indigo-200">
            <ShieldCheck className="text-white" size={32} />
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_20px_50px_rgba(79,70,229,0.1)] border border-white overflow-hidden">
          <div className="p-8 text-center">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Selamat Datang</h1>
            <p className="text-slate-500 mt-2 text-sm font-medium">Silakan masuk untuk memulai ujian</p>
          </div>
          
          <form onSubmit={handleSubmit} className="px-8 pb-8 space-y-5">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-semibold border border-red-100 flex items-center justify-center gap-2 animate-shake">
                {error}
              </div>
            )}
            
            <div className="space-y-4">
              <div className="group relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                <input 
                  type="text" 
                  placeholder="Username"
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium placeholder:text-slate-400"
                  onChange={(e) => setCreds({...creds, username: e.target.value})}
                  required 
                />
              </div>
              
              <div className="group relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                <input 
                  type="password" 
                  placeholder="Password"
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-medium placeholder:text-slate-400"
                  onChange={(e) => setCreds({...creds, password: e.target.value})}
                  required 
                />
              </div>
            </div>

            <button className="w-full bg-slate-900 hover:bg-indigo-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/40 active:scale-[0.98]">
              Masuk Sekarang <LogIn size={20} />
            </button>

            <div className="pt-4 text-center">
              <p className="text-sm text-slate-500 font-medium">
                Belum terdaftar?{' '}
                <button 
                  type="button"
                  onClick={onGoToRegister}
                  className="text-indigo-600 font-bold hover:text-indigo-700 underline underline-offset-4 decoration-2 decoration-indigo-200"
                >
                  Buat Akun Baru
                </button>
              </p>
            </div>
          </form>
        </div>
        
        {/* Footer Info */}
        <p className="mt-8 text-center text-slate-400 text-xs font-medium">
          &copy; 2026 AI Proctoring System. Terlindungi Enkripsi End-to-End.
        </p>
      </div>
    </div>
  );
};

export default Login;