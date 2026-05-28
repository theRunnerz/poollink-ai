import { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Heart, Loader2, Waves } from 'lucide-react';
import PoolCard from '../components/pools/PoolCard';
import { Pool } from './Home';
import { motion, AnimatePresence } from 'motion/react';

export default function Favorites() {
  const [favoritePools, setFavoritePools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!auth.currentUser) return;

      try {
        const favsSnap = await getDocs(collection(db, `users/${auth.currentUser.uid}/favorites`));
        const poolIds = favsSnap.docs.map(d => d.id);
        
        const poolsData: Pool[] = [];
        for (const id of poolIds) {
          const poolSnap = await getDoc(doc(db, 'pools', id));
          if (poolSnap.exists()) {
            poolsData.push({ id: poolSnap.id, ...poolSnap.data() } as Pool);
          }
        }
        setFavoritePools(poolsData);
      } catch (error) {
        console.error('Error fetching favorites:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-medium">Loading your favorites...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight">Saved Pools</h1>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2 italic">Your curated collection of Calgary facilities</p>
        </div>
        <a href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all shadow-sm group">
          <Waves className="w-5 h-5 text-sky-500 group-hover:rotate-90 transition-transform" />
          Find More Pools
        </a>
      </div>

      <AnimatePresence mode="wait">
        {favoritePools.length > 0 ? (
          <motion.div 
            key="grid"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {favoritePools.map(pool => (
              <PoolCard key={pool.id} pool={pool} />
            ))}
          </motion.div>
        ) : (
          <motion.div 
            key="empty"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-32 text-center bg-white rounded-[3rem] border border-dashed border-slate-200 shadow-inner flex flex-col items-center justify-center"
          >
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 text-slate-200">
              <Heart className="w-12 h-12" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2">No Saved Pools</h2>
            <p className="text-slate-400 font-medium max-w-sm mx-auto mb-10">
              You haven't saved any pools to your favorites yet. Start exploring and save your preferred locations.
            </p>
            <a 
              href="/" 
              className="px-10 py-5 bg-slate-900 text-white rounded-3xl font-black uppercase tracking-widest text-xs shadow-2xl hover:bg-sky-600 transition-all inline-block"
            >
              Start Exploring
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
