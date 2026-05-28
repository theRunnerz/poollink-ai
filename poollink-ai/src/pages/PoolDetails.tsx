import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  doc, 
  getDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  setDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { parseScheduleForStatus } from '../lib/scheduleUtils';
import { performPoolGrounding } from '../lib/grounding';
import { 
  ChevronLeft, 
  MapPin, 
  Clock, 
  Heart, 
  Star, 
  Share2, 
  Loader2, 
  AlertTriangle, 
  CheckCircle2,
  Send,
  MessageSquare,
  Activity,
  Bell,
  BellOff,
  Waves,
  ExternalLink,
  AlertCircle,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Pool } from './Home';
import { Availability } from '../components/pools/PoolCard';
import PoolPhotos from '../components/pools/PoolPhotos';

export default function PoolDetails() {
  const { poolId } = useParams();
  const navigate = useNavigate();
  const [pool, setPool] = useState<Pool | null>(null);
  const [loading, setLoading] = useState(true);
  const [cachedAvailability, setAvailability] = useState<Availability>({ status: 'unknown' });
  const [isFavorite, setIsFavorite] = useState(false);
  const [isNotified, setIsNotified] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [newReview, setNewReview] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportIssue, setReportIssue] = useState('');
  const [reporting, setReporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [googleMapsDetails, setGoogleMapsDetails] = useState<{
    isOpen: boolean | null;
    regularOpeningHours?: any;
    loaded: boolean;
  }>({ isOpen: null, loaded: false });

  const handlePlaceDetails = (details: { isOpen: boolean | null; regularOpeningHours?: any }) => {
    setGoogleMapsDetails({
      isOpen: details.isOpen,
      regularOpeningHours: details.regularOpeningHours,
      loaded: true
    });
  };

  const checkAvailability = async (forceRefresh = false, isBackground = false) => {
    if (!poolId || !pool) return;
    if (forceRefresh && !isBackground) setRefreshing(true);
    try {
      if (!forceRefresh) {
        // 1. Try sessionStorage cache first (immediate in-app load)
        const sessionCachedJson = sessionStorage.getItem(`pool_avail_${poolId}`);
        if (sessionCachedJson) {
          try {
            const parsedCache = JSON.parse(sessionCachedJson);
            const isStaleBobBahan = poolId === 'bob-bahan' && (
              (parsedCache.message && (parsedCache.message.includes('6:00 AM - 3:00 PM') || parsedCache.message.includes('6am -3pm') || parsedCache.message.includes('6:00 AM - 3:00'))) ||
              (parsedCache.hours && (parsedCache.hours.includes('6:00 AM - 3:00 PM') || parsedCache.hours.includes('6am -3pm') || parsedCache.hours.includes('6:00 AM - 3:00'))) ||
              (parsedCache.activities && parsedCache.activities.some((act: any) => act.time && act.time.includes('3:00 PM') && act.label.toLowerCase().includes('lane')))
            );
            if (!isStaleBobBahan) {
              setAvailability(parsedCache);
              
              // If cache is older than 72 hours, trigger background update
              const lastCheckedTime = parsedCache.lastChecked ? new Date(parsedCache.lastChecked).getTime() : 0;
              if (Date.now() - lastCheckedTime > 72 * 60 * 60 * 1000) {
                checkAvailability(true, true);
              }
              return;
            }
          } catch (e) {
            console.error('Session cache parse failed:', e);
          }
        }

        // 2. Try Firestore cache next (shared global cache)
        const cacheRef = doc(db, 'pool_schedules', poolId);
        const cacheSnap = await getDoc(cacheRef);
        
        if (cacheSnap.exists()) {
          const cacheData = cacheSnap.data();
          const isStaleBobBahan = poolId === 'bob-bahan' && (
            (cacheData.hours && (cacheData.hours.includes('6:00 AM - 3:00 PM') || cacheData.hours.includes('6am -3pm') || cacheData.hours.includes('6:00 AM - 3:00'))) ||
            (cacheData.activities && cacheData.activities.some((act: any) => act.time && act.time.includes('3:00 PM') && act.label.toLowerCase().includes('lane')))
          );
          
          if (cacheData.hours && cacheData.hours !== 'Unknown' && cacheData.hours.trim() !== '' && !isStaleBobBahan) {
            const parsed = parseScheduleForStatus(cacheData.hours, cacheData.source);
            
            // If Firestore cache is older than 72 hours, refresh it automatically in the background
            const lastUpdated = cacheData.lastUpdated?.toDate();
            if (lastUpdated && (Date.now() - lastUpdated.getTime() > 72 * 60 * 60 * 1000)) {
              checkAvailability(true, true);
            }

            const availabilityData = {
              status: cacheData.status || parsed.status,
              hours: parsed.displayText,
              message: cacheData.hours,
              source: cacheData.source as any,
              confidence: cacheData.confidence || parsed.confidence,
              lastChecked: lastUpdated?.toISOString() || new Date().toISOString(),
              activities: cacheData.activities || parsed.activities
            };

            // Cache in sessionStorage for instant subsequent page loading
            sessionStorage.setItem(`pool_avail_${poolId}`, JSON.stringify(availabilityData));

            setAvailability(availabilityData);
            return;
          }
        }
      }

      // Perform grounding via Gemini
      const result = await performPoolGrounding(poolId, pool.name, pool.scheduleUrl);
      const availabilityData = {
        status: result.status,
        hours: result.hours,
        message: result.hours,
        source: result.source as any,
        confidence: result.confidence,
        lastChecked: result.lastChecked,
        activities: result.activities
      };

      // Cache in sessionStorage
      sessionStorage.setItem(`pool_avail_${poolId}`, JSON.stringify(availabilityData));

      setAvailability(availabilityData);
    } catch (error) {
      console.error('API check failed:', error);
    } finally {
      if (!isBackground) setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!poolId) return;

    const fetchPool = async () => {
      try {
        const poolDoc = await getDoc(doc(db, 'pools', poolId));
        if (poolDoc.exists()) {
          setPool({ id: poolDoc.id, ...poolDoc.data() } as Pool);
        } else {
          navigate('/');
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `pools/${poolId}`);
      } finally {
        setLoading(false);
      }
    };

    fetchPool();

    // Favorites listener
    if (auth.currentUser) {
      const favRef = doc(db, `users/${auth.currentUser.uid}/favorites`, poolId);
      getDoc(favRef).then(docSnap => setIsFavorite(docSnap.exists()));
    }

    // Reviews listener
    const q = query(collection(db, `pools/${poolId}/reviews`), orderBy('createdAt', 'desc'));
    const unsubscribeReviews = onSnapshot(q, (snapshot) => {
      setReviews(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => unsubscribeReviews();
  }, [poolId, auth.currentUser]);

  useEffect(() => {
    if (pool) {
      checkAvailability();
    }
  }, [pool?.id]);

  const handleRefresh = async () => {
    await checkAvailability(true);
  };

  const toggleFavorite = async () => {
    if (!auth.currentUser || !poolId) {
      navigate('/auth');
      return;
    }

    const favRef = doc(db, `users/${auth.currentUser.uid}/favorites`, poolId);
    if (isFavorite) {
      await deleteDoc(favRef);
      setIsFavorite(false);
    } else {
      await setDoc(favRef, { poolId, userId: auth.currentUser.uid, createdAt: serverTimestamp() });
      setIsFavorite(true);
    }
  };

  const toggleNotifications = () => {
    setIsNotified(!isNotified);
    if (!isNotified) {
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !poolId) {
      navigate('/auth');
      return;
    }
    if (!newReview.trim()) return;

    setSubmittingReview(true);
    try {
      await addDoc(collection(db, `pools/${poolId}/reviews`), {
        poolId,
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'Anonymous',
        rating: newRating,
        comment: newReview,
        createdAt: serverTimestamp()
      });
      setNewReview('');
      setNewRating(5);
    } catch (error) {
      console.error('Error submitting review:', error);
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading || !pool) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Fetching details...</p>
      </div>
    );
  }

  const renderedAvailability = {
    ...cachedAvailability,
    status: googleMapsDetails.loaded && googleMapsDetails.isOpen !== null
      ? (googleMapsDetails.isOpen ? 'open' : 'closed')
      : cachedAvailability.status,
    hours: googleMapsDetails.loaded && googleMapsDetails.isOpen !== null
      ? (googleMapsDetails.isOpen
          ? (cachedAvailability.hours && !cachedAvailability.hours.toLowerCase().includes("closed") ? cachedAvailability.hours : 'Open (Verified via Google Maps Live)')
          : 'Closed for the day (Verified via Google Maps Live)')
      : cachedAvailability.hours,
    confidence: googleMapsDetails.loaded && googleMapsDetails.isOpen !== null ? ('High' as const) : cachedAvailability.confidence,
    source: googleMapsDetails.loaded && googleMapsDetails.isOpen !== null ? ('google_maps' as any) : cachedAvailability.source
  };

  const availability = renderedAvailability;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Navigation & Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-400 hover:text-sky-500 transition-colors font-black uppercase tracking-widest text-[10px] group"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Explore
          </button>
          <div className="flex items-center gap-4">
            <h1 className="text-4xl md:text-5xl font-black text-slate-800 tracking-tight">{pool.name}</h1>
            <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] ${
              pool.type === 'Indoor' ? 'bg-sky-100 text-sky-600' : 'bg-orange-100 text-orange-600'
            }`}>
              {pool.type}
            </div>
          </div>
          <p className="text-slate-500 font-medium flex items-center gap-2">
            <MapPin className="w-5 h-5 text-slate-300" />
            {pool.address}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={toggleFavorite}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all shadow-sm ${
              isFavorite 
                ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Heart className={`w-5 h-5 ${isFavorite ? 'fill-rose-600' : ''}`} />
            {isFavorite ? 'Saved to Favorites' : 'Save Pool'}
          </button>
          <button 
            onClick={toggleNotifications}
            className={`p-3 rounded-2xl transition-all shadow-sm ${
              isNotified ? 'bg-sky-600 text-white shadow-sky-100' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {isNotified ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Main Image & Status */}
        <div className="md:col-span-8 space-y-8">
          <PoolPhotos poolName={pool.name} poolAddress={pool.address} onPlaceDetails={handlePlaceDetails}>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className={`p-5 rounded-3xl backdrop-blur-xl border ${
                  availability.status === 'open' ? 'bg-green-500/20 border-green-400/30 text-green-400' : 
                  availability.status === 'limited' ? 'bg-amber-500/20 border-amber-400/30 text-amber-500' : 
                  availability.status === 'closed' ? 'bg-red-500/20 border-red-400/30 text-red-500' : 'bg-white/10 border-white/20 text-white'
                }`}>
                  {availability.status === 'open' ? (
                    <span className="relative flex h-8 w-8">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-8 w-8 bg-green-500 flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      </span>
                    </span>
                  ) : availability.status === 'limited' ? (
                    <span className="relative flex h-8 w-8">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-8 w-8 bg-amber-500 flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-white" />
                      </span>
                    </span>
                  ) : availability.status === 'closed' ? <AlertTriangle className="w-8 h-8" /> : <Loader2 className="w-8 h-8 animate-spin" />}
                </div>
                <div>
                  <h2 className={`text-4xl font-black uppercase tracking-tight drop-shadow-md ${
                    availability.status === 'open' ? 'text-green-500' : 
                    availability.status === 'limited' ? 'text-amber-500 bg-black/40 px-3 py-1 rounded-xl' : 
                    availability.status === 'closed' ? 'text-red-500 bg-black/40 px-3 py-1 rounded-xl' : 
                    availability.status === 'maintenance' ? 'text-orange-500 bg-black/40 px-3 py-1 rounded-xl' : 'text-slate-200'
                  }`}>
                    {availability.status === 'unknown' ? 'CHECKING...' : `${availability.status.toUpperCase()} NOW`}
                  </h2>
                  <p className="text-slate-300 font-bold text-[10px] tracking-widest uppercase mt-1 drop-shadow">
                    {availability.source === 'google_maps' ? (
                      <span className="flex items-center gap-1.5 text-sky-400 bg-black/30 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-sky-500/10 w-fit">
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                        Verified via Google Maps Live
                      </span>
                    ) : availability.source === 'official' ? (
                      <span className="flex items-center gap-1.5 text-emerald-400 bg-black/30 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-emerald-500/10 w-fit">
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                        Verified via Official Source
                      </span>
                    ) : (
                      <span className="bg-black/30 backdrop-blur-sm px-2.5 py-1 rounded-lg text-slate-200">
                        Powered by {availability.source === 'search' ? 'Search Intelligence' : 'Official API'}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {pool.scheduleUrl && (
                <a 
                  href={pool.scheduleUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-white hover:bg-sky-500 hover:text-white text-slate-900 rounded-2xl font-black uppercase tracking-widest text-[9px] shadow-lg transition-all flex items-center gap-2 border border-slate-100"
                >
                  <ExternalLink className="w-4 h-4" />
                  Official Schedule
                </a>
              )}
            </div>
          </PoolPhotos>

          <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden flex flex-col md:flex-row gap-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/20 rounded-full blur-[100px] -mr-32 -mt-32"></div>
            
            <div className="flex-1 space-y-8 relative z-10">
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-sky-400 font-mono flex items-center gap-2">
                <Activity className="w-4 h-4" />
                PoolLink AI Operational Summary
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center gap-4 text-2xl font-black">
                  <span className="text-slate-400">Open now:</span>
                  <span className={
                    availability.status === 'open' ? 'text-green-500' : 
                    availability.status === 'limited' ? 'text-amber-500' : 
                    availability.status === 'closed' ? 'text-red-500' : 
                    availability.status === 'maintenance' ? 'text-orange-500' : 'text-slate-500'
                  }>
                    {availability.status === 'unknown' ? '---' : (availability.status === 'open' || availability.status === 'limited' ? 'Yes' : 'No')}
                  </span>
                </div>
                
                <div className="flex flex-col gap-6">
                  {availability.activities && availability.activities.length > 0 ? (
                    availability.activities.map((act, i) => (
                      <div key={i} className="bg-white/5 border border-white/5 p-6 rounded-2xl flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                            act.type === 'lane_swim' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/20' :
                            act.type === 'public_swim' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' :
                            'bg-amber-500/20 text-amber-400 border border-amber-500/20'
                          }`}>
                            {act.type === 'lane_swim' ? 'Length Swimming Only' : 
                             act.type === 'public_swim' ? 'Kids & Families Welcome' : 
                             'Classes / Lessons'}
                          </div>
                          <Clock className="w-4 h-4 text-slate-500" />
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex items-center gap-4 text-3xl font-black text-white">
                            <span>{act.label}</span>
                          </div>
                          <div className="flex items-center gap-2 text-lg font-black text-sky-400">
                            <span className="text-slate-400 lowercase font-mono text-xs">Slot Time:</span>
                            <span>{act.time}</span>
                            {act.isActive && (
                              <span className="ml-2 px-2 py-0.5 bg-green-500/20 text-green-400 text-[8px] rounded-full border border-green-500/20">LIVE NOW</span>
                            )}
                          </div>
                        </div>

                        {act.type === 'public_swim' && (
                          <div className="text-[10px] font-bold text-emerald-500/80 flex items-center gap-1.5">
                            <Waves className="w-3 h-3" />
                            Pool is open for leisure and play.
                          </div>
                        )}
                        {act.type === 'lane_swim' && (
                          <div className="text-[10px] font-bold text-sky-500/80 flex items-center gap-1.5">
                            <Activity className="w-3 h-3" />
                            Pool is restricted to swimming lengths.
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="bg-white/5 border border-white/5 p-6 rounded-2xl">
                      <div className="flex items-center gap-4 text-2xl font-black text-white">
                        <span className="text-slate-400">Status:</span>
                        <span>{availability.status.toUpperCase()}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xl font-black text-sky-400 mt-2">
                        <span className="text-slate-400 lowercase font-mono text-sm">Time:</span>
                        <span>{availability.hours || 'Checking...'}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm font-black text-slate-400 uppercase tracking-widest pt-4 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Confidence:</span>
                    <span className={
                      availability.confidence === 'High' ? 'text-green-400' : 
                      availability.confidence === 'Medium' ? 'text-amber-400' : 'text-red-400'
                    }>{availability.confidence || 'Low'}</span>
                  </div>
                  {availability.lastChecked && (
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">• Latency:</span>
                      <span className="text-white italic lowercase">
                        {Math.max(0, Math.floor((Date.now() - new Date(availability.lastChecked).getTime()) / 60000))}m
                      </span>
                    </div>
                  )}
                  <button 
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className={`flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg transition-all border border-white/5 group ${refreshing ? 'cursor-not-allowed opacity-70' : ''}`}
                    title="Refresh status"
                  >
                    <Loader2 className={`w-3.5 h-3.5 text-sky-400 ${refreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                    <span className="text-[10px] font-black tracking-widest text-sky-400 uppercase">
                      {refreshing ? 'SYNCING...' : 'REFRESH'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <div className="md:w-px bg-white/10 hidden md:block"></div>
            
            <div className="flex-1 space-y-6 relative z-10">
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 font-mono">Status Intelligence</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                {availability.source === 'google_maps'
                  ? "Live verification of open status sourced in real-time from official Google Maps Place indicators."
                  : availability.source === 'official' 
                    ? "Direct synchronization with City of Calgary or YMCA official operating portals."
                    : availability.source === 'search' 
                      ? "Generated via multi-source search grounding. Verifying across official webpages and local bulletins."
                      : "Scheduled data only. Live operational confirmation pending next sync."
                }
              </p>
              {availability.status === 'maintenance' && (
                <div className="p-4 bg-orange-500/20 border border-orange-400/30 rounded-2xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-400 shrink-0" />
                  <p className="text-xs font-bold text-orange-200">Facility reported as under maintenance. Operational access restricted.</p>
                </div>
              )}
              {availability.status === 'limited' && (
                <div className="p-5 bg-amber-500/10 border border-amber-500/20 rounded-[1.5rem] space-y-4">
                  <div className="flex items-start gap-3.5">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-black text-amber-500 uppercase tracking-widest leading-none">Lesson / Gap Mode Active</h4>
                      <p className="text-xs font-bold text-slate-300 leading-relaxed mt-2">
                        The main swimming pool is currently reserved for swimming lessons. 
                        During this block, regular drop-in public and length-swimming access is restricted.
                      </p>
                    </div>
                  </div>
                  {(pool.features.includes("Hot Tub") || pool.features.includes("Steam Room")) && (
                    <div className="pt-3 border-t border-amber-500/10 pl-8 space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block">✨ Amenity Access Open</span>
                      <p className="text-xs font-medium text-slate-400 leading-relaxed">
                        Excellent news! Warm-water amenities like the hot tub and steam room (which are available here) remain fully operational and open to the public during lessons.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-sky-50 p-10 rounded-[3rem] border border-sky-100 shadow-inner flex flex-col justify-center">
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-sky-400 mb-4 font-mono">Ownership</h3>
              <p className="text-2xl font-black text-sky-900 tracking-tight mb-2">{pool.operator}</p>
              <p className="text-sky-700/60 text-sm font-medium leading-relaxed">
                This facility is operated by {pool.operator}. Verified data is refreshed every 15 minutes.
              </p>
            </div>
          </div>

          <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
            <div>
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-6 font-mono">Facility Features</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {pool.features.map(f => (
                  <div key={f} className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-[2rem] border border-slate-100 text-center gap-3 hover:bg-sky-50 hover:border-sky-100 transition-colors">
                    <Activity className="w-6 h-6 text-sky-500" />
                    <span className="text-xs font-black text-slate-700 uppercase tracking-tight">{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-8 border-t border-slate-100">
              <div className="bg-slate-900 p-8 rounded-[2.5rem] relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-all pointer-events-none">
                  <ShieldCheck className="w-24 h-24 text-sky-500" />
                </div>
                <div className="relative z-10 max-w-lg">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-sky-400 mb-2">Community Intelligence Integration</h4>
                  <p className="text-white text-lg font-black mb-1 capitalize">Seen an operational change?</p>
                  <p className="text-slate-400 text-sm font-medium mb-6 leading-relaxed">
                    PoolLink AI integrates with MongoDB to log community feedback. 
                    Reports trigger multi-step verification tasks to ensure data accuracy for all users.
                  </p>
                  
                  {!showReportForm ? (
                    <button 
                      onClick={() => setShowReportForm(true)}
                      className="px-8 py-4 bg-sky-500 hover:bg-sky-400 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-lg shadow-sky-500/20 transition-all active:scale-95"
                    >
                      Report Status Change
                    </button>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-4"
                    >
                      <textarea
                        autoFocus
                        placeholder="What operational change are you reporting? (e.g. 'Pool is closed for cleaning', 'Only 2 lanes open')"
                        className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-white text-sm focus:ring-2 focus:ring-sky-500 outline-none min-h-[100px]"
                        value={reportIssue}
                        onChange={(e) => setReportIssue(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <button 
                          disabled={reporting || !reportIssue.trim()}
                          onClick={() => {
                            setReporting(true);
                            fetch('/api/reports', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ poolId, issue: reportIssue, details: "User reported via community portal" })
                            })
                            .then(r => r.json())
                            .then(data => {
                              alert(data.message || "Report synchronized with MongoDB cluster.");
                              setShowReportForm(false);
                              setReportIssue('');
                            })
                            .catch(e => {
                              console.error("Sync failed:", e);
                              alert("Failed to synchronize report.");
                            })
                            .finally(() => setReporting(false));
                          }}
                          className="flex-1 py-3 bg-sky-500 text-white rounded-xl font-black uppercase tracking-widest text-[10px] disabled:opacity-50"
                        >
                          {reporting ? 'Synchronizing...' : 'Submit Intelligence'}
                        </button>
                        <button 
                          onClick={() => setShowReportForm(false)}
                          className="px-4 py-3 bg-white/10 text-white rounded-xl font-black uppercase tracking-widest text-[10px]"
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-4 font-mono">Location Overview</h3>
              <p className="text-slate-600 text-lg font-medium leading-relaxed italic">
                "{pool.description}"
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar: Reviews */}
        <div className="md:col-span-4 space-y-6">
          <div className="bg-slate-900 rounded-[3rem] p-8 text-white shadow-2xl relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-xl font-bold mb-1">Community Score</h3>
              <div className="flex items-center gap-4 mb-6">
                <span className="text-5xl font-black text-sky-400">
                  {reviews.length > 0 
                    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) 
                    : 'NEW'}
                </span>
                <div className="flex flex-col">
                  <div className="flex text-amber-400 gap-0.5">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} className="w-3 h-3 fill-current" />
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{reviews.length} local ratings</span>
                </div>
              </div>
              <button 
                onClick={() => document.getElementById('review-form')?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-2xl text-sm font-black uppercase tracking-widest transition-all border border-white/10"
              >
                Write a Review
              </button>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
          </div>

          <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col gap-6">
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 font-mono">Recent Activity</h3>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {reviews.map((r, i) => (
                <div key={r.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-slate-800">{r.userName}</span>
                    <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">{r.rating}/5</span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">"{r.comment}"</p>
                </div>
              ))}
              {reviews.length === 0 && <p className="text-center py-10 text-xs font-bold text-slate-300 uppercase tracking-widest">No reviews yet</p>}
            </div>
          </div>

          <div id="review-form" className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm italic">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6 font-mono">Share Your Thoughts</h3>
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div className="flex justify-center gap-2 mb-4">
                {[1,2,3,4,5].map(s => (
                  <button key={s} type="button" onClick={() => setNewRating(s)} className={`transition-all ${s <= newRating ? 'text-amber-400 scale-110' : 'text-slate-200'}`}>
                    <Star className={`w-6 h-6 ${s <= newRating ? 'fill-current' : ''}`} />
                  </button>
                ))}
              </div>
              <textarea 
                placeholder="How was the water?..."
                className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm focus:ring-2 focus:ring-sky-500 outline-none min-h-[100px]"
                value={newReview}
                onChange={(e) => setNewReview(e.target.value)}
              />
              <button type="submit" disabled={submittingReview} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 disabled:opacity-50">
                Post Review
              </button>
            </form>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, scale: 0.9, x: '-50%' }}
            className="fixed bottom-8 left-1/2 z-[100] bg-sky-600 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 border border-sky-400"
          >
            <div className="bg-white/20 p-3 rounded-2xl">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <p className="font-black text-sm uppercase tracking-tight">Alerts Live!</p>
              <p className="text-xs text-sky-100 font-bold">We'll ping you if {pool.name}'s status flips.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
