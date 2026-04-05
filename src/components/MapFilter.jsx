"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import { SlidersHorizontal, RotateCcw, Check } from "lucide-react";
import {
  ECOLOGICAL_ROLES,
  TEXTURES,
  UNDERSIDES,
  FRUITING_SURFACES,
  STEM_PRESENCE,
  COMMON_USES,
} from "@/components/mushroomConstants";
import { getMushroomImage, getDisplayName } from "@/components/mushroomImageMap";

export default function MapFilter({
  onFilterToggle,
  onResetFilters,
  selectedFilters = {},
  onApplyFilter,
}) {
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [pendingFilters, setPendingFilters] = useState(selectedFilters);

  const filterDropdownRef = useRef(null);
  const filterButtonClickedRef = useRef(false);

  useEffect(() => {
    if (filterMenuOpen) {
      setPendingFilters(selectedFilters);
    }
  }, [filterMenuOpen, selectedFilters]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterButtonClickedRef.current) {
        filterButtonClickedRef.current = false;
        return;
      }
      if (filterMenuOpen && filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setFilterMenuOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside, true);
    return () => document.removeEventListener("click", handleClickOutside, true);
  }, [filterMenuOpen]);

  const allFilterOptions = [
    ...ECOLOGICAL_ROLES,
    ...TEXTURES,
    ...UNDERSIDES,
    ...FRUITING_SURFACES,
    ...STEM_PRESENCE,
    ...COMMON_USES,
  ];

  const filterCategories = [
    { id: "all", label: "All" },
    { id: "ecological", label: "Ecological", options: ECOLOGICAL_ROLES },
    { id: "texture", label: "Texture", options: TEXTURES },
    { id: "underside", label: "Underside", options: UNDERSIDES },
    { id: "surface", label: "Surface", options: FRUITING_SURFACES },
    { id: "stem", label: "Stem", options: STEM_PRESENCE },
    { id: "use", label: "Uses", options: COMMON_USES },
  ];

  const currentOptions =
    selectedCategory === "all"
      ? allFilterOptions
      : filterCategories.find((c) => c.id === selectedCategory)?.options || allFilterOptions;

  const activeFilterCount = Object.values(filterMenuOpen ? pendingFilters : selectedFilters).reduce(
    (total, arr) => total + (Array.isArray(arr) ? arr.length : 0),
    0
  );

  useEffect(() => {
    if (activeFilterCount === 0) {
      setSelectedCategory("all");
      setFilterMenuOpen(false);
    }
  }, [activeFilterCount]);

  const getFilterType = (value) => {
    if (ECOLOGICAL_ROLES.includes(value)) return "ecologicalRole";
    if (TEXTURES.includes(value)) return "texture";
    if (UNDERSIDES.includes(value)) return "underside";
    if (FRUITING_SURFACES.includes(value)) return "fruitingSurface";
    if (STEM_PRESENCE.includes(value)) return "stemPresence";
    if (COMMON_USES.includes(value)) return "commonUses";
    return null;
  };

  const isFilterSelected = (value) => {
    const type = getFilterType(value);
    return pendingFilters[type]?.includes(value);
  };

  const handleFilterClick = (value, e) => {
    e.stopPropagation();
    const type = getFilterType(value);
    if (!type) return;
    setPendingFilters((prev) => {
      const currentValues = prev[type] || [];
      const isSelected = currentValues.includes(value);
      const newValues = isSelected
        ? currentValues.filter((v) => v !== value)
        : [...currentValues, value];
      return { ...prev, [type]: newValues };
    });
  };

  const processedOptions = useMemo(() => {
    return currentOptions.map((option) => ({
      option,
      img: getMushroomImage(option),
      label: getDisplayName(option),
      selected: isFilterSelected(option),
    }));
  }, [currentOptions, pendingFilters]);

  const handleApply = (e) => {
    e.stopPropagation();
    Object.keys(pendingFilters).forEach((filterType) => {
      const pendingValues = pendingFilters[filterType] || [];
      const currentValues = selectedFilters[filterType] || [];
      currentValues.filter((v) => !pendingValues.includes(v)).forEach((v) => onFilterToggle(filterType, v));
      pendingValues.filter((v) => !currentValues.includes(v)).forEach((v) => onFilterToggle(filterType, v));
    });
    if (onApplyFilter) onApplyFilter(pendingFilters);
    setFilterMenuOpen(false);
  };

  const handleReset = (e) => {
    e.stopPropagation();
    const empty = { ecologicalRole: [], texture: [], underside: [], fruitingSurface: [], stemPresence: [], commonUses: [] };
    setPendingFilters(empty);
    onResetFilters();
    setSelectedCategory("all");
    setFilterMenuOpen(false);
  };

  return (
    <div className="relative">
      {/* FILTER BUTTON */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          filterButtonClickedRef.current = true;
          setFilterMenuOpen((prev) => !prev);
        }}
        className={`relative flex items-center gap-2 px-4 py-2.5 rounded-2xl backdrop-blur-md border shadow-lg font-bold text-sm transition-all duration-200 ${
          activeFilterCount > 0
            ? "bg-emerald-600 border-emerald-500 text-white shadow-emerald-500/30"
            : "bg-white/90 border-emerald-100 text-emerald-700 hover:bg-white"
        }`}
      >
        <SlidersHorizontal size={15} />
        <span>Filters</span>
        {activeFilterCount > 0 && (
          <span className="flex items-center justify-center w-5 h-5 bg-white text-emerald-600 text-[10px] font-black rounded-full">
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* DROPDOWN */}
      {filterMenuOpen && (
        <div
          ref={filterDropdownRef}
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-emerald-100 z-50 overflow-hidden"
        >
          {/* HEADER */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-emerald-50">
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={14} className="text-emerald-600" />
              <span className="font-bold text-slate-800 text-sm">Filter Map</span>
            </div>
            {activeFilterCount > 0 && (
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                {activeFilterCount} active
              </span>
            )}
          </div>

          {/* CATEGORY PILLS */}
          <div className="px-3 py-2.5 border-b border-emerald-50 flex gap-1.5 overflow-x-auto scrollbar-hide">
            {filterCategories.map((c) => (
              <button
                key={c.id}
                onClick={(e) => { e.stopPropagation(); setSelectedCategory(c.id); }}
                className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                  selectedCategory === c.id
                    ? "bg-emerald-600 text-white"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* FILTER GRID */}
          <div className="p-3 max-h-64 overflow-y-auto grid grid-cols-5 gap-2">
            {processedOptions.map(({ option, img, label, selected }) => (
              <button
                key={option}
                onClick={(e) => handleFilterClick(option, e)}
                className={`relative flex flex-col items-center gap-1 p-1.5 rounded-xl border-2 transition-all ${
                  selected
                    ? "bg-emerald-50 border-emerald-400 shadow-sm"
                    : "border-transparent bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200"
                }`}
              >
                {selected && (
                  <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full flex items-center justify-center">
                    <Check size={8} strokeWidth={3} className="text-white" />
                  </span>
                )}
                {img && <img src={img} alt={label} className="w-8 h-8 object-contain" />}
                <span className="text-[8px] font-bold text-center text-slate-600 leading-tight">{label}</span>
              </button>
            ))}
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex gap-2 p-3 border-t border-emerald-50">
            <button
              onClick={handleReset}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <RotateCcw size={12} />
              Reset
            </button>
            <button
              onClick={handleApply}
              className="flex-[2] flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <Check size={12} />
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
