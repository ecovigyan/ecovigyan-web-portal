"use client";

import { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Image as ImageIcon, Sparkles, AlertCircle, CheckCircle, XCircle, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { ImageWithFallback } from './ImageWithFallback';

export function ReviewObservationModal({ isOpen, onClose, observation, onSave, onApprove, onReject }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [formData, setFormData] = useState(null);
  const [fullObservation, setFullObservation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  // Autocomplete states
  const [allMushrooms, setAllMushrooms] = useState([]);
  const [commonNameSuggestions, setCommonNameSuggestions] = useState([]);
  const [scientificNameSuggestions, setScientificNameSuggestions] = useState([]);
  const [showCommonNameSuggestions, setShowCommonNameSuggestions] = useState(false);
  const [showScientificNameSuggestions, setShowScientificNameSuggestions] = useState(false);
  
  // Refs for autocomplete
  const commonNameInputRef = useRef(null);
  const scientificNameInputRef = useRef(null);
  const commonNameSuggestionsRef = useRef(null);
  const scientificNameSuggestionsRef = useRef(null);

  // Fetch all mushrooms for autocomplete
  useEffect(() => {
    const fetchMushrooms = async () => {
      if (!isOpen) return;
      try {
        const res = await fetch("/api/mushrooms");
        if (res.ok) {
          const data = await res.json();
          setAllMushrooms(data.mushrooms || []);
        }
      } catch (error) {
        console.error("Error fetching mushrooms:", error);
      }
    };
    fetchMushrooms();
  }, [isOpen]);

  // Fetch full observation data when modal opens
  useEffect(() => {
    const fetchFullObservation = async () => {
      if (observation && observation._id && isOpen) {
        setLoading(true);
        try {
          const res = await fetch(`/api/admin/mushrooms/${observation._id}`);
          const data = await res.json();
          
          if (res.ok && data.mushroom) {
            const m = data.mushroom;
            setFullObservation(m);
            setFormData({
              ...m,
              commonName: m.commonName || '',
              scientificName: m.scientificName || '',
              description: m.description || '',
              ecologicalRole: Array.isArray(m.ecologicalRole) 
                ? m.ecologicalRole 
                : (m.ecologicalRole ? [m.ecologicalRole] : []),
              texture: m.texture || '',
              underside: m.underside || '',
              fruitingSurface: m.fruitingSurface || '',
              stemPresence: m.stemPresence || '',
              commonUses: Array.isArray(m.commonUses)
                ? m.commonUses
                : (m.commonUses ? [m.commonUses] : []),
              adminNotes: m.adminNotes || '',
              rejectionReason: m.rejectionReason || '',
              status: m.status || 'pending'
            });
          } else {
            toast.error('Failed to load observation details');
          }
        } catch (error) {
          console.error('Error fetching observation:', error);
          toast.error('Failed to load observation details');
        } finally {
          setLoading(false);
        }
      }
    };

    fetchFullObservation();
    setCurrentImageIndex(0);
  }, [observation, isOpen]);

  // Generate common name suggestions
  useEffect(() => {
    if (!formData?.commonName?.trim() || !allMushrooms.length) {
      setCommonNameSuggestions([]);
      return;
    }

    const searchLower = formData.commonName.toLowerCase().trim();
    const uniqueMatches = new Map();

    allMushrooms.forEach((item) => {
      const itemCommonName = (item.commonName || item.name || "").toLowerCase();
      
      if (itemCommonName.includes(searchLower)) {
        const key = item.commonName || item.name;
        if (!uniqueMatches.has(key)) {
          uniqueMatches.set(key, {
            commonName: item.commonName || item.name || "Unknown",
            scientificName: item.scientificName || "",
            ecologicalRole: item.ecologicalRole || [],
            texture: item.texture || "",
            underside: item.underside || "",
            fruitingSurface: item.fruitingSurface || "",
            stemPresence: item.stemPresence || "",
            commonUses: item.commonUses || [],
          });
        }
      }
    });

    const matchArray = Array.from(uniqueMatches.values()).slice(0, 8);
    setCommonNameSuggestions(matchArray);
  }, [formData?.commonName, allMushrooms]);

  // Generate scientific name suggestions
  useEffect(() => {
    if (!formData?.scientificName?.trim() || !allMushrooms.length) {
      setScientificNameSuggestions([]);
      return;
    }

    const searchLower = formData.scientificName.toLowerCase().trim();
    const uniqueMatches = new Map();

    allMushrooms.forEach((item) => {
      const itemScientificName = (item.scientificName || "").toLowerCase();
      
      if (itemScientificName.includes(searchLower)) {
        const key = item.scientificName;
        if (key && !uniqueMatches.has(key)) {
          uniqueMatches.set(key, {
            commonName: item.commonName || item.name || "Unknown",
            scientificName: item.scientificName,
            ecologicalRole: item.ecologicalRole || [],
            texture: item.texture || "",
            underside: item.underside || "",
            fruitingSurface: item.fruitingSurface || "",
            stemPresence: item.stemPresence || "",
            commonUses: item.commonUses || [],
          });
        }
      }
    });

    const matchArray = Array.from(uniqueMatches.values()).slice(0, 8);
    setScientificNameSuggestions(matchArray);
  }, [formData?.scientificName, allMushrooms]);

  // Handle click outside for common name
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        commonNameSuggestionsRef.current &&
        !commonNameSuggestionsRef.current.contains(event.target) &&
        commonNameInputRef.current &&
        !commonNameInputRef.current.contains(event.target)
      ) {
        setShowCommonNameSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle click outside for scientific name
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        scientificNameSuggestionsRef.current &&
        !scientificNameSuggestionsRef.current.contains(event.target) &&
        scientificNameInputRef.current &&
        !scientificNameInputRef.current.contains(event.target)
      ) {
        setShowScientificNameSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isOpen || !observation) return null;
  
  if (loading || !formData || !fullObservation) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading observation details...</p>
        </div>
      </div>
    );
  }

  const images = fullObservation.images || [];

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const toggleEcologicalRole = (role) => {
    const current = formData.ecologicalRole || [];
    const updated = current.includes(role)
      ? current.filter(r => r !== role)
      : [...current, role];
    setFormData({ ...formData, ecologicalRole: updated });
  };

  const toggleCommonUse = (use) => {
    const current = formData.commonUses || [];
    const updated = current.includes(use)
      ? current.filter(u => u !== use)
      : [...current, use];
    setFormData({ ...formData, commonUses: updated });
  };

  const handleCommonNameSelect = (suggestion) => {
    setFormData({ 
      ...formData, 
      commonName: suggestion.commonName,
      scientificName: suggestion.scientificName || formData.scientificName,
      ecologicalRole: suggestion.ecologicalRole && suggestion.ecologicalRole.length > 0 ? suggestion.ecologicalRole : formData.ecologicalRole,
      texture: suggestion.texture || formData.texture,
      underside: suggestion.underside || formData.underside,
      fruitingSurface: suggestion.fruitingSurface || formData.fruitingSurface,
      stemPresence: suggestion.stemPresence || formData.stemPresence,
      commonUses: suggestion.commonUses && suggestion.commonUses.length > 0 ? suggestion.commonUses : formData.commonUses,
    });
    setShowCommonNameSuggestions(false);
  };

  const handleScientificNameSelect = (suggestion) => {
    setFormData({ 
      ...formData, 
      scientificName: suggestion.scientificName,
      commonName: suggestion.commonName || formData.commonName,
      ecologicalRole: suggestion.ecologicalRole && suggestion.ecologicalRole.length > 0 ? suggestion.ecologicalRole : formData.ecologicalRole,
      texture: suggestion.texture || formData.texture,
      underside: suggestion.underside || formData.underside,
      fruitingSurface: suggestion.fruitingSurface || formData.fruitingSurface,
      stemPresence: suggestion.stemPresence || formData.stemPresence,
      commonUses: suggestion.commonUses && suggestion.commonUses.length > 0 ? suggestion.commonUses : formData.commonUses,
    });
    setShowScientificNameSuggestions(false);
  };

  const handleSaveOnly = async () => {
    setSaving(true);
    try {
      await onSave(formData);
      toast.success('Review saved successfully!');
      onClose();
    } catch (error) {
      toast.error(error.message || 'Failed to save review');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    setApproving(true);
    try {
      // Save review data first
      await onSave(formData);
      // Then approve
      if (onApprove) {
        await onApprove(fullObservation._id);
      }
      toast.success('Observation approved successfully!');
      onClose();
    } catch (error) {
      toast.error(error.message || 'Failed to approve observation');
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    setRejecting(true);
    try {
      // Save review data first
      await onSave(formData);
      // Then reject
      if (onReject) {
        await onReject(fullObservation._id, formData.rejectionReason || "");
      }
      toast.success('Observation rejected');
      onClose();
    } catch (error) {
      toast.error(error.message || 'Failed to reject observation');
    } finally {
      setRejecting(false);
    }
  };

  const getStatusBadge = () => {
    const statusConfig = {
      pending: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', label: 'Pending Review' },
      approved: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300', label: 'Approved' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', label: 'Rejected' }
    };
    
    const config = statusConfig[formData.status];
    return (
      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${config.bg} ${config.text} border-2 ${config.border} font-bold text-sm`}>
        {formData.status === 'approved' && <CheckCircle className="w-4 h-4" />}
        {formData.status === 'rejected' && <XCircle className="w-4 h-4" />}
        {formData.status === 'pending' && <AlertCircle className="w-4 h-4" />}
        {config.label}
      </div>
    );
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="relative bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h2 className="text-3xl font-bold mb-2">Review Mushroom Observation</h2>
                <p className="text-emerald-100 text-sm">
                  Review and enrich this observation with scientific data
                </p>
              </div>
              <div className="flex items-center gap-4">
                {getStatusBadge()}
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 p-6">
              {/* Left Column - Images & Basic Info */}
              <div className="lg:col-span-2 space-y-6">
                {/* Image Gallery */}
                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border-2 border-emerald-200 shadow-lg">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-emerald-600 rounded-lg">
                      <ImageIcon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg">Submission Images</h3>
                    <span className="ml-auto text-sm text-gray-600 font-semibold">
                      {images.length} photo{images.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  {images.length > 0 ? (
                    <div className="space-y-4">
                      <div className="relative aspect-square bg-white rounded-xl overflow-hidden shadow-xl border-4 border-white">
                        <ImageWithFallback
                          src={images[currentImageIndex].url}
                          alt={`Mushroom ${currentImageIndex + 1}`}
                          className="w-full h-full object-cover"
                        />
                        
                        {/* Image Counter */}
                        <div className="absolute top-4 left-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                          {currentImageIndex + 1} / {images.length}
                        </div>

                        {/* Navigation Arrows */}
                        {images.length > 1 && (
                          <>
                            <button
                              onClick={prevImage}
                              className="absolute left-3 top-1/2 -translate-y-1/2 bg-white hover:bg-emerald-50 p-3 rounded-full shadow-xl transition-all hover:scale-110"
                            >
                              <ChevronLeft className="w-6 h-6 text-gray-700" />
                            </button>
                            <button
                              onClick={nextImage}
                              className="absolute right-3 top-1/2 -translate-y-1/2 bg-white hover:bg-emerald-50 p-3 rounded-full shadow-xl transition-all hover:scale-110"
                            >
                              <ChevronRight className="w-6 h-6 text-gray-700" />
                            </button>
                          </>
                        )}
                      </div>

                      {/* Thumbnail Strip */}
                      {images.length > 1 && (
                        <div className="flex gap-3 overflow-x-auto pb-2">
                          {images.map((img, idx) => (
                            <button
                              key={idx}
                              onClick={() => setCurrentImageIndex(idx)}
                              className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-3 transition-all hover:scale-105 ${
                                idx === currentImageIndex
                                  ? 'border-emerald-500 ring-4 ring-emerald-200 shadow-lg'
                                  : 'border-gray-300 hover:border-emerald-300 opacity-60 hover:opacity-100'
                              }`}
                            >
                              <ImageWithFallback 
                                src={img.url} 
                                alt={`Thumb ${idx + 1}`} 
                                className="w-full h-full object-cover" 
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="aspect-square bg-gray-100 rounded-xl flex items-center justify-center">
                      <div className="text-center">
                        <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-400 font-semibold">No images available</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Submission Details */}
                <div className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg">
                  <h3 className="font-bold text-gray-900 text-lg mb-4 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-gray-600" />
                    Submission Details
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600 font-semibold">Submitted By:</span>
                      <span className="text-gray-900 font-bold">
                        {fullObservation.submittedBy?.name || fullObservation.submittedBy?.username || 'Unknown'}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600 font-semibold">Location:</span>
                      <span className="text-gray-900 font-bold">
                        {fullObservation.location?.latitude?.toFixed(4)}, {fullObservation.location?.longitude?.toFixed(4)}
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-600 font-semibold">Submitted:</span>
                      <span className="text-gray-900 font-bold">
                        {new Date(fullObservation.createdAt).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Review Form */}
              <div className="lg:col-span-3 space-y-6">
                {/* Taxonomy & Description */}
                <div className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg">
                  <div className="flex items-center gap-2 mb-5 pb-4 border-b-2 border-gray-100">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <Sparkles className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg">Taxonomy & Description</h3>
                  </div>

                  <div className="space-y-5">
                    {/* Common Name */}
                    <div className="relative">
                      <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                        🍄 Common Name
                      </label>
                      <input
                        ref={commonNameInputRef}
                        type="text"
                        value={formData.commonName || ''}
                        onChange={(e) => setFormData({ ...formData, commonName: e.target.value })}
                        onFocus={() => commonNameSuggestions.length > 0 && setShowCommonNameSuggestions(true)}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-semibold transition-all"
                        placeholder="Enter common name..."
                      />
                      
                      {/* Common Name Suggestions Dropdown */}
                      {showCommonNameSuggestions && commonNameSuggestions.length > 0 && (
                        <div
                          ref={commonNameSuggestionsRef}
                          className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-emerald-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto z-50 py-2"
                        >
                          {commonNameSuggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => handleCommonNameSelect(suggestion)}
                              className="w-full px-4 py-2.5 text-left hover:bg-emerald-50 transition-colors border-b border-gray-100 last:border-b-0"
                            >
                              <div className="flex flex-col gap-0.5">
                                <span className="text-sm font-bold text-slate-800">
                                  {suggestion.commonName}
                                </span>
                                {suggestion.scientificName && (
                                  <span className="text-xs italic text-emerald-600">
                                    {suggestion.scientificName}
                                  </span>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Scientific Name */}
                    <div className="relative">
                      <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                        🔬 Scientific Name
                      </label>
                      <input
                        ref={scientificNameInputRef}
                        type="text"
                        value={formData.scientificName || ''}
                        onChange={(e) => setFormData({ ...formData, scientificName: e.target.value })}
                        onFocus={() => scientificNameSuggestions.length > 0 && setShowScientificNameSuggestions(true)}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 italic font-semibold transition-all"
                        placeholder="Genus species"
                      />
                      
                      {/* Scientific Name Suggestions Dropdown */}
                      {showScientificNameSuggestions && scientificNameSuggestions.length > 0 && (
                        <div
                          ref={scientificNameSuggestionsRef}
                          className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-emerald-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto z-50 py-2"
                        >
                          {scientificNameSuggestions.map((suggestion, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => handleScientificNameSelect(suggestion)}
                              className="w-full px-4 py-2.5 text-left hover:bg-emerald-50 transition-colors border-b border-gray-100 last:border-b-0"
                            >
                              <div className="flex flex-col gap-0.5">
                                <span className="text-sm italic font-bold text-emerald-600">
                                  {suggestion.scientificName}
                                </span>
                                {suggestion.commonName && (
                                  <span className="text-xs text-slate-700">
                                    {suggestion.commonName}
                                  </span>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                        📝 Description
                      </label>
                      <textarea
                        value={formData.description || ''}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={4}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                        placeholder="Detailed characteristics, habitat, distinctive features..."
                      />
                    </div>

                    {/* Ecological Role */}
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
                        🌿 Ecological Role
                      </label>
                      <div className="flex gap-3 flex-wrap">
                        {['decomposer', 'symbiont', 'parasite'].map((role) => (
                          <button
                            key={role}
                            onClick={() => toggleEcologicalRole(role)}
                            className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all transform hover:scale-105 ${
                              formData.ecologicalRole?.includes(role)
                                ? 'bg-emerald-600 text-white shadow-lg ring-2 ring-emerald-200'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-gray-200'
                            }`}
                          >
                            {role}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Texture */}
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                          🖐️ Texture
                        </label>
                        <select
                          value={formData.texture || ''}
                          onChange={(e) => setFormData({ ...formData, texture: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-semibold transition-all"
                        >
                          <option value="">Select texture...</option>
                          <option value="soft-to-touch">soft to touch</option>
                          <option value="hard-to-touch">hard to touch</option>
                          <option value="jelly-like">jelly-like</option>
                          <option value="leathery">leathery</option>
                        </select>
                      </div>

                      {/* Underside */}
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                          ⚪ Underside
                        </label>
                        <select
                          value={formData.underside || ''}
                          onChange={(e) => setFormData({ ...formData, underside: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-semibold transition-all"
                        >
                          <option value="">Select underside...</option>
                          <option value="pores">pores</option>
                          <option value="gills">gills</option>
                          <option value="teeth">teeth</option>
                          <option value="ball-with-no-distinctive-bottom">ball with no distinctive bottom</option>
                          <option value="cup-with-no-distinctive-bottom">cup with no distinctive bottom</option>
                          <option value="club-with-no-distinctive-bottom">club with no distinctive bottom</option>
                          <option value="crust-on-wood-with-no-distinctive-bottom">crust on wood with no distinctive bottom</option>
                          <option value="star-with-no-distinctive-bottom">star with no distinctive bottom</option>
                          <option value="jelly-with-no-distinctive-bottom">jelly with no distinctive bottom</option>
                          <option value="sponge-with-no-distinctive-bottom">sponge with no distinctive bottom</option>
                        </select>
                      </div>

                      {/* Fruiting Surface */}
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                          🌳 Fruiting Surface
                        </label>
                        <select
                          value={formData.fruitingSurface || ''}
                          onChange={(e) => setFormData({ ...formData, fruitingSurface: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-semibold transition-all"
                        >
                          <option value="">Select surface...</option>
                          <option value="ground">ground</option>
                          <option value="wood">wood</option>
                          <option value="leaf">leaf</option>
                          <option value="dung">dung</option>
                        </select>
                      </div>

                      {/* Stem Presence */}
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                          🦵 Stem Presence
                        </label>
                        <select
                          value={formData.stemPresence || ''}
                          onChange={(e) => setFormData({ ...formData, stemPresence: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-semibold transition-all"
                        >
                          <option value="">Select stem presence...</option>
                          <option value="has-stem">has stem</option>
                          <option value="has-no-stem">no stem</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Properties & Uses */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200 shadow-lg">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Sparkles className="w-5 h-5 text-purple-600" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg">Properties & Uses</h3>
                  </div>

                  <div className="flex gap-3 flex-wrap">
                    {['edible', 'inedible', 'poisonous', 'medicinal', 'hallucinogenic', 'other-uses', 'mysterious'].map((use) => (
                      <button
                        key={use}
                        onClick={() => toggleCommonUse(use)}
                        className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all transform hover:scale-105 ${
                          formData.commonUses?.includes(use)
                            ? 'bg-purple-600 text-white shadow-lg ring-2 ring-purple-200'
                            : 'bg-white text-gray-700 hover:bg-purple-50 border-2 border-purple-200'
                        }`}
                      >
                        {use}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Administrative Review */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border-2 border-amber-300 shadow-lg">
                  <div className="flex items-center gap-2 mb-5 pb-4 border-b-2 border-amber-200">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-amber-700" />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg">Administrative Review</h3>
                  </div>

                  <div className="space-y-5">
                    {/* Internal Notes */}
                    <div>
                      <label className="block text-sm font-bold text-amber-800 mb-2 uppercase tracking-wide flex items-center gap-2">
                        🔒 Internal Notes (Private - Admin Only)
                      </label>
                      <textarea
                        value={formData.adminNotes || ''}
                        onChange={(e) => setFormData({ ...formData, adminNotes: e.target.value })}
                        rows={4}
                        className="w-full px-4 py-3 border-2 border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white transition-all"
                        placeholder="Log internal thoughts, data verification notes, quality assessment..."
                      />
                    </div>

                    {/* Rejection Reason */}
                    <div>
                      <label className="block text-sm font-bold text-red-700 mb-2 uppercase tracking-wide flex items-center gap-2">
                        🔴 Rejection Reason (Visible to Submitter)
                      </label>
                      <textarea
                        value={formData.rejectionReason || ''}
                        onChange={(e) => setFormData({ ...formData, rejectionReason: e.target.value })}
                        rows={4}
                        className="w-full px-4 py-3 border-2 border-red-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-400 bg-white transition-all"
                        placeholder="Explain why this observation was rejected (e.g., poor image quality, insufficient data, misidentification)..."
                      />
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {['Not a fungi', 'Duplicate observation'].map((reason) => (
                          <button
                            key={reason}
                            type="button"
                            onClick={() => setFormData({ ...formData, rejectionReason: reason })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-2 ${
                              formData.rejectionReason === reason
                                ? 'bg-red-600 text-white border-red-600 shadow-md'
                                : 'bg-white text-gray-700 hover:bg-red-50 border-red-200'
                            }`}
                          >
                            {reason}
                          </button>
                        ))}
                        {formData.rejectionReason && (
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, rejectionReason: '' })}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-2 bg-gray-100 hover:bg-gray-200 text-gray-600 border-gray-200"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-2 font-semibold">
                        ℹ️ Optional: Provide a rejection reason or click a preset above
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer - Action Buttons */}
          <div className="border-t-2 border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 p-6">
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={onClose}
                disabled={saving || approving || rejecting}
                className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveOnly}
                  disabled={saving || approving || rejecting}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-5 h-5" />
                  {saving ? 'Saving...' : 'Save Review'}
                </button>
                
                {formData.status === 'pending' && (
                  <>
                    <button
                      onClick={handleReject}
                      disabled={saving || approving || rejecting}
                      className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <XCircle className="w-5 h-5" />
                      {rejecting ? 'Rejecting...' : 'Reject'}
                    </button>
                    <button
                      onClick={handleApprove}
                      disabled={saving || approving || rejecting}
                      className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold hover:from-emerald-700 hover:to-teal-700 transition-all hover:scale-105 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckCircle className="w-5 h-5" />
                      {approving ? 'Approving...' : 'Approve Observation'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
