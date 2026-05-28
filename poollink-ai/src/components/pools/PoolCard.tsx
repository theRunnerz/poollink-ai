import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Info, Waves } from 'lucide-react';
import { motion } from 'motion/react';
import { Pool } from '../../pages/Home';

interface PoolCardProps {
  pool: Pool;
  key?: string;
}

export type Availability = {
  status: 'open' | 'closed' | 'maintenance' | 'limited' | 'unknown';
  hours?: string;
  message?: string;
  source?: 'official' | 'api' | 'search';
  confidence?: 'High' | 'Medium' | 'Low';
  lastChecked?: string;
  activities?: { type: string, label: string, time: string }[];
};

export default function PoolCard({ pool }: PoolCardProps) {
  return (
    <motion.div 
      whileHover={{ y: -8, scale: 1.02 }}
      className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-slate-200 hover:shadow-2xl hover:shadow-sky-100 transition-all group flex flex-col h-full"
    >
      <div className="relative h-40 bg-slate-100 flex items-center justify-center">
        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-300">
          <Waves className="w-8 h-8" />
        </div>
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md shadow-sm border ${
            pool.type === 'Indoor' || pool.type === 'Leisure Centre' ? 'bg-sky-600/90 text-white border-sky-400' : 'bg-orange-500/90 text-white border-orange-300'
          }`}>
            {pool.type}
          </span>
          <span className="px-3 py-1 bg-white/90 backdrop-blur-md text-[9px] font-black uppercase tracking-widest text-slate-800 rounded-lg shadow-sm border border-slate-100 w-fit">
            {pool.operator}
          </span>
        </div>
      </div>

      <div className="p-8 flex flex-col flex-1">
        <div className="flex justify-between items-start gap-4 mb-3">
          <h3 className="text-2xl font-extrabold text-slate-800 leading-tight">
            {pool.name}
          </h3>
        </div>
        
        <p className="text-slate-500 text-sm font-medium mb-6 flex items-center gap-1.5">
          <MapPin className="w-4 h-4 opacity-50" />
          {pool.address.split(',')[0]}
        </p>

        <div className="flex flex-wrap gap-2 mb-6">
          {pool.features.slice(0, 3).map(feature => (
            <span key={feature} className="text-[9px] font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 uppercase tracking-wider">
              {feature}
            </span>
          ))}
        </div>

        <div className="mt-auto pt-6 border-t border-slate-50 flex items-center justify-end">
          <Link 
            to={`/pool/${pool.id}`}
            className="px-6 py-3 bg-slate-900 border border-slate-800 text-white rounded-2xl flex items-center gap-2.5 hover:bg-sky-500 hover:border-sky-400 transition-all shadow-lg active:scale-95"
            id={`check-status-${pool.id}`}
          >
            <span className="text-[10px] font-black uppercase tracking-widest">Check Status</span>
            <Info className="w-4 h-4 opacity-50" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

