"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { createRoot } from "react-dom/client";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  generateCircleBoundary,
  generateRectangleBoundary,
} from "@/lib/geocoding";
import { useAuth } from "@/context/AuthContext";
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

if (MAPBOX_TOKEN) {
  mapboxgl.accessToken = MAPBOX_TOKEN;
}

export default function Map(props) {
  const { user, loading } = useAuth();
  const isLoggedIn = !!user;
  // Destructure with defaults to handle undefined props
  const {
    data,
    filters = {},
    mode,
    onMarkerSelect,
    onMushroomClick, // Alias for onMarkerSelect for compatibility
    selectedZone,
    drawingMode,
    onDrawingComplete,
    onDrawingCancel,
    onGetCurrentBoundary,
    onResetView,
    trailMode = false,
    trailMushrooms = [],
    trailCurrentLocation = null,
    onTrailMushroomAdd,
    onStartTrail,
  } = props || {};

  // Ensure data is always an array
  const safeData = Array.isArray(data) ? data : [];
  // Use onMushroomClick if provided, otherwise fall back to onMarkerSelect
  const handleMarkerSelect = onMushroomClick || onMarkerSelect;
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const popupRef = useRef(null);
  const userLocationMarkerRef = useRef(null);
  const resizeHandlesRef = useRef([]);
  const drawingStateRef = useRef({
    isDrawing: false,
    isMoving: false,
    isResizing: false,
    startPoint: null,
    currentShape: null,
    currentCenter: null,
    currentSize: null,
    dragStart: null,
    initialCenter: null,
    initialSize: null,
    activeHandle: null,
    polygonPoints: [], // For polygon drawing mode
    polygonEditMode: false, // True after double-click, allows resizing vertices
    activeVertexIndex: undefined, // Index of vertex being dragged
  });
  const lastZoomedZoneRef = useRef(null); // Track last zoomed zone to prevent re-zooming

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [currentZoom, setCurrentZoom] = useState(null);

  const isTokenMissing = useMemo(() => !MAPBOX_TOKEN, []);

  /* ---------------- FILTER ---------------- */
  // Data is now pre-filtered at the page level, so we show all items passed here
  const isItemActive = (item) => {
    return true; // All items in data array are already filtered
  };

  /* ---------------- MAP INIT ---------------- */
  useEffect(() => {
    // Always clean up any existing map instance first
    if (mapRef.current) {
      try {
        popupRef.current?.remove();
        popupRef.current = null;
        userLocationMarkerRef.current?.remove();
        userLocationMarkerRef.current = null;
        const existingMap = mapRef.current;
        existingMap.remove();
        mapRef.current = null;
        setMapLoaded(false);
        setMapError(null);
      } catch (e) {
        console.error("Error removing existing map:", e);
        mapRef.current = null;
      }
    }

    if (isTokenMissing || !mapContainerRef.current) {
      return;
    }

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [80.5, 25.0],
      zoom: 3.5,
      projection: "mercator", // 👈 THIS LINE
      minZoom: 2.5,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Throttle function for smooth zoom updates
    let lastZoomUpdate = 0;
    const throttleMs = 100; // Update every 100ms during zoom for smooth transitions
    
    const handleZoomChange = () => {
      setCurrentZoom(map.getZoom());
    };

    // Throttled zoom handler for smooth continuous updates during zoom
    const handleZoomThrottled = () => {
      const now = Date.now();
      if (now - lastZoomUpdate >= throttleMs) {
        lastZoomUpdate = now;
        setCurrentZoom(map.getZoom());
      }
    };

    map.on("load", () => {
      setMapLoaded(true);
      map.resize();
      setCurrentZoom(map.getZoom());
    });

    map.on("error", (e) => {
      setMapError(e?.error?.message || "Map failed to load");
    });

    // Track zoom changes for grid recalculation 
    // Use 'zoom' event with throttling for smooth continuous updates during zoom animation
    map.on("zoom", handleZoomThrottled);
    map.on("zoomend", handleZoomChange); // Final update when zoom completes
    map.on("moveend", handleZoomChange); // Also update on pan in case bounds change significantly

    mapRef.current = map;

    return () => {
      popupRef.current?.remove();
      popupRef.current = null;
      userLocationMarkerRef.current?.remove();
      userLocationMarkerRef.current = null;
      if (map) {
        map.off("zoom", handleZoomThrottled);
        map.off("zoomend", handleZoomChange);
        map.off("moveend", handleZoomChange);
        map.remove();
      }
      mapRef.current = null;
      setMapLoaded(false);
      setMapError(null);
    };
  }, [isTokenMissing]);

  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !mapRef.current.isStyleLoaded())
      return;

    const map = mapRef.current;

    const features = safeData
      .filter((d) => d && d.latitude && d.longitude && isItemActive(d))
      .map((d) => ({
        type: "Feature",
        properties: d,
        geometry: {
          type: "Point",
          coordinates: [Number(d.longitude), Number(d.latitude)],
        },
      }));

    const geojson = {
      type: "FeatureCollection",
      features,
    };

    if (!map.getSource("mushrooms")) {
      map.addSource("mushrooms", { type: "geojson", data: geojson });
    } else {
      map.getSource("mushrooms").setData(geojson);
    }

    // Expose a function the parent can call to fly back to the default overview
    if (onResetView) {
      onResetView.current = () => {
        map.flyTo({ center: [80.5, 25.0], zoom: 3.5, duration: 1000 });
      };
    }

    // Helper function to create grid-based heatmap
    const createGridHeatmap = (features, zoom) => {
      if (!features || features.length === 0) {
        return {
          type: "FeatureCollection",
          features: [],
        };
      }

      // Default zoom if not provided
      const currentZoomLevel = zoom !== null && zoom !== undefined ? zoom : 4;

      // Grid size based on zoom level - smooth exponential interpolation for seamless transitions
      // Grid continues shrinking until zoom 9 when individual icons appear
      // Using exponential interpolation: gridSize = maxSize * (minSize/maxSize)^((zoom - minZoom) / (maxZoom - minZoom))
      const minZoom = 2.5;  // Minimum zoom level for grid
      const maxZoom = 9;    // Maximum zoom level before icons appear
      const maxGridSize = 2.0;  // Largest grid cell size at minZoom (~220km)
      const minGridSize = 0.01; // Smallest grid cell size at maxZoom (~1.1km)
      
      // Clamp zoom level to valid range
      const clampedZoom = Math.max(minZoom, Math.min(maxZoom, currentZoomLevel));
      
      // Calculate interpolation factor (0 to 1)
      const t = (clampedZoom - minZoom) / (maxZoom - minZoom);
      
      // Exponential interpolation for smooth grid scaling
      // This provides perceptually smooth transitions as zoom level changes
      const gridSize = maxGridSize * Math.pow(minGridSize / maxGridSize, t);

      // Create an object to store counts per grid cell (using object instead of Map to avoid naming conflict)
      const gridMap = {};

      // Count features in each grid cell
      features.forEach((feature) => {
        // Validate feature has valid geometry and coordinates
        if (!feature || !feature.geometry || !feature.geometry.coordinates) {
          return; // Skip invalid features
        }

        const coordinates = feature.geometry.coordinates;
        if (!Array.isArray(coordinates) || coordinates.length < 2) {
          return; // Skip invalid coordinates
        }

        const [lng, lat] = coordinates;

        // Validate coordinates are numbers
        if (
          typeof lng !== "number" ||
          typeof lat !== "number" ||
          isNaN(lng) ||
          isNaN(lat)
        ) {
          return; // Skip invalid coordinates
        }

        // Calculate grid cell coordinates
        const gridX = Math.floor(lng / gridSize);
        const gridY = Math.floor(lat / gridSize);
        const cellKey = `${gridX}_${gridY}`;

        if (!gridMap[cellKey]) {
          gridMap[cellKey] = {
            count: 0,
            gridX,
            gridY,
          };
        }
        gridMap[cellKey].count++;
      });

      // Create polygon features for each grid cell (only include cells with data)
      const gridFeatures = Object.entries(gridMap)
        .filter(([key, data]) => data.count > 0) // Only include cells with mushrooms
        .map(([key, data]) => {
          const { count, gridX, gridY } = data;

          // Create square polygon for this grid cell
          const minLng = gridX * gridSize;
          const maxLng = (gridX + 1) * gridSize;
          const minLat = gridY * gridSize;
          const maxLat = (gridY + 1) * gridSize;

          return {
            type: "Feature",
            properties: {
              count,
            },
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [minLng, minLat],
                  [maxLng, minLat],
                  [maxLng, maxLat],
                  [minLng, maxLat],
                  [minLng, minLat],
                ],
              ],
            },
          };
        });

      return {
        type: "FeatureCollection",
        features: gridFeatures,
      };
    };

    // Create grid heatmap data
    // Safely get zoom - map.getZoom() might not be available if map isn't fully initialized
    let zoomLevel = currentZoom;
    if (zoomLevel === null || zoomLevel === undefined) {
      try {
        zoomLevel = map.getZoom();
      } catch (e) {
        zoomLevel = 4; // Default zoom
      }
    }
    const gridHeatmapData = createGridHeatmap(features, zoomLevel);

    // Add or update grid heatmap source
    if (!map.getSource("mushroom-grid-heat")) {
      map.addSource("mushroom-grid-heat", {
        type: "geojson",
        data: gridHeatmapData,
      });
    } else {
      map.getSource("mushroom-grid-heat").setData(gridHeatmapData);
    }

    // Add grid heatmap layer (show until zoom 9.5 with fade-out, overlapping with icons starting at 9)
    if (!map.getLayer("mushroom-grid-heat")) {
      map.addLayer({
        id: "mushroom-grid-heat",
        type: "fill",
        source: "mushroom-grid-heat",
        maxzoom: 9.5,
        paint: {
          "fill-color": [
            "interpolate",
            ["linear"],
            ["get", "count"],
            0,
            "rgba(0,0,0,0)",
            1,
            "#a7f3d0",
            5,
            "#34d399",
            10,
            "#10b981",
            20,
            "#059669",
            50,
            "#064e3b",
          ],
          // Fade out grid as we approach zoom 9.5 where icons are fully visible
          "fill-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            2, ["interpolate", ["linear"], ["get", "count"], 0, 0, 1, 0.3, 5, 0.5, 10, 0.7, 20, 0.85],
            8.5, ["interpolate", ["linear"], ["get", "count"], 0, 0, 1, 0.3, 5, 0.5, 10, 0.7, 20, 0.85],
            9.5, 0
          ],
        },
      });

      // Add grid outline for better visibility (also fades out)
      if (!map.getLayer("mushroom-grid-heat-outline")) {
        map.addLayer({
          id: "mushroom-grid-heat-outline",
          type: "line",
          source: "mushroom-grid-heat",
          maxzoom: 9.5,
          paint: {
            "line-color": "#10b981",
            "line-width": [
              "interpolate",
              ["linear"],
              ["zoom"],
              2,
              0.5,
              4,
              1,
              6,
              1.5,
              8,
              2,
            ],
            // Fade out outline as grid fades
            "line-opacity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              2, 0.3,
              8.5, 0.3,
              9.5, 0
            ],
          },
        });
      }
    }

    // Load mushroom icon if not already loaded
    if (!map.hasImage("mushroom-icon")) {
      map.loadImage("/icons/icon1.png", (err, img) => {
        if (!err && img && !map.hasImage("mushroom-icon")) {
          map.addImage("mushroom-icon", img);
        }
      });
    }

    // Remove existing point layers if they exist so we can safely recreate them.
    if (map.getLayer("mushroom-point-fallback")) {
      map.removeLayer("mushroom-point-fallback");
    }
    if (map.getLayer("mushroom-points")) {
      map.removeLayer("mushroom-points");
    }

    // Add a circle fallback so coordinates are still clearly visible even if the
    // icon feels too subtle at city zoom or loads a beat later than the layer.
    map.addLayer({
      id: "mushroom-point-fallback",
      type: "circle",
      source: "mushrooms",
      minzoom: 6.5,
      paint: {
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["zoom"],
          6.5, 3,
          8, 4.5,
          10, 6,
          12, 7
        ],
        "circle-color": "#059669",
        "circle-stroke-color": "#ecfdf5",
        "circle-stroke-width": 1.5,
        "circle-opacity": 0.9,
      },
    });

    // Show point icons a bit earlier so dense local clusters become discoverable
    // without having to zoom all the way in first.
    if (map.hasImage("mushroom-icon")) {
      map.addLayer({
        id: "mushroom-points",
        type: "symbol",
        source: "mushrooms",
        minzoom: 7,
        layout: {
          "icon-image": "mushroom-icon",
          "icon-size": 0.05,
          "icon-allow-overlap": true,
        },
      });
    }

    /* ---------------- ZONE BOUNDARY ---------------- */
    // Handle zone boundary - separate from data/filters updates
    // Skip boundary rendering for trails (they don't need a visible boundary)
    if (
      selectedZone &&
      selectedZone.boundary &&
      selectedZone.boundary.length > 0 &&
      selectedZone.type !== "trail"
    ) {
      const zoneGeoJSON = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: {
              type: "Polygon",
              coordinates: [selectedZone.boundary],
            },
          },
        ],
      };

      if (map.getSource("zone")) {
        // Update existing zone source data
        map.getSource("zone").setData(zoneGeoJSON);
      } else {
        // Add zone source and layers if they don't exist
        map.addSource("zone", {
          type: "geojson",
          data: zoneGeoJSON,
        });

        // Add fill layer
        if (!map.getLayer("zone-fill")) {
          map.addLayer({
            id: "zone-fill",
            type: "fill",
            source: "zone",
            paint: {
              "fill-color": "#10b981",
              "fill-opacity": 0.1,
            },
          });
        }

        // Add boundary line
        if (!map.getLayer("zone-boundary")) {
          map.addLayer({
            id: "zone-boundary",
            type: "line",
            source: "zone",
            paint: {
              "line-color": "#10b981",
              "line-width": 3,
              "line-opacity": 0.8,
            },
          });
        }
      }
    } else {
      // No active zone — remove boundary layers and clear the source so the
      // overlay doesn't linger after the user clears the location filter.
      if (map.getLayer("zone-boundary")) map.removeLayer("zone-boundary");
      if (map.getLayer("zone-fill")) map.removeLayer("zone-fill");
      if (map.getSource("zone")) {
        map.getSource("zone").setData({
          type: "FeatureCollection",
          features: [],
        });
      }
    }

    /* ---------------- ZONE ZOOM ---------------- */
    // Handle auto-zoom for zones and trails (separate from boundary rendering)
    if (selectedZone) {
      // Auto-zoom for city boundaries, trail locations, and saved zones
      // Saved zones have types: rectangle, circle, polygon
      const shouldZoom =
        selectedZone.type === "city" ||
        selectedZone.type === "trail" ||
        selectedZone.type === "rectangle" ||
        selectedZone.type === "circle" ||
        selectedZone.type === "polygon";

      // Create a unique key for this zone to track if we've already zoomed
      let zoneKey = null;
      if (selectedZone.boundary) {
        zoneKey = JSON.stringify(selectedZone.boundary);
      } else if (selectedZone.type === "trail") {
        // For trails, use mushroom IDs from selectedZone or trailMushrooms prop
        const mushroomsForKey =
          selectedZone.trailMushrooms || trailMushrooms || [];
        if (mushroomsForKey.length > 0) {
          const mushroomIds = mushroomsForKey
            .map((m) => m._id || m.id)
            .filter((id) => id)
            .sort()
            .join(",");
          zoneKey = mushroomIds
            ? `trail-${mushroomIds}`
            : `trail-${selectedZone.center?.lat}-${selectedZone.center?.lng}`;
        } else if (selectedZone.center) {
          zoneKey = `trail-center-${selectedZone.center.lat}-${selectedZone.center.lng}`;
        }
      } else if (selectedZone.center) {
        zoneKey = `${selectedZone.type}-${selectedZone.center.lat}-${selectedZone.center.lng}`;
      }

      // Only zoom if this is a new zone (hasn't been zoomed to yet)
      const needsZoom =
        shouldZoom && zoneKey && lastZoomedZoneRef.current !== zoneKey;

      if (needsZoom && selectedZone.boundary) {
        const coordinates = selectedZone.boundary;
        const bounds = coordinates.reduce(
          (bounds, coord) => {
            return [
              [
                Math.min(bounds[0][0], coord[0]),
                Math.min(bounds[0][1], coord[1]),
              ],
              [
                Math.max(bounds[1][0], coord[0]),
                Math.max(bounds[1][1], coord[1]),
              ],
            ];
          },
          [
            [coordinates[0][0], coordinates[0][1]],
            [coordinates[0][0], coordinates[0][1]],
          ]
        );

        // Use center from selectedZone if available, otherwise calculate from bounds
        let centerLng, centerLat;
        if (selectedZone.center) {
          centerLng = selectedZone.center.lng;
          centerLat = selectedZone.center.lat;
        } else {
          // Calculate center of bounds as fallback
          centerLng = (bounds[0][0] + bounds[1][0]) / 2;
          centerLat = (bounds[0][1] + bounds[1][1]) / 2;
        }

        // For trail mode, ensure we zoom to at least level 9 so mushrooms are visible
        if (selectedZone.type === "trail" && trailMode) {
          // Use fitBounds with minZoom to ensure mushrooms are visible
          // Don't set maxZoom to allow user to zoom in/out freely after
          map.fitBounds(bounds, {
            padding: { top: 100, bottom: 100, left: 100, right: 100 },
            duration: 1000,
            minZoom: 9,
          });
        } else {
          map.fitBounds(bounds, {
            padding: { top: 100, bottom: 100, left: 100, right: 100 },
            duration: 1000,
          });
        }

        // Mark this zone as zoomed to
        lastZoomedZoneRef.current = zoneKey;
      } else if (
        needsZoom &&
        selectedZone.type === "trail" &&
        !selectedZone.boundary
      ) {
        // Handle trail - zoom to fit all mushrooms in the trail
        // Use mushrooms from selectedZone first, then fall back to trailMushrooms prop
        const mushroomsToZoom = selectedZone.trailMushrooms || trailMushrooms;
        // Check if we have mushrooms to zoom to
        if (mushroomsToZoom && mushroomsToZoom.length > 0) {
          // Calculate bounds from trail mushrooms
          const validMushrooms = mushroomsToZoom.filter((m) => {
            const lat = m.latitude || m.location?.latitude;
            const lng = m.longitude || m.location?.longitude;
            return lat && lng && !isNaN(Number(lat)) && !isNaN(Number(lng));
          });

          if (validMushrooms.length > 0) {
            // Calculate bounds from all mushrooms
            let minLat = Infinity,
              maxLat = -Infinity;
            let minLng = Infinity,
              maxLng = -Infinity;

            validMushrooms.forEach((m) => {
              const lat = Number(m.latitude || m.location?.latitude);
              const lng = Number(m.longitude || m.location?.longitude);
              minLat = Math.min(minLat, lat);
              maxLat = Math.max(maxLat, lat);
              minLng = Math.min(minLng, lng);
              maxLng = Math.max(maxLng, lng);
            });

            // Create bounds array for fitBounds
            const bounds = [
              [minLng, minLat],
              [maxLng, maxLat],
            ];

            // Zoom to fit all mushrooms with padding
            map.fitBounds(bounds, {
              padding: { top: 100, bottom: 100, left: 100, right: 100 },
              duration: 1000,
              minZoom: 9,
            });

            // Mark this zone as zoomed to
            lastZoomedZoneRef.current = zoneKey;
          } else {
            // Fallback: zoom to center at level 9
            const center = selectedZone.center;
            if (center) {
              map.flyTo({
                center: [center.lng, center.lat],
                zoom: 9,
                duration: 1000,
              });
              lastZoomedZoneRef.current = zoneKey;
            }
          }
        } else if (selectedZone.center) {
          // Fallback: zoom to center at level 9
          const center = selectedZone.center;
          map.flyTo({
            center: [center.lng, center.lat],
            zoom: 9,
            duration: 1000,
          });
          lastZoomedZoneRef.current = zoneKey;
        }
      }
    } else {
      // Remove zone if not selected
      try {
        const zoneSource = map.getSource("zone");
        if (zoneSource) {
          // Clear source data first to make shape disappear immediately
          zoneSource.setData({
            type: "FeatureCollection",
            features: [],
          });
        }
        // Remove layers first (must be done before removing source)
        if (map.getLayer("zone-boundary")) {
          map.removeLayer("zone-boundary");
        }
        if (map.getLayer("zone-fill")) {
          map.removeLayer("zone-fill");
        }
        // Remove source after layers are removed
        if (map.getSource("zone")) {
          map.removeSource("zone");
        }
      } catch (error) {
        // If error occurs, try to force remove layers
        console.error("Error removing zone:", error);
        try {
          if (map.getLayer("zone-boundary")) {
            map.removeLayer("zone-boundary");
          }
          if (map.getLayer("zone-fill")) {
            map.removeLayer("zone-fill");
          }
          if (map.getSource("zone")) {
            map.removeSource("zone");
          }
        } catch (e) {
          console.error("Error force removing zone:", e);
        }
      }
    }

    /* ---------------- TRAIL LAYER ---------------- */
    // Helper function to create curved line between points using quadratic Bezier curve
    const createCurvedLine = (points) => {
      if (points.length < 2) return [];

      const curvedPoints = [];

      // Add first point
      curvedPoints.push(points[0]);

      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];

        // Calculate midpoint
        const midLat = (p1[1] + p2[1]) / 2;
        const midLng = (p1[0] + p2[0]) / 2;

        // Calculate distance in degrees (approximate)
        const dx = p2[0] - p1[0];
        const dy = p2[1] - p1[1];
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Create a control point offset perpendicular to the line
        // This creates a natural curve
        const curveAmount = Math.min(distance * 0.4, 0.01); // Limit curve amount

        // Perpendicular vector (rotate 90 degrees)
        const perpX = -dy / distance;
        const perpY = dx / distance;

        // Control point (midpoint offset perpendicularly)
        const controlLat = midLat + perpY * curveAmount;
        const controlLng = midLng + perpX * curveAmount;

        // Generate points along the quadratic Bezier curve
        // Use more points for smoother curves
        const numPoints = Math.max(
          30,
          Math.min(100, Math.floor(distance * 5000))
        );
        const step = 1 / numPoints;

        for (let t = step; t < 1; t += step) {
          // Quadratic Bezier: (1-t)²P₀ + 2(1-t)tP₁ + t²P₂
          const mt = 1 - t;
          const lat = mt * mt * p1[1] + 2 * mt * t * controlLat + t * t * p2[1];
          const lng = mt * mt * p1[0] + 2 * mt * t * controlLng + t * t * p2[0];
          curvedPoints.push([lng, lat]);
        }

        // Add the endpoint (avoid duplicates)
        if (i === points.length - 2) {
          curvedPoints.push(p2);
        }
      }

      return curvedPoints;
    };

    // Update trail line layer
    // Draw line from user's current location to mushrooms in sequence (if at least 1 mushroom)
    if (trailMode && trailMushrooms.length >= 1) {
      const trailPoints = [];

      // Start with user's current location if available
      if (
        trailCurrentLocation &&
        trailCurrentLocation.lat &&
        trailCurrentLocation.lng
      ) {
        trailPoints.push([
          Number(trailCurrentLocation.lng),
          Number(trailCurrentLocation.lat),
        ]);
      }

      // Add all mushrooms in the trail in order (no duplicates)
      const addedCoordinates = new Set();
      trailMushrooms.forEach((m) => {
        const lng = Number(m.longitude || m.location?.longitude);
        const lat = Number(m.latitude || m.location?.latitude);
        if (!isNaN(lng) && !isNaN(lat)) {
          // Create a unique key for this coordinate to prevent duplicates
          const coordKey = `${lng.toFixed(6)},${lat.toFixed(6)}`;
          if (!addedCoordinates.has(coordKey)) {
            addedCoordinates.add(coordKey);
            trailPoints.push([lng, lat]);
          }
        }
      });

      // Only draw line if we have at least 2 points (user location + at least 1 mushroom, or 2+ mushrooms)
      // The line should go: user → mushroom1 → mushroom2 → ... → last mushroom (stops there)
      if (trailPoints.length >= 2) {
        // Create curved line connecting points in sequence
        const curvedLine = createCurvedLine(trailPoints);

        // Ensure the line ends at the last point (last mushroom) and doesn't continue
        const finalLine = curvedLine.length > 0 ? curvedLine : trailPoints;

        const trailGeoJSON = {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: {
                type: "LineString",
                coordinates: finalLine, // Single LineString from start to end
              },
            },
          ],
        };

        if (!map.getSource("trail-line")) {
          map.addSource("trail-line", {
            type: "geojson",
            data: trailGeoJSON,
          });

          if (!map.getLayer("trail-line-layer")) {
            map.addLayer({
              id: "trail-line-layer",
              type: "line",
              source: "trail-line",
              layout: {
                "line-cap": "round",
                "line-join": "round",
              },
              paint: {
                "line-color": "#3b82f6",
                "line-width": 4,
                "line-opacity": 0.8,
                "line-dasharray": [2, 2], // Creates a dotted/dashed line pattern
              },
            });
          }
        } else {
          map.getSource("trail-line").setData(trailGeoJSON);
        }
      }
    } else {
      // Remove trail line if not in trail mode or not enough mushrooms
      try {
        if (map.getLayer("trail-line-layer")) {
          map.removeLayer("trail-line-layer");
        }
        if (map.getSource("trail-line")) {
          map.removeSource("trail-line");
        }
      } catch (error) {
        // Ignore errors if layers don't exist
      }
    }

    // Update trail markers (highlight selected mushrooms)
    if (trailMode && trailMushrooms.length > 0) {
      const trailMarkerFeatures = trailMushrooms
        .filter((m) => m.latitude && m.longitude)
        .map((m) => ({
          type: "Feature",
          properties: { ...m, isTrailMarker: true },
          geometry: {
            type: "Point",
            coordinates: [
              Number(m.longitude || m.location?.longitude),
              Number(m.latitude || m.location?.latitude),
            ],
          },
        }));

      const trailMarkersGeoJSON = {
        type: "FeatureCollection",
        features: trailMarkerFeatures,
      };

      if (!map.getSource("trail-markers")) {
        map.addSource("trail-markers", {
          type: "geojson",
          data: trailMarkersGeoJSON,
        });

        // Load trail marker icon if not already loaded
        if (!map.hasImage("trail-marker-icon")) {
          map.loadImage("/icons/icon1.png", (err, img) => {
            if (!err && img && !map.hasImage("trail-marker-icon")) {
              map.addImage("trail-marker-icon", img);
            }
          });
        }

        if (
          map.hasImage("trail-marker-icon") &&
          !map.getLayer("trail-markers-layer")
        ) {
          map.addLayer({
            id: "trail-markers-layer",
            type: "symbol",
            source: "trail-markers",
            minzoom: 9,
            layout: {
              "icon-image": "trail-marker-icon",
              "icon-size": 0.06,
              "icon-allow-overlap": true,
            },
            paint: {
              "icon-color": "#3b82f6",
            },
          });
        }
      } else {
        map.getSource("trail-markers").setData(trailMarkersGeoJSON);
      }
    } else {
      // Remove trail markers if not in trail mode
      try {
        if (map.getLayer("trail-markers-layer")) {
          map.removeLayer("trail-markers-layer");
        }
        if (map.getSource("trail-markers")) {
          map.removeSource("trail-markers");
        }
      } catch (error) {
        // Ignore errors if layers don't exist
      }
    }

    // Update user location marker
    if (
      trailMode &&
      trailCurrentLocation &&
      trailCurrentLocation.lat &&
      trailCurrentLocation.lng
    ) {
      // Remove existing marker if it exists
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.remove();
        userLocationMarkerRef.current = null;
      }

      // Create user location marker element
      const el = document.createElement("div");
      el.className = "user-location-marker";
      el.style.width = "40px";
      el.style.height = "40px";
      el.style.borderRadius = "50%";
      el.style.backgroundColor = "#3b82f6";
      el.style.border = "3px solid white";
      el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      el.style.cursor = "pointer";
      el.style.zIndex = "1000";

      // Add user icon SVG
      el.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" fill="white"/>
          <path d="M12 14C7.58172 14 4 17.5817 4 22H20C20 17.5817 16.4183 14 12 14Z" fill="white"/>
        </svg>
      `;

      // Create and add marker
      const marker = new mapboxgl.Marker({
        element: el,
        anchor: "center",
      })
        .setLngLat([trailCurrentLocation.lng, trailCurrentLocation.lat])
        .addTo(map);

      userLocationMarkerRef.current = marker;
    } else {
      // Remove user location marker if not in trail mode or no location
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.remove();
        userLocationMarkerRef.current = null;
      }
    }

    /* ---------------- CLICK POPUP (NO ZOOM, iNATURALIST STYLE) ---------------- */
    const handleClick = (e) => {
      // Don't show popup if in drawing mode
      if (drawingMode) return;

      // Prevent event propagation to avoid multiple triggers
      if (e.originalEvent) {
        e.originalEvent.stopPropagation();
        e.originalEvent.preventDefault();
      }

      const f = e.features?.[0];
      if (!f) return;

      const item = f.properties;
      const [lng, lat] = f.geometry.coordinates;

      // In trail mode, add mushroom to trail instead of showing popup
      if (trailMode && onTrailMushroomAdd) {
        // Use a small delay to prevent rapid multiple clicks
        const clickTime = Date.now();
        if (
          handleClick.lastClickTime &&
          clickTime - handleClick.lastClickTime < 500
        ) {
          return; // Ignore clicks within 500ms
        }
        handleClick.lastClickTime = clickTime;

        onTrailMushroomAdd(item);
        return;
      }

      // Only open popup, don't open details on marker click
      popupRef.current?.remove();

      const popupNode = document.createElement("div");

      const popup = new mapboxgl.Popup({
        closeButton: true,
        closeOnClick: true,
        closeOnMove: false,
        anchor: "bottom",
        offset: [0, -10],
        maxWidth: "400px",
        className: "mushroom-popup-container",
      })
        .setLngLat([lng, lat])
        .setDOMContent(popupNode)
        .addTo(map);

      popupRef.current = popup;

      // Format date
      const formatDate = (date) => {
        if (!date) return null;
        const d = new Date(date);
        if (isNaN(d.getTime())) return null;
        return d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      };

      const formatDateShort = (date) => {
        if (!date) return null;
        const d = new Date(date);
        if (isNaN(d.getTime())) return null;
        const month = d.toLocaleDateString("en-US", { month: "short" });
        const year = d.getFullYear().toString().slice(-2);
        return `${month} '${year}`;
      };

      const observationDate = item.photoDateTime || item.createdAt;
      const displayDate = formatDate(observationDate);
      const shortDate = formatDateShort(observationDate);

      // Extract user ID and profile picture for profile link
      let userId = null;
      let profilePicture = null;

      // Helper to validate MongoDB ObjectId format (24 hex characters)
      const isValidObjectId = (id) => {
        if (!id) return false;
        const idStr = typeof id === "string" ? id : id.toString();
        return /^[0-9a-fA-F]{24}$/.test(idStr);
      };

      // Extract user ID, profile picture, and username
      // Note: submittedBy might be a JSON string that needs parsing
      let submittedByData = item.submittedBy;
      let displayUsername = item.contributor; // Fallback to contributor name

      // If it's a string, try to parse it as JSON
      if (typeof submittedByData === "string") {
        try {
          submittedByData = JSON.parse(submittedByData);
        } catch (e) {
          // If it's not JSON, treat it as a simple ID string
          if (isValidObjectId(submittedByData)) {
            userId = submittedByData;
          }
          submittedByData = null;
        }
      }

      // Now process the parsed object
      if (submittedByData) {
        // Handle string ID (already validated above)
        if (typeof submittedByData === "string") {
          if (isValidObjectId(submittedByData)) {
            userId = submittedByData;
          }
        }
        // Handle object with _id or id
        else if (
          typeof submittedByData === "object" &&
          submittedByData !== null
        ) {
          // Try _id first (most common)
          if (
            submittedByData._id !== undefined &&
            submittedByData._id !== null
          ) {
            const idValue =
              typeof submittedByData._id === "string"
                ? submittedByData._id
                : String(submittedByData._id);
            if (isValidObjectId(idValue)) {
              userId = idValue;
            }
          }
          // Fallback to id property
          else if (
            submittedByData.id !== undefined &&
            submittedByData.id !== null
          ) {
            const idValue =
              typeof submittedByData.id === "string"
                ? submittedByData.id
                : String(submittedByData.id);
            if (isValidObjectId(idValue)) {
              userId = idValue;
            }
          }

          // Get username for display
          if (submittedByData.username) {
            displayUsername = submittedByData.username;
          } else if (submittedByData.name) {
            displayUsername = submittedByData.name;
          }

          // Get profile picture
          const dp = submittedByData.dp;
          if (
            dp &&
            typeof dp === "object" &&
            dp !== null &&
            !Array.isArray(dp) &&
            dp.url
          ) {
            if (typeof dp.url === "string" && dp.url.trim().length > 0) {
              profilePicture = dp.url.trim();
            }
          }
        }
      }

      // Handle image click to show details
      const handleImageClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        popup.remove(); // Close popup
        handleMarkerSelect?.(item); // Trigger detail view
      };

      createRoot(popupNode).render(
        <div className="w-[380px] bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-stretch">
            {/* Left side - Image (clickable) */}
            {item.image && (
              <div
                className="w-[150px] bg-gray-200 flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity overflow-hidden"
                onClick={handleImageClick}
                title="Click to view details"
              >
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover min-h-[150px]"
                />
              </div>
            )}

            {/* Right side - Content */}
            <div className="flex-1 p-4 flex flex-col min-w-0 min-h-[150px]">
              {/* Top section */}
              <div className="flex-1">
                {/* Species name */}
                <h3 className="text-lg font-semibold italic text-gray-900 leading-tight mb-1">
                  {item.name || "Unnamed Mushroom"}
                </h3>

                {/* Location and date */}
                <div className="text-xs text-gray-600 mb-2">
                  {item.location?.name ||
                    `${lat.toFixed(4)}, ${lng.toFixed(4)}`}
                  {displayDate && ` • ${displayDate}`}
                </div>

                {/* Mushroom Type/Category with icon */}
                {(item.category || item.ecologicalRole) && (
                  <div className="inline-flex items-center gap-1.5 mb-2">
                    {(() => {
                      // Get the type value, handling all array formats
                      let rawType = item.ecologicalRole || item.category;
                      
                      // Handle stringified arrays like '["decomposer"]'
                      if (typeof rawType === 'string' && rawType.startsWith('[')) {
                        try {
                          rawType = JSON.parse(rawType);
                        } catch (e) {
                          // If parsing fails, clean up the string manually
                          rawType = rawType.replace(/[\[\]"']/g, '').trim();
                        }
                      }
                      
                      // Extract first element if it's an array
                      let type = Array.isArray(rawType) ? rawType[0] : rawType;
                      
                      // Clean up any remaining brackets or quotes
                      if (typeof type === 'string') {
                        type = type.replace(/[\[\]"']/g, '').trim();
                      }
                      
                      // Map ecological roles and uses to image paths from mushroomImageMap
                      const typeImages = {
                        'decomposer': '/mushrooms/decomposing mushroom.png',
                        'symbiont': '/mushrooms/symbiotic.png',
                        'parasite': '/mushrooms/parasitic mushroom.png',
                        'saprotroph': '/mushrooms/decomposing mushroom.png',
                        'mycorrhizal': '/mushrooms/symbiotic.png',
                        'parasitic': '/mushrooms/parasitic mushroom.png',
                        'edible': '/mushrooms/edible.png',
                        'inedible': '/mushrooms/inedible.png',
                        'poisonous': '/mushrooms/poisonous.png',
                        'medicinal': '/mushrooms/medicinal.png',
                        'hallucinogenic': '/mushrooms/magic mushroom.png',
                        'toxic': '/mushrooms/poisonous.png',
                        'psychoactive': '/mushrooms/magic mushroom.png',
                      };
                      
                      // Get image based on lowercase type
                      const imagePath = type ? typeImages[type.toLowerCase()] : null;
                      
                      // Capitalize first letter for display
                      const displayType = type ? type.charAt(0).toUpperCase() + type.slice(1).toLowerCase() : 'Unknown';
                      
                      return (
                        <>
                          {imagePath ? (
                            <img 
                              src={imagePath} 
                              alt={displayType} 
                              className="w-5 h-5 object-contain"
                            />
                          ) : (
                            <span className="text-base">🍄</span>
                          )}
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide">
                            {displayType}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Bottom section - Interaction icons and date */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  {/* Contributor with profile picture and link */}
                  {item.contributor && (
                    <div className="flex items-center gap-2">
                      {/* Profile Picture */}
                      {profilePicture ? (
                        <a
                          href={userId ? `/user/${userId}` : "#"}
                          onClick={(e) => {
                            if (userId) {
                              e.preventDefault();
                              e.stopPropagation();
                              popup.remove();
                              setTimeout(() => {
                                window.location.href = `/user/${userId}`;
                              }, 100);
                            } else {
                              e.preventDefault();
                            }
                          }}
                          className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 border border-gray-200 hover:border-blue-400 transition-colors cursor-pointer"
                          title={userId ? "View profile" : undefined}
                        >
                          <img
                            src={profilePicture}
                            alt={displayUsername}
                            className="w-full h-full object-cover"
                          />
                        </a>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
                          <svg
                            className="w-3.5 h-3.5 text-gray-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                        </div>
                      )}
                      {/* Contributor username with link - always show as link if we have contributor */}
                      {displayUsername && (
                        <a
                          href={userId ? `/user/${userId}` : "#"}
                          onClick={(e) => {
                            if (userId) {
                              e.preventDefault();
                              e.stopPropagation();
                              popup.remove();
                              window.location.href = `/user/${userId}`;
                            } else {
                              e.preventDefault();
                            }
                          }}
                          className={`truncate max-w-[100px] transition-colors cursor-pointer ${
                            userId
                              ? "text-blue-600 hover:text-blue-800 hover:underline font-medium"
                              : "text-gray-500 cursor-not-allowed"
                          }`}
                          title={
                            userId ? "View profile" : "Profile not available"
                          }
                        >
                          {displayUsername}
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Date icon */}
                {shortDate && (
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span>{shortDate}</span>
                  </div>
                )}
              </div>

              {/* Start Trail Button */}
             
            </div>
          </div>
        </div>
      );

      // Check if popup is out of bounds and adjust map pan if needed
      const adjustPopupPosition = () => {
        const popupElement = popup.getElement();
        if (!popupElement) return;

        const popupRect = popupElement.getBoundingClientRect();
        const mapContainer = map.getContainer();
        const mapRect = mapContainer.getBoundingClientRect();

        const padding = 20;
        let panX = 0;
        let panY = 0;

        // Calculate how much we need to pan (positive = pan right/down, negative = pan left/up)
        if (popupRect.right > mapRect.right - padding) {
          // Popup extends beyond right edge - pan map RIGHT to move popup left
          panX = popupRect.right - (mapRect.right - padding);
        } else if (popupRect.left < mapRect.left + padding) {
          // Popup extends beyond left edge - pan map LEFT to move popup right
          panX = popupRect.left - (mapRect.left + padding);
        }

        if (popupRect.bottom > mapRect.bottom - padding) {
          // Popup extends beyond bottom edge - pan map DOWN to move popup up
          panY = popupRect.bottom - (mapRect.bottom - padding);
        } else if (popupRect.top < mapRect.top + padding) {
          // Popup extends beyond top edge - pan map UP to move popup down
          panY = popupRect.top - (mapRect.top + padding);
        }

        // Pan the map to bring popup into view
        if (panX !== 0 || panY !== 0) {
          const currentCenter = map.getCenter();
          const centerPixel = map.project(currentCenter);

          // Pan: add offset to center pixel (panning right/down moves center pixel right/down)
          const newCenterPixel = [centerPixel.x + panX, centerPixel.y + panY];

          const newCenter = map.unproject(newCenterPixel);

          map.easeTo({
            center: newCenter,
            duration: 300,
            easing: (t) => t * (2 - t), // ease-out
          });
        }
      };

      // Check bounds after popup is fully rendered (use double RAF to ensure DOM is updated)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          adjustPopupPosition();
        });
      });
    };

    const handleMouseEnterPoint = () => {
      map.getCanvas().style.cursor = "pointer";
    };

    const handleMouseLeavePoint = () => {
      map.getCanvas().style.cursor = "";
    };

    // IMPORTANT: prevent duplicate listeners
    map.off("click", "mushroom-point-fallback", handleClick);
    map.off("click", "mushroom-points", handleClick);
    map.off("mouseenter", "mushroom-point-fallback", handleMouseEnterPoint);
    map.off("mouseenter", "mushroom-points", handleMouseEnterPoint);
    map.off("mouseleave", "mushroom-point-fallback", handleMouseLeavePoint);
    map.off("mouseleave", "mushroom-points", handleMouseLeavePoint);

    map.on("click", "mushroom-point-fallback", handleClick);
    map.on("click", "mushroom-points", handleClick);

    /* ---------------- CURSOR POINTER ON HOVER ---------------- */
    map.on("mouseenter", "mushroom-point-fallback", handleMouseEnterPoint);
    map.on("mouseenter", "mushroom-points", handleMouseEnterPoint);
    map.on("mouseleave", "mushroom-point-fallback", handleMouseLeavePoint);
    map.on("mouseleave", "mushroom-points", handleMouseLeavePoint);

    // Update cursor in trail mode
    if (trailMode) {
      map.getCanvas().style.cursor = "crosshair";
    } else {
      map.getCanvas().style.cursor = "";
    }
  }, [
    data,
    filters,
    mode,
    mapLoaded,
    onMarkerSelect,
    onMushroomClick,
    selectedZone,
    currentZoom,
    trailMode,
    trailMushrooms,
    trailCurrentLocation,
    onTrailMushroomAdd,
    onStartTrail,
    onResetView,
  ]);

  /* ---------------- DRAWING MODE ---------------- */
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) {
      return;
    }

    const map = mapRef.current;

    if (!drawingMode) {
      // Clean up drawing state
      drawingStateRef.current.isDrawing = false;
      drawingStateRef.current.isMoving = false;
      drawingStateRef.current.isResizing = false;
      drawingStateRef.current.startPoint = null;
      drawingStateRef.current.currentShape = null;
      drawingStateRef.current.currentCenter = null;
      drawingStateRef.current.currentSize = null;
      drawingStateRef.current.dragStart = null;
      drawingStateRef.current.initialCenter = null;
      drawingStateRef.current.initialSize = null;
      drawingStateRef.current.activeHandle = null;
      // Only clear polygon-specific state if we were in polygon mode
      if (drawingMode === "polygon") {
        drawingStateRef.current.polygonPoints = []; // Clear polygon points
        drawingStateRef.current.polygonEditMode = false;
        drawingStateRef.current.activeVertexIndex = undefined;
      }

      try {
        // Remove resize handles
        resizeHandlesRef.current.forEach((handle) => handle.remove());
        resizeHandlesRef.current = [];

        // Remove layers first (must be done before removing source)
        if (map.getLayer("drawing-fill")) {
          map.removeLayer("drawing-fill");
        }
        if (map.getLayer("drawing-outline")) {
          map.removeLayer("drawing-outline");
        }
        // Remove source after layers are removed
        if (map.getSource("drawing")) {
          map.removeSource("drawing");
        }
      } catch (error) {
        console.error("Error removing drawing layers:", error);
      }

      map.getCanvas().style.cursor = "";
      return;
    }

    // Function to set up drawing mode (defined first so it can be called by event handlers)
    let cleanupFunc = null;

    const setupDrawingMode = () => {
      if (!map || !map.isStyleLoaded()) {
        return;
      }

      // Reset drawing state first - clear all modes
      drawingStateRef.current.isDrawing = false;
      drawingStateRef.current.isMoving = false;
      drawingStateRef.current.isResizing = false;
      drawingStateRef.current.startPoint = null;
      drawingStateRef.current.dragStart = null;
      drawingStateRef.current.initialCenter = null;
      drawingStateRef.current.initialSize = null;
      drawingStateRef.current.activeHandle = null;

      if (drawingMode === "polygon") {
        // For polygon, initialize with empty points array
        drawingStateRef.current.polygonPoints = [];
        drawingStateRef.current.polygonEditMode = false;
        drawingStateRef.current.activeVertexIndex = undefined;
        drawingStateRef.current.currentCenter = null;
        drawingStateRef.current.currentSize = null;
      } else if (drawingMode === "rectangle" || drawingMode === "circle") {
        // For rectangle/circle, clear polygon-specific state
        drawingStateRef.current.polygonPoints = [];
        drawingStateRef.current.polygonEditMode = false;
        drawingStateRef.current.activeVertexIndex = undefined;
        const center = map.getCenter();
        drawingStateRef.current.currentCenter = {
          lat: center.lat,
          lng: center.lng,
        };

        // Calculate initial size based on current viewport (30% of visible area)
        try {
          const bounds = map.getBounds();
          const ne = bounds.getNorthEast();
          const sw = bounds.getSouthWest();

          // Calculate distance in kilometers
          // Latitude: 1 degree ≈ 111 km
          const latDiff = ne.lat - sw.lat;
          const latDistKm = latDiff * 111;

          // Longitude: 1 degree ≈ 111 * cos(latitude) km
          const avgLat = (ne.lat + sw.lat) / 2;
          const cosLat = Math.cos((avgLat * Math.PI) / 180);
          const lngDiff = ne.lng - sw.lng;
          const lngDistKm = lngDiff * 111 * cosLat;

          // Set size to 30% of viewport dimensions
          const viewportWidth = lngDistKm;
          const viewportHeight = latDistKm;

          if (drawingMode === "rectangle") {
            drawingStateRef.current.currentSize = {
              width: viewportWidth * 0.3,
              height: viewportHeight * 0.3,
            };
          } else {
            // For circle, use the smaller dimension to ensure it fits
            const minDimension = Math.min(viewportWidth, viewportHeight);
            drawingStateRef.current.currentSize = {
              radius: minDimension * 0.3,
            };
          }
        } catch (error) {
          // Fallback to small fixed sizes if bounds calculation fails
          drawingStateRef.current.currentSize =
            drawingMode === "rectangle"
              ? { width: 10, height: 10 } // 10km x 10km rectangle fallback
              : { radius: 5 }; // 5km radius circle fallback
        }
        drawingStateRef.current.isDrawing = false;
        drawingStateRef.current.isMoving = false;
        drawingStateRef.current.isResizing = false;
        drawingStateRef.current.startPoint = null;
        drawingStateRef.current.dragStart = null;
        drawingStateRef.current.initialCenter = null;
        drawingStateRef.current.initialSize = null;
        drawingStateRef.current.activeHandle = null;
        drawingStateRef.current.polygonPoints = [];
      }

      // Initialize drawing source and layers
      if (!map.getSource("drawing")) {
        map.addSource("drawing", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [],
          },
        });
      }

      // Add drawing layers - these should be on top of other layers to be visible
      if (!map.getLayer("drawing-fill")) {
        map.addLayer({
          id: "drawing-fill",
          type: "fill",
          source: "drawing",
          paint: {
            "fill-color": "#10b981",
            "fill-opacity": 0.2,
          },
        });
        // Move to top to ensure visibility
        try {
          map.moveLayer("drawing-fill");
        } catch (e) {
          // Layer might already be on top
        }
      }

      if (!map.getLayer("drawing-outline")) {
        map.addLayer({
          id: "drawing-outline",
          type: "line",
          source: "drawing",
          paint: {
            "line-color": "#10b981",
            "line-width": 3,
            "line-opacity": 0.8,
            "line-dasharray": [2, 2],
          },
        });
        // Move to top to ensure visibility
        try {
          map.moveLayer("drawing-outline");
        } catch (e) {
          // Layer might already be on top
        }
      }

      // Helper to get maximum allowed size based on viewport
      const getMaxViewportSize = () => {
        try {
          const bounds = map.getBounds();
          const ne = bounds.getNorthEast();
          const sw = bounds.getSouthWest();

          // Calculate viewport dimensions in kilometers
          const latDiff = ne.lat - sw.lat;
          const latDistKm = latDiff * 111;

          const avgLat = (ne.lat + sw.lat) / 2;
          const cosLat = Math.cos((avgLat * Math.PI) / 180);
          const lngDiff = ne.lng - sw.lng;
          const lngDistKm = lngDiff * 111 * cosLat;

          return {
            maxWidth: lngDistKm * 0.95, // 95% of viewport width
            maxHeight: latDistKm * 0.95, // 95% of viewport height
            maxRadius: (Math.min(lngDistKm, latDistKm) * 0.95) / 2, // 95% of smaller dimension, divided by 2 for radius
          };
        } catch (error) {
          // Fallback to large values if calculation fails
          return {
            maxWidth: 1000,
            maxHeight: 1000,
            maxRadius: 500,
          };
        }
      };

      const updateDrawingShape = (boundary, updateHandles = false) => {
        if (!boundary || !Array.isArray(boundary) || boundary.length === 0) {
          console.error("Invalid boundary data:", boundary);
          return;
        }

        // Ensure drawing source exists, create it if it doesn't
        if (!map.getSource("drawing")) {
          try {
            map.addSource("drawing", {
              type: "geojson",
              data: {
                type: "FeatureCollection",
                features: [],
              },
            });
          } catch (error) {
            console.error("Error creating drawing source:", error);
            return;
          }
        }

        // Ensure drawing layers exist
        if (!map.getLayer("drawing-fill")) {
          try {
            map.addLayer({
              id: "drawing-fill",
              type: "fill",
              source: "drawing",
              paint: {
                "fill-color": "#10b981",
                "fill-opacity": 0.2,
              },
            });
          } catch (error) {
            console.error("Error creating drawing-fill layer:", error);
          }
        }

        if (!map.getLayer("drawing-outline")) {
          try {
            map.addLayer({
              id: "drawing-outline",
              type: "line",
              source: "drawing",
              paint: {
                "line-color": "#10b981",
                "line-width": 3,
                "line-opacity": 0.8,
                "line-dasharray": [2, 2],
              },
            });
          } catch (error) {
            console.error("Error creating drawing-outline layer:", error);
          }
        }

        const geojson = {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: {
                type: "Polygon",
                coordinates: [boundary],
              },
            },
          ],
        };

        try {
          const source = map.getSource("drawing");
          if (source) {
            source.setData(geojson);
          }
        } catch (error) {
          console.error("Error updating drawing shape:", error);
        }
      };

      const createInitialShape = () => {
        // For polygon mode, don't create initial shape - user will click to add points
        if (drawingMode === "polygon") {
          return null;
        }

        const center = drawingStateRef.current.currentCenter;
        const size = drawingStateRef.current.currentSize;

        if (!center || !size) {
          console.error("Missing center or size:", { center, size });
          return null;
        }

        let boundary;
        if (drawingMode === "rectangle") {
          boundary = generateRectangleBoundary(
            center.lat,
            center.lng,
            size.width,
            size.height
          );
        } else {
          boundary = generateCircleBoundary(
            center.lat,
            center.lng,
            size.radius
          );
        }

        updateDrawingShape(boundary);
        return boundary;
      };

      // Helper to calculate handle positions
      const getHandlePositions = () => {
        const handles = [];

        // For polygon mode, create handles at each vertex
        if (drawingMode === "polygon") {
          const points = drawingStateRef.current.polygonPoints;
          if (points.length >= 3) {
            // Create a handle for each vertex (excluding the closing point)
            points.forEach((point, index) => {
              handles.push({
                position: [point[0], point[1]],
                type: `vertex-${index}`,
                index: index,
              });
            });
          }
          return handles;
        }

        const center = drawingStateRef.current.currentCenter;
        const size = drawingStateRef.current.currentSize;

        if (drawingMode === "rectangle") {
          // Rectangle: handles at 4 corners
          // Convert km to degrees: width/height in km, need to convert to degrees
          const halfWidthKm = size.width / 2;
          const halfHeightKm = size.height / 2;
          const cosLat = Math.cos((center.lat * Math.PI) / 180);

          // Latitude: 1 degree ≈ 111 km
          const halfHeightDeg = halfHeightKm / 111;
          // Longitude: 1 degree ≈ 111 * cos(latitude) km
          const halfWidthDeg = halfWidthKm / (111 * cosLat);

          handles.push(
            {
              position: [center.lng - halfWidthDeg, center.lat - halfHeightDeg],
              type: "nw",
            },
            {
              position: [center.lng + halfWidthDeg, center.lat - halfHeightDeg],
              type: "ne",
            },
            {
              position: [center.lng + halfWidthDeg, center.lat + halfHeightDeg],
              type: "se",
            },
            {
              position: [center.lng - halfWidthDeg, center.lat + halfHeightDeg],
              type: "sw",
            }
          );
        } else {
          // Circle: handles at 4 cardinal directions
          const radiusDeg = size.radius / 111;
          const cosLat = Math.cos((center.lat * Math.PI) / 180);

          handles.push(
            { position: [center.lng, center.lat + radiusDeg], type: "s" },
            {
              position: [center.lng + radiusDeg / cosLat, center.lat],
              type: "e",
            },
            { position: [center.lng, center.lat - radiusDeg], type: "n" },
            {
              position: [center.lng - radiusDeg / cosLat, center.lat],
              type: "w",
            }
          );
        }
        return handles;
      };

      // Create and update resize handles
      const updateResizeHandles = () => {
        // Remove existing handles
        resizeHandlesRef.current.forEach((handle) => handle.remove());
        resizeHandlesRef.current = [];

        const handles = getHandlePositions();

        // If no handles (e.g., polygon with less than 3 points), return
        if (handles.length === 0) {
          return;
        }

        handles.forEach((handleData) => {
          const el = document.createElement("div");
          el.className = "drawing-resize-handle";

          // Make polygon handles larger and more visible
          const isPolygon = drawingMode === "polygon";
          const size = isPolygon ? 40 : 32;
          const borderWidth = isPolygon ? 4 : 3;
          const bgColor = isPolygon ? "#059669" : "#10b981";

          // Style the element - use anchor: 'center' in marker to center it properly
          el.style.cssText = `
          width: ${size}px; 
          height: ${size}px; 
          background-color: ${bgColor}; 
          border: ${borderWidth}px solid white; 
          border-radius: 50%; 
          cursor: grab; 
          box-shadow: 0 2px 12px rgba(0,0,0,0.5); 
          z-index: 1000; 
          touch-action: none; 
          transition: box-shadow 0.2s, border-width 0.2s; 
          box-sizing: border-box;
        `;

          // Add hover effect - change shadow and border instead of scale to prevent shifting
          el.addEventListener("mouseenter", () => {
            el.style.cursor = "grabbing";
            el.style.boxShadow = "0 4px 16px rgba(0,0,0,0.7)";
            el.style.borderWidth = `${borderWidth + 2}px`;
          });
          el.addEventListener("mouseleave", () => {
            el.style.cursor = "grab";
            el.style.boxShadow = "0 2px 12px rgba(0,0,0,0.5)";
            el.style.borderWidth = `${borderWidth}px`;
          });

          // Use anchor: 'center' to center the marker on the point, preventing shift
          const marker = new mapboxgl.Marker({
            element: el,
            draggable: true,
            anchor: "center", // This centers the marker on the coordinate point
          })
            .setLngLat(handleData.position)
            .addTo(map);

          marker.on("dragstart", () => {
            drawingStateRef.current.activeHandle = handleData.type;
            drawingStateRef.current.dragStart = {
              lat: handleData.position[1],
              lng: handleData.position[0],
            };

            // For polygon, store the vertex index
            if (drawingMode === "polygon" && handleData.index !== undefined) {
              drawingStateRef.current.activeVertexIndex = handleData.index;
            } else {
              // Ensure currentCenter exists before copying
              const currentCenter = drawingStateRef.current.currentCenter;
              if (
                currentCenter &&
                typeof currentCenter.lat === "number" &&
                typeof currentCenter.lng === "number"
              ) {
                drawingStateRef.current.initialCenter = {
                  lat: currentCenter.lat,
                  lng: currentCenter.lng,
                };
              } else {
                // Fallback: calculate center from handle positions or shape boundary
                const source = map.getSource("drawing");
                if (source) {
                  const data = source.getData ? source.getData() : source._data;
                  if (data && data.features && data.features.length > 0) {
                    const boundary = data.features[0].geometry.coordinates[0];
                    if (boundary && boundary.length > 0) {
                      // Calculate centroid
                      let sumLat = 0,
                        sumLng = 0;
                      for (let i = 0; i < boundary.length - 1; i++) {
                        sumLng += boundary[i][0];
                        sumLat += boundary[i][1];
                      }
                      const count = boundary.length - 1;
                      drawingStateRef.current.initialCenter = {
                        lat: sumLat / count,
                        lng: sumLng / count,
                      };
                    }
                  }
                }

                if (!drawingStateRef.current.initialCenter) {
                  console.error("Cannot determine center, aborting resize");
                  return;
                }
              }

              const currentSize = drawingStateRef.current.currentSize;
              if (currentSize) {
                drawingStateRef.current.initialSize =
                  drawingMode === "rectangle"
                    ? {
                        width: currentSize.width || 50,
                        height: currentSize.height || 50,
                      }
                    : { radius: currentSize.radius || 25 };
              } else {
                drawingStateRef.current.initialSize =
                  drawingMode === "rectangle"
                    ? { width: 50, height: 50 }
                    : { radius: 25 };
              }
            }
            map.dragPan.disable();
          });

          marker.on("drag", () => {
            const newLngLat = marker.getLngLat();

            // Safety check: ensure we have valid coordinates
            if (
              !newLngLat ||
              typeof newLngLat.lat !== "number" ||
              typeof newLngLat.lng !== "number"
            ) {
              return;
            }

            const currentPoint = { lat: newLngLat.lat, lng: newLngLat.lng };

            // Handle polygon vertex dragging
            if (
              drawingMode === "polygon" &&
              drawingStateRef.current.activeVertexIndex !== undefined
            ) {
              const vertexIndex = drawingStateRef.current.activeVertexIndex;
              const points = drawingStateRef.current.polygonPoints;

              // Update the vertex position
              if (points[vertexIndex] !== undefined) {
                points[vertexIndex] = [currentPoint.lng, currentPoint.lat];
                // Update the polygon shape immediately
                updatePolygonShape();
                // Don't update handles during drag - it would interrupt the drag
                // The handle being dragged will move naturally with the cursor
                // We'll update all handles after drag ends
              }
              return;
            }

            // For rectangle/circle, we need initialCenter to calculate size
            let initialCenter = drawingStateRef.current.initialCenter;

            // Safety check: ensure initialCenter exists
            if (
              !initialCenter ||
              typeof initialCenter.lat !== "number" ||
              typeof initialCenter.lng !== "number"
            ) {
              // Try to get it from currentCenter
              const currentCenter = drawingStateRef.current.currentCenter;
              if (
                currentCenter &&
                typeof currentCenter.lat === "number" &&
                typeof currentCenter.lng === "number"
              ) {
                initialCenter = {
                  lat: currentCenter.lat,
                  lng: currentCenter.lng,
                };
                drawingStateRef.current.initialCenter = initialCenter;
              } else {
                // Last resort: calculate center from the shape's boundary
                const source = map.getSource("drawing");
                if (source) {
                  const data = source.getData ? source.getData() : source._data;
                  if (data && data.features && data.features.length > 0) {
                    const boundary = data.features[0].geometry.coordinates[0];
                    if (boundary && boundary.length > 0) {
                      // Calculate centroid
                      let sumLat = 0,
                        sumLng = 0;
                      for (let i = 0; i < boundary.length - 1; i++) {
                        sumLng += boundary[i][0];
                        sumLat += boundary[i][1];
                      }
                      const count = boundary.length - 1;
                      initialCenter = {
                        lat: sumLat / count,
                        lng: sumLng / count,
                      };
                      drawingStateRef.current.initialCenter = initialCenter;
                    }
                  }
                }

                if (
                  !initialCenter ||
                  typeof initialCenter.lat !== "number" ||
                  typeof initialCenter.lng !== "number"
                ) {
                  console.error("No valid center available, aborting drag");
                  return;
                }
              }
            }

            if (drawingMode === "rectangle") {
              // Calculate the distance from center to the dragged corner
              // This must match the inverse of getHandlePositions calculation
              const latDiff = Math.abs(currentPoint.lat - initialCenter.lat);
              const lngDiff = Math.abs(currentPoint.lng - initialCenter.lng);

              // Convert degrees to km
              // For latitude: 1 degree ≈ 111 km
              const latDist = latDiff * 111;
              // For longitude: 1 degree ≈ 111 * cos(latitude) km
              const cosLat = Math.cos((initialCenter.lat * Math.PI) / 180);
              const lngDist = lngDiff * 111 * cosLat;

              // The size is twice the distance from center to corner
              // Width corresponds to longitude (east-west), height to latitude (north-south)
              const maxSize = getMaxViewportSize();
              drawingStateRef.current.currentSize.width = Math.min(
                maxSize.maxWidth,
                Math.max(10, lngDist * 2)
              );
              drawingStateRef.current.currentSize.height = Math.min(
                maxSize.maxHeight,
                Math.max(10, latDist * 2)
              );
            } else {
              // Circle: radius is distance from initial center to current position
              const R = 6371;
              const dLat =
                ((currentPoint.lat - initialCenter.lat) * Math.PI) / 180;
              const dLng =
                ((currentPoint.lng - initialCenter.lng) * Math.PI) / 180;
              const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos((initialCenter.lat * Math.PI) / 180) *
                  Math.cos((currentPoint.lat * Math.PI) / 180) *
                  Math.sin(dLng / 2) *
                  Math.sin(dLng / 2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
              const maxSize = getMaxViewportSize();
              drawingStateRef.current.currentSize.radius = Math.min(
                maxSize.maxRadius,
                Math.max(5, R * c)
              );
            }

            // Update the shape immediately - this will redraw the shape
            createInitialShape();

            // Don't update handles during drag - it would interrupt the drag
            // The handle being dragged will move naturally with the cursor
            // We'll update all handles after drag ends
          });

          marker.on("dragend", () => {
            drawingStateRef.current.activeHandle = null;
            if (drawingMode === "polygon") {
              drawingStateRef.current.activeVertexIndex = undefined;
              // Ensure polygon shape is updated after drag
              updatePolygonShape();
            }
            map.dragPan.enable();
            // Update handles to their new positions after drag
            updateResizeHandles();
          });

          resizeHandlesRef.current.push(marker);
        });
      };

      // Helper to check if point is near shape edge (for resizing)
      const getDistanceToEdge = (point, boundary) => {
        let minDist = Infinity;
        for (let i = 0; i < boundary.length - 1; i++) {
          const [x1, y1] = boundary[i];
          const [x2, y2] = boundary[i + 1];
          const dx = x2 - x1;
          const dy = y2 - y1;
          const t = Math.max(
            0,
            Math.min(
              1,
              ((point.lng - x1) * dx + (point.lat - y1) * dy) /
                (dx * dx + dy * dy)
            )
          );
          const projX = x1 + t * dx;
          const projY = y1 + t * dy;
          const dist = Math.sqrt(
            Math.pow(point.lng - projX, 2) + Math.pow(point.lat - projY, 2)
          );
          minDist = Math.min(minDist, dist);
        }
        return minDist;
      };

      // Helper to check if point is inside shape (for moving)
      const isPointInShape = (point, boundary) => {
        let inside = false;
        for (let i = 0, j = boundary.length - 1; i < boundary.length; j = i++) {
          const [xi, yi] = boundary[i];
          const [xj, yj] = boundary[j];
          const intersect =
            yi > point.lat !== yj > point.lat &&
            point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;
          if (intersect) inside = !inside;
        }
        return inside;
      };

      // Create initial shape - try multiple approaches to ensure it works
      const createShapeNow = () => {
        try {
          const boundary = createInitialShape();
          if (boundary) {
            updateResizeHandles();
          }
        } catch (error) {
          console.error("Error in createShapeNow:", error);
        }
      };

      // For polygon mode, set cursor and skip initial shape creation
      if (drawingMode === "polygon") {
        map.getCanvas().style.cursor = "crosshair";
      } else {
        // Try immediately
        createShapeNow();

        // Also try after a short delay as backup
        setTimeout(createShapeNow, 200);

        // And try when map is idle
        if (map.loaded()) {
          map.once("idle", createShapeNow);
        }
      }

      // Helper to update polygon shape
      const updatePolygonShape = () => {
        const points = drawingStateRef.current.polygonPoints;
        if (points.length < 2) {
          // Need at least 2 points to draw a line
          if (map.getSource("drawing")) {
            map.getSource("drawing").setData({
              type: "FeatureCollection",
              features: [],
            });
          }
          return;
        }

        // Create boundary: connect all points and close the polygon
        const boundary = [...points];
        if (points.length >= 3) {
          // Close the polygon by adding the first point at the end
          boundary.push([points[0][0], points[0][1]]);
        }

        updateDrawingShape(boundary);
      };

      // Helper to find the closest edge segment to a point
      const findClosestEdgeSegment = (point, boundary) => {
        let minDist = Infinity;
        let closestSegmentIndex = -1;
        let closestPointOnEdge = null;

        for (let i = 0; i < boundary.length - 1; i++) {
          const [x1, y1] = boundary[i];
          const [x2, y2] = boundary[i + 1];

          // Calculate distance from point to line segment
          const A = point.lng - x1;
          const B = point.lat - y1;
          const C = x2 - x1;
          const D = y2 - y1;

          const dot = A * C + B * D;
          const lenSq = C * C + D * D;
          let param = -1;

          if (lenSq !== 0) param = dot / lenSq;

          let xx, yy;
          if (param < 0) {
            xx = x1;
            yy = y1;
          } else if (param > 1) {
            xx = x2;
            yy = y2;
          } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
          }

          const dx = point.lng - xx;
          const dy = point.lat - yy;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < minDist) {
            minDist = dist;
            closestSegmentIndex = i;
            closestPointOnEdge = [xx, yy];
          }
        }

        return {
          segmentIndex: closestSegmentIndex,
          distance: minDist,
          point: closestPointOnEdge,
        };
      };

      // Event handlers for moving and resizing the shape
      const handleInteractionStart = (e) => {
        // For polygon mode, handle clicks differently - MUST return early
        if (drawingMode === "polygon") {
          const point = e.lngLat;
          if (!point) return;

          // If in edit mode (after double-click), allow adding vertices on edges
          if (drawingStateRef.current.polygonEditMode) {
            const points = drawingStateRef.current.polygonPoints;
            if (points.length < 2) return;

            // Create closed boundary for checking
            const boundary = [...points, [points[0][0], points[0][1]]];

            // Check if clicking near an edge (to add a vertex)
            const edgeInfo = findClosestEdgeSegment(point, boundary);
            const zoom = map.getZoom();
            const threshold = zoom > 10 ? 0.0005 : zoom > 7 ? 0.001 : 0.002; // Distance threshold

            if (edgeInfo.distance < threshold && edgeInfo.segmentIndex >= 0) {
              // Add new vertex at the closest point on the edge
              const newVertex = edgeInfo.point;
              const insertIndex = edgeInfo.segmentIndex + 1;
              points.splice(insertIndex, 0, newVertex);
              updatePolygonShape();
              updateResizeHandles();
              return;
            }

            // Check if clicking near a vertex handle first - use larger threshold for handles
            // Handles are 40px (polygon) which is larger, so we need a larger threshold
            // Convert pixel size to degrees: 40px at current zoom level
            const pixelsToDegrees = 360 / (256 * Math.pow(2, zoom)); // Approximate conversion
            const handleSizeDegrees = 40 * pixelsToDegrees; // Handle is 40px
            const handleThreshold = Math.max(
              threshold * 5,
              handleSizeDegrees * 0.5
            ); // Use larger threshold

            let closestVertexIndex = -1;
            let minVertexDist = Infinity;
            for (let i = 0; i < points.length; i++) {
              const [vx, vy] = points[i];
              const dist = Math.sqrt(
                Math.pow(point.lng - vx, 2) + Math.pow(point.lat - vy, 2)
              );
              if (dist < minVertexDist) {
                minVertexDist = dist;
                closestVertexIndex = i;
              }
            }

            // If clicking very close to a vertex handle, don't interfere - let the handle handle it
            // The handle marker will capture the drag event, so we should not process this click
            if (minVertexDist < handleThreshold) {
              // This is likely a handle click/drag, let it be handled by the marker drag system
              // Don't process this as a polygon edit action
              return;
            }

            // If clicking near a vertex (but not on handle) and we have more than 3 vertices, delete it
            if (
              minVertexDist < threshold &&
              closestVertexIndex >= 0 &&
              points.length > 3
            ) {
              points.splice(closestVertexIndex, 1);
              updatePolygonShape();
              updateResizeHandles();
              return;
            }

            // Otherwise, allow moving the entire polygon
            return;
          }

          // Not in edit mode - add point to polygon
          const newPoint = [point.lng, point.lat];
          drawingStateRef.current.polygonPoints.push(newPoint);

          // Update the polygon shape
          updatePolygonShape();

          // Change cursor to indicate we're drawing
          map.getCanvas().style.cursor = "crosshair";

          if (e.originalEvent && e.originalEvent.preventDefault) {
            e.originalEvent.preventDefault();
          }
          return;
        }

        // Get current boundary
        const source = map.getSource("drawing");
        if (!source) {
          return;
        }
        const data = source.getData ? source.getData() : source._data;
        if (!data || !data.features || data.features.length === 0) {
          return;
        }

        // Get coordinates from either mouse or touch event
        const point = e.lngLat;
        if (!point) {
          return;
        }

        const boundary = data.features[0].geometry.coordinates[0];

        // Check if clicking near edge (for resizing) - use zoom-based threshold
        const edgeDist = getDistanceToEdge(point, boundary);
        const isTouch =
          e.originalEvent &&
          ((e.originalEvent.type && e.originalEvent.type.startsWith("touch")) ||
            (e.originalEvent.touches && e.originalEvent.touches.length > 0) ||
            (window.matchMedia &&
              window.matchMedia("(pointer: coarse)").matches));
        const zoom = map.getZoom();
        // Use smaller threshold at higher zoom levels for better precision
        const baseThreshold = isTouch ? 10 : 5; // km
        const threshold =
          (zoom > 10
            ? baseThreshold * 0.3
            : zoom > 7
            ? baseThreshold * 0.5
            : baseThreshold) / 111;

        const isInside = isPointInShape(point, boundary);

        // Check edge first, but only if we're actually near the edge
        // If inside and not near edge, allow moving
        if (edgeDist < threshold && isInside) {
          // Near edge and inside - prioritize resize
          drawingStateRef.current.isResizing = true;
          drawingStateRef.current.isMoving = false; // Ensure move is false
          drawingStateRef.current.dragStart = point;
          // Ensure initialCenter and initialSize are properly set
          const currentCenter = drawingStateRef.current.currentCenter;
          if (
            currentCenter &&
            typeof currentCenter.lat === "number" &&
            typeof currentCenter.lng === "number"
          ) {
            drawingStateRef.current.initialCenter = {
              lat: currentCenter.lat,
              lng: currentCenter.lng,
            };
          }
          const currentSize = drawingStateRef.current.currentSize;
          if (currentSize) {
            drawingStateRef.current.initialSize =
              drawingMode === "rectangle"
                ? {
                    width: currentSize.width || 50,
                    height: currentSize.height || 50,
                  }
                : { radius: currentSize.radius || 25 };
          }
          map.getCanvas().style.cursor = "grabbing";
          map.dragPan.disable();
          if (e.originalEvent && e.originalEvent.preventDefault) {
            e.originalEvent.preventDefault();
          }
        } else if (isInside && edgeDist >= threshold) {
          drawingStateRef.current.isMoving = true;
          drawingStateRef.current.isResizing = false; // Ensure resize is false
          drawingStateRef.current.dragStart = point;
          // Ensure initialCenter is properly set
          const currentCenter = drawingStateRef.current.currentCenter;
          if (currentCenter && currentCenter.lat && currentCenter.lng) {
            drawingStateRef.current.initialCenter = {
              lat: currentCenter.lat,
              lng: currentCenter.lng,
            };
          } else {
            console.error("Cannot start move: currentCenter not set");
            return;
          }
          map.getCanvas().style.cursor = "grabbing";
          map.dragPan.disable();
          if (e.originalEvent && e.originalEvent.preventDefault) {
            e.originalEvent.preventDefault();
          }
        }
      };

      const handleMouseDown = (e) => {
        handleInteractionStart(e);
      };

      const handleTouchStart = (e) => {
        if (!e.lngLat && e.point) {
          const point = map.unproject(e.point);
          e.lngLat = point;
        }
        if (e.lngLat) {
          handleInteractionStart(e);
        }
      };

      const handleInteractionMove = (e) => {
        // For polygon mode, update cursor based on context - MUST return early
        if (drawingMode === "polygon") {
          if (drawingStateRef.current.polygonEditMode) {
            // In edit mode, show different cursors based on hover
            const point = e.lngLat;
            if (point) {
              const points = drawingStateRef.current.polygonPoints;
              if (points.length < 2) {
                map.getCanvas().style.cursor = "default";
                return;
              }

              const boundary = [...points, [points[0][0], points[0][1]]];

              // Check if near edge (to add vertex)
              const edgeInfo = findClosestEdgeSegment(point, boundary);
              const zoom = map.getZoom();
              const threshold = zoom > 10 ? 0.0005 : zoom > 7 ? 0.001 : 0.002;

              if (edgeInfo.distance < threshold) {
                map.getCanvas().style.cursor = "crosshair";
                return;
              }

              // Check if near vertex (to delete)
              let minVertexDist = Infinity;
              for (let i = 0; i < points.length; i++) {
                const [vx, vy] = points[i];
                const dist = Math.sqrt(
                  Math.pow(point.lng - vx, 2) + Math.pow(point.lat - vy, 2)
                );
                if (dist < minVertexDist) {
                  minVertexDist = dist;
                }
              }

              if (minVertexDist < threshold && points.length > 3) {
                map.getCanvas().style.cursor = "not-allowed";
                return;
              }

              // Check if inside polygon (to move)
              if (isPointInShape(point, boundary)) {
                map.getCanvas().style.cursor = "move";
                return;
              }
            }
            map.getCanvas().style.cursor = "default";
          } else {
            map.getCanvas().style.cursor = "crosshair";
          }
          return; // CRITICAL: Must return here to prevent rectangle/circle logic
        }

        // Rectangle and Circle mode logic - only runs if NOT polygon
        if (drawingMode !== "rectangle" && drawingMode !== "circle") {
          return;
        }

        // Get current point - try multiple ways to get coordinates
        let currentPoint = e.lngLat;
        if (!currentPoint && e.point) {
          currentPoint = map.unproject(e.point);
          e.lngLat = currentPoint;
        }
        if (!currentPoint) return;

        if (
          !drawingStateRef.current.isMoving &&
          !drawingStateRef.current.isResizing
        ) {
          // Update cursor based on hover
          const source = map.getSource("drawing");
          if (source) {
            const data = source.getData ? source.getData() : source._data;
            if (data && data.features && data.features.length > 0) {
              const boundary = data.features[0].geometry.coordinates[0];
              const point = currentPoint;
              const edgeDist = getDistanceToEdge(point, boundary);
              // Use a more lenient threshold based on zoom level
              const zoom = map.getZoom();
              const threshold = (zoom > 10 ? 0.5 : zoom > 7 ? 1 : 2) / 111; // Smaller threshold at higher zoom

              if (edgeDist < threshold) {
                map.getCanvas().style.cursor = "nwse-resize";
              } else if (isPointInShape(point, boundary)) {
                map.getCanvas().style.cursor = "move";
              } else {
                map.getCanvas().style.cursor = "default";
              }
            }
          }
          return;
        }

        if (!drawingStateRef.current.dragStart) {
          // If we're in move/resize mode but don't have dragStart, initialize it
          if (
            drawingStateRef.current.isMoving ||
            drawingStateRef.current.isResizing
          ) {
            drawingStateRef.current.dragStart = currentPoint;
          } else {
            return;
          }
        }

        if (drawingStateRef.current.isMoving) {
          // Move the shape
          const initialCenter = drawingStateRef.current.initialCenter;
          const dragStart = drawingStateRef.current.dragStart;

          // Safety checks
          if (
            !initialCenter ||
            typeof initialCenter.lat !== "number" ||
            typeof initialCenter.lng !== "number"
          ) {
            return;
          }

          if (
            !dragStart ||
            typeof dragStart.lat !== "number" ||
            typeof dragStart.lng !== "number"
          ) {
            drawingStateRef.current.dragStart = currentPoint;
            return;
          }

          // Calculate the difference from where drag started
          const latDiff = currentPoint.lat - dragStart.lat;
          const lngDiff = currentPoint.lng - dragStart.lng;

          // Ensure currentCenter exists
          if (!drawingStateRef.current.currentCenter) {
            drawingStateRef.current.currentCenter = {
              lat: initialCenter.lat,
              lng: initialCenter.lng,
            };
          }

          // Update center position
          drawingStateRef.current.currentCenter.lat =
            initialCenter.lat + latDiff;
          drawingStateRef.current.currentCenter.lng =
            initialCenter.lng + lngDiff;

          // Update the shape immediately
          createInitialShape();

          if (e.originalEvent && e.originalEvent.preventDefault) {
            e.originalEvent.preventDefault();
          }
        } else if (drawingStateRef.current.isResizing) {
          // Resize the shape
          const initialCenter = drawingStateRef.current.initialCenter;

          // Safety check: ensure initialCenter exists
          if (!initialCenter || !initialCenter.lat || !initialCenter.lng) {
            return;
          }

          const maxSize = getMaxViewportSize();

          if (drawingMode === "rectangle") {
            const latDiff = Math.abs(currentPoint.lat - initialCenter.lat);
            const lngDiff = Math.abs(currentPoint.lng - initialCenter.lng);
            const latDist = latDiff * 111;
            const lngDist =
              lngDiff * 111 * Math.cos((initialCenter.lat * Math.PI) / 180);
            drawingStateRef.current.currentSize.width = Math.min(
              maxSize.maxWidth,
              Math.max(10, lngDist * 2)
            );
            drawingStateRef.current.currentSize.height = Math.min(
              maxSize.maxHeight,
              Math.max(10, latDist * 2)
            );
            createInitialShape();
            if (!drawingStateRef.current.activeHandle) {
              updateResizeHandles();
            }
          } else {
            const R = 6371;
            const dLat =
              ((currentPoint.lat - initialCenter.lat) * Math.PI) / 180;
            const dLng =
              ((currentPoint.lng - initialCenter.lng) * Math.PI) / 180;
            const a =
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos((initialCenter.lat * Math.PI) / 180) *
                Math.cos((currentPoint.lat * Math.PI) / 180) *
                Math.sin(dLng / 2) *
                Math.sin(dLng / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            drawingStateRef.current.currentSize.radius = Math.min(
              maxSize.maxRadius,
              Math.max(5, R * c)
            );
            createInitialShape();
            if (!drawingStateRef.current.activeHandle) {
              updateResizeHandles();
            }
          }
          if (e.originalEvent && e.originalEvent.preventDefault) {
            e.originalEvent.preventDefault();
          }
        }
      };

      const handleMouseMove = (e) => {
        handleInteractionMove(e);
      };

      const handleTouchMove = (e) => {
        if (!e.lngLat && e.point) {
          const point = map.unproject(e.point);
          e.lngLat = point;
        }
        if (e.lngLat) {
          handleInteractionMove(e);
        }
      };

      const handleInteractionEnd = (e) => {
        if (
          drawingStateRef.current.isMoving ||
          drawingStateRef.current.isResizing
        ) {
          drawingStateRef.current.isMoving = false;
          drawingStateRef.current.isResizing = false;
          drawingStateRef.current.dragStart = null;
          map.getCanvas().style.cursor = "default";
          map.dragPan.enable();
          if (e.originalEvent && e.originalEvent.preventDefault) {
            e.originalEvent.preventDefault();
          }
        }
      };

      const handleMouseUp = (e) => {
        handleInteractionEnd(e);
      };

      const handleTouchEnd = (e) => {
        handleInteractionEnd(e);
      };

      const handleDoubleClick = (e) => {
        // For polygon mode, enter edit mode and show resize handles
        if (drawingMode === "polygon") {
          const points = drawingStateRef.current.polygonPoints;
          if (points.length < 3) {
            // Need at least 3 points to form a polygon
            return;
          }

          // Enter edit mode - this allows resizing by dragging vertices
          drawingStateRef.current.polygonEditMode = true;

          // Update polygon shape to ensure it's closed
          updatePolygonShape();

          // Show resize handles at vertices
          updateResizeHandles();

          // Change cursor back to default since we're now in edit mode
          map.getCanvas().style.cursor = "default";

          if (e.originalEvent && e.originalEvent.preventDefault) {
            e.originalEvent.preventDefault();
          }
          return;
        }

        const source = map.getSource("drawing");
        if (!source) return;
        const data = source.getData ? source.getData() : source._data;
        if (!data || !data.features || data.features.length === 0) return;

        const boundary = data.features[0].geometry.coordinates[0];
        const centerPoint =
          drawingMode === "circle"
            ? drawingStateRef.current.currentCenter
            : undefined;

        drawingStateRef.current.currentCenter = null;
        drawingStateRef.current.currentSize = null;
        completeDrawing(boundary, drawingMode, centerPoint, true);
      };

      const cleanupAll = () => {
        map.off("mousedown", handleMouseDown);
        map.off("mousemove", handleMouseMove);
        map.off("mouseup", handleMouseUp);
        map.off("dblclick", handleDoubleClick);
        map.off("touchstart", handleTouchStart);
        map.off("touchmove", handleTouchMove);
        map.off("touchend", handleTouchEnd);
        map.off("zoom", handleZoomOrMove);
        map.off("move", handleZoomOrMove);

        // Remove layers and source
        try {
          if (map.getLayer("drawing-fill")) map.removeLayer("drawing-fill");
          if (map.getLayer("drawing-outline")) map.removeLayer("drawing-outline");
          if (map.getSource("drawing")) map.removeSource("drawing");
        } catch (error) {
          console.error("Error removing drawing layers:", error);
        }

        // Remove handles
        if (resizeHandlesRef.current) {
          resizeHandlesRef.current.forEach((handle) => handle.remove());
          resizeHandlesRef.current = [];
        }

        map.getCanvas().style.cursor = "";
      };

      const completeDrawing = (
        boundary,
        shapeType,
        centerPoint,
        isFinal = false
      ) => {
        if (isFinal) {
          cleanupAll();

          try {
            if (map.getLayer("drawing-fill")) {
              map.removeLayer("drawing-fill");
            }
            if (map.getLayer("drawing-outline")) {
              map.removeLayer("drawing-outline");
            }
            if (map.getSource("drawing")) {
              map.removeSource("drawing");
            }
          } catch (error) {
            console.error("Error removing drawing layers:", error);
          }

          resizeHandlesRef.current.forEach((handle) => handle.remove());
          resizeHandlesRef.current = [];
          map.getCanvas().style.cursor = "";
        }

        onDrawingComplete?.({
          type: shapeType,
          boundary,
          center: centerPoint,
          isFinal,
        });
      };

      // Update resize handles on zoom/move to keep them in sync
      const handleZoomOrMove = () => {
        if (
          drawingMode &&
          drawingMode !== "polygon" &&
          drawingStateRef.current.currentCenter &&
          drawingStateRef.current.currentSize
        ) {
          // Update handles position when zoom changes
          updateResizeHandles();
        }
      };

      map.on("zoom", handleZoomOrMove);
      map.on("move", handleZoomOrMove);

      // Attach event listeners
      map.on("mousedown", handleMouseDown);
      map.on("mousemove", handleMouseMove);
      map.on("mouseup", handleMouseUp);
      map.on("dblclick", handleDoubleClick);
      map.on("touchstart", handleTouchStart);
      map.on("touchmove", handleTouchMove);
      map.on("touchend", handleTouchEnd);

      // Expose function to get current boundary
      if (onGetCurrentBoundary) {
        onGetCurrentBoundary.current = () => {
          // Use mapRef.current instead of closure variable to ensure we always have the current map instance
          const currentMap = mapRef.current;
          if (!currentMap) {
            return null;
          }

          // For polygon, get boundary from polygonPoints
          if (drawingMode === "polygon") {
            const points = drawingStateRef.current.polygonPoints;
            if (points.length < 3) return null;

            // Create closed boundary
            const boundary = [...points];
            boundary.push([points[0][0], points[0][1]]); // Close the polygon

            return {
              type: drawingMode,
              boundary,
              center: undefined,
            };
          }

          const source = currentMap.getSource("drawing");
          if (!source) return null;
          const data = source.getData ? source.getData() : source._data;
          if (!data || !data.features || data.features.length === 0)
            return null;
          const boundary = data.features[0].geometry.coordinates[0];
          const centerPoint =
            drawingMode === "circle"
              ? drawingStateRef.current.currentCenter
              : undefined;
          return {
            type: drawingMode,
            boundary,
            center: centerPoint,
          };
        };

        // Also expose a clear function
        onGetCurrentBoundary.clear = () => {
          // Clear polygon points
          drawingStateRef.current.polygonPoints = [];
          drawingStateRef.current.polygonEditMode = false;
          drawingStateRef.current.activeVertexIndex = undefined;

          // Clear drawing source data - use mapRef.current instead of closure variable
          const currentMap = mapRef.current;
          if (!currentMap) {
            return;
          }

          try {
            const source = currentMap.getSource("drawing");
            if (source) {
              source.setData({
                type: "FeatureCollection",
                features: [],
              });
            }
          } catch (error) {
            console.error("Error clearing drawing source:", error);
          }
        };
      }

      // Return cleanup function for setupDrawingMode
      return () => {
        cleanupAll();
        if (onGetCurrentBoundary) {
          onGetCurrentBoundary.current = null;
        }
      };
    };

    // Wait for style to be loaded if it's not ready yet, then call setupDrawingMode
    if (!map.isStyleLoaded()) {
      let cleanupDone = false;
      let timeoutId = null;

      const doCleanup = () => {
        if (cleanupDone) return;
        cleanupDone = true;
        map.off("style.load", onStyleLoad);
        map.off("load", onMapLoad);
        map.off("idle", onIdle);
        if (timeoutId) clearTimeout(timeoutId);
      };

      // Try multiple events to catch when style is ready
      const onStyleLoad = () => {
        if (map.isStyleLoaded() && drawingMode) {
          doCleanup();
          cleanupFunc = setupDrawingMode();
        }
      };

      const onMapLoad = () => {
        if (map.isStyleLoaded() && drawingMode) {
          doCleanup();
          cleanupFunc = setupDrawingMode();
        }
      };

      const onIdle = () => {
        if (map.isStyleLoaded() && drawingMode) {
          doCleanup();
          cleanupFunc = setupDrawingMode();
        }
      };

      // Listen to multiple events
      map.on("style.load", onStyleLoad);
      map.on("load", onMapLoad);
      map.on("idle", onIdle);

      // Also try after a delay as fallback
      timeoutId = setTimeout(() => {
        if (map.isStyleLoaded() && drawingMode) {
          doCleanup();
          cleanupFunc = setupDrawingMode();
        }
      }, 500);

      return () => {
        doCleanup();
      };
    }

    // If style is already loaded, proceed immediately
    cleanupFunc = setupDrawingMode();

    // Return cleanup for the useEffect
    return () => {
      if (cleanupFunc) cleanupFunc();
    };
  }, [
    drawingMode,
    mapLoaded,
    onDrawingComplete,
    onDrawingCancel,
    onGetCurrentBoundary,
  ]);

  /* ---------------- UI ---------------- */
  return (
    <div className="absolute inset-0">
      {isTokenMissing ? (
        <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white text-sm">
          Mapbox token missing
        </div>
      ) : mapError ? (
        <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white text-sm">
          {mapError}
        </div>
      ) : (
        <div ref={mapContainerRef} className="w-full h-full" />
      )}
    </div>
  );
}
