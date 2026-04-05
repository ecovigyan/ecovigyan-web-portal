"use client";

import { X, MapPin, Calendar, User, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MUSHROOM_IMAGE_MAP } from "./mushroomImageMap";

// Helper function to format enum values for display
function formatLabel(value) {
  if (!value) return null;
  return value
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Helper function to get image path for a trait value
function getTraitImage(value) {
  if (!value) return null;
  // Normalize the value to match MUSHROOM_IMAGE_MAP keys (lowercase, hyphenated)
  const normalizedValue = value.toString().toLowerCase().replace(/\s+/g, '-');
  return MUSHROOM_IMAGE_MAP[normalizedValue] || null;
}

// TraitItem component for displaying mushroom characteristics
const TraitItem = ({ label, children, icon, color }) => {
  if (!children || (Array.isArray(children) && children.length === 0)) return null;
  const items = Array.isArray(children) ? children : [children];
  
  const colors = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    purple: "bg-purple-50 text-purple-700 border-purple-100",
    orange: "bg-orange-50 text-orange-700 border-orange-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
    red: "bg-red-50 text-red-700 border-red-100",
  };

  // Get the first item's image for the label icon
  const firstItemImage = getTraitImage(items[0]);

  return (
    <div className="space-y-2">
      <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
        {firstItemImage ? (
          <img src={firstItemImage} alt="" className="w-4 h-4 object-contain" />
        ) : (
          <span>{icon}</span>
        )}
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it, i) => {
          const itemImage = getTraitImage(it);
          return (
            <span key={i} className={`px-2 py-0.5 rounded-md text-[11px] font-bold border flex items-center gap-1.5 ${colors[color]}`}>
              {itemImage && <img src={itemImage} alt="" className="w-3.5 h-3.5 object-contain" />}
              {formatLabel(it.toString())}
            </span>
          );
        })}
      </div>
    </div>
  );
};

