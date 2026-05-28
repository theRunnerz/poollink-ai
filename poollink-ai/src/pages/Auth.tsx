import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup 
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Waves, Mail, Lock, LogIn, UserPlus } from 'lucide-react';
import { motion } from 'motion/react';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      navigate('/');
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password provider is still reporting as "Disabled" in Firebase. Ensure you clicked "Save" in the Firebase Console (Authentication > Sign-in method). It can take up to 60 seconds to propagate.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Try signing in instead.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else {
        setError(err.message || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100 w-full max-w-md relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-sky-500/10 rounded-full blur-3xl -ml-16 -mb-16"></div>

        <div className="relative z-10 text-center mb-10">
          <div className="w-20 h-20 bg-sky-600 rounded-3xl flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-sky-100">
            <Waves className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">
            {isLogin ? 'Welcome Back' : 'Join the Community'}
          </h1>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2">PoolLink Calgary Credentials</p>
        </div>

        <form onSubmit={handleAuth} className="relative z-10 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
              <input 
                type="email"
                required
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none transition-all text-sm font-medium"
                placeholder="yours@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
              <input 
                type="password"
                required
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-sky-500 outline-none transition-all text-sm font-medium"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-bold flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></div>
              {error}
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-sky-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-sky-100 active:scale-95 transition-all hover:bg-sky-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLogin ? (
              <>
                <LogIn className="w-4 h-4" />
                Sign In
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Create Account
              </>
            )}
            {loading && <span className="ml-2 animate-pulse opacity-50">...</span>}
          </button>
        </form>

        <div className="relative z-10 mt-8 pt-8 border-t border-slate-50 text-center flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {isLogin ? "New to PoolLink?" : "Return to Login"}
            </span>
            <button 
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-xs font-black text-sky-600 uppercase tracking-widest hover:text-sky-700 transition-colors py-2 bg-sky-50 rounded-xl"
            >
              {isLogin ? "Create an Account" : 'Sign Into Existing Account'}
            </button>
          </div>

          <button
            onClick={signInWithGoogle}
            className="w-full bg-white border border-slate-200 text-slate-700 font-bold py-3 rounded-2xl hover:bg-slate-50 transition-all flex items-center justify-center gap-3 shadow-sm text-xs"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/smartlock/google.svg" className="w-4 h-4" alt="Google" />
            Continue with Google
          </button>
        </div>
      </motion.div>
    </div>
  );
}
