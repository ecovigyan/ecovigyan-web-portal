"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  CheckCircle,
  User as UserIcon,
  Award,
  Image as ImageIcon,
  ExternalLink,
  Settings,
} from "lucide-react";
import toast from "react-hot-toast";
import MushroomBadge from "@/components/MushroomBadge";
import { useAuth } from "@/context/AuthContext";
import { hasAdminAccess } from "@/lib/permissions";

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.id;
  const { user: currentUser } = useAuth();

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if current user is viewing their own profile
  const isOwnProfile = currentUser && (
    currentUser.id === userId || 
    currentUser._id === userId || 
    currentUser._id?.toString() === userId
  );

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/users/${userId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch profile");
      setProfileData(data);
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) fetchUserProfile();
  }, [userId]);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
    });
  };

  if (loading) return <LoadingSkeleton />;
  if (error || !profileData) return <ErrorState error={error} />;

  const { user, mushrooms, submissionCount } = profileData;

  return (
    <div className="min-h-screen bg-[#F9FAF8]">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        {/* Back Button */}
        <Link 
          href="/explore" 
          className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-semibold mb-8 transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Mushroom Mania
        </Link>

        {/* PROFILE HEADER - MushroomHub Style */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-[48px] p-8 md:p-12 mb-12 border border-emerald-100">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Avatar with Decorative Background */}
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 bg-emerald-200 rounded-full scale-110 blur-2xl opacity-30" />
              <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-xl">
                {user.dp?.url ? (
                  <img src={user.dp.url} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-5xl">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              {user.isVerified && (
                <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1.5 rounded-xl shadow-lg border-2 border-white">
                  <CheckCircle className="w-5 h-5 fill-current" />
                </div>
              )}
            </div>

            {/* User Info */}
            <div className="text-center md:text-left flex-1">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-2">
                <div>
                  <h1 className="text-4xl md:text-5xl font-bold font-serif text-emerald-950 mb-2">
                    {user.name}
                  </h1>
                  <div className="flex items-center gap-2 justify-center md:justify-start mb-4">
                    <p className="text-emerald-600 font-bold text-lg">
                      {user.role && user.role !== 'user' ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Contributor'}
                    </p>
                    {user.role && user.role !== 'user' && (
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide ${
                        hasAdminAccess(user) 
                          ? 'bg-red-100 text-red-700' 
                          : user.role === 'writer'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {user.role}
                      </span>
                    )}
                  </div>
                </div>
                {/* Settings Icon - Only show for own profile */}
                {isOwnProfile && (
                  <Link
                    href="/account"
                    className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-white rounded-xl transition-all flex-shrink-0 self-center md:self-start"
                    title="Account Settings"
                  >
                    <Settings className="w-5 h-5" />
                  </Link>
                )}
              </div>

              {user.bio && (
                <p className="text-emerald-800/70 text-sm leading-relaxed mb-6 max-w-2xl">
                  {user.bio}
                </p>
              )}

              {/* Stats */}
              <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                <div className="bg-white px-6 py-3 rounded-2xl border border-emerald-100 shadow-sm">
                  <span className="text-2xl font-bold text-emerald-900">{submissionCount}</span>
                  <span className="text-xs font-bold text-emerald-900/40 uppercase ml-2">Observations</span>
                </div>
                <div className="bg-white px-6 py-3 rounded-2xl border border-emerald-100 shadow-sm">
                  <span className="text-2xl font-bold text-emerald-900">{user.points || 0}</span>
                  <span className="text-xs font-bold text-emerald-900/40 uppercase ml-2">Points</span>
                </div>
                <div className="bg-white px-6 py-3 rounded-2xl border border-emerald-100 shadow-sm flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-800">Joined {formatDate(user.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SUBMISSIONS SECTION */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold font-serif text-emerald-950 mb-2">Submissions</h2>
              <p className="text-emerald-800/60">Verified field observations</p>
            </div>
            <div className="bg-emerald-600 text-white px-4 py-2 rounded-full font-bold text-sm">
              {submissionCount} Total
            </div>
          </div>

          {mushrooms.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {mushrooms.map((mushroom) => (
                <MushroomCard key={mushroom._id} mushroom={mushroom} formatDate={formatDate} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

/* HELPER COMPONENTS FOR CLEANER CODE */

function MushroomCard({ mushroom, formatDate }) {
  const router = useRouter();
  
  const handleViewOnMap = (e) => {
    e.stopPropagation();
    router.push(`/explore?highlight=${mushroom._id}`);
  };

  const handleCardClick = () => {
    router.push(`/mushroom/${mushroom._id}`);
  };

  return (
    <div 
      onClick={handleCardClick}
      className="bg-white rounded-[32px] overflow-hidden border border-emerald-100 shadow-lg hover:shadow-2xl transition-all cursor-pointer group"
    >
      <div className="relative h-48 overflow-hidden">
        {mushroom.images?.[0]?.url ? (
          <img
            src={mushroom.images[0].url}
            alt={mushroom.commonName}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-emerald-100 flex items-center justify-center">
            <ImageIcon className="w-12 h-12 text-emerald-300" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        <div className="absolute top-3 left-3">
          <MushroomBadge
            category={mushroom.ecologicalRole}
            use={mushroom.commonUses?.[0]}
          />
        </div>
        
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-white font-bold text-sm line-clamp-2">
            {mushroom.commonName || mushroom.scientificName || "Unknown Species"}
          </h3>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {mushroom.scientificName && (
          <p className="text-xs font-medium text-emerald-700 italic line-clamp-1">
            {mushroom.scientificName}
          </p>
        )}
        
        <div className="flex items-start gap-2 text-xs text-emerald-800/70">
          <MapPin size={14} className="text-emerald-600 shrink-0 mt-0.5" />
          <span className="line-clamp-1">
            {typeof mushroom.location === 'string' 
              ? mushroom.location 
              : mushroom.location?.latitude && mushroom.location?.longitude
              ? `${mushroom.location.latitude.toFixed(4)}, ${mushroom.location.longitude.toFixed(4)}`
              : 'Field Location'}
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-emerald-800/70">
          <Calendar size={14} className="text-emerald-600 shrink-0" />
          <span>{formatDate(mushroom.approvedAt || mushroom.createdAt)}</span>
        </div>
        
        <button 
          onClick={handleViewOnMap}
          className="w-full bg-emerald-600 text-white py-2 rounded-xl font-bold text-xs hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
        >
          <MapPin size={14} />
          View on Map
        </button>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="bg-emerald-50 rounded-[32px] p-20 text-center">
      <div className="bg-white rounded-[32px] border border-emerald-100 p-12">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ImageIcon className="text-emerald-600" size={40} />
        </div>
        <h3 className="text-xl font-bold text-emerald-950 mb-2">No observations yet</h3>
        <p className="text-emerald-800/60">This researcher's field journal is currently empty.</p>
      </div>
    </div>
  );
}

function ErrorState({ error }) {
    return (
        <div className="min-h-screen flex items-center justify-center p-6">
            <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Profile Unreachable</h2>
                <p className="text-slate-500 mb-6">{error}</p>
                <Link href="/explore" className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold">Return Home</Link>
            </div>
        </div>
    )
}