export default function MushroomDetailModal({ isOpen, onClose, mushroom }) {
  const router = useRouter();

  if (!isOpen || !mushroom) return null;

  // Extract user ID and check if it's a system user
  let userId = null;
  const contributorName =
    mushroom.contributor ||
    mushroom.submittedBy?.name ||
    mushroom.submittedBy?.username ||
    "Anonymous";
  const isSystemUser =
    mushroom.submittedBy?.email === "system@ecovigyan.org" ||
    mushroom.submittedBy?.username === "system" ||
    mushroom.submittedBy?.name === "System Import" ||
    contributorName === "System Import" ||
    contributorName === "system";

  if (mushroom.submittedBy && !isSystemUser) {
    if (typeof mushroom.submittedBy === "string") {
      userId = mushroom.submittedBy;
    } else if (mushroom.submittedBy._id) {
      const idString =
        typeof mushroom.submittedBy._id === "string"
          ? mushroom.submittedBy._id
          : mushroom.submittedBy._id.toString();
      if (/^[0-9a-fA-F]{24}$/.test(idString)) {
        userId = idString;
      }
    }
  }

  // Get original Google Drive link for system imports
  let originalDriveLink =
    mushroom.images?.[0]?.originalDriveLink || null;

  // Fallback: reconstruct from image URL if needed
  if (isSystemUser && !originalDriveLink) {
    const imageUrl = mushroom.image || mushroom.images?.[0]?.url;
    if (imageUrl && imageUrl.includes("drive.google.com/uc?")) {
      const idMatch = imageUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (idMatch && idMatch[1]) {
        originalDriveLink = `https://drive.google.com/file/d/${idMatch[1]}/view`;
      }
    }
  }

  const handleUsernameClick = (e) => {
    e.stopPropagation();
    if (userId) {
      router.push(`/user/${userId}`);
      onClose();
    }
  };

  return (
   <div
  className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[110] flex items-center justify-center p-4 transition-all"
  onClick={onClose}
>
  <div
    className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-white/20"
    onClick={(e) => e.stopPropagation()}
  >
    {/* HEADER */}
    <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-white/80 backdrop-blur-sm sticky top-0 z-20">
      <div>
        <h2 className="text-sm font-black text-emerald-600 uppercase tracking-[0.2em]">
          Species Profile
        </h2>
        <p className="text-2xl font-bold text-slate-900 leading-tight">
          {mushroom.commonName || mushroom.scientificName || "Unnamed Mushroom"}
        </p>
      </div>
      <button
        onClick={onClose}
        className="p-2.5 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-all duration-200 group"
      >
        <X size={20} className="group-hover:rotate-90 transition-transform" />
      </button>
    </div>

    {/* SCROLLABLE CONTENT */}
    <div className="overflow-y-auto custom-scrollbar bg-slate-50/50">
      <div className="p-6 space-y-6">
        
        {/* HERO IMAGE SECTION */}
        {(mushroom.image || mushroom.images?.[0]?.url) && (
          <div className="relative group">
            <div className="relative w-full h-64 md:h-80 rounded-2xl overflow-hidden shadow-lg border-4 border-white">
              <img
                src={mushroom.image || mushroom.images?.[0]?.url}
                alt={mushroom.commonName || mushroom.scientificName}
                className="w-full h-full object-cover"
              />
              {/* Subtle Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60" />
              
              {/* Float Date Badge on Image */}
              {(mushroom.photoDateTime || mushroom.createdAt) && (
                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg text-[11px] font-bold text-slate-700 shadow-sm flex items-center gap-2">
                  <Calendar size={14} className="text-emerald-500" />
                  {new Date(mushroom.photoDateTime || mushroom.createdAt).toLocaleDateString(undefined, { dateStyle: 'long' })}
                </div>
              )}
            </div>
            
            {/* GOOGLE DRIVE ACTION */}
            {isSystemUser && originalDriveLink && (
              <button
                onClick={() => window.open(originalDriveLink, "_blank")}
                className="absolute -bottom-3 right-6 flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-bold shadow-xl hover:scale-105 transition-all"
              >
                <ExternalLink size={14} />
                Source Assets
              </button>
            )}
          </div>
        )}

        {/* PRIMARY INFO GRID */}
        <div className="grid md:grid-cols-2 gap-5">
          {/* DESCRIPTION CARD */}
          <div className="md:col-span-2 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Scientific Identity & Notes</label>
             <p className="text-lg font-medium text-slate-700 italic mb-2 leading-tight">
               {mushroom.scientificName || "Genus species"}
             </p>
             <p className="text-sm text-slate-600 leading-relaxed italic">
               "{mushroom.description || "No description provided for this specimen."}"
             </p>
          </div>

          {/* METADATA CARDS */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Discovery Location</label>
              <div className="flex items-center gap-3 text-slate-700">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <MapPin size={18} className="text-emerald-600" />
                </div>
                <div className="text-sm font-semibold">
                  {mushroom.location?.latitude?.toFixed(5)}°N, {mushroom.location?.longitude?.toFixed(5)}°E
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Contributor</label>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                  <User size={18} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-800 leading-none">{contributorName}</span>
                  {userId && (
                    <button onClick={handleUsernameClick} className="text-[11px] text-emerald-600 font-bold hover:underline mt-1 text-left">
                      View Profile →
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CLASSIFICATION & TRAITS SECTION */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block text-center">Specimen Characteristics</label>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-4">
            {/* Roles */}
            <TraitItem label="Ecological Role" icon="🌱" color="blue">
               {mushroom.ecologicalRole}
            </TraitItem>

            {/* Texture */}
            {mushroom.texture && (
              <TraitItem label="Texture" icon="✋" color="purple">
                {mushroom.texture}
              </TraitItem>
            )}

            {/* Underside */}
            {mushroom.underside && (
              <TraitItem label="Underside" icon="🔍" color="orange">
                {mushroom.underside}
              </TraitItem>
            )}

            {/* Fruiting Surface */}
            {mushroom.fruitingSurface && (
              <TraitItem label="Fruiting Surface" icon="🍄" color="emerald">
                {mushroom.fruitingSurface}
              </TraitItem>
            )}

            {/* Stem */}
            {mushroom.stemPresence && (
              <TraitItem label="Stem Presence" icon="📏" color="indigo">
                {mushroom.stemPresence}
              </TraitItem>
            )}

            {/* Uses */}
            <TraitItem label="Common Uses" icon="🧪" color="red">
              {mushroom.commonUses || mushroom.use}
            </TraitItem>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
  );
}

