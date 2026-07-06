"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getCityBoundary } from "@/lib/geocoding";

async function fetchNominatimSuggestions(query) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=6&addressdetails=1`;
    const res = await fetch(url, { headers: { "User-Agent": "EcoVigyan/1.0" } });
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((item) => {
      const addr = item.address || {};
      const place =
        addr.city || addr.town || addr.village ||
        addr.municipality || addr.county || addr.state_district || item.name;
      const shortName = [place, addr.state !== place ? addr.state : null, addr.country]
        .filter(Boolean)
        .join(", ");
      return {
        displayName: shortName || item.display_name,
        fullName: item.display_name,
        source: "nominatim",
      };
    });
  } catch {
    return [];
  }
}

export default function LocationSearchInput({
  selectedZone,
  onZoneSelect,
  onZoneClear,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [zones, setZones] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);
  const onZoneSelectRef = useRef(onZoneSelect);
  const justSelectedRef = useRef(false);

  useEffect(() => {
    onZoneSelectRef.current = onZoneSelect;
  }, [onZoneSelect]);

  // Fetch saved zones once on mount
  useEffect(() => {
    fetch("/api/zones")
      .then((r) => (r.ok ? r.json() : { zones: [] }))
      .then((d) => setZones(d.zones || []))
      .catch(() => {});
  }, []);

  // Sync input when selectedZone changes externally
  useEffect(() => {
    setSearchTerm(selectedZone?.name || "");
  }, [selectedZone]);

  // Suggestion fetch — only after 2+ characters
  useEffect(() => {
    clearTimeout(debounceRef.current);

    // Skip re-fetching when the search term change was caused by a selection
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }

    const trimmed = searchTerm.trim();

    if (trimmed.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsFetching(false);
      return;
    }

    // Saved zones match immediately (no network needed)
    const zoneSuggestions = zones
      .filter((z) => z.name.toLowerCase().includes(trimmed.toLowerCase()))
      .slice(0, 3)
      .map((z) => ({ ...z, source: "zone" }));

    setIsFetching(true);

    debounceRef.current = setTimeout(async () => {
      const geocodeSuggestions = await fetchNominatimSuggestions(trimmed);

      // Zones first, then geocode results — dedup by display name
      const seen = new Set(zoneSuggestions.map((z) => z.name.toLowerCase()));
      const merged = [
        ...zoneSuggestions,
        ...geocodeSuggestions
          .filter((s) => !seen.has(s.displayName?.toLowerCase()))
          .slice(0, 6 - zoneSuggestions.length),
      ];

      setSuggestions(merged);
      setShowSuggestions(merged.length > 0);
      setIsFetching(false);
    }, 400);

    return () => clearTimeout(debounceRef.current);
  }, [searchTerm, zones]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectSuggestion = async (suggestion) => {
    justSelectedRef.current = true; // prevent the searchTerm change from reopening the dropdown
    setShowSuggestions(false);
    setSuggestions([]);
    setIsFetching(false);

    if (suggestion.source === "zone") {
      setSearchTerm(suggestion.name);
      onZoneSelectRef.current?.(suggestion);
      return;
    }

    // Geocoded result — fetch full polygon boundary on selection
    const name = suggestion.displayName;
    setSearchTerm(name);
    setIsApplying(true);
    try {
      const boundary = await getCityBoundary(name);
      if (boundary) {
        onZoneSelectRef.current?.({ ...boundary, name });
      }
    } finally {
      setIsApplying(false);
    }
  };

  const handleClear = () => {
    setSearchTerm("");
    setSuggestions([]);
    setShowSuggestions(false);
    setIsFetching(false);
    onZoneClear?.();
  };

  const isSpinning = isFetching || isApplying;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative group">
        <MapPin
          className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-400 group-focus-within:text-purple-600 transition-colors z-10"
          size={18}
        />

        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder="Search location (city, region, country)..."
          className="w-full bg-purple-50/50 rounded-2xl py-3 pl-12 pr-10 text-sm focus:outline-none border border-transparent focus:border-purple-200 focus:bg-white transition-all shadow-inner"
        />

        {isSpinning ? (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
            <Loader2 size={16} className="text-purple-400 animate-spin" />
          </div>
        ) : searchTerm ? (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-purple-100 rounded-lg transition-colors z-10"
          >
            <X size={16} className="text-purple-400" />
          </button>
        ) : null}
      </div>

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {showSuggestions && suggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-2 bg-white border border-purple-200 rounded-xl shadow-xl overflow-hidden"
          >
            <div className="max-h-64 overflow-y-auto">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onMouseDown={() => selectSuggestion(s)}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-purple-50 transition-colors border-b border-purple-100 last:border-b-0 flex items-center gap-3"
                >
                  <MapPin
                    size={14}
                    className={`flex-shrink-0 ${
                      s.source === "zone" ? "text-emerald-500" : "text-purple-400"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800 truncate">
                      {s.source === "zone" ? s.name : s.displayName}
                    </div>
                    {s.source === "zone" && s.description && (
                      <div className="text-xs text-emerald-600 truncate mt-0.5">
                        {s.description}
                      </div>
                    )}
                    {s.source === "nominatim" &&
                      s.fullName !== s.displayName && (
                        <div className="text-xs text-gray-400 truncate mt-0.5">
                          {s.fullName}
                        </div>
                      )}
                  </div>
                  {s.source === "zone" && (
                    <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex-shrink-0">
                      saved
                    </span>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Helper text */}
      <div className="mt-2 text-xs text-emerald-600">
        {selectedZone ? (
          <span className="flex items-center gap-1">
            <MapPin size={10} />
            Filtering by &quot;{selectedZone.name}&quot;
          </span>
        ) : searchTerm.trim().length === 1 ? (
          <span>Type one more letter to search&hellip;</span>
        ) : (
          <span>
            Search for cities, locations, or{" "}
            {zones.length > 0
              ? `${zones.length} saved zone${zones.length !== 1 ? "s" : ""}`
              : "saved zones"}
          </span>
        )}
      </div>
    </div>
  );
}
