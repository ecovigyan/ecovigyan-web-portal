"use client";

import { useState, useEffect } from "react";
import { X, Square, Circle, Loader2, Hexagon, FolderOpen, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import ConfirmDialog from "@/components/ConfirmDialog";
import { hasAdminAccess } from "@/lib/permissions";

export default function ZoneModal({ isOpen, onClose, onZoneSelect, onDrawingModeSelect }) {
  const { user } = useAuth();
  const isAdmin = user && hasAdminAccess(user);
  const [activeTab, setActiveTab] = useState("saved"); // "draw" or "saved"
  const [savedZones, setSavedZones] = useState([]);
  const [loadingZones, setLoadingZones] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all"); // "all", "decomposer", "symbiont", "parasitic"
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, zoneId: null, zoneName: null });

  const handleDrawRectangle = () => {
    onDrawingModeSelect("rectangle");
    onClose();
  };

  const handleDrawCircle = () => {
    onDrawingModeSelect("circle");
    onClose();
  };

  const handleDrawPolygon = () => {
    onDrawingModeSelect("polygon");
    onClose();
  };

  // Load saved zones when modal opens
  useEffect(() => {
    if (isOpen && activeTab === "saved") {
      loadSavedZones();
    }
  }, [isOpen, activeTab]);

  const loadSavedZones = async () => {
    setLoadingZones(true);
    try {
      const categoryParam = selectedCategory !== "all" ? `?category=${selectedCategory}` : "";
      const response = await fetch(`/api/zones${categoryParam}`, {
        credentials: "include",
        cache: "no-store",
      });
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to load zones" }));
        
        // If unauthorized, user might not be logged in
        if (response.status === 401) {
          console.warn("User not authenticated - zones require login");
          setSavedZones([]);
          // Don't show error to user, just show empty state
          return;
        }
        
        console.error("Error loading zones:", data.error || `HTTP ${response.status}`);
        setSavedZones([]);
        return;
      }
      
      const data = await response.json();
      setSavedZones(data.zones || []);
    } catch (error) {
      console.error("Error loading zones:", error);
      setSavedZones([]);
    } finally {
      setLoadingZones(false);
    }
  };

  // Reload zones when category changes
  useEffect(() => {
    if (activeTab === "saved") {
      loadSavedZones();
    }
  }, [selectedCategory]);

  const handleZoneClick = (zone) => {
    onZoneSelect({
      type: zone.shapeType,
      boundary: zone.location.boundary,
      center: zone.location.center,
      name: zone.name,
      category: zone.category,
    });
    onClose();
  };

  const handleDeleteClick = (e, zoneId, zoneName) => {
    e.stopPropagation(); // Prevent triggering the zone selection
    setDeleteConfirm({ isOpen: true, zoneId, zoneName });
  };

  const handleDeleteConfirm = async () => {
    const { zoneId } = deleteConfirm;
    if (!zoneId) return;

    try {
      const response = await fetch(`/api/zones/${zoneId}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Zone deleted successfully");
        // Reload zones
        loadSavedZones();
      } else {
        toast.error(data.error || "Failed to delete zone");
      }
    } catch (error) {
      console.error("Error deleting zone:", error);
      toast.error("Failed to delete zone");
    } finally {
      setDeleteConfirm({ isOpen: false, zoneId: null, zoneName: null });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-emerald-100">
          <h2 className="text-xl font-black text-emerald-950 uppercase tracking-wider">
            Select Zone
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-emerald-50 text-emerald-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-emerald-100">
          <button
            onClick={() => setActiveTab("saved")}
            className={`flex-1 py-4 px-6 text-sm font-bold uppercase tracking-wide transition-colors ${
              activeTab === "saved"
                ? "text-emerald-700 border-b-2 border-emerald-500 bg-emerald-50/50"
                : "text-emerald-600/60 hover:text-emerald-700 hover:bg-emerald-50/30"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <FolderOpen size={16} />
              <span>Saved Zones</span>
            </div>
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab("draw")}
              className={`flex-1 py-4 px-6 text-sm font-bold uppercase tracking-wide transition-colors ${
                activeTab === "draw"
                  ? "text-emerald-700 border-b-2 border-emerald-500 bg-emerald-50/50"
                  : "text-emerald-600/60 hover:text-emerald-700 hover:bg-emerald-50/30"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Square size={16} />
                <span>Draw Area</span>
              </div>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === "saved" ? (
            <div className="space-y-4">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-bold text-emerald-900 mb-2">
                  Filter by Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-emerald-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-emerald-900 font-medium bg-white"
                >
                  <option value="all">All Categories</option>
                  <option value="decomposer">Decomposer</option>
                  <option value="symbiont">Symbiont</option>
                  <option value="parasitic">Parasitic</option>
                </select>
              </div>

              {/* Zones List */}
              {loadingZones ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 size={32} className="animate-spin text-emerald-600 mb-2" />
                  <p className="text-sm text-emerald-600">Loading zones...</p>
                </div>
              ) : savedZones.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <FolderOpen size={48} className="text-emerald-300 mb-4" />
                  <p className="text-sm font-bold text-emerald-900 mb-2">
                    No Saved Zones
                  </p>
                  <p className="text-xs text-emerald-600/70 text-center">
                    {isAdmin 
                      ? "Create and save zones to see them here"
                      : "No zones available in this category"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {savedZones.map((zone) => (
                    <div
                      key={zone._id}
                      className="relative group"
                    >
                      <button
                        onClick={() => handleZoneClick(zone)}
                        className="w-full px-4 py-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors text-left"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-sm font-bold text-emerald-900 mb-1">
                              {zone.name}
                            </p>
                            <p className="text-xs text-emerald-600/70 capitalize">
                              {zone.category} • {zone.shapeType}
                            </p>
                          </div>
                          <span className="text-xs text-emerald-500 font-medium capitalize px-2 py-1 bg-emerald-200 rounded-md">
                            {zone.category}
                          </span>
                        </div>
                      </button>
                      {isAdmin && (
                        <button
                          onClick={(e) => handleDeleteClick(e, zone._id, zone.name)}
                          className="absolute top-2 right-2 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete zone"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-emerald-900 font-medium mb-4">
                Choose a drawing tool to create a custom zone on the map:
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={handleDrawRectangle}
                  className="flex flex-col items-center gap-3 p-6 border-2 border-emerald-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-all group"
                >
                  <div className="w-12 h-12 flex items-center justify-center bg-emerald-100 rounded-lg group-hover:bg-emerald-200 transition-colors">
                    <Square size={24} className="text-emerald-600" />
                  </div>
                  <span className="text-sm font-bold text-emerald-900 uppercase tracking-wide">
                    Rectangle
                  </span>
                  <span className="text-xs text-emerald-600/70 text-center">
                    Click and drag to draw a rectangular area
                  </span>
                </button>
                <button
                  onClick={handleDrawCircle}
                  className="flex flex-col items-center gap-3 p-6 border-2 border-emerald-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-all group"
                >
                  <div className="w-12 h-12 flex items-center justify-center bg-emerald-100 rounded-lg group-hover:bg-emerald-200 transition-colors">
                    <Circle size={24} className="text-emerald-600" />
                  </div>
                  <span className="text-sm font-bold text-emerald-900 uppercase tracking-wide">
                    Circle
                  </span>
                  <span className="text-xs text-emerald-600/70 text-center">
                    Click center and drag to set radius
                  </span>
                </button>
                <button
                  onClick={handleDrawPolygon}
                  className="flex flex-col items-center gap-3 p-6 border-2 border-emerald-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-all group col-span-2"
                >
                  <div className="w-12 h-12 flex items-center justify-center bg-emerald-100 rounded-lg group-hover:bg-emerald-200 transition-colors">
                    <Hexagon size={24} className="text-emerald-600" />
                  </div>
                  <span className="text-sm font-bold text-emerald-900 uppercase tracking-wide">
                    Frequency Polygon
                  </span>
                  <span className="text-xs text-emerald-600/70 text-center">
                    Click multiple points to create a custom polygon shape. Double-click to finish.
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-emerald-100 bg-emerald-50/30">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, zoneId: null, zoneName: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Zone"
        message={`Are you sure you want to delete "${deleteConfirm.zoneName || "this zone"}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmColor="red"
      />
    </div>
  );
}

