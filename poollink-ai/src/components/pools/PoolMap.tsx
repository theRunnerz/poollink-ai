import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useAdvancedMarkerRef } from '@vis.gl/react-google-maps';
import { useState } from 'react';
import { Pool } from '../../pages/Home';
import { Link } from 'react-router-dom';

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

interface PoolMapProps {
  pools: Pool[];
}

export default function PoolMap({ pools }: PoolMapProps) {
  if (!hasValidKey) {
    return (
      <div className="flex flex-col items-center justify-center h-[500px] bg-sky-50 rounded-[2.5rem] p-8 text-center border-2 border-dashed border-sky-100">
        <div className="bg-white p-8 rounded-[2rem] shadow-2xl max-w-sm border border-slate-100">
          <h2 className="text-2xl font-black text-slate-800 mb-4 tracking-tight">Map Access Required</h2>
          <p className="text-sm text-slate-600 mb-8 leading-relaxed font-medium">
            Link your <strong>GOOGLE_MAPS_PLATFORM_KEY</strong> in the environment secrets to unlock live facility tracking.
          </p>
          <div className="space-y-4 text-left">
            <div className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 bg-sky-100 text-sky-600 rounded-xl flex items-center justify-center text-xs font-black">01</span>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-tight">Open Settings → Secrets</p>
            </div>
            <div className="flex gap-4">
              <span className="flex-shrink-0 w-8 h-8 bg-sky-100 text-sky-600 rounded-xl flex items-center justify-center text-xs font-black">02</span>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-tight">Add Platform Key</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={API_KEY} version="weekly">
      <Map
        defaultCenter={{ lat: 51.0447, lng: -114.0719 }}
        defaultZoom={11}
        mapId="POOL_MAP_ID"
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        className="w-full h-full"
      >
        {pools.map(pool => (
          <PoolMarker key={pool.id} pool={pool} />
        ))}
      </Map>
    </APIProvider>
  );
}

function PoolMarker({ pool }: { pool: Pool; key?: string }) {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [infoWindowShown, setInfoWindowShown] = useState(false);

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: pool.lat, lng: pool.lng }}
        title={pool.name}
        onClick={() => setInfoWindowShown(true)}
      >
        <Pin 
          background={pool.type === 'Indoor' ? '#0ea5e9' : '#f97316'} 
          glyphColor="#fff" 
          borderColor="#fff"
        />
      </AdvancedMarker>
      {infoWindowShown && (
        <InfoWindow
          anchor={marker}
          onCloseClick={() => setInfoWindowShown(false)}
        >
          <div className="p-2 max-w-[200px]">
            <h4 className="font-bold text-slate-800 text-sm mb-1">{pool.name}</h4>
            <p className="text-xs text-slate-500 mb-3">{pool.address}</p>
            <Link 
              to={`/pool/${pool.id}`}
              className="block text-center py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-sky-600 transition-all"
            >
              Details
            </Link>
          </div>
        </InfoWindow>
      )}
    </>
  );
}
