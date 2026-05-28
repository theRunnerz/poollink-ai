import React, { useState, useEffect } from 'react';
import { APIProvider, useMapsLibrary } from '@vis.gl/react-google-maps';
import { motion, AnimatePresence } from 'motion/react';
import { Waves, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

interface PlaceDetails {
  isOpen: boolean | null;
  regularOpeningHours?: any;
}

interface PoolPhotosProps {
  poolName: string;
  poolAddress: string;
  onPlaceDetails?: (details: PlaceDetails) => void;
  children?: React.ReactNode;
}

export default function PoolPhotos({ poolName, poolAddress, onPlaceDetails, children }: PoolPhotosProps) {
  if (!hasValidKey) {
    return <FallbackHeader children={children} message="Link Google Maps API key to see facility photos" />;
  }

  return (
    <APIProvider apiKey={API_KEY} version="weekly">
      <PlacesImageLoader poolName={poolName} poolAddress={poolAddress} onPlaceDetails={onPlaceDetails}>
        {children}
      </PlacesImageLoader>
    </APIProvider>
  );
}

function PlacesImageLoader({ 
  poolName, 
  poolAddress, 
  onPlaceDetails,
  children 
}: { 
  poolName: string; 
  poolAddress: string; 
  onPlaceDetails?: (details: PlaceDetails) => void;
  children?: React.ReactNode;
}) {
  const placesLib = useMapsLibrary('places');
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!placesLib) return;

    let isMounted = true;

    async function fetchPhotos() {
      try {
        console.log('Searching Place photos for:', poolName);
        // We look up the Place via Text Search using Name + Address/Calgary
        const searchQuery = `${poolName}, ${poolAddress}`;
        const { places } = await placesLib.Place.searchByText({
          textQuery: searchQuery,
          fields: ['photos', 'displayName', 'id', 'formattedAddress', 'regularOpeningHours'],
          maxResultCount: 1,
        });

        if (places && places.length > 0) {
          const place = places[0];
          // Try to fetch fields first in case photos is not fully loaded (though searchByText should fetch it)
          if (!place.photos || place.photos.length === 0) {
            await place.fetchFields({ fields: ['photos', 'regularOpeningHours'] });
          }

          if (place.photos && place.photos.length > 0 && isMounted) {
            // Get URLs for the best pictures
            const urls = place.photos.slice(0, 10).map((photo) => 
              photo.getURI({ maxWidth: 1200, maxHeight: 800 })
            );
            setPhotos(urls);
          }

          let isOpenStatus: boolean | null = null;
          try {
            isOpenStatus = await place.isOpen();
          } catch (e) {
            console.warn('Place.isOpen() call failed:', e);
          }

          if (isMounted && onPlaceDetails) {
            onPlaceDetails({
              isOpen: isOpenStatus,
              regularOpeningHours: place.regularOpeningHours
            });
          }
        }
      } catch (error) {
        console.warn('Google Places API call for pool photos failed or returned no results:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchPhotos();

    return () => {
      isMounted = false;
    };
  }, [placesLib, poolName, poolAddress]);

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (photos.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (photos.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  if (loading) {
    return (
      <div className="relative h-80 bg-slate-100 rounded-[3rem] border border-slate-200 flex flex-col items-center justify-center text-slate-400">
        <Loader2 className="w-10 h-10 text-sky-500 animate-spin mb-2" />
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Google Maps Photos...</span>
      </div>
    );
  }

  if (photos.length === 0) {
    return <FallbackHeader children={children} message="No live photos found on Google Maps" />;
  }

  return (
    <div className="relative h-80 bg-slate-950 rounded-[3rem] overflow-hidden border border-slate-200 group">
      {/* Background Image Carousel with motion */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0.8 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0.8 }}
          transition={{ duration: 0.4 }}
          className="absolute inset-0"
        >
          <img 
            src={photos[currentIndex]} 
            alt={`${poolName} scene ${currentIndex + 1}`}
            className="w-full h-full object-cover select-none pointer-events-none"
            referrerPolicy="no-referrer"
          />
        </motion.div>
      </AnimatePresence>

      {/* Modern Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30 rounded-[3rem]"></div>

      {/* Left/Right Arrows for sliding on Hover */}
      {photos.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 border border-white/10"
            aria-label="Previous Photo"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/40 hover:bg-black/70 text-white backdrop-blur-md transition-all opacity-0 group-hover:opacity-100 border border-white/10"
            aria-label="Next Photo"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Photo Counter Indicator */}
      <div className="absolute top-6 right-8 px-4 py-1.5 rounded-full bg-black/60 text-white text-[10px] font-black uppercase tracking-widest backdrop-blur-md border border-white/10">
        Google Maps • {currentIndex + 1} of {photos.length}
      </div>

      {/* Position children components over the picture dynamically */}
      <div className="absolute bottom-10 left-10 right-10 z-10">
        {children}
      </div>
    </div>
  );
}

function FallbackHeader({ 
  children, 
  message 
}: { 
  children?: React.ReactNode; 
  message: string;
}) {
  return (
    <div className="relative h-80 bg-gradient-to-br from-slate-50 to-slate-100 rounded-[3rem] shadow-inner flex items-center justify-center border border-slate-200">
      <div className="flex flex-col items-center gap-4 -translate-y-6">
        <div className="w-16 h-16 bg-white rounded-2xl shadow-md flex items-center justify-center text-slate-300">
          <Waves className="w-8 h-8 text-sky-400" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic">{message}</p>
      </div>
      
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent rounded-[3rem]"></div>
      <div className="absolute bottom-10 left-10 right-10 z-10">
        {children}
      </div>
    </div>
  );
}
