import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Search, Filter, ArrowUpDown, Loader2, Activity } from 'lucide-react';
import PoolCard from '../components/pools/PoolCard';
import PoolMap from '../components/pools/PoolMap';
import { motion, AnimatePresence } from 'motion/react';

export type Pool = {
  id: string;
  name: string;
  location: string;
  operator: 'City of Calgary' | 'YMCA' | 'MNP' | 'Community Association' | 'Private';
  address: string;
  lat: number;
  lng: number;
  type: 'Indoor' | 'Outdoor' | 'Wading' | 'Leisure Centre';
  features: string[];
  description: string;
  imageUrl?: string;
  scheduleUrl?: string;
  placeId?: string;
};

export default function Home() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterOperator, setFilterOperator] = useState('All');
  const [sortOrder, setSortOrder] = useState<'name' | 'type'>('name');
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');

  useEffect(() => {
    const fetchPools = async () => {
      try {
        setError(null);
        const q = query(collection(db, 'pools'), orderBy('name'));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          console.warn('No pools found in Firestore "pools" collection.');
        }

        const fetchedPools = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Pool[];
        setPools(fetchedPools);
      } catch (err) {
        console.error('Error fetching pools:', err);
        setError(err instanceof Error ? err.message : 'Failed to connect to pool database');
      } finally {
        setLoading(false);
      }
    };
    fetchPools();
  }, []);

  const filteredPools = pools
    .filter(pool => 
      pool.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (filterType === 'All' || pool.type === filterType) &&
      (filterOperator === 'All' || pool.operator === filterOperator)
    )
    .sort((a, b) => {
      if (sortOrder === 'name') return a.name.localeCompare(b.name);
      return a.type.localeCompare(b.type);
    });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-10 h-10 text-sky-600 animate-spin" />
        <p className="text-slate-500 font-medium">Syncing Calgary Aquatic Data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-6 text-center max-w-md mx-auto">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center">
          <Activity className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">External Connection Error</h2>
          <p className="text-slate-500 text-sm font-medium">{error}</p>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all"
        >
          Check Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Search & Info Bar */}
      <div className="flex flex-col gap-6">
        <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
              <input 
                type="text"
                placeholder="Find a facility (e.g. 'Southland' or 'YMCA')..."
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-base focus:ring-4 focus:ring-sky-500/10 outline-none transition-all font-bold placeholder:text-slate-300"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-2 bg-sky-600 rounded-[2rem] p-6 text-white shadow-xl shadow-sky-100 h-full">
              <div className="bg-white/20 p-3 rounded-2xl">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xs font-black tracking-[0.2em] uppercase text-sky-100 italic">Live Sync</h2>
                <p className="text-xl font-black">{pools.length} Facilities Active</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-8 pt-4 border-t border-slate-50">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Facility Type</label>
              <div className="flex items-center gap-2 p-1 bg-slate-50 rounded-2xl border border-slate-100">
                {['All', 'Indoor', 'Outdoor', 'Leisure Centre'].map(type => (
                  <button 
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterType === type ? 'bg-white text-sky-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Operator</label>
              <div className="flex items-center gap-2 p-1 bg-slate-50 rounded-2xl border border-slate-100">
                {['All', 'City of Calgary', 'YMCA', 'MNP', 'Community Association'].map(op => (
                  <button 
                    key={op}
                    onClick={() => setFilterOperator(op)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterOperator === op ? 'bg-white text-sky-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    {op === 'Community Association' ? 'Outdoor (COSPA)' : op.replace('City of Calgary', 'City')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* View Toggle & Status */}
      <div className="flex items-center justify-between px-2">
        <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] font-mono">
          Showing {filteredPools.length} Active Locations
        </p>
        <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
          <button 
            onClick={() => setViewMode('grid')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'grid' ? 'bg-sky-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Grid
          </button>
          <button 
            onClick={() => setViewMode('map')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'map' ? 'bg-sky-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Map
          </button>
        </div>
      </div>

      {/* Main Content */}
      <AnimatePresence mode="wait">
        {viewMode === 'grid' ? (
          <motion.div 
            key="grid"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredPools.map(pool => (
              <PoolCard key={pool.id} pool={pool} />
            ))}
            {filteredPools.length === 0 && (
              <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                <p className="text-slate-400 text-lg font-bold">No pools found matching your criteria.</p>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div 
            key="map"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-[600px] rounded-[2.5rem] overflow-hidden border border-slate-200 shadow-xl"
          >
            <PoolMap pools={filteredPools} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
