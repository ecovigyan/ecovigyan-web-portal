"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Menu, X, Home, Info, Users, FileText, Image, Calendar, FileCheck, Mail, User, Settings, Navigation, Heart, Layers, MapPin, CheckCircle, Save, Trash2, Sparkles, ShieldCheck, Zap, Map as MapIcon, Grid, Trophy, Search } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import ExploreHeader from "@/components/ExploreHeader";
import MushroomGrid from "@/components/MushroomGrid";
import MushroomSubmissionForm from "@/components/MushroomSubmissionForm";
import Leaderboard from "@/components/Leaderboard";
import ZoneModal from "@/components/ZoneModal";
import TrailModal from "@/components/TrailModal";
import SaveTrailModal from "@/components/SaveTrailModal";
import SaveZoneModal from "@/components/SaveZoneModal";
import MapFilter from "@/components/MapFilter";
import MushroomDetailModal from "@/components/MushroomDetailModal";
import MapSidebar from "@/components/MapSidebar";
import { useAuth } from "@/context/AuthContext";
import { isPointInPolygon, calculateDistance } from "@/lib/geocoding";
import { saveTrail } from "@/lib/trailStorage";
import toast from "react-hot-toast";

const Map = dynamic(() => import("@/components/Map"), { 
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white">
      <div className="text-center">
        <div className="text-lg font-bold mb-2">Loading map...</div>
        <div className="text-sm text-gray-400">Please wait</div>
      </div>
    </div>
  ),
  onError: (error) => {
    console.error("❌ Error loading Map component:", error);
    return <div className="absolute inset-0 flex items-center justify-center bg-red-900 text-white">Failed to load map</div>;
  }
});

const getPrimaryEcologicalRole = (mushroom) => {
  if (Array.isArray(mushroom?.ecologicalRole) && mushroom.ecologicalRole.length > 0) {
    return mushroom.ecologicalRole[0];
  }
  if (typeof mushroom?.ecologicalRole === "string" && mushroom.ecologicalRole.trim()) {
    return mushroom.ecologicalRole;
  }
  if (typeof mushroom?.category === "string" && mushroom.category.trim()) {
    return mushroom.category;
  }
  return "Unknown";
};

const getPrimaryCommonUse = (mushroom) => {
  if (Array.isArray(mushroom?.commonUses) && mushroom.commonUses.length > 0) {
    return mushroom.commonUses[0];
  }
  if (typeof mushroom?.use === "string" && mushroom.use.trim()) {
    return mushroom.use;
  }
  return "Unknown";
};

const transformMushroom = (m) => ({
  ...m,
  latitude: m.location?.latitude || m.latitude,
  longitude: m.location?.longitude || m.longitude,
  name: m.commonName || m.scientificName || m.name || "Unnamed Mushroom",
  image: m.images?.[0]?.url || m.image,
  contributor:
    m.submittedBy?.name ||
    m.submittedBy?.username ||
    m.contributor ||
    "Anonymous",
  info: m.description || m.info || "",
  category: getPrimaryEcologicalRole(m),
  use: getPrimaryCommonUse(m),
  submittedBy: m.submittedBy,
  images: m.images || [],
});

function MapPageContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [allData, setAllData] = useState([]); // Store all data for filtering
  const [mode, setMode] = useState("category");
  const [filters, setFilters] = useState({});
  const [headerFilters, setHeaderFilters] = useState({
    ecologicalRole: [],
    texture: [],
    underside: [],
    fruitingSurface: [],
    stemPresence: [],
    commonUses: [],
  });
  const [selectedMushroom, setSelectedMushroom] = useState(null);
  const searchParams = useSearchParams();
  const [mapKey, setMapKey] = useState(0);

  // Derived state from URL parameters
  const mushroomId = searchParams.get("mushroom");
  const detailMushroom = allData.find(m => (m._id || m.id) === mushroomId) || null;
  const showDetailModal = !!detailMushroom;
  const showAddModal = searchParams.get("add") === "true";
  const showZoneModal = searchParams.get("zones") === "true";

  // State for search and UI elements
  const [view, setViewState] = useState("map");

  // Handle opening mushroom detail with URL update
  const handleOpenMushroomDetail = (mushroom) => {
    const mId = mushroom._id || mushroom.id;
    if (mId) {
      const params = new URLSearchParams(window.location.search);
      params.set("mushroom", mId);
      router.push(`/explore?${params.toString()}`, { scroll: false });
    }
  };

  // Handle closing mushroom detail with URL update
  const handleCloseMushroomDetail = () => {
    const params = new URLSearchParams(window.location.search);
    params.delete("mushroom");
    router.push(`/explore?${params.toString()}`, { scroll: false });
  };

  // Handle opening add modal with URL update
  const handleOpenAddModal = () => {
    const params = new URLSearchParams(window.location.search);
    params.set("add", "true");
    router.push(`/explore?${params.toString()}`, { scroll: false });
  };

  // Handle closing add modal with URL update
  const handleCloseAddModal = () => {
    const params = new URLSearchParams(window.location.search);
    params.delete("add");
    router.push(`/explore?${params.toString()}`, { scroll: false });
  };

  // Handle opening zone modal with URL update
  const handleOpenZoneModal = () => {
    const params = new URLSearchParams(window.location.search);
    params.set("zones", "true");
    router.push(`/explore?${params.toString()}`, { scroll: false });
  };

  // Handle closing zone modal with URL update
  const handleCloseZoneModal = () => {
    const params = new URLSearchParams(window.location.search);
    params.delete("zones");
    router.push(`/explore?${params.toString()}`, { scroll: false });
  };

  // Custom setView that increments mapKey when switching to map view
  const setView = useCallback((newView) => {
    console.log("🔄 setView called:", newView, "current view:", view);
    
    // Update state FIRST, before URL
    if (newView === "map") {
      // Always increment mapKey when switching to map view to force remount
      setMapKey(prev => {
        const newKey = prev + 1;
        console.log("🔑 Incrementing mapKey:", prev, "->", newKey);
        return newKey;
      });
      // Clear scientific name search when switching to map to avoid filtering the map
      setScientificNameSearchTerm("");
    }
    
    // Set view state immediately
    setViewState(newView);
    console.log("✅ View state set to:", newView);
    
    // Update URL using Next.js router (this shouldn't cause a re-render that resets state)
    const newUrl = `/explore?view=${newView}`;
    router.replace(newUrl, { scroll: false });
    console.log("🔗 URL updated via router to:", newUrl);
  }, [view, router]);

  // Handle URL parameters for view on initial load only
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get("view");
    if (viewParam && ["map", "grid", "leaderboard"].includes(viewParam)) {
      console.log("🔄 Initial load from URL, setting view to:", viewParam);
      setViewState(viewParam);
      if (viewParam === "map") {
        setMapKey(1);
      }
    }
  }, []); // Only run once on mount
  
  // Sync view state with URL when URL changes (e.g., browser back/forward)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get("view");
      const currentView = viewParam && ["map", "grid", "leaderboard"].includes(viewParam) ? viewParam : "map";
      if (currentView !== view) {
        console.log("🔄 PopState - updating view from", view, "to", currentView);
        setViewState(currentView);
        if (currentView === "map") {
          setMapKey(prev => prev + 1);
        }
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [view]);

  // URL is now updated immediately in setView function, so this useEffect is not needed

  // Debug: Log view changes
  useEffect(() => {
    console.log("🔍 View changed to:", view, "mapKey:", mapKey);
    if (view === "map") {
      console.log("🗺️ Map view active - Map component should render");
    }
  }, [view, mapKey]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showTrailModal, setShowTrailModal] = useState(false);
  const [showSaveTrailModal, setShowSaveTrailModal] = useState(false);
  const [showSaveZoneModal, setShowSaveZoneModal] = useState(false);
  const [isSavingZone, setIsSavingZone] = useState(false);
  const [selectedZone, setSelectedZone] = useState(null);
  const [drawingMode, setDrawingMode] = useState(null);
  const [trailMode, setTrailMode] = useState(false);
  const [trailLocation, setTrailLocation] = useState(null);
  const [trailCurrentLocation, setTrailCurrentLocation] = useState(null);
  const [trailMushrooms, setTrailMushrooms] = useState([]);
  const [speciesSearchTerm, setSpeciesSearchTerm] = useState("");
  const [scientificNameSearchTerm, setScientificNameSearchTerm] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState([]);
  const getCurrentBoundaryRef = useRef(null);
  const prevFiltersRef = useRef({ speciesSearchTerm: "", scientificNameSearchTerm: "", hasZone: false });
  const lastAddedMushroomRef = useRef(null);
  const trailModeRef = useRef(false);
  const skipFilterToastRef = useRef(false);
  
  // Keep trailModeRef in sync with trailMode state
  useEffect(() => {
    trailModeRef.current = trailMode;
  }, [trailMode]);

  // Set sidebar open by default on desktop
  useEffect(() => {
    if (window.innerWidth >= 768) {
      setSidebarOpen(true);
    }
  }, []);

  // Generate autocomplete suggestions from species search
  useEffect(() => {
    if (speciesSearchTerm.trim().length > 0) {
      const uniqueNames = new Set();
      allData.forEach(obs => {
        if (obs.commonName && obs.commonName.toLowerCase().includes(speciesSearchTerm.toLowerCase())) {
          uniqueNames.add(obs.commonName);
        }
        if (obs.scientificName && obs.scientificName.toLowerCase().includes(speciesSearchTerm.toLowerCase())) {
          uniqueNames.add(obs.scientificName);
        }
      });
      const suggestions = Array.from(uniqueNames).slice(0, 8);
      setAutocompleteSuggestions(suggestions);
    } else {
      setAutocompleteSuggestions([]);
    }
  }, [speciesSearchTerm, allData]);

  useEffect(() => {
    const cacheKey = "explore-mushrooms-cache-v1";
    const cached = typeof window !== "undefined" ? window.sessionStorage.getItem(cacheKey) : null;

    if (cached) {
      try {
        const cachedMushrooms = JSON.parse(cached);
        if (Array.isArray(cachedMushrooms) && cachedMushrooms.length > 0) {
          setAllData(cachedMushrooms);
          setData(cachedMushrooms);
          initializeFilters(cachedMushrooms, "category");
        }
      } catch (error) {
        console.warn("Failed to parse mushroom cache:", error);
      }
    }

    fetch("/api/mushrooms")
      .then((res) => res.json())
      .then((d) => {
        const mushrooms = d.mushrooms || [];
        const transformedMushrooms = mushrooms.map(transformMushroom);
        setAllData(transformedMushrooms);
        setData(transformedMushrooms);
        initializeFilters(transformedMushrooms, "category");
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(cacheKey, JSON.stringify(transformedMushrooms));
        }
      })
      .catch(console.error);
  }, []);

  const initializeFilters = (dataset, filterMode) => {
    const f = {};
    dataset.forEach((item) => {
      const key =
        filterMode === "category"
          ? getPrimaryEcologicalRole(item)
          : getPrimaryCommonUse(item);
      if (key) f[key] = true;
    });
    setFilters(f);
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    initializeFilters(data, newMode);
  };

  const toggleFilter = (key) =>
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));

  // Handle filter selection from header
  const handleHeaderFilterToggle = (filterType, filterValue) => {
    setHeaderFilters((prev) => {
      const currentValues = prev[filterType] || [];
      const isSelected = currentValues.includes(filterValue);
      const newValues = isSelected
        ? currentValues.filter((v) => v !== filterValue)
        : [...currentValues, filterValue];
      return { ...prev, [filterType]: newValues };
    });
  };

  // Reset all header filters
  const handleResetFilters = () => {
    setHeaderFilters({
      ecologicalRole: [],
      texture: [],
      underside: [],
      fruitingSurface: [],
      stemPresence: [],
      commonUses: [],
    });
    // Also clear species search and zone selection
    setSpeciesSearchTerm("");
    setScientificNameSearchTerm("");
    setSelectedZone(null);
    // Force map to reset zoom by incrementing mapKey
    setMapKey(prev => prev + 1);
  };

  // Filter data based on header filters, zone, and species search
  useEffect(() => {
    let filtered = [...allData];

    // Apply zone filter first
    if (selectedZone && selectedZone.boundary) {
      filtered = filtered.filter((item) => {
        if (!item.latitude || !item.longitude) return false;
        return isPointInPolygon(item.latitude, item.longitude, selectedZone.boundary);
      });
    }

    // Apply species search filter (common name)
    if (speciesSearchTerm.trim()) {
      const searchLower = speciesSearchTerm.toLowerCase().trim();
      filtered = filtered.filter((item) => {
        const commonName = (item.commonName || item.name || "").toLowerCase();
        return commonName.includes(searchLower);
      });
    }

    // Apply scientific name search filter (from Grid)
    if (scientificNameSearchTerm.trim()) {
      const searchLower = scientificNameSearchTerm.toLowerCase().trim();
      filtered = filtered.filter((item) => {
        const commonName = (item.commonName || item.name || "").toLowerCase();
        const scientificName = (item.scientificName || "").toLowerCase();
        return commonName.includes(searchLower) || scientificName.includes(searchLower);
      });
    }

    // Apply header filters
    if (headerFilters.ecologicalRole.length > 0) {
      filtered = filtered.filter((item) => {
        const itemRoles = Array.isArray(item.ecologicalRole) 
          ? item.ecologicalRole 
          : [item.ecologicalRole].filter(Boolean);
        // OR logic: mushroom has ANY of the selected roles
        return headerFilters.ecologicalRole.some((role) => itemRoles.includes(role));
      });
    }
    if (headerFilters.texture.length > 0) {
      filtered = filtered.filter((item) =>
        headerFilters.texture.includes(item.texture)
      );
    }
    if (headerFilters.underside.length > 0) {
      filtered = filtered.filter((item) =>
        headerFilters.underside.includes(item.underside)
      );
    }
    if (headerFilters.fruitingSurface.length > 0) {
      filtered = filtered.filter((item) =>
        headerFilters.fruitingSurface.includes(item.fruitingSurface)
      );
    }
    if (headerFilters.stemPresence.length > 0) {
      filtered = filtered.filter((item) =>
        headerFilters.stemPresence.includes(item.stemPresence)
      );
    }
    if (headerFilters.commonUses.length > 0) {
      filtered = filtered.filter((item) => {
        const itemUses = item.commonUses || [];
        // OR logic: mushroom has ANY of the selected uses
        return headerFilters.commonUses.some((use) => itemUses.includes(use));
      });
    }

    // Apply legacy filters (for backward compatibility with existing filter UI)
    if (Object.keys(filters).length > 0 && mode === "category") {
      // Check if any filters are explicitly disabled (set to false)
      const hasDisabledFilters = Object.values(filters).some(val => val === false);
      
      // Only apply filtering if some filters are disabled
      // (If all are true, it's the default state - show everything)
      if (hasDisabledFilters) {
        filtered = filtered.filter((item) => {
          // Handle multiple ecological roles
          const roles = Array.isArray(item.ecologicalRole) 
            ? item.ecologicalRole
            : [item.ecologicalRole].filter(Boolean);

          const normalizedRoles = roles.length > 0 ? roles : [getPrimaryEcologicalRole(item)];
          
          // Show mushroom if it has at least one role that's not disabled
          return normalizedRoles.some(role => filters[role] !== false);
        });
      }
    } else if (Object.keys(filters).length > 0 && mode === "use") {
      filtered = filtered.filter((item) => {
        const key = getPrimaryCommonUse(item);
        return filters[key] !== false;
      });
    }

    setData(filtered);

    // Don't show toast if skipFilterToastRef is true (means Apply Filter button was clicked)
    if (skipFilterToastRef.current) {
      skipFilterToastRef.current = false;
      // Update previous filters ref
      prevFiltersRef.current = {
        speciesSearchTerm: speciesSearchTerm,
        scientificNameSearchTerm: scientificNameSearchTerm,
        hasZone: !!(selectedZone && selectedZone.boundary),
        count: filtered.length,
        zoneId: selectedZone?.boundary?.length || null,
      };
      return;
    }

    // Show toast notification for species searches (automated - not manual)
    const hasSpeciesSearch = speciesSearchTerm.trim().length > 0;
    const hasZone = selectedZone && selectedZone.boundary;
    const prevHasSpecies = prevFiltersRef.current.speciesSearchTerm.trim().length > 0;
    const prevHasZone = prevFiltersRef.current.hasZone;
    const prevCount = prevFiltersRef.current.count || 0;
    const speciesChanged = speciesSearchTerm.trim() !== prevFiltersRef.current.speciesSearchTerm.trim();

    // Don't show automatic toast - only manual search should trigger toast now
    // (Manual search is triggered by clicking search button or selecting suggestion)

    // Update previous filters ref
    prevFiltersRef.current = {
      speciesSearchTerm: speciesSearchTerm,
      scientificNameSearchTerm: scientificNameSearchTerm,
      hasZone: !!hasZone,
      count: filtered.length,
      zoneId: selectedZone?.boundary?.length || null,
    };
  }, [headerFilters, filters, mode, allData, selectedZone, speciesSearchTerm, scientificNameSearchTerm]);

  // Manual search handler - triggered by search button or suggestion click
  const handleManualSearch = (searchTerm) => {
    if (!searchTerm || !searchTerm.trim()) return;

    const searchLower = searchTerm.toLowerCase().trim();
    const hasZone = selectedZone && selectedZone.boundary;

    // Filter data based on search term
    let searchResults = allData.filter((item) => {
      const commonName = (item.commonName || item.name || "").toLowerCase();
      const scientificName = (item.scientificName || "").toLowerCase();
      return commonName.includes(searchLower) || scientificName.includes(searchLower);
    });

    // Apply zone filter if active
    if (hasZone) {
      searchResults = searchResults.filter((item) => {
        if (!item.latitude || !item.longitude) return false;
        return isPointInPolygon(item.latitude, item.longitude, selectedZone.boundary);
      });
    }

    const count = searchResults.length;

    if (hasZone) {
      // When both species and location are searched
      const locationName = selectedZone.name || "this location";
      if (count > 0) {
        toast.success(
          `Found ${searchTerm} (${count === 1 ? '1 observation' : `${count} observations`}) in ${locationName}`,
          { duration: 4000, icon: '🍄' }
        );
      } else {
        // Show suggestions when no results in location
        const suggestions = allData
          .filter(item => {
            const commonName = (item.commonName || item.name || "").toLowerCase();
            return commonName.includes(searchLower.substring(0, 3));
          })
          .slice(0, 3)
          .map(item => item.commonName || item.name)
          .filter((name, index, self) => self.indexOf(name) === index);
        
        const suggestionText = suggestions.length > 0 
          ? ` Try: ${suggestions.join(', ')}` 
          : '';
        
        toast.error(
          `No "${searchTerm}" found in ${locationName}.${suggestionText}`,
          { duration: 5000 }
        );
      }
    } else {
      // When only species is searched (no location filter)
      if (count > 0) {
        toast.success(
          `Found ${searchTerm} (${count === 1 ? '1 observation' : `${count} observations`})`,
          { duration: 3000, icon: '🍄' }
        );
      } else {
        // Show suggestions when no results found at all
        const suggestions = allData
          .filter(item => {
            const commonName = (item.commonName || item.name || "").toLowerCase();
            const searchPrefix = searchLower.substring(0, Math.min(3, searchLower.length));
            return searchPrefix.length > 0 && commonName.includes(searchPrefix);
          })
          .slice(0, 3)
          .map(item => item.commonName || item.name)
          .filter((name, index, self) => self.indexOf(name) === index);
        
        const suggestionText = suggestions.length > 0 
          ? ` Did you mean: ${suggestions.join(', ')}?` 
          : ' Try different keywords.';
        
        toast.error(
          `No "${searchTerm}" found.${suggestionText}`,
          { duration: 5000 }
        );
      }
    }
  };

  // Handle zone selection
  const handleZoneSelect = (zone) => {
    setSelectedZone(zone);
    setDrawingMode(null);
  };

  // Handle zone clear
  const handleZoneClear = () => {
    setSelectedZone(null);
  };


  // Handle trail location selection
  const handleTrailLocationSelect = (location) => {
    // Store current location for distance calculation
    if (location.currentLocation) {
      const currentLoc = {
        lat: Number(location.currentLocation.lat),
        lng: Number(location.currentLocation.lng),
      };
      setTrailCurrentLocation(currentLoc);
    } else {
      console.warn("No current location in location object:", location);
    }
    
    setTrailLocation(location);
    setTrailMode(true);
    setTrailMushrooms([]);
    
    // Set the zone to zoom to user's location
    setSelectedZone({
      type: "trail",
      center: location.currentLocation 
        ? { lat: Number(location.currentLocation.lat), lng: Number(location.currentLocation.lng) }
        : location.center,
      boundary: location.boundary || null,
    });
    
    toast.success("Trail mode started! Click mushrooms on the map to add them to your trail.");
  };

  // Handle adding mushroom to trail (ADD ONLY - no toggle/remove)
  const handleTrailMushroomAdd = (mushroom) => {
    // Early return if not in trail mode - don't process at all
    if (!trailMode) {
      return;
    }
    
    // Prevent rapid duplicate clicks
    const now = Date.now();
    if (handleTrailMushroomAdd.lastClick && (now - handleTrailMushroomAdd.lastClick) < 300) {
      return; // Ignore clicks within 300ms
    }
    handleTrailMushroomAdd.lastClick = now;
    
    // Normalize mushroom data for consistent comparison
    const normalizeMushroom = (m) => {
      const id = m._id || m.id;
      const lat = Number(m.latitude || m.location?.latitude);
      const lng = Number(m.longitude || m.location?.longitude);
      return { id, lat, lng };
    };
    
    const normalizedMushroom = normalizeMushroom(mushroom);
    
    // Validate coordinates
    if (isNaN(normalizedMushroom.lat) || isNaN(normalizedMushroom.lng) || 
        !isFinite(normalizedMushroom.lat) || !isFinite(normalizedMushroom.lng)) {
      console.warn("Invalid mushroom coordinates:", mushroom);
      return;
    }
    
    // Helper function to check if two mushrooms are the same (by ID only)
    const isSameMushroom = (m1, m2) => {
      const n1 = normalizeMushroom(m1);
      const n2 = normalizeMushroom(m2);
      
      // Only match by ID - both mushrooms must have IDs and they must match exactly
      if (n1.id && n2.id) {
        const id1 = String(n1.id).trim();
        const id2 = String(n2.id).trim();
        return id1 === id2 && id1 !== '' && id2 !== '';
      }
      
      return false;
    };
    
    // Create a unique key for this mushroom
    const mushroomKey = normalizedMushroom.id || `${normalizedMushroom.lat.toFixed(6)},${normalizedMushroom.lng.toFixed(6)}`;
    
    // Check if we just processed this mushroom
    if (lastAddedMushroomRef.current === mushroomKey) {
      return;
    }
    
    // Use functional update to ensure we're working with latest state
    let wasAdded = false;
    let wasAlreadyInTrail = false;
    
    setTrailMushrooms((prev) => {
      // Deduplicate trail first
      const uniqueTrail = [];
      const seenIds = new Set();
      for (const m of prev) {
        const n = normalizeMushroom(m);
        if (n.id) {
          const idStr = String(n.id).trim();
          if (!seenIds.has(idStr)) {
            seenIds.add(idStr);
            uniqueTrail.push(m);
          }
        } else {
          uniqueTrail.push(m);
        }
      }
      
      // Check if mushroom is already in trail
      const existingIndex = uniqueTrail.findIndex((m) => isSameMushroom(m, mushroom));
      
      if (existingIndex >= 0) {
        // Mushroom is already in trail - do nothing
        wasAlreadyInTrail = true;
        return uniqueTrail; // Return unchanged trail
      } else {
        // Mushroom is not in trail - add it
        wasAdded = true;
        return [...uniqueTrail, mushroom];
      }
    });
    
    // Show toast outside of setState callback to prevent render warnings
    lastAddedMushroomRef.current = mushroomKey;
    setTimeout(() => {
      if (trailModeRef.current) {
        if (wasAlreadyInTrail) {
          toast("Mushroom already in trail", { 
            id: `mushroom-already-${mushroomKey}`,
            icon: "ℹ️",
            duration: 2000
          });
        } else if (wasAdded) {
          toast.success("Mushroom added to trail", { id: `mushroom-${mushroomKey}` });
        }
      }
      setTimeout(() => {
        lastAddedMushroomRef.current = null;
      }, 500);
    }, 0);
  };

  // Handle removing mushroom from trail
  const handleTrailMushroomRemove = (mushroomId) => {
    if (!mushroomId) return;
    
    const currentTrail = trailMushrooms;
    const filtered = currentTrail.filter((m) => {
      const mId = m._id || m.id;
      return mId && String(mId).trim() !== String(mushroomId).trim();
    });
    
    const wasRemoved = filtered.length < currentTrail.length;
    
    if (wasRemoved) {
      setTrailMushrooms(filtered);
      // Show toast outside of setState to prevent render warnings
      setTimeout(() => {
        toast.success("Mushroom removed from trail");
      }, 0);
    }
  };

  // Handle loading a saved trail
  const handleLoadTrail = (trail) => {
    if (!trail || !trail.mushrooms || trail.mushrooms.length === 0) {
      toast.error("Trail has no mushrooms to load");
      return;
    }

    // Calculate bounds from all mushrooms in the trail for zooming
    const validMushrooms = trail.mushrooms.filter(m => {
      const lat = m.latitude || m.location?.latitude;
      const lng = m.longitude || m.location?.longitude;
      return lat && lng && !isNaN(Number(lat)) && !isNaN(Number(lng));
    });

    if (validMushrooms.length === 0) {
      toast.error("Trail mushrooms have no valid coordinates");
      return;
    }

    // Calculate center from mushrooms (for display only, no boundary needed)
    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;

    validMushrooms.forEach(m => {
      const lat = Number(m.latitude || m.location?.latitude);
      const lng = Number(m.longitude || m.location?.longitude);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    });

    // Calculate center from bounds
    const center = {
      lat: (minLat + maxLat) / 2,
      lng: (minLng + maxLng) / 2,
    };

    // Try to get current location (optional)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const currentLoc = {
            lat: Number(latitude),
            lng: Number(longitude),
          };

          setTrailCurrentLocation(currentLoc);
          setTrailMushrooms(trail.mushrooms);
          setTrailMode(true);
          setTrailLocation({
            type: "trail",
            currentLocation: currentLoc,
            center: center,
            boundary: null,
          });

          // Set selectedZone without boundary - Map component will zoom to mushrooms directly
          setSelectedZone({
            type: "trail",
            center: center,
            boundary: null,
            trailMushrooms: trail.mushrooms, // Pass mushrooms for zoom calculation
          });

          toast.success(`Loaded trail "${trail.name}" with ${trail.mushrooms.length} mushrooms`, { id: 'loading-trail' });
        },
        (err) => {
          // Location access denied or failed - continue without location
          setTrailCurrentLocation(null);
          setTrailMushrooms(trail.mushrooms);
          setTrailMode(true);
          setTrailLocation({
            type: "trail",
            currentLocation: null,
            center: center,
            boundary: null,
          });

          // Set selectedZone without boundary - Map component will zoom to mushrooms directly
          setSelectedZone({
            type: "trail",
            center: center,
            boundary: null,
            trailMushrooms: trail.mushrooms, // Pass mushrooms for zoom calculation
          });

          toast.success(`Loaded trail "${trail.name}" with ${trail.mushrooms.length} mushrooms`, { id: 'loading-trail' });
        },
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 60000,
        }
      );
    } else {
      // Geolocation not supported - continue without location
      setTrailCurrentLocation(null);
      setTrailMushrooms(trail.mushrooms);
      setTrailMode(true);
      setTrailLocation({
        type: "trail",
        currentLocation: null,
        center: center,
        boundary: null,
      });

      // Set selectedZone without boundary - Map component will zoom to mushrooms directly
      setSelectedZone({
        type: "trail",
        center: center,
        boundary: null,
        trailMushrooms: trail.mushrooms, // Pass mushrooms for zoom calculation
      });

      toast.success(`Loaded trail "${trail.name}" with ${trail.mushrooms.length} mushrooms`);
    }
  };

  // Handle saving current trail
  const handleSaveTrail = () => {
    if (trailMushrooms.length === 0) {
      toast.error("Cannot save an empty trail. Add some mushrooms first!");
      return;
    }
    setShowSaveTrailModal(true);
  };

  // Handle save trail confirmation
  const handleSaveTrailConfirm = async (trailName) => {
    const trailData = {
      name: trailName,
      location: trailLocation,
      mushrooms: trailMushrooms,
      createdAt: new Date().toISOString(),
    };

    try {
      const trailId = await saveTrail(trailData);
      if (trailId) {
        toast.success(`Trail "${trailName}" saved successfully!`);
      } else {
        toast.error("Failed to save trail. Please try again.");
      }
    } catch (error) {
      console.error('Error saving trail:', error);
      toast.error("Failed to save trail. Please try again.");
    }
  };

  // Handle starting trail to a specific mushroom
  const handleStartTrailToMushroom = (mushroom) => {
    // Get mushroom location for center
    const mushroomLat = mushroom.latitude || mushroom.location?.latitude;
    const mushroomLng = mushroom.longitude || mushroom.location?.longitude;
    const center = mushroomLat && mushroomLng ? { lat: Number(mushroomLat), lng: Number(mushroomLng) } : null;

    // Try to get current location (optional)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const currentLoc = {
            lat: Number(latitude),
            lng: Number(longitude),
          };

          setTrailCurrentLocation(currentLoc);
          setTrailMushrooms([mushroom]);
          setTrailMode(true);
          setTrailLocation({
            type: "trail",
            currentLocation: currentLoc,
            center: center || currentLoc,
            boundary: null,
          });

          setSelectedZone({
            type: "trail",
            center: center || currentLoc,
            boundary: null,
          });

          toast.success(`Trail started to "${mushroom.name || mushroom.commonName || 'mushroom'}"!`, { id: 'starting-trail' });
        },
        (err) => {
          // Location access denied or failed - continue without location
          setTrailCurrentLocation(null);
          setTrailMushrooms([mushroom]);
          setTrailMode(true);
          setTrailLocation({
            type: "trail",
            currentLocation: null,
            center: center,
            boundary: null,
          });

          if (center) {
            setSelectedZone({
              type: "trail",
              center: center,
              boundary: null,
            });
          }

          toast.success(`Trail started to "${mushroom.name || mushroom.commonName || 'mushroom'}"!`, { id: 'starting-trail' });
        },
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 60000,
        }
      );
    } else {
      // Geolocation not supported - continue without location
      setTrailCurrentLocation(null);
      setTrailMushrooms([mushroom]);
      setTrailMode(true);
      setTrailLocation({
        type: "trail",
        currentLocation: null,
        center: center,
        boundary: null,
      });

      if (center) {
        setSelectedZone({
          type: "trail",
          center: center,
          boundary: null,
        });
      }

      toast.success(`Trail started to "${mushroom.name || mushroom.commonName || 'mushroom'}"!`);
    }
  };

  // Handle ending trail mode
  const handleEndTrail = () => {
    // Reset all trail-related state without reloading
    setTrailMode(false);
    trailModeRef.current = false;
    setTrailLocation(null);
    setTrailCurrentLocation(null);
    setTrailMushrooms([]);
    setSelectedZone(null);
    lastAddedMushroomRef.current = null;
    
    toast.success("Trail mode ended", { id: 'trail-ended' });
  };

  // Calculate distance and estimated time to next mushroom in trail
  const getDistanceToNextMushroom = () => {
    if (!trailCurrentLocation || trailMushrooms.length === 0) {
      return null;
    }
    
    // Get the first mushroom in the trail (next one to visit)
    const nextMushroom = trailMushrooms[0];
    
    // Try multiple ways to get coordinates
    const mushroomLat = nextMushroom.latitude 
      || nextMushroom.location?.latitude 
      || (nextMushroom.location && typeof nextMushroom.location === 'object' && nextMushroom.location.latitude);
    const mushroomLng = nextMushroom.longitude 
      || nextMushroom.location?.longitude 
      || (nextMushroom.location && typeof nextMushroom.location === 'object' && nextMushroom.location.longitude);
    
    if (!mushroomLat || !mushroomLng || isNaN(mushroomLat) || isNaN(mushroomLng)) {
      console.warn("Mushroom coordinates not found:", nextMushroom);
      return null;
    }
    
    // Ensure current location has valid coordinates
    if (!trailCurrentLocation.lat || !trailCurrentLocation.lng || 
        isNaN(trailCurrentLocation.lat) || isNaN(trailCurrentLocation.lng)) {
      console.warn("Current location invalid:", trailCurrentLocation);
      return null;
    }
    
    const distance = calculateDistance(
      trailCurrentLocation.lat,
      trailCurrentLocation.lng,
      Number(mushroomLat),
      Number(mushroomLng)
    );
    
    // Calculate estimated time (assuming average walking speed of 5 km/h)
    const walkingSpeedKmh = 5; // km/h
    const walkingSpeedKms = walkingSpeedKmh / 3600; // km/s
    const estimatedTimeSeconds = distance / walkingSpeedKms;
    
    return {
      distance,
      estimatedTimeSeconds,
    };
  };

  // Handle drawing mode selection (admin only)
  const handleDrawingModeSelect = (mode) => {
    // Only allow admins to use drawing mode
    if (!user || user.role !== "admin") {
      toast.error("Drawing zones is only available for administrators.");
      return;
    }
    setDrawingMode(mode);
    setSelectedZone(null); // Clear existing zone when starting new drawing
  };

  // Handle drawing completion
  const handleDrawingComplete = (drawnZone) => {
    setSelectedZone(drawnZone);
    setDrawingMode(null);
  };

  // Handle applying the drawn zone
  const handleApplyZone = () => {
    if (!drawingMode || !getCurrentBoundaryRef.current) return;
    
    const currentZone = getCurrentBoundaryRef.current();
    if (currentZone) {
      setSelectedZone(currentZone);
      setDrawingMode(null);
    }
  };

  // Handle saving the zone
  const handleSaveZone = async (zoneData) => {
    setIsSavingZone(true);
    try {
      const response = await fetch("/api/zones", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(zoneData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save zone");
      }

      toast.success("Zone saved successfully!");
      setShowSaveZoneModal(false);
    } catch (error) {
      console.error("Error saving zone:", error);
      toast.error(error.message || "Failed to save zone");
    } finally {
      setIsSavingZone(false);
    }
  };

  // Handle drawing cancellation
  const handleDrawingCancel = () => {
    setDrawingMode(null);
    getCurrentBoundaryRef.current = null;
    setMapKey(prev => prev + 1);
  };

  // Handle clearing the current drawing (reset but keep drawing mode active)
  const handleClearDrawing = () => {
    // Clear the drawing source data immediately if clear function is available
    if (getCurrentBoundaryRef.current && getCurrentBoundaryRef.current.clear) {
      getCurrentBoundaryRef.current.clear();
    }
    
    // Reset the drawing mode to trigger a fresh start
    // We'll set it to null first, then back to the current mode to reset state
    const currentMode = drawingMode;
    setDrawingMode(null);
    
    // Use setTimeout to ensure cleanup happens before re-initializing
    setTimeout(() => {
      if (currentMode) {
        setDrawingMode(currentMode);
      }
    }, 50);
  };

  // Clear selected zone
  const handleClearZone = () => {
    setSelectedZone(null);
    setDrawingMode(null);
    getCurrentBoundaryRef.current = null;
    setMapKey(prev => prev + 1);
  };

  const handleSubmissionSuccess = async () => {
    // Refresh data after successful submission
    const refreshed = await fetch("/api/mushrooms");
    const refreshedData = await refreshed.json();
    const mushrooms = refreshedData.mushrooms || [];
    const transformedMushrooms = mushrooms.map(transformMushroom);
    setAllData(transformedMushrooms);
    setData(transformedMushrooms);
    initializeFilters(transformedMushrooms, "category");
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(
        "explore-mushrooms-cache-v1",
        JSON.stringify(transformedMushrooms)
      );
    }
  };

  // Handle zones button click with authentication check
  const handleZonesClick = () => {
    if (!user) {
      toast.error("Please login to explore");
      return;
    }
    handleOpenZoneModal();
  };

  // Handle trails button click with authentication check
  const handleTrailsClick = () => {
    if (!user) {
      toast.error("Please login to explore");
      return;
    }
    setShowTrailModal(true);
  };

  // Handle apply filter button click - show toast with filtered count
  const handleApplyFilter = (pendingFilters = {}) => {
    // Set flag to skip automatic toast from useEffect
    skipFilterToastRef.current = true;
    
    const totalCount = allData.length;
    
    // Use pending filters if provided, otherwise use header filters
    const filtersToCheck = Object.keys(pendingFilters).length > 0 ? pendingFilters : headerFilters;
    
    // Calculate what the filtered count will be with these filters
    let filtered = [...allData];
    
    // Apply zone filter
    if (selectedZone && selectedZone.boundary) {
      filtered = filtered.filter((item) => {
        if (!item.latitude || !item.longitude) return false;
        return isPointInPolygon(item.latitude, item.longitude, selectedZone.boundary);
      });
    }
    
    // Apply species search filter
    if (speciesSearchTerm.trim()) {
      const searchLower = speciesSearchTerm.toLowerCase().trim();
      filtered = filtered.filter((item) => {
        const commonName = (item.commonName || item.name || "").toLowerCase();
        return commonName.includes(searchLower);
      });
    }
    
    // Apply header filters with AND logic (must match ALL selected filters)
    if (filtersToCheck.ecologicalRole?.length > 0) {
      filtered = filtered.filter((item) => {
        const roles = Array.isArray(item.ecologicalRole) ? item.ecologicalRole : [item.ecologicalRole];
        // OR logic: mushroom has ANY of the selected roles
        return filtersToCheck.ecologicalRole.some((selectedRole) => roles.includes(selectedRole));
      });
    }
    if (filtersToCheck.texture?.length > 0) {
      filtered = filtered.filter((item) => filtersToCheck.texture.includes(item.texture));
    }
    if (filtersToCheck.underside?.length > 0) {
      filtered = filtered.filter((item) => filtersToCheck.underside.includes(item.underside));
    }
    if (filtersToCheck.fruitingSurface?.length > 0) {
      filtered = filtered.filter((item) => filtersToCheck.fruitingSurface.includes(item.fruitingSurface));
    }
    if (filtersToCheck.stemPresence?.length > 0) {
      filtered = filtered.filter((item) => filtersToCheck.stemPresence.includes(item.stemPresence));
    }
    if (filtersToCheck.commonUses?.length > 0) {
      filtered = filtered.filter((item) => {
        const uses = Array.isArray(item.commonUses) ? item.commonUses : [item.commonUses];
        // Must have ALL selected uses
        return filtersToCheck.commonUses.every((selectedUse) => uses.includes(selectedUse));
      });
    }
    
    const filterCount = filtered.length;
    
    // Check if any filters are active
    const hasActiveFilters = Object.values(filtersToCheck).some(
      (arr) => Array.isArray(arr) && arr.length > 0
    );
    
    if (!hasActiveFilters && !selectedZone && !speciesSearchTerm.trim()) {
      toast(
        `Showing all ${totalCount} observations`,
        { duration: 3000, icon: '🍄' }
      );
    } else {
      const filterDescriptions = [];
      
      // Add filter descriptions with actual names
      if (filtersToCheck.ecologicalRole?.length > 0) {
        filterDescriptions.push(filtersToCheck.ecologicalRole.join(', '));
      }
      if (filtersToCheck.texture?.length > 0) {
        filterDescriptions.push(filtersToCheck.texture.join(', '));
      }
      if (filtersToCheck.underside?.length > 0) {
        filterDescriptions.push(filtersToCheck.underside.join(', '));
      }
      if (filtersToCheck.fruitingSurface?.length > 0) {
        filterDescriptions.push(filtersToCheck.fruitingSurface.join(', '));
      }
      if (filtersToCheck.stemPresence?.length > 0) {
        filterDescriptions.push(filtersToCheck.stemPresence.join(', '));
      }
      if (filtersToCheck.commonUses?.length > 0) {
        filterDescriptions.push(filtersToCheck.commonUses.join(', '));
      }
      if (selectedZone) {
        filterDescriptions.push(selectedZone.name || 'location');
      }
      if (speciesSearchTerm.trim()) {
        filterDescriptions.push(`"${speciesSearchTerm.trim()}"`);
      }
      
      const filterText = filterDescriptions.length > 0 
        ? ` with ${filterDescriptions.join(', ')}` 
        : '';
      
      if (filterCount > 0) {
        toast.success(
          `Found ${filterCount} observation${filterCount === 1 ? '' : 's'}${filterText}`,
          { duration: 4000, icon: '🔍' }
        );
      } else {
        toast.error(
          `No observations found${filterText}`,
          { duration: 3500 }
        );
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-white overflow-x-hidden">
      {/* HERO SECTION - MushroomHub Design */}
      <section className="relative pt-24 pb-12 bg-gray-50">
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8">
            
            {/* LEFT COLUMN: Badge + Main Heading */}
            <div className="lg:col-span-2">
              <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4">
                <ShieldCheck size={14} /> Verified Mycology Hub
              </div>
              <h1 className="text-4xl md:text-6xl font-bold font-serif text-emerald-950 mb-4 tracking-tight">
                Mushroom Mania
              </h1>
              <p className="text-emerald-800/60 max-w-xl text-lg">
                Map and discover the fungal kingdom of India through citizen science.
              </p>
            </div>
            
            {/* RIGHT COLUMN: Latest Discovery Card */}
            <div className="bg-emerald-900 rounded-[32px] p-6 text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 opacity-20 -mr-10 -mt-10 group-hover:scale-110 transition-transform">
                <Zap size={100} fill="white" />
              </div>
              <div className="relative z-10">
                <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-2">
                  Latest Discovery
                </div>
                {allData.length === 0 ? (
                  /* Loading skeleton */
                  <div className="animate-pulse space-y-4">
                    <div className="h-7 bg-emerald-700/60 rounded-xl w-3/4" />
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-emerald-700/60" />
                      <div className="h-8 w-24 bg-emerald-700/60 rounded-xl" />
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="text-2xl font-bold mb-4 font-serif italic">
                      {allData[0]?.name || "Unknown Species"}
                    </h3>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden shadow-lg">
                        <img
                          src={allData[0]?.image || "https://images.unsplash.com/photo-1649279595591-cfc7a11203fd"}
                          className="w-full h-full object-cover"
                          alt="Latest discovery"
                        />
                      </div>
                      <button
                        onClick={() => handleOpenMushroomDetail(allData[0])}
                        className="bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-bold transition-all"
                      >
                        View Profile
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
            
          </div>
        </div>
      </section>

      {/* TAB NAVIGATION */}
      <div className="bg-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4 w-full">
            {/* Left: Tab Navigation */}
            <div className="bg-white p-1.5 rounded-2xl shadow-sm flex gap-1 w-fit overflow-x-auto scrollbar-hide">
              {[
                { id: "map", label: "Explore Map", icon: MapIcon },
                { id: "grid", label: "Observations", icon: Grid },
                { id: "leaderboard", label: "Community", icon: Trophy },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setView(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2.5 sm:px-6 sm:py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                    view === tab.id
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                      : "text-emerald-800/40 hover:text-emerald-800/60"
                  }`}
                >
                  <tab.icon size={18} strokeWidth={2.5} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
            
            {/* Right: Add, Trails & Zones Buttons (for logged-in users) */}
            {user && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleOpenAddModal}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-all whitespace-nowrap shadow-md"
                >
                  <Plus size={18} strokeWidth={2.5} />
                  <span className="hidden sm:inline">Add Observations</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      

      {/* MAIN CONTENT */}
      <main className="flex-1 relative overflow-hidden bg-gray-50">
        {view === "map" ? (
          <div className="w-full">
            <div key={`map-container-${mapKey}`} className="w-full flex overflow-hidden shadow-2xl border-y border-emerald-100 bg-white" style={{ height: "calc(100vh - 128px)", minHeight: "500px" }}>
              {/* Map Sidebar */}
              <MapSidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                speciesSearchTerm={speciesSearchTerm}
                onSpeciesSearch={setSpeciesSearchTerm}
                autocompleteSuggestions={autocompleteSuggestions}
                onManualSearch={handleManualSearch}
                selectedZone={selectedZone}
                onZoneSelect={handleZoneSelect}
                onZoneClear={handleZoneClear}
                filteredCount={data.length}
                totalCount={allData.length}
                onZonesClick={handleZonesClick}
                onTrailsClick={handleTrailsClick}
              />
              
              {/* Map Container */}
              <div className="flex-1 relative">
              <Map
                key={`map-${mapKey}`}
                  data={data} 
                  filters={filters} 
                  mode={mode}
                  selectedZone={selectedZone}
                  drawingMode={drawingMode}
                  onDrawingComplete={handleDrawingComplete}
                  onDrawingCancel={handleDrawingCancel}
                  onGetCurrentBoundary={getCurrentBoundaryRef}
                  trailMode={trailMode}
                  trailMushrooms={trailMushrooms}
                  trailCurrentLocation={trailCurrentLocation}
                  onTrailMushroomAdd={handleTrailMushroomAdd}
                  onStartTrail={user?.role === "admin" ? handleStartTrailToMushroom : undefined}
                  onMushroomClick={(mushroom) => {
                    if (trailMode) {
                      handleTrailMushroomAdd(mushroom);
                    } else {
                      handleOpenMushroomDetail(mushroom);
                    }
                  }}
                />

                {/* Map Controls - Top Right: Search (mobile only) */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="md:hidden absolute z-20 p-2.5 rounded-2xl bg-white/90 backdrop-blur-md border border-emerald-100 shadow-lg text-emerald-700 hover:bg-white transition-all"
                  style={{
                    top: "max(4.5rem, calc(env(safe-area-inset-top, 0px) + 4.25rem))",
                    left: "max(0.5rem, calc(env(safe-area-inset-left, 0px) + 0.5rem))",
                  }}
                  title="Search"
                >
                  <Search size={18} />
                </button>

                {/* Map Controls - Top Left: Filters + Zones + Trails */}
                <div className="absolute top-6 left-6 z-20 flex flex-col gap-3 pointer-events-none">
                  <div className="flex items-center gap-2 pointer-events-auto">
                    {/* Desktop sidebar toggle — only shown when sidebar is closed */}
                    {!sidebarOpen && (
                      <button
                        onClick={() => setSidebarOpen(true)}
                        className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/90 backdrop-blur-md border border-emerald-100 shadow-lg text-emerald-700 font-bold text-sm hover:bg-white transition-all"
                        title="Open Discovery Hub"
                      >
                        <Search size={15} />
                        <span>Search</span>
                      </button>
                    )}
                    {/* Filter Button */}
                    <MapFilter
                      onFilterToggle={handleHeaderFilterToggle}
                      onResetFilters={handleResetFilters}
                      selectedFilters={headerFilters}
                      onApplyFilter={handleApplyFilter}
                    />

                    {/* Zones Button */}
                    <button
                      onClick={handleZonesClick}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/90 backdrop-blur-md border border-emerald-100 shadow-lg text-emerald-700 font-bold text-sm hover:bg-white transition-all"
                      title="Zones"
                    >
                      <Layers size={15} />
                      <span>Zones</span>
                    </button>

                    {/* Trails Button */}
                    <button
                      onClick={handleTrailsClick}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl backdrop-blur-md border shadow-lg font-bold text-sm transition-all ${
                        trailMode
                          ? "bg-blue-600 border-blue-500 text-white"
                          : "bg-white/90 border-emerald-100 text-emerald-700 hover:bg-white"
                      }`}
                      title="Trails"
                    >
                      <Navigation size={15} />
                      <span>Trails</span>
                    </button>
                  </div>
                  
                  {/* Drawing Controls (shown when in drawing mode) */}
                  {drawingMode && (
                    <div className="flex flex-col gap-2 pointer-events-auto">
                      <button
                        onClick={handleApplyZone}
                        className="px-4 py-3 rounded-2xl bg-emerald-600/90 hover:bg-emerald-700/90 backdrop-blur-md border border-emerald-500 text-white shadow-2xl transition-all duration-300 hover:shadow-emerald-500/50 flex items-center gap-2 font-bold text-sm"
                      >
                        <CheckCircle size={18} className="shrink-0" />
                        Apply Zone
                      </button>
                      {user?.role === "admin" && (
                        <button
                          onClick={() => {
                            const currentZone = getCurrentBoundaryRef.current?.();
                            if (currentZone && currentZone.boundary) {
                              setShowSaveZoneModal(true);
                            } else {
                              toast.error("Please draw a zone first");
                            }
                          }}
                          className="px-4 py-3 rounded-2xl bg-blue-600/90 hover:bg-blue-700/90 backdrop-blur-md border border-blue-500 text-white shadow-2xl transition-all duration-300 hover:shadow-blue-500/50 flex items-center gap-2 font-bold text-sm"
                          title="Save zone"
                        >
                          <Save size={18} className="shrink-0" />
                          Save Zone
                        </button>
                      )}
                      <button
                        onClick={handleClearDrawing}
                        className="px-4 py-3 rounded-2xl bg-red-600/90 hover:bg-red-700/90 backdrop-blur-md border border-red-500 text-white shadow-2xl transition-all duration-300 hover:shadow-red-500/50 flex items-center gap-2 font-bold text-sm"
                        title="Clear current drawing"
                      >
                        <Trash2 size={18} className="shrink-0" />
                        Clear
                      </button>
                      <button
                        onClick={handleDrawingCancel}
                        className="px-4 py-3 rounded-2xl bg-gray-600/90 hover:bg-gray-700/90 backdrop-blur-md border border-gray-500 text-white shadow-2xl transition-all duration-300 hover:shadow-gray-500/50 flex items-center gap-2 font-bold text-sm"
                        title="Cancel drawing"
                      >
                        <X size={18} className="shrink-0" />
                        Cancel
                      </button>
                    </div>
                  )}
                  
                  {/* Zone filter indicator and clear button */}
                  {selectedZone && !drawingMode && !trailMode && (
                    <div className="p-3 rounded-2xl bg-emerald-600/90 backdrop-blur-md border border-emerald-500 shadow-2xl flex items-center gap-3 pointer-events-auto">
                      <div className="flex items-center gap-2">
                        <MapPin size={16} className="text-white" />
                        <span className="text-white text-xs font-bold">
                          {selectedZone.name || "Zone Selected"}
                        </span>
                      </div>
                      <button
                        onClick={handleClearZone}
                        className="p-1.5 rounded-lg bg-emerald-700/50 hover:bg-emerald-700 transition-colors"
                        title="Clear zone filter"
                      >
                        <X size={14} className="text-white" />
                      </button>
                    </div>
                  )}
                  
                  {/* Trail mode indicator */}
                  {trailMode && (
                    <div className="p-3 rounded-2xl bg-blue-600/90 backdrop-blur-md border border-blue-500 shadow-2xl pointer-events-auto max-w-[200px] md:max-w-xs">
                      <div className="flex items-center gap-2 mb-2">
                        <Navigation size={16} className="text-white" />
                        <span className="text-white text-xs font-bold">
                          Trail Mode: {trailMushrooms.length} mushroom{trailMushrooms.length !== 1 ? 's' : ''} selected
                        </span>
                      </div>
                      {trailCurrentLocation && (
                        <p className="text-white/70 text-[9px] mb-1">
                          Your location: {trailCurrentLocation.lat?.toFixed(4)}, {trailCurrentLocation.lng?.toFixed(4)}
                        </p>
                      )}
                      {trailCurrentLocation && trailMushrooms.length > 0 && (() => {
                        const result = getDistanceToNextMushroom();
                        if (result !== null) {
                          const { distance, estimatedTimeSeconds } = result;
                          const distanceText = distance < 1 
                            ? `${(distance * 1000).toFixed(0)} m` 
                            : `${distance.toFixed(2)} km`;
                          
                          // Format estimated time
                          let timeText = "";
                          if (estimatedTimeSeconds < 60) {
                            timeText = `${Math.round(estimatedTimeSeconds)} sec`;
                          } else if (estimatedTimeSeconds < 3600) {
                            const minutes = Math.round(estimatedTimeSeconds / 60);
                            timeText = `${minutes} min`;
                          } else {
                            const hours = Math.floor(estimatedTimeSeconds / 3600);
                            const minutes = Math.round((estimatedTimeSeconds % 3600) / 60);
                            timeText = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
                          }
                          
                          return (
                            <div className="space-y-1 mb-2">
                              <p className="text-white/90 text-[10px] font-semibold">
                                Distance: {distanceText}
                              </p>
                              <p className="text-white/80 text-[9px]">
                                Est. time: {timeText} (walking)
                              </p>
                            </div>
                          );
                        } else {
                          return (
                            <p className="text-white/70 text-[9px] mb-2">
                              Move closer to a mushroom to see distance
                            </p>
                          );
                        }
                      })()}
                      {!trailCurrentLocation && (
                        <p className="text-white/70 text-[9px] mb-2">
                          Location not available
                        </p>
                      )}
                      
                      {/* Trail Mushrooms List with Remove Buttons */}
                      {trailMushrooms.length > 0 && (
                        <div className="mt-2 mb-2 border-t border-blue-500/50 pt-2">
                          <p className="text-white/90 text-[10px] font-semibold mb-2">Trail Mushrooms:</p>
                          <div className="space-y-1 max-h-48 overflow-y-auto">
                            {trailMushrooms.map((mushroom, index) => {
                              const mushroomId = mushroom._id || mushroom.id;
                              const mushroomName = mushroom.commonName || mushroom.scientificName || mushroom.name || `Mushroom ${index + 1}`;
                              return (
                                <div 
                                  key={mushroomId || index} 
                                  className="flex items-center justify-between gap-2 p-1.5 bg-blue-700/50 rounded-lg hover:bg-blue-700/70 transition-colors"
                                >
                                  <span className="text-white text-[9px] flex-1 truncate" title={mushroomName}>
                                    {index + 1}. {mushroomName}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTrailMushroomRemove(mushroomId);
                                    }}
                                    className="p-1 text-white/80 hover:text-white hover:bg-red-600/50 rounded transition-colors flex-shrink-0"
                                    title="Remove from trail"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      <p className="text-white/80 text-[10px] mt-1">
                        Click mushrooms on the map to add them to your trail
                      </p>

                      <div className="mt-3 flex gap-2">
                        {user?.role === "admin" && trailMushrooms.length > 0 && (
                          <button
                            onClick={handleSaveTrail}
                            className="flex-1 px-3 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-[10px] transition-colors flex items-center justify-center gap-1.5 shadow-lg"
                            title="Save Trail"
                          >
                            <Save size={12} strokeWidth={2.5} />
                            SAVE
                          </button>
                        )}
                        <button
                          onClick={handleEndTrail}
                          className="flex-1 px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] transition-colors flex items-center justify-center gap-1.5 shadow-lg"
                          title="End Trail"
                        >
                          <X size={12} strokeWidth={3} />
                          END
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {view === "grid" && (
          <MushroomGrid
            data={data}
            onMushroomClick={handleOpenMushroomDetail}
            onScientificNameSearch={setScientificNameSearchTerm}
          />
        )}

        {view === "leaderboard" && <Leaderboard />}
      </main>

      {/* MODALS */}

      <MushroomSubmissionForm
        isOpen={showAddModal}
        onClose={handleCloseAddModal}
        onSuccess={handleSubmissionSuccess}
        selectedLocation={selectedLocation}
        onLocationSelect={setSelectedLocation}
      />

      <MushroomDetailModal
        isOpen={showDetailModal}
        onClose={handleCloseMushroomDetail}
        mushroom={detailMushroom}
      />

      <ZoneModal
        isOpen={showZoneModal}
        onClose={handleCloseZoneModal}
        onZoneSelect={handleZoneSelect}
        onDrawingModeSelect={handleDrawingModeSelect}
      />

      <TrailModal
        isOpen={showTrailModal}
        onClose={() => setShowTrailModal(false)}
        onLocationSelect={handleTrailLocationSelect}
        onLoadTrail={handleLoadTrail}
      />

      <SaveTrailModal
        isOpen={showSaveTrailModal}
        onClose={() => setShowSaveTrailModal(false)}
        onSave={handleSaveTrailConfirm}
        mushroomCount={trailMushrooms.length}
      />

      <SaveZoneModal
        isOpen={showSaveZoneModal}
        onClose={() => setShowSaveZoneModal(false)}
        onSave={handleSaveZone}
        zoneData={selectedZone || (getCurrentBoundaryRef.current?.() || null)}
        isSaving={isSavingZone}
      />

      {/* MOBILE FLOATING BUTTONS — trail active-state controls only */}
      {view === "map" && trailMode && (
        <div className="md:hidden fixed bottom-6 right-6 z-50 flex flex-col gap-3">
          {trailMushrooms.length > 0 && user?.role === "admin" && (
            <button
              onClick={handleSaveTrail}
              className="px-4 py-3 rounded-2xl bg-green-600/90 hover:bg-green-700/90 text-white shadow-2xl transition-all active:scale-95 backdrop-blur-md border border-green-500 flex items-center gap-2"
              aria-label="Save Trail"
            >
              <Save size={20} strokeWidth={3} />
              <span className="font-bold text-sm whitespace-nowrap">Save Trail</span>
            </button>
          )}
          <button
            onClick={handleEndTrail}
            className="px-4 py-3 rounded-2xl bg-red-600/90 hover:bg-red-700/90 text-white shadow-2xl transition-all active:scale-95 backdrop-blur-md border border-red-500 flex items-center gap-2"
            aria-label="End Trail"
          >
            <X size={20} strokeWidth={3} />
            <span className="font-bold text-sm whitespace-nowrap">End Trail</span>
          </button>
        </div>
      )}
    </div>
  );

}

export default function MapPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-gray-950 text-white">
        <div className="text-center">
          <div className="text-xl font-bold mb-2">Loading explorer...</div>
        </div>
      </div>
    }>
      <MapPageContent />
    </Suspense>
  );
}
