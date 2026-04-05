"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, MapPin, Calendar, User, Loader2, Globe, Info } from "lucide-react";
import MushroomBadge from "@/components/MushroomBadge";
import { getMushroomImage, getDisplayName } from "@/components/mushroomImageMap";

const MiniMap = dynamic(() => import("@/components/MiniMap"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-stone-100 animate-pulse rounded-[2.5rem]" />,
});

export default function MushroomDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [mushroom, setMushroom] = useState(null);
  const [allMushrooms, setAllMushrooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMushroom = async () => {
      try {
        const res = await fetch("/api/mushrooms");
        const data = await res.json();
        const found = data.mushrooms?.find((m) => (m._id || m.id) === params.id);
        setMushroom(found);
        setAllMushrooms(data.mushrooms);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (params.id) fetchMushroom();
  }, [params.id]);

  if (loading) return <LoadingState />;
  if (!mushroom) return <NotFoundState router={router} />;

  const mushroomData = {
    lat: mushroom.location?.latitude || mushroom.latitude,
    lng: mushroom.location?.longitude || mushroom.longitude,
    name: mushroom.commonName || mushroom.scientificName || mushroom.name || "Unknown Species",
    image: mushroom.images?.[0]?.url || mushroom.image,
  };

  return (
    <div className="min-h-screen bg-[#faf9f6] text-stone-900 selection:bg-emerald-100">
      <nav className="sticky top-0 z-50 bg-white/70 backdrop-blur-md border-b border-stone-200/50">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <button 
            onClick={() => router.back()}
            className="group flex items-center gap-2 text-stone-500 hover:text-emerald-700 transition-colors"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-semibold tracking-tight">Back to gallery</span>
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left Side: Image & Basic Info */}
          <div className="lg:col-span-5 space-y-8">
            <div className="relative aspect-[4/5] rounded-[3rem] overflow-hidden shadow-2xl shadow-stone-200 border-[12px] border-white">
              {mushroomData.image ? (
                <img src={mushroomData.image} alt={mushroomData.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-stone-100 flex items-center justify-center text-stone-300">
                  <MapPin size={48} />
                </div>
              )}
              <div className="absolute top-8 left-8 scale-110">
                <MushroomBadge category={mushroom.ecologicalRole} use={mushroom.commonUses?.[0]} />
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-stone-200/60 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400 mb-4 px-1">Discovered By</p>
              <Link href={`/user/${mushroom.submittedBy?.id}`} className="flex items-center gap-4 group">
                <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex-shrink-0 flex items-center justify-center overflow-hidden ring-4 ring-emerald-50">
                  {mushroom.submittedBy?.dp?.url ? (
                    <img src={mushroom.submittedBy.dp.url} className="w-full h-full object-cover" />
                  ) : (
                    <User className="text-white" size={24} />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-stone-800 group-hover:text-emerald-700 transition-colors leading-tight">
                    {mushroom.submittedBy?.name || "Anonymous Forager"}
                  </h4>
                  <p className="text-xs text-stone-400 font-medium mt-1">Certified Explorer</p>
                </div>
              </Link>
            </div>
          </div>

          {/* Right Side: Taxonomy & Expanded Map */}
          <div className="lg:col-span-7 space-y-10">
            <header>
              <div className="flex items-center gap-2 text-emerald-600 mb-4">
                <Calendar size={16} />
                <span className="text-xs font-bold tracking-[0.2em] uppercase">
                  Captured {new Date(mushroom.photoDateTime || mushroom.createdAt).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                </span>
              </div>
              <h1 className="text-6xl font-black text-stone-900 tracking-tighter leading-[0.9] mb-4">
                {mushroomData.name}
              </h1>
              <p className="text-2xl italic font-medium text-emerald-800/50 font-serif">
                {mushroom.commonName ? (mushroom.scientificName || "Species Incognita") : "Species Incognita"}
              </p>
            </header>

            <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <Stat card label="Ecological Role" value={mushroom.ecologicalRole?.join(", ")} />
               <Stat card label="Texture" value={mushroom.texture} />
               {(mushroom.underside || mushroom.stemPresence || mushroom.commonUses?.length > 0) && (
               <div className="sm:col-span-2 bg-white border border-stone-200/60 rounded-[2.5rem] p-8 space-y-4">
                  <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400 mb-2">Technical Summary</h3>
                  <Stat label="Underside" value={mushroom.underside} />
                  <Stat label="Stem Presence" value={mushroom.stemPresence} />
                  <Stat label="Common Uses" value={mushroom.commonUses?.join(", ")} />
               </div>
               )}
            </section>

            {/* ENLARGED MAP SECTION */}
            <section className="space-y-6 pt-4">
               <div className="flex items-end justify-between px-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-emerald-700">
                      <Globe size={18} />
                      <h3 className="text-sm font-black uppercase tracking-widest">Global Positioning</h3>
                    </div>
                    <p className="text-xs text-stone-400 font-medium">Detailed sighting location in the wild</p>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] font-bold text-stone-400 uppercase tracking-tighter">Coordinates</span>
                    <span className="text-sm font-mono font-bold text-stone-700">{mushroomData.lat?.toFixed(5)}° N, {mushroomData.lng?.toFixed(5)}° E</span>
                  </div>
               </div>
               
               {/* Increased height from 64 to 96 (approx 400px) */}
                <div className="h-96 rounded-[3rem] overflow-hidden border-8 border-white shadow-2xl shadow-stone-200 relative group">
                  <div className="absolute inset-0 bg-emerald-900/5 group-hover:bg-transparent transition-colors z-10 pointer-events-none" />
                  <MiniMap 
                    latitude={mushroomData.lat}
                    longitude={mushroomData.lng}
                    name={mushroomData.name}
                    locations={
                      // Filter for all mushrooms of the same species (using scientific name preferred, fallback to common name)
                      (allMushrooms || []).filter(m => 
                        (mushroom.scientificName && m.scientificName?.toLowerCase() === mushroom.scientificName?.toLowerCase()) ||
                        (!mushroom.scientificName && (m.commonName || m.name) === mushroomData.name)
                      ).map(m => ({
                        lat: m.location?.latitude || m.latitude,
                        lng: m.location?.longitude || m.longitude,
                        name: m.commonName || m.scientificName,
                        id: m._id || m.id
                      })).filter(l => l.lat && l.lng)
                    }
                    currentId={params.id}
                  />
               </div>
            </section>
          </div>

        </div>
      </main>
    </div>
  );
}

function Stat({ label, value, card }) {
  if (!value) return null;
  
  // Get icon for the value if it's a known category/attribute
  const getIconForValue = (val) => {
    if (typeof val !== 'string') return null;
    // Handle arrays like ecologicalRole
    const values = val.includes(',') ? val.split(',').map(v => v.trim()) : [val];
    return values.map(v => getMushroomImage(v.toLowerCase().replace(/ /g, '-')));
  };
  
  const icons = getIconForValue(value);
  const displayValue = typeof value === 'string' ? getDisplayName(value.replace(/-/g, ' ')) : value;
  
  const content = (
    <>
      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-stone-400">{label}</span>
      <div className="flex items-center gap-2">
        {icons && icons.filter(Boolean).length > 0 && (
          <div className="flex gap-1">
            {icons.filter(Boolean).map((icon, idx) => (
              <img key={idx} src={icon} alt="" className="w-6 h-6 object-contain" />
            ))}
          </div>
        )}
        <span className="text-base font-bold text-stone-800 capitalize leading-tight">{displayValue}</span>
      </div>
    </>
  );

  if (card) return <div className="bg-white border border-stone-200/60 p-6 rounded-[2rem] flex flex-col gap-2 shadow-sm">{content}</div>;
  return <div className="flex justify-between items-center py-3 border-b border-stone-100 last:border-0">{content}</div>;
}

function LoadingState() {
  return (
    <div className="min-h-screen bg-[#faf9f6] flex flex-col items-center justify-center gap-6">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" />
        <Loader2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-600" size={24} />
      </div>
      <p className="text-stone-400 font-black uppercase tracking-[0.3em] text-[10px]">Processing Records</p>
    </div>
  );
}

function NotFoundState({ router }) {
  return (
    <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center px-6">
      <div className="max-w-sm text-center">
        <div className="w-24 h-24 bg-white rounded-[2rem] shadow-xl shadow-stone-200 flex items-center justify-center mx-auto mb-8 text-stone-300">
           <Info size={40} />
        </div>
        <h2 className="text-3xl font-black text-stone-900 mb-3 tracking-tight">Lost in the Brush</h2>
        <p className="text-stone-500 mb-10 text-sm leading-relaxed">We couldn't find the specimen you're looking for. It might have been moved or removed from the database.</p>
        <button onClick={() => router.push("/explore")} className="w-full py-4 bg-stone-900 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-stone-200">Return to Exploration</button>
      </div>
    </div>
  );
}