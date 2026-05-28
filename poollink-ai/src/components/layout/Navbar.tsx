import { Link, useNavigate } from 'react-router-dom';
import { User, signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { Waves, LogIn, LogOut, Heart, Map as MapIcon, User as UserIcon } from 'lucide-react';

interface NavbarProps {
  user: User | null;
}

export default function Navbar({ user }: NavbarProps) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
  };

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="bg-sky-500 p-2.5 rounded-xl group-hover:bg-sky-600 transition-all shadow-lg shadow-sky-100">
            <Waves className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-800">
            PoolLink<span className="text-sky-500 underline decoration-2 underline-offset-4">YYC</span>
          </h1>
        </Link>
        
        <div className="flex items-center gap-6">
          <Link to="/" className="text-sm font-bold text-slate-600 hover:text-sky-500 hidden md:block transition-colors">
            Explore Pools
          </Link>
          {user ? (
            <div className="flex items-center gap-4">
              <Link to="/favorites" className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-sky-500 transition-colors">
                <Heart className="w-4 h-4" />
                <span className="hidden sm:inline">Saved</span>
              </Link>
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-red-500 transition-colors"
                id="logout-btn"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Exit</span>
              </button>
              <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center text-sky-700 font-black border-2 border-white shadow-sm">
                {user.email?.substring(0, 2).toUpperCase()}
              </div>
            </div>
          ) : (
            <Link 
              to="/auth" 
              className="px-6 py-2.5 bg-slate-900 text-white rounded-full text-sm font-bold hover:bg-slate-800 transition-all shadow-md active:scale-95"
              id="login-link"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
