"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { isSuperAdmin } from "@/lib/permissions";
import { X, Camera, MapPin, Search, Navigation } from "lucide-react";
import toast from "react-hot-toast";
import MushroomSelectField from "./MushroomSelectField";
import LocationPickerModal from "./LocationPickerModal";
import { extractExifData } from "@/lib/exifUtils";
import { uploadToCloudinary } from "@/lib/uploadToCloudinary";

import { geocodeCity } from "@/lib/geocoding";
import { useAuth } from "@/context/AuthContext";
import {
  ECOLOGICAL_ROLES,
  TEXTURES,
  UNDERSIDES,
  FRUITING_SURFACES,
  STEM_PRESENCE,
  COMMON_USES,
} from "./mushroomConstants";

export default function MushroomSubmissionForm({
  isOpen,
  onClose,
  onSuccess,
  selectedLocation,
  onLocationSelect,
}) {
  const { user } = useAuth();
  // These gate submission privileges — gallery upload and manual location
  // entry — which bypass the live-capture rule, so they are superadmin only.
  // A subadmin moderates submissions but submits under the same rules as
  // everyone else.
  const isAdmin = isSuperAdmin(user);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState("idle"); // idle | signing | uploading | saving
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationInputMethod, setLocationInputMethod] = useState("map"); // map, city, manual
  const [hasExifGps, setHasExifGps] = useState(false);
  const [cityName, setCityName] = useState("");
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [exifDateTime, setExifDateTime] = useState(null);
  const [isExtractingExif, setIsExtractingExif] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isFromCamera, setIsFromCamera] = useState(false);
  const [commonName, setCommonName] = useState("");
  const [scientificName, setScientificName] = useState("");
  const [ecologicalRole, setEcologicalRole] = useState([]);
  const [texture, setTexture] = useState("");
  const [underside, setUnderside] = useState("");
  const [fruitingSurface, setFruitingSurface] = useState("");
  const [stemPresence, setStemPresence] = useState("");
  const [commonUses, setCommonUses] = useState([]);
  
  // Autocomplete states
  const [allMushrooms, setAllMushrooms] = useState([]);
  const [commonNameSuggestions, setCommonNameSuggestions] = useState([]);
  const [scientificNameSuggestions, setScientificNameSuggestions] = useState([]);
  const [showCommonNameSuggestions, setShowCommonNameSuggestions] = useState(false);
  const [showScientificNameSuggestions, setShowScientificNameSuggestions] = useState(false);
  const [selectedCommonNameIndex, setSelectedCommonNameIndex] = useState(-1);
  const [selectedScientificNameIndex, setSelectedScientificNameIndex] = useState(-1);
  const commonNameInputRef = useRef(null);
  const scientificNameInputRef = useRef(null);
  const commonNameSuggestionsRef = useRef(null);
  const scientificNameSuggestionsRef = useRef(null);

  // Fetch all mushrooms for autocomplete
  useEffect(() => {
    const fetchMushrooms = async () => {
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
    
    if (isOpen) {
      fetchMushrooms();
    }
  }, [isOpen]);

  // Canonical (common name, scientific name) pairs drawn from existing
  // observations.
  //
  // Both suggestion lists used to dedupe on a single field — the common-name
  // list keyed only on commonName, the scientific list only on scientificName
  // — and each attached whichever partner name happened to come first in the
  // API response. Records sort by approvedAt, so a submission saved without a
  // scientific name could shadow a complete one, and the same mushroom showed
  // a different partner name depending on which field you searched from.
  // Keying on the pair means both lists describe the same set of mushrooms.
  const namePairs = useMemo(() => {
    const byPair = new Map();

    allMushrooms.forEach((item) => {
      const common = (item.commonName || item.name || "").trim();
      const scientific = (item.scientificName || "").trim();

      // An observation with neither name tells us nothing
      if (!common && !scientific) return;

      const key = `${common.toLowerCase()}|${scientific.toLowerCase()}`;
      if (byPair.has(key)) return;

      byPair.set(key, {
        commonName: common,
        scientificName: scientific,
        ecologicalRole: item.ecologicalRole || [],
        texture: item.texture || "",
        underside: item.underside || "",
        fruitingSurface: item.fruitingSurface || "",
        stemPresence: item.stemPresence || "",
        commonUses: item.commonUses || [],
      });
    });

    const pairs = Array.from(byPair.values());

    // Where a complete pair exists, drop the half-filled entries that carry
    // the same name. Otherwise picking "Oyster Mushroom" could fill in a blank
    // scientific name purely because that record was submitted more recently.
    const complete = pairs.filter((pair) => pair.commonName && pair.scientificName);
    const commonCovered = new Set(complete.map((pair) => pair.commonName.toLowerCase()));
    const scientificCovered = new Set(complete.map((pair) => pair.scientificName.toLowerCase()));

    return pairs.filter((pair) => {
      if (pair.commonName && pair.scientificName) return true;
      if (pair.commonName && commonCovered.has(pair.commonName.toLowerCase())) return false;
      if (pair.scientificName && scientificCovered.has(pair.scientificName.toLowerCase())) return false;
      return true;
    });
  }, [allMushrooms]);

  // Generate common name suggestions
  useEffect(() => {
    const query = commonName.toLowerCase().trim();

    if (!query || !namePairs.length) {
      setCommonNameSuggestions([]);
      setShowCommonNameSuggestions(false);
      return;
    }

    setCommonNameSuggestions(
      namePairs
        .filter((pair) => pair.commonName.toLowerCase().includes(query))
        .slice(0, 8)
    );
  }, [commonName, namePairs]);

  // Generate scientific name suggestions
  useEffect(() => {
    const query = scientificName.toLowerCase().trim();

    if (!query || !namePairs.length) {
      setScientificNameSuggestions([]);
      setShowScientificNameSuggestions(false);
      return;
    }

    setScientificNameSuggestions(
      namePairs
        .filter((pair) => pair.scientificName.toLowerCase().includes(query))
        .slice(0, 8)
    );
  }, [scientificName, namePairs]);

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

  if (!isOpen) return null;

  // Get device GPS location
  const getDeviceLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by this browser"));
        return;
      }

      setIsGettingLocation(true);
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setIsGettingLocation(false);
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          setIsGettingLocation(false);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0, // Don't use cached position
        }
      );
    });
  };

  // Get current date/time
  const getCurrentDateTime = () => {
    return new Date();
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Which input the file came through is the only trustworthy signal here.
    // Filename and lastModified heuristics were dropped: gallery files on Android
    // are routinely named "image_1234.jpg" and a freshly copied file also looks
    // recent, so both matched gallery picks as camera captures.
    const inputElement = e.target;
    const isCamera = inputElement.hasAttribute('capture');

    setIsFromCamera(isCamera);
    setImageFile(file);
    setIsExtractingExif(true);

    // If from camera, get device location and date/time immediately
    if (isCamera) {
      try {
        // Get device GPS location
        try {
          const deviceLocation = await getDeviceLocation();
          onLocationSelect?.(deviceLocation);
          setHasExifGps(true);
          setLocationInputMethod("map");
          toast.success(`Location captured: ${deviceLocation.latitude.toFixed(5)}, ${deviceLocation.longitude.toFixed(5)}`);
        } catch (locationError) {
          console.warn("Could not get device location:", locationError);
          toast("Could not get GPS location. Please enable location services or select location manually.", {
            icon: "ℹ️",
          });
        }

        // Get current date/time
        const currentDateTime = getCurrentDateTime();
        setExifDateTime(currentDateTime);
        toast.success(`Date/time captured: ${currentDateTime.toLocaleString()}`);
      } catch (error) {
        console.error("Error getting device location/time:", error);
      }
    }

    // Create preview URL (separate from EXIF extraction)
    const showPreview = () => {
      const previewReader = new FileReader();
      previewReader.onloadend = () => {
        setImagePreview(previewReader.result);
      };
      previewReader.readAsDataURL(file);
    };

    if (isCamera) showPreview();

    // Extract EXIF data - read as ArrayBuffer to preserve all binary data
    try {
      // Try File object first (sometimes works better than ArrayBuffer for exifr)
      console.log("Attempting EXIF extraction from File object...");
      let exifResult = await extractExifData(file);

      // If that didn't work, try ArrayBuffer
      if (!exifResult.gps && !exifResult.dateTime) {
        console.log("File object method didn't find EXIF, trying ArrayBuffer...");
        const arrayBuffer = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = (err) => {
            console.error("Error reading ArrayBuffer:", err);
            reject(err);
          };
          reader.readAsArrayBuffer(file);
        });

        console.log("File read as ArrayBuffer, size:", arrayBuffer.byteLength, "bytes");
        exifResult = await extractExifData(arrayBuffer, file);
      }

      // Last resort: try as Blob
      if (!exifResult.gps && !exifResult.dateTime) {
        console.log("ArrayBuffer method didn't find EXIF, trying Blob...");
        const arrayBuffer = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsArrayBuffer(file);
        });
        const blob = new Blob([arrayBuffer], { type: file.type });
        exifResult = await extractExifData(blob, file);
      }

      const { gps, dateTime } = exifResult;
      console.log("EXIF extraction result:", { gps, dateTime, fileName: file.name });

      // For camera photos: EXIF takes priority if found (more accurate), otherwise use device location/time already set
      // For gallery photos: Try to use EXIF, fallback to manual selection
      
      if (isCamera) {
        // Camera photo: EXIF is preferred if available (more accurate), but we already have device location/time
        if (gps && gps.latitude && gps.longitude) {
          // EXIF GPS found - use it (more accurate than device location)
          onLocationSelect?.(gps);
          setHasExifGps(true);
          toast.success(`Location from EXIF: ${gps.latitude.toFixed(5)}, ${gps.longitude.toFixed(5)}`);
        }
        // If no EXIF GPS, device location was already set above
        
        if (dateTime) {
          // EXIF date/time found - use it (more accurate)
          setExifDateTime(dateTime);
          toast.success(`Date/time from EXIF: ${dateTime.toLocaleString()}`);
        }
        // If no EXIF date/time, device date/time was already set above
      } else {
        // Gallery photo: EXIF GPS is mandatory — stripped photos are rejected
        if (!gps || !gps.latitude || !gps.longitude) {
          toast.error("EXIF data has been removed. Please capture a live photo.", {
            duration: 5000,
          });
          setImageFile(null);
          setIsFromCamera(false);
          inputElement.value = "";
          return;
        }

        onLocationSelect?.(gps);
        setHasExifGps(true);
        setLocationInputMethod("map");
        toast.success(`Location found in EXIF: ${gps.latitude.toFixed(5)}, ${gps.longitude.toFixed(5)}`);
        showPreview();

        if (dateTime) {
          setExifDateTime(dateTime);
          toast.success(`Photo date/time: ${dateTime.toLocaleString()}`);
        }
      }
    } catch (error) {
      console.error("Error reading EXIF:", error);
      console.error("Error details:", error.message, error.stack);
      setHasExifGps(false);
      setLocationInputMethod("map");
      if (isCamera) {
        toast.error("Could not read EXIF data from image");
      } else {
        toast.error("EXIF data has been removed. Please capture a live photo.");
        setImageFile(null);
        setIsFromCamera(false);
        inputElement.value = "";
      }
    } finally {
      setIsExtractingExif(false);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setExifDateTime(null);
    setHasExifGps(false);
    setIsFromCamera(false);
    onLocationSelect?.(null);
  };

  const handleCitySearch = async () => {
    if (!cityName.trim()) {
      toast.error("Please enter a city name");
      return;
    }

    setIsGeocoding(true);
    try {
      const coords = await geocodeCity(cityName);
      if (coords) {
        onLocationSelect?.(coords);
        toast.success(`Location found for ${cityName}`);
      } else {
        toast.error(
          "City not found. Please try a different name or use map picker."
        );
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      toast.error("Failed to find city. Please try again.");
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleManualLocation = () => {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);

    if (isNaN(lat) || isNaN(lng)) {
      toast.error("Please enter valid latitude and longitude");
      return;
    }

    if (lat < -90 || lat > 90) {
      toast.error("Latitude must be between -90 and 90");
      return;
    }

    if (lng < -180 || lng > 180) {
      toast.error("Longitude must be between -180 and 180");
      return;
    }

    onLocationSelect?.({ latitude: lat, longitude: lng });
    toast.success("Location set manually");
  };

  const getCurrentLocation = () => {
    if (!selectedLocation) return null;
    return selectedLocation;
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  const location = getCurrentLocation();
  if (!location) {
    toast.error("Please provide a location");
    return;
  }

  if (!imageFile) {
    toast.error("Please upload an image");
    return;
  }

  setIsSubmitting(true);
  setUploadProgress(0);
  setUploadStage("signing");

  try {
    // 1️⃣ Upload image to Cloudinary
    setUploadStage("uploading");
    const upload = await uploadToCloudinary(imageFile, {
      onProgress: (pct) => setUploadProgress(pct),
    });
    setUploadProgress(100);

    // 2️⃣ Send coordinates + image URL as JSON
    setUploadStage("saving");
    const res = await fetch("/api/mushrooms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        latitude: location.latitude,
        longitude: location.longitude,
        imageUrl: upload.secure_url,
        publicId: upload.public_id,
        captureMethod: isFromCamera ? "camera" : "gallery",

        // optional
        photoDateTime: exifDateTime?.toISOString(),
        commonName,
        scientificName,
        ecologicalRole,
        texture,
        underside,
        fruitingSurface,
        stemPresence,
        commonUses,
      }),
    });

    const data = await res.json();

if (!res.ok) {
  console.error("Server error response:", data);
  throw new Error(data.message || data.error || "Submission failed");
}

toast.success(data.message || "Mushroom submitted successfully!");


    // Reset form
    setImageFile(null);
    setImagePreview(null);
    setCommonName("");
    setScientificName("");
    setEcologicalRole([]);
    setTexture("");
    setUnderside("");
    setFruitingSurface("");
    setStemPresence("");
    setCommonUses([]);
    setExifDateTime(null);
    setHasExifGps(false);
    setIsFromCamera(false);
    setLocationInputMethod("map");
    onLocationSelect?.(null);

    onSuccess?.();
    onClose();
  } catch (err) {
    console.error("Submission error:", err);
    toast.error(err.message || "Failed to submit mushroom");
  } finally {
    setIsSubmitting(false);
    setUploadStage("idle");
    setUploadProgress(0);
  }
};


  const currentLocation = getCurrentLocation();

  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center sm:p-4 bg-emerald-950/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white border border-stone-200 w-full max-w-md rounded-t-3xl sm:rounded-[2.5rem] shadow-2xl relative animate-in slide-in-from-bottom sm:zoom-in-95 duration-300 max-h-[92dvh] sm:max-h-[90dvh] flex flex-col">
        {/* CLOSE BUTTON */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-8 sm:right-8 text-stone-400 hover:text-emerald-600 transition-colors z-10"
        >
          <X size={20} className="sm:w-6 sm:h-6" strokeWidth={2.5} />
        </button>

        {/* HEADER - Fixed */}
        <div className="p-4 sm:p-6 md:p-8 md:pb-6 pb-4 shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-6 bg-emerald-500 rounded-full" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">
              Citizen Science
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-emerald-900 uppercase tracking-tight">
            Add <span className="text-emerald-600 italic">Specimen</span>
          </h2>
        </div>

        {/* FORM - Scrollable */}
        <form
          id="mushroom-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 md:pb-10 pb-4 sm:pb-6 space-y-4"
        >
          {/* INFO MESSAGE */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 sm:p-4 space-y-2">
            <p className="text-[10px] sm:text-xs font-bold text-emerald-800 text-center leading-relaxed">
              📸 <strong>Tip:</strong> Use "Take Photo with Camera" to automatically capture GPS location and date/time from your device.
            </p>
            {isAdmin && (
              <p className="text-[9px] sm:text-[10px] text-emerald-700 text-center leading-relaxed">
                ⚠️ <strong>Note:</strong> Gallery uploads must still contain EXIF GPS data. Photos with EXIF stripped will be rejected.
              </p>
            )}
          </div>

          {/* PHOTO UPLOAD - REQUIRED */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-2 uppercase tracking-wider">
              Photo <span className="text-red-500">*</span>
            </label>
            
            {imagePreview ? (
              // IMAGE PREVIEW
              <div className="relative w-full rounded-3xl overflow-hidden border-2 border-emerald-300 bg-stone-50">
                <img
                  src={imagePreview}
                  alt="Selected mushroom"
                  className="w-full h-64 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent">
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="text-white text-xs font-bold mb-1 truncate">
                      {imageFile.name}
                    </p>
                    {exifDateTime && (
                      <p className="text-white/80 text-[10px] font-medium">
                        📅 {exifDateTime.toLocaleString()}
                      </p>
                    )}
                    {hasExifGps && (
                      <p className="text-white/80 text-[10px] font-medium">
                        📍 GPS location found
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                  title="Remove image"
                >
                  <X size={16} />
                </button>
                <label className="absolute bottom-3 right-3 cursor-pointer">
                  <span className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg">
                    Change Photo
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleImageChange}
                    accept="image/*"
                    {...(isAdmin ? {} : { capture: "environment" })}
                  />
                </label>
              </div>
            ) : (
              // UPLOAD OPTIONS
              <div className="space-y-3">
                {/* CAMERA OPTION */}
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-emerald-300 rounded-2xl cursor-pointer hover:bg-emerald-50 group transition-all bg-emerald-50/30 relative">
                  <div className="bg-emerald-600 p-3 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                    <Camera className="text-white" size={24} />
                  </div>
                  <p className="mt-2 text-xs text-emerald-700 font-bold uppercase tracking-wider">
                    Take Photo with Camera
                  </p>
                  <p className="text-[10px] text-emerald-600 font-medium mt-1 text-center px-2">
                    Automatically captures GPS location and date/time from your device
                  </p>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleImageChange}
                    accept="image/*"
                    capture="environment"
                    required
                  />
                </label>

                {/* MANUAL UPLOAD OPTION - ADMIN ONLY */}
                {isAdmin && (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-stone-300 rounded-2xl cursor-pointer hover:bg-stone-50 group transition-all bg-stone-50 relative">
                  <div className="bg-stone-400 p-3 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                    <MapPin className="text-white" size={24} />
                  </div>
                  <p className="mt-2 text-xs text-stone-700 font-bold uppercase tracking-wider">
                    Upload from Gallery / Files
                  </p>
                  <p className="text-[10px] text-stone-500 font-medium mt-1 text-center px-2">
                    Note: Some mobile browsers may strip EXIF data from gallery images
                  </p>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleImageChange}
                    accept="image/*"
                    required
                  />
                </label>
                )}
              </div>
            )}

            {(isExtractingExif || isGettingLocation) && (
              <div className="mt-2 space-y-2">
                {isGettingLocation && (
                  <div className="flex items-center gap-2 text-xs text-emerald-600">
                    <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="font-medium">Getting GPS location from device...</span>
                  </div>
                )}
                {isExtractingExif && (
                  <div className="flex items-center gap-2 text-xs text-emerald-600">
                    <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="font-medium">Extracting EXIF data from image...</span>
                  </div>
                )}
              </div>
            )}
            
            {exifDateTime && !imagePreview && (
              <p className="mt-2 text-xs text-emerald-600 font-medium">
                📅 Photo taken: {exifDateTime.toLocaleString()}
              </p>
            )}
          </div>

          {/* COMMON NAME - OPTIONAL WITH AUTOCOMPLETE */}
          <div className="relative">
            <input
              ref={commonNameInputRef}
              value={commonName}
              onChange={(e) => {
                setCommonName(e.target.value);
                setSelectedCommonNameIndex(-1);
                setShowCommonNameSuggestions(true);
              }}
              onFocus={() => commonNameSuggestions.length > 0 && setShowCommonNameSuggestions(true)}
              onKeyDown={(e) => {
                if (!showCommonNameSuggestions || commonNameSuggestions.length === 0) return;
                
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setSelectedCommonNameIndex((prev) =>
                    prev < commonNameSuggestions.length - 1 ? prev + 1 : prev
                  );
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setSelectedCommonNameIndex((prev) => (prev > 0 ? prev - 1 : -1));
                } else if (e.key === "Enter" && selectedCommonNameIndex >= 0) {
                  e.preventDefault();
                  const suggestion = commonNameSuggestions[selectedCommonNameIndex];
                  setCommonName(suggestion.commonName);
                  if (suggestion.scientificName) {
                    setScientificName(suggestion.scientificName);
                  }
                  // Autofill other fields if available
                  if (suggestion.ecologicalRole && suggestion.ecologicalRole.length > 0) {
                    setEcologicalRole(suggestion.ecologicalRole);
                  }
                  if (suggestion.texture) setTexture(suggestion.texture);
                  if (suggestion.underside) setUnderside(suggestion.underside);
                  if (suggestion.fruitingSurface) setFruitingSurface(suggestion.fruitingSurface);
                  if (suggestion.stemPresence) setStemPresence(suggestion.stemPresence);
                  if (suggestion.commonUses && suggestion.commonUses.length > 0) {
                    setCommonUses(suggestion.commonUses);
                  }
                  setShowCommonNameSuggestions(false);
                } else if (e.key === "Escape") {
                  setShowCommonNameSuggestions(false);
                }
              }}
              placeholder="Common name (optional)"
              className="w-full bg-stone-100 border border-stone-200 rounded-2xl px-4 sm:px-5 py-3 sm:py-4 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white outline-none transition-all font-medium text-stone-800 placeholder:text-stone-400 text-sm sm:text-base"
            />
            
            {/* Common Name Suggestions Dropdown */}
            {showCommonNameSuggestions && commonNameSuggestions.length > 0 && (
              <div
                ref={commonNameSuggestionsRef}
                className="absolute top-full left-0 right-0 mt-2 bg-white border border-stone-200 rounded-2xl shadow-2xl max-h-60 overflow-y-auto z-50 py-2"
              >
                {commonNameSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      setCommonName(suggestion.commonName);
                      if (suggestion.scientificName) {
                        setScientificName(suggestion.scientificName);
                      }
                      // Autofill other fields if available
                      if (suggestion.ecologicalRole && suggestion.ecologicalRole.length > 0) {
                        setEcologicalRole(suggestion.ecologicalRole);
                      }
                      if (suggestion.texture) setTexture(suggestion.texture);
                      if (suggestion.underside) setUnderside(suggestion.underside);
                      if (suggestion.fruitingSurface) setFruitingSurface(suggestion.fruitingSurface);
                      if (suggestion.stemPresence) setStemPresence(suggestion.stemPresence);
                      if (suggestion.commonUses && suggestion.commonUses.length > 0) {
                        setCommonUses(suggestion.commonUses);
                      }
                      setShowCommonNameSuggestions(false);
                    }}
                    className={`w-full px-4 py-2.5 text-left hover:bg-emerald-50 transition-colors border-b border-stone-100 last:border-b-0 ${
                      index === selectedCommonNameIndex ? "bg-emerald-50" : ""
                    }`}
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

          {/* SCIENTIFIC NAME - OPTIONAL WITH AUTOCOMPLETE */}
          <div className="relative">
            <input
              ref={scientificNameInputRef}
              value={scientificName}
              onChange={(e) => {
                setScientificName(e.target.value);
                setSelectedScientificNameIndex(-1);
                setShowScientificNameSuggestions(true);
              }}
              onFocus={() => scientificNameSuggestions.length > 0 && setShowScientificNameSuggestions(true)}
              onKeyDown={(e) => {
                if (!showScientificNameSuggestions || scientificNameSuggestions.length === 0) return;
                
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setSelectedScientificNameIndex((prev) =>
                    prev < scientificNameSuggestions.length - 1 ? prev + 1 : prev
                  );
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setSelectedScientificNameIndex((prev) => (prev > 0 ? prev - 1 : -1));
                } else if (e.key === "Enter" && selectedScientificNameIndex >= 0) {
                  e.preventDefault();
                  const suggestion = scientificNameSuggestions[selectedScientificNameIndex];
                  setScientificName(suggestion.scientificName);
                  if (suggestion.commonName) {
                    setCommonName(suggestion.commonName);
                  }
                  // Autofill other fields if available
                  if (suggestion.ecologicalRole && suggestion.ecologicalRole.length > 0) {
                    setEcologicalRole(suggestion.ecologicalRole);
                  }
                  if (suggestion.texture) setTexture(suggestion.texture);
                  if (suggestion.underside) setUnderside(suggestion.underside);
                  if (suggestion.fruitingSurface) setFruitingSurface(suggestion.fruitingSurface);
                  if (suggestion.stemPresence) setStemPresence(suggestion.stemPresence);
                  if (suggestion.commonUses && suggestion.commonUses.length > 0) {
                    setCommonUses(suggestion.commonUses);
                  }
                  setShowScientificNameSuggestions(false);
                } else if (e.key === "Escape") {
                  setShowScientificNameSuggestions(false);
                }
              }}
              placeholder="Scientific name (optional)"
              className="w-full bg-stone-100 border border-stone-200 rounded-2xl px-4 sm:px-5 py-3 sm:py-4 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white outline-none transition-all font-medium text-stone-800 placeholder:text-stone-400 text-sm sm:text-base italic"
            />
            
            {/* Scientific Name Suggestions Dropdown */}
            {showScientificNameSuggestions && scientificNameSuggestions.length > 0 && (
              <div
                ref={scientificNameSuggestionsRef}
                className="absolute top-full left-0 right-0 mt-2 bg-white border border-stone-200 rounded-2xl shadow-2xl max-h-60 overflow-y-auto z-50 py-2"
              >
                {scientificNameSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      setScientificName(suggestion.scientificName);
                      if (suggestion.commonName) {
                        setCommonName(suggestion.commonName);
                      }
                      // Autofill other fields if available
                      if (suggestion.ecologicalRole && suggestion.ecologicalRole.length > 0) {
                        setEcologicalRole(suggestion.ecologicalRole);
                      }
                      if (suggestion.texture) setTexture(suggestion.texture);
                      if (suggestion.underside) setUnderside(suggestion.underside);
                      if (suggestion.fruitingSurface) setFruitingSurface(suggestion.fruitingSurface);
                      if (suggestion.stemPresence) setStemPresence(suggestion.stemPresence);
                      if (suggestion.commonUses && suggestion.commonUses.length > 0) {
                        setCommonUses(suggestion.commonUses);
                      }
                      setShowScientificNameSuggestions(false);
                    }}
                    className={`w-full px-4 py-2.5 text-left hover:bg-emerald-50 transition-colors border-b border-stone-100 last:border-b-0 ${
                      index === selectedScientificNameIndex ? "bg-emerald-50" : ""
                    }`}
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

          {/* LOCATION INPUT - REQUIRED */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-2 uppercase tracking-wider">
              Location <span className="text-red-500">*</span>
            </label>

            {/* Current Location Display */}
            {currentLocation && (
              <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-emerald-800">
                      📍 {currentLocation.latitude.toFixed(5)},{" "}
                      {currentLocation.longitude.toFixed(5)}
                    </p>
                    {hasExifGps && (
                      <p className="text-[10px] text-emerald-600 mt-1">
                        (From image EXIF)
                      </p>
                    )}
                  </div>
                  {/* Admin only: discarding the EXIF location leaves a non-admin
                      with no picker and no way back to the coordinates they had. */}
                  {hasExifGps && isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setHasExifGps(false);
                        setLocationInputMethod("map");
                      }}
                      className="px-3 py-1.5 text-[10px] font-bold uppercase bg-white border border-emerald-300 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-all"
                    >
                      Change
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Location Input Methods - ADMIN ONLY, and only when the photo
                carries no EXIF GPS. Regular submitters cannot set a location by
                hand at all: the coordinates must come from the photo itself, so
                an observation's location always reflects where the photo was
                actually taken. */}
            {!hasExifGps && isAdmin && (
              <div className="space-y-3">
                {/* Method Selector */}
                {!currentLocation && (
                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setLocationInputMethod("map")}
                      className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${
                        locationInputMethod === "map"
                          ? "bg-emerald-600 text-white"
                          : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                      }`}
                    >
                      <MapPin size={12} className="inline mr-1" />
                      Map
                    </button>
                    <button
                      type="button"
                      onClick={() => setLocationInputMethod("city")}
                      className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${
                        locationInputMethod === "city"
                          ? "bg-emerald-600 text-white"
                          : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                      }`}
                    >
                      <Search size={12} className="inline mr-1" />
                      City
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setLocationInputMethod("manual")}
                        className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${
                          locationInputMethod === "manual"
                            ? "bg-emerald-600 text-white"
                            : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                        }`}
                      >
                        <Navigation size={12} className="inline mr-1" />
                        Manual
                      </button>
                    )}
                  </div>
                )}

                {/* Map Picker */}
                {locationInputMethod === "map" && (
                  <button
                    type="button"
                    onClick={() => setShowLocationPicker(true)}
                    className="w-full bg-stone-100 border-2 border-stone-200 rounded-2xl px-4 sm:px-5 py-3 sm:py-4 text-left font-bold transition hover:border-emerald-300 text-stone-600 text-sm sm:text-base"
                  >
                    Click to select location on map
                  </button>
                )}

                {/* City Search */}
                {locationInputMethod === "city" && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={cityName}
                      onChange={(e) => setCityName(e.target.value)}
                      placeholder="Enter city name..."
                      className="flex-1 bg-stone-100 border border-stone-200 rounded-2xl px-4 py-3 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white outline-none transition-all font-medium text-stone-800 placeholder:text-stone-400 text-sm"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleCitySearch();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleCitySearch}
                      disabled={isGeocoding}
                      className="px-4 py-3 bg-emerald-600 text-white rounded-2xl font-bold text-xs uppercase disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-700 transition-all"
                    >
                      {isGeocoding ? "..." : "Search"}
                    </button>
                  </div>
                )}

                {/* Manual Input - ADMIN ONLY */}
                {isAdmin && locationInputMethod === "manual" && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="any"
                        value={manualLat}
                        onChange={(e) => setManualLat(e.target.value)}
                        placeholder="Latitude (-90 to 90)"
                        className="flex-1 bg-stone-100 border border-stone-200 rounded-2xl px-4 py-3 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white outline-none transition-all font-medium text-stone-800 placeholder:text-stone-400 text-sm"
                      />
                      <input
                        type="number"
                        step="any"
                        value={manualLng}
                        onChange={(e) => setManualLng(e.target.value)}
                        placeholder="Longitude (-180 to 180)"
                        className="flex-1 bg-stone-100 border border-stone-200 rounded-2xl px-4 py-3 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white outline-none transition-all font-medium text-stone-800 placeholder:text-stone-400 text-sm"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleManualLocation}
                      className="w-full px-4 py-3 bg-emerald-600 text-white rounded-2xl font-bold text-xs uppercase hover:bg-emerald-700 transition-all"
                    >
                      Set Location
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Non-admins have no manual fallback — tell them why and how to fix it */}
            {!hasExifGps && !isAdmin && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-1">
                <p className="text-xs font-bold text-amber-800">
                  No location found in this photo
                </p>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  Observation locations come from the photo itself. Turn on location
                  access for your camera and take the photo again — a photo picked from
                  your gallery or one with its location data removed cannot be submitted.
                </p>
              </div>
            )}
          </div>

          {/* CLASSIFICATION FIELDS - OPTIONAL */}
          <div className="border-t border-stone-200 pt-6 mt-6">
            <p className="text-xs font-black uppercase tracking-widest text-stone-500 mb-4">
              Classification (Optional)
            </p>

            <div className="space-y-4">
              {/* ECOLOGICAL ROLE - MULTI-SELECT */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-2 uppercase tracking-wider">
                  Ecological Role
                </label>
                <div className="flex flex-wrap gap-2">
                  {ECOLOGICAL_ROLES.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => {
                        setEcologicalRole((prev) =>
                          prev.includes(role)
                            ? prev.filter((r) => r !== role)
                            : [...prev, role]
                        );
                      }}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                        ecologicalRole.includes(role)
                          ? "bg-emerald-600 text-white"
                          : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                      }`}
                    >
                      {role
                        .split("-")
                        .map(
                          (word) => word.charAt(0).toUpperCase() + word.slice(1)
                        )
                        .join(" ")}
                    </button>
                  ))}
                </div>
              </div>

              <MushroomSelectField
                label="Texture"
                value={texture}
                onChange={setTexture}
                options={TEXTURES}
              />

              <MushroomSelectField
                label="Underside"
                value={underside}
                onChange={setUnderside}
                options={UNDERSIDES}
              />

              <MushroomSelectField
                label="Fruiting Surface"
                value={fruitingSurface}
                onChange={setFruitingSurface}
                options={FRUITING_SURFACES}
              />

              <MushroomSelectField
                label="Stem Presence"
                value={stemPresence}
                onChange={setStemPresence}
                options={STEM_PRESENCE}
              />

              {/* COMMON USES */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-2 uppercase tracking-wider">
                  Common Uses
                </label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_USES.map((use) => (
                    <button
                      key={use}
                      type="button"
                      onClick={() => {
                        setCommonUses((prev) =>
                          prev.includes(use)
                            ? prev.filter((u) => u !== use)
                            : [...prev, use]
                        );
                      }}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                        commonUses.includes(use)
                          ? "bg-emerald-600 text-white"
                          : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                      }`}
                    >
                      {use
                        .split("-")
                        .map(
                          (word) => word.charAt(0).toUpperCase() + word.slice(1)
                        )
                        .join(" ")}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* SUBMIT BUTTON - Fixed */}
        <div className="p-4 sm:p-6 md:p-8 md:pt-4 pt-3 border-t border-stone-200 shrink-0 space-y-3">
          {/* Progress indicator */}
          {isSubmitting && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-emerald-700">
                  {uploadStage === "signing" && "Preparing upload..."}
                  {uploadStage === "uploading" && "Uploading photo..."}
                  {uploadStage === "saving" && "Saving observation..."}
                </span>
                {uploadStage === "uploading" && (
                  <span className="text-emerald-600">{uploadProgress}%</span>
                )}
              </div>
              <div className="w-full h-2 bg-emerald-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{
                    width: uploadStage === "signing" ? "5%" :
                           uploadStage === "uploading" ? `${5 + uploadProgress * 0.85}%` :
                           "95%"
                  }}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            form="mushroom-form"
            disabled={isSubmitting}
            className="w-full bg-emerald-600 hover:bg-emerald-700 py-4 sm:py-5 rounded-2xl text-white font-black text-xs sm:text-sm uppercase tracking-[0.2em] transition-all active:scale-95 shadow-xl shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Submitting..." : "Submit Observation"}
          </button>
        </div>
      </div>

      {/* LOCATION PICKER MODAL */}
      <LocationPickerModal
        isOpen={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onSelect={(location) => {
          onLocationSelect?.(location);
          setShowLocationPicker(false);
          setLocationInputMethod("map");
        }}
        selectedLocation={currentLocation}
      />
    </div>
  );
}
