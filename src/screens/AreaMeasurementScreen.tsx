import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Ruler,
  Layers,
  Calculator,
  Square,
  Circle,
  Triangle,
  RotateCcw,
  Save,
  Trash2,
  Copy,
  Check,
  Plus,
  BookOpen,
  DollarSign,
  Info,
  Calendar,
  User,
  MapPin,
  FileSpreadsheet,
  CheckCircle2,
  Sliders,
  Navigation,
  Crosshair,
  Footprints,
  Compass,
  Map,
  Eye,
  Maximize2,
  Minimize2,
  Undo,
  Play,
  Square as StopIcon,
  AlertCircle,
  RefreshCw,
  Minus,
  WifiOff,
  Radio
} from 'lucide-react';
import L from 'leaflet';
import { Utils } from '../util/utils';

export type ShapeMode = 'gps_polygon' | 'quadrilateral' | 'triangle' | 'rectangle' | 'circle' | 'multi_plot' | 'converter';
export type UnitLength = 'feet' | 'haat' | 'gaj' | 'meter' | 'link';
export type RateUnit = 'bigha' | 'shatak' | 'katha' | 'acre' | 'cft';
export type MapLayerType = 'google_hybrid' | 'esri_sat' | 'osm_street' | 'offline_canvas';

export interface GpsPoint {
  id: string;
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp?: number;
}

export interface SavedLandMeasurement {
  id: string;
  customerName: string;
  plotInfo: string;
  date: string;
  shapeType: string;
  totalSqFt: number;
  totalShatak: number;
  bighaText: string;
  ratePerUnit?: number;
  rateUnit?: RateUnit;
  totalBill?: number;
  detailsNote?: string;
  pointsCount?: number;
}

interface AreaMeasurementScreenProps {
  onBack: () => void;
  onAddToHisab?: (data: {
    name: string;
    workDetails: string;
    qty: number;
    rate: number;
    bill: number;
    address?: string;
  }) => void;
}

// Standard Land Conversion Factors based on 1 Square Feet (বর্গফুট)
const SQFT_PER_SHATAK = 435.6; // 1 শতক / শতাংশ = ৪৩৫.৬ বর্গফুট
const SQFT_PER_KATHA = 720;    // 1 কাঠা = ৭২০ বর্গফুট
const SQFT_PER_BIGHA = 14400;  // 1 বিঘা (৩৩ শতক) = ১৪,৪০০ বর্গফুট (২০ কাঠা)
const SQFT_PER_ACRE = 43560;   // 1 একর = ৪৩,৫৬০ বর্গফুট (১০০ শতক)
const SQFT_PER_HECTARE = 107639.1; // 1 হেক্টর = ১০৭,৬৩৯.১ বর্গফুট (২৪৭.১ শতক)
const SQFT_PER_CHHATAK = 45;   // 1 ছটাক = ৪৫ বর্গফুট (১৬ ছটাকে ১ কাঠা)
const SQFT_PER_GANDA = 871.2;  // 1 গণ্ডা = ২ শতক = ৮৭১.২ বর্গফুট (২০ গণ্ডায় ১ কানি)
const SQFT_PER_KANI = 17424;   // 1 কানি (শাহী/স্ট্যান্ডার্ড ৪০ শতক) = ১৭,৪২৪ বর্গফুট
const SQFT_PER_SQ_METER = 10.7639; // 1 বর্গমিটার = ১০.৭৬৩৯ বর্গফুট
const SQFT_PER_SQ_YARD = 9.0;      // 1 বর্গগজ = ৯ বর্গফুট
const SQFT_PER_SQ_LINK = 0.4356;   // 1 বর্গলিংক = ০.৪৩৫৬ বর্গফুট (১০০০ বর্গলিংকে ১ শতক)

// Conversion factor to convert linear input unit to Feet (ফুট)
function toFeet(val: number, unit: UnitLength): number {
  if (isNaN(val) || val <= 0) return 0;
  switch (unit) {
    case 'haat': return val * 1.5;         // ১ হাত = ১.৫ ফুট (১৮ ইঞ্চি)
    case 'gaj': return val * 3.0;          // ১ গজ = ৩ ফুট (৩৬ ইঞ্চি)
    case 'meter': return val * 3.28084;    // ১ মিটার = ৩.২৮০৮৪ ফুট
    case 'link': return val * 0.66;        // ১ লিংক/কড়ি = ০.৬৬ ফুট (৭.৯২ ইঞ্চি)
    case 'feet':
    default:
      return val;
  }
}

// Haversine distance between two GPS coordinates in meters
function haversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculate geodesic polygon area in square meters using spherical excess / local projection
function calculatePolygonAreaSqMeters(points: GpsPoint[]): number {
  if (points.length < 3) return 0;

  // Local projection centered at average lat/lng for high precision in land surveying
  let avgLat = 0;
  let avgLng = 0;
  for (const p of points) {
    avgLat += p.lat;
    avgLng += p.lng;
  }
  avgLat /= points.length;
  avgLng /= points.length;

  const latRad = avgLat * (Math.PI / 180);
  const R = 6378137; // WGS84 major radius in meters

  // Convert points to local meter grid (x, y)
  const xy = points.map(p => {
    const dLat = (p.lat - avgLat) * (Math.PI / 180);
    const dLng = (p.lng - avgLng) * (Math.PI / 180);
    const x = R * dLng * Math.cos(latRad);
    const y = R * dLat;
    return { x, y };
  });

  // Shoelace formula on projected coordinates
  let area = 0;
  const n = xy.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += xy[i].x * xy[j].y;
    area -= xy[j].x * xy[i].y;
  }
  return Math.abs(area) / 2.0;
}

export const AreaMeasurementScreen: React.FC<AreaMeasurementScreenProps> = ({
  onBack,
  onAddToHisab
}) => {
  const [activeTab, setActiveTab] = useState<ShapeMode>('gps_polygon');
  const [unit, setUnit] = useState<UnitLength>('feet');
  const [bighaShatakValue, setBighaShatakValue] = useState<number>(33); // 33 shatak per bigha default
  const [showSettings, setShowSettings] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [savedRecords, setSavedRecords] = useState<SavedLandMeasurement[]>(() => {
    try {
      const saved = localStorage.getItem('hisab_saved_land_measurements');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showSavedModal, setShowSavedModal] = useState(false);

  // Metadata for saving/adding to hisab
  const [customerName, setCustomerName] = useState('');
  const [plotNumber, setPlotNumber] = useState('');
  const [workDetails, setWorkDetails] = useState('জমি চাষ / পরিমাপ');
  const [ratePerUnit, setRatePerUnit] = useState<string>('');
  const [rateUnit, setRateUnit] = useState<RateUnit>('bigha');

  // ================= GPS POLYGON STATE =================
  const [gpsPoints, setGpsPoints] = useState<GpsPoint[]>([]);
  const [currentGpsPos, setCurrentGpsPos] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [isGpsTracking, setIsGpsTracking] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [mapLayerType, setMapLayerType] = useState<'google_hybrid' | 'esri_sat' | 'osm_street'>('google_hybrid');
  const [isMapExpanded, setIsMapExpanded] = useState<boolean>(false);
  const [mapReloadKey, setMapReloadKey] = useState<number>(0);
  const [inAppToast, setInAppToast] = useState<{ message: string; type: 'info' | 'success' | 'warning' } | null>(null);

  const showToast = (message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    setInAppToast({ message, type });
    setTimeout(() => {
      setInAppToast(null);
    }, 3200);
  };

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const polygonLayerRef = useRef<L.Polygon | null>(null);
  const polylineLayerRef = useRef<L.Polyline | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.CircleMarker | null>(null);
  const userAccuracyCircleRef = useRef<L.Circle | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastMapCenterRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastMapZoomRef = useRef<number | null>(null);

  // Method 1: Quadrilateral (৪ বাহু ও ঐচ্ছিক কর্ণ)
  const [quadNorth, setQuadNorth] = useState('');
  const [quadSouth, setQuadSouth] = useState('');
  const [quadEast, setQuadEast] = useState('');
  const [quadWest, setQuadWest] = useState('');
  const [quadDiagonal, setQuadDiagonal] = useState('');

  // Method 2: Triangle (৩ বাহু বা ভূমি × উচ্চতা)
  const [triMode, setTriMode] = useState<'3sides' | 'baseHeight'>('3sides');
  const [triA, setTriA] = useState('');
  const [triB, setTriB] = useState('');
  const [triC, setTriC] = useState('');
  const [triBase, setTriBase] = useState('');
  const [triHeight, setTriHeight] = useState('');

  // Method 3: Rectangle / Square
  const [rectLength, setRectLength] = useState('');
  const [rectWidth, setRectWidth] = useState('');

  // Method 4: Circle / Pond / Ellipse
  const [circleMode, setCircleMode] = useState<'circle' | 'ellipse'>('circle');
  const [circleRadius, setCircleRadius] = useState('');
  const [ellipseMajor, setEllipseMajor] = useState('');
  const [ellipseMinor, setEllipseMinor] = useState('');

  // Method 5: Multi Plot Sum (একাধিক প্লট)
  const [multiPlots, setMultiPlots] = useState<Array<{ id: string; name: string; length: string; width: string; directShatak: string }>>([
    { id: '1', name: 'প্লট ১', length: '', width: '', directShatak: '' },
    { id: '2', name: 'প্লট ২', length: '', width: '', directShatak: '' }
  ]);

  // Method 6: Unit Converter
  const [converterInput, setConverterInput] = useState<string>('1');
  const [converterUnit, setConverterUnit] = useState<string>('shatak');

  // CFT Depth / Soil Excavation Setting
  const [cftDepth, setCftDepth] = useState<string>('1');
  const [cftDepthUnit, setCftDepthUnit] = useState<'feet' | 'inch'>('feet');
  const [showCftDepthSetting, setShowCftDepthSetting] = useState<boolean>(false);

  // Save records to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem('hisab_saved_land_measurements', JSON.stringify(savedRecords));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }, [savedRecords]);

  // ================= GPS INITIALIZATION & TRACKING =================
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError('আপনার ডিভাইসে GPS / Geolocation সমর্থিত নয়।');
      return;
    }

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setCurrentGpsPos({ lat: latitude, lng: longitude, accuracy });
        setGpsError(null);
      },
      (err) => {
        console.warn('GPS location fetch failed:', err.message);
        setGpsError('GPS লোকেশন চালু করুন বা পারমিশন দিন।');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    // Watch position
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setCurrentGpsPos({ lat: latitude, lng: longitude, accuracy });
        setGpsError(null);

        // Auto-tracking mode (log point if walked more than 2.5 meters from last point)
        if (isGpsTracking) {
          setGpsPoints((prev) => {
            if (prev.length === 0) {
              return [{ id: Date.now().toString(), lat: latitude, lng: longitude, accuracy, timestamp: Date.now() }];
            }
            const last = prev[prev.length - 1];
            const dist = haversineDistanceMeters(last.lat, last.lng, latitude, longitude);
            if (dist >= 2.5) {
              return [...prev, { id: Date.now().toString(), lat: latitude, lng: longitude, accuracy, timestamp: Date.now() }];
            }
            return prev;
          });
        }
      },
      (err) => {
        console.warn('GPS watch error:', err.message);
      },
      { enableHighAccuracy: true, maximumAge: 2000 }
    );

    watchIdRef.current = id;

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [isGpsTracking]);

  // ================= LEAFLET MAP SETUP =================
  useEffect(() => {
    if (activeTab !== 'gps_polygon') {
      if (mapInstanceRef.current) {
        try {
          const center = mapInstanceRef.current.getCenter();
          lastMapCenterRef.current = { lat: center.lat, lng: center.lng };
          lastMapZoomRef.current = mapInstanceRef.current.getZoom();
          mapInstanceRef.current.remove();
        } catch (e) {
          console.warn('Error removing map instance:', e);
        }
        mapInstanceRef.current = null;
        markersGroupRef.current = null;
        tileLayerRef.current = null;
        polygonLayerRef.current = null;
        polylineLayerRef.current = null;
      }
      return;
    }

    const container = mapContainerRef.current;
    if (!container) return;

    // If map was already initialized on another element, destroy it first but preserve center & zoom
    if (mapInstanceRef.current) {
      try {
        const center = mapInstanceRef.current.getCenter();
        lastMapCenterRef.current = { lat: center.lat, lng: center.lng };
        lastMapZoomRef.current = mapInstanceRef.current.getZoom();
        mapInstanceRef.current.remove();
      } catch (e) {
        console.warn('Map cleanup error:', e);
      }
      mapInstanceRef.current = null;
      markersGroupRef.current = null;
      tileLayerRef.current = null;
      polygonLayerRef.current = null;
      polylineLayerRef.current = null;
    }

    // Safety check for Leaflet container ID attribute
    if ((container as any)._leaflet_id) {
      delete (container as any)._leaflet_id;
    }

    const initialCenterLat = lastMapCenterRef.current ? lastMapCenterRef.current.lat : (currentGpsPos?.lat || 23.8103);
    const initialCenterLng = lastMapCenterRef.current ? lastMapCenterRef.current.lng : (currentGpsPos?.lng || 90.4125);
    const initialZoom = lastMapZoomRef.current !== null && lastMapZoomRef.current !== undefined
      ? lastMapZoomRef.current
      : (currentGpsPos ? 18 : 15);

    const map = L.map(container, {
      center: [initialCenterLat, initialCenterLng],
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: false
    });

    // Layer groups
    const markersGroup = L.layerGroup().addTo(map);
    markersGroupRef.current = markersGroup;

    // Record zoom and center whenever user pans or zooms so it is NEVER lost or reset
    map.on('moveend zoomend', () => {
      try {
        const center = map.getCenter();
        lastMapCenterRef.current = { lat: center.lat, lng: center.lng };
        lastMapZoomRef.current = map.getZoom();
      } catch (e) {
        // ignore
      }
    });

    // Add click event on map to add vertex point
    map.on('click', (e: L.LeafletMouseEvent) => {
      const newPoint: GpsPoint = {
        id: Date.now().toString(),
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        accuracy: 0,
        timestamp: Date.now()
      };
      setGpsPoints((prev) => [...prev, newPoint]);
    });

    mapInstanceRef.current = map;

    // Apply Initial Tile Layer
    if (mapLayerType === 'offline_canvas') {
      // Create SVG Grid Pattern Data URL for pure offline grid background
      const svgGrid = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
        <rect width="100" height="100" fill="#0f172a" />
        <defs>
          <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" stroke-width="0.8" />
          </pattern>
          <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
            <rect width="100" height="100" fill="url(#smallGrid)" />
            <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#334155" stroke-width="1.5" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#grid)" />
      </svg>`;
      const encodedSvg = `data:image/svg+xml;base64,${btoa(svgGrid)}`;
      tileLayerRef.current = L.tileLayer(encodedSvg, {
        maxZoom: 22,
        minZoom: 1
      }).addTo(map);
    } else {
      let tileUrl = 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
      let maxZoom = 21;
      let subdomains: string[] = ['mt0', 'mt1', 'mt2', 'mt3'];

      if (mapLayerType === 'esri_sat') {
        tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
        maxZoom = 19;
        subdomains = ['a', 'b', 'c'];
      } else if (mapLayerType === 'osm_street') {
        tileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
        maxZoom = 19;
        subdomains = ['a', 'b', 'c'];
      }

      tileLayerRef.current = L.tileLayer(tileUrl, {
        maxZoom,
        subdomains
      }).addTo(map);
    }

    // Repeated size invalidations to ensure full rendering across all device screen layouts without resetting zoom
    const triggerInvalidate = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize({ animate: false });
      }
    };

    triggerInvalidate();
    const t1 = setTimeout(triggerInvalidate, 80);
    const t2 = setTimeout(triggerInvalidate, 250);
    const t3 = setTimeout(triggerInvalidate, 600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [activeTab, mapReloadKey]);

  // Update Tile Layer without recreating the map or changing zoom
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (tileLayerRef.current) {
      try {
        map.removeLayer(tileLayerRef.current);
      } catch (e) {
        // ignore
      }
    }

    if (mapLayerType === 'offline_canvas') {
      const svgGrid = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
        <rect width="100" height="100" fill="#0f172a" />
        <defs>
          <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" stroke-width="0.8" />
          </pattern>
          <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
            <rect width="100" height="100" fill="url(#smallGrid)" />
            <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#334155" stroke-width="1.5" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#grid)" />
      </svg>`;
      const encodedSvg = `data:image/svg+xml;base64,${btoa(svgGrid)}`;
      tileLayerRef.current = L.tileLayer(encodedSvg, {
        maxZoom: 22,
        minZoom: 1
      }).addTo(map);
    } else {
      let tileUrl = 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
      let maxZoom = 21;
      let subdomains: string[] = ['mt0', 'mt1', 'mt2', 'mt3'];

      if (mapLayerType === 'esri_sat') {
        tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
        maxZoom = 19;
        subdomains = ['a', 'b', 'c'];
      } else if (mapLayerType === 'osm_street') {
        tileUrl = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
        maxZoom = 19;
        subdomains = ['a', 'b', 'c'];
      }

      tileLayerRef.current = L.tileLayer(tileUrl, {
        maxZoom,
        subdomains
      }).addTo(map);
    }
  }, [mapLayerType]);

  // Handle map container expansion / resize smoothly without resetting zoom or center
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const t1 = setTimeout(() => map.invalidateSize({ animate: false }), 60);
    const t2 = setTimeout(() => map.invalidateSize({ animate: false }), 260);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isMapExpanded]);

  // Clean up map when component unmounts entirely
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        try {
          const center = mapInstanceRef.current.getCenter();
          lastMapCenterRef.current = { lat: center.lat, lng: center.lng };
          lastMapZoomRef.current = mapInstanceRef.current.getZoom();
          mapInstanceRef.current.remove();
        } catch (e) {
          // ignore
        }
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Map Markers & Polygon whenever gpsPoints or currentGpsPos change
  useEffect(() => {
    if (activeTab !== 'gps_polygon' || !mapInstanceRef.current || !markersGroupRef.current) return;
    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;

    markersGroup.clearLayers();

    // 1. Draw User Current Location Pulse
    if (currentGpsPos) {
      // Accuracy Circle
      if (currentGpsPos.accuracy && currentGpsPos.accuracy > 0) {
        userAccuracyCircleRef.current = L.circle([currentGpsPos.lat, currentGpsPos.lng], {
          radius: currentGpsPos.accuracy,
          color: '#3B82F6',
          fillColor: '#3B82F6',
          fillOpacity: 0.15,
          weight: 1
        }).addTo(markersGroup);
      }

      // User Marker Dot
      userMarkerRef.current = L.circleMarker([currentGpsPos.lat, currentGpsPos.lng], {
        radius: 7,
        color: '#FFFFFF',
        fillColor: '#2563EB',
        fillOpacity: 1,
        weight: 2
      }).addTo(markersGroup);
    }

    // 2. Draw Polygon / Polyline for Boundary
    const latLngs: L.LatLngExpression[] = gpsPoints.map(p => [p.lat, p.lng]);

    if (polygonLayerRef.current) {
      map.removeLayer(polygonLayerRef.current);
      polygonLayerRef.current = null;
    }
    if (polylineLayerRef.current) {
      map.removeLayer(polylineLayerRef.current);
      polylineLayerRef.current = null;
    }

    if (gpsPoints.length >= 3) {
      polygonLayerRef.current = L.polygon(latLngs, {
        color: '#10B981',
        weight: 3,
        fillColor: '#10B981',
        fillOpacity: 0.35,
        dashArray: undefined
      }).addTo(map);
    } else if (gpsPoints.length >= 2) {
      polylineLayerRef.current = L.polyline(latLngs, {
        color: '#10B981',
        weight: 3,
        dashArray: '5, 5'
      }).addTo(map);
    }

    // 3. Draw Numbered Corner Markers
    gpsPoints.forEach((point, index) => {
      const isFirst = index === 0;
      const isLast = index === gpsPoints.length - 1 && gpsPoints.length > 1;

      const markerHtml = `
        <div style="
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: ${isFirst ? '#059669' : isLast ? '#D97706' : '#1E293B'};
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 11px;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.4);
          cursor: grab;
        ">
          ${index + 1}
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-gps-pin',
        html: markerHtml,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });

      const marker = L.marker([point.lat, point.lng], {
        icon: customIcon,
        draggable: true
      }).addTo(markersGroup);

      // Point Drag Handler (for fine-tuning exact corner)
      marker.on('dragend', (e) => {
        const target = e.target as L.Marker;
        const newLatLng = target.getLatLng();
        setGpsPoints(prev =>
          prev.map(p => p.id === point.id ? { ...p, lat: newLatLng.lat, lng: newLatLng.lng } : p)
        );
      });

      // Bind info tooltip
      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 11px; line-height: 1.4; padding: 2px;">
          <b>কোণা #${index + 1}</b><br/>
          Lat: ${point.lat.toFixed(6)}<br/>
          Lng: ${point.lng.toFixed(6)}
        </div>
      `);
    });
  }, [gpsPoints, currentGpsPos, activeTab]);

  // Center map on user location
  const handleLocateMe = () => {
    if (!mapInstanceRef.current) return;
    if (currentGpsPos) {
      mapInstanceRef.current.flyTo([currentGpsPos.lat, currentGpsPos.lng], 19, { animate: true });
      showToast('আপনার বর্তমান GPS অবস্থান ম্যাপে প্রদর্শিত হচ্ছে', 'info');
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          setCurrentGpsPos({ lat: latitude, lng: longitude, accuracy });
          mapInstanceRef.current?.flyTo([latitude, longitude], 19, { animate: true });
          showToast('GPS অবস্থান সফলভাবে চিহ্নিত হয়েছে', 'success');
        },
        (err) => {
          showToast('GPS অবস্থান পাওয়া যায়নি। ফোনের লোকেশন চালু করুন।', 'warning');
        },
        { enableHighAccuracy: true }
      );
    }
  };

  // Fit bounds to polygon
  const handleFitPolygon = () => {
    if (!mapInstanceRef.current || gpsPoints.length < 2) return;
    const bounds = L.latLngBounds(gpsPoints.map(p => [p.lat, p.lng]));
    mapInstanceRef.current.fitBounds(bounds, { padding: [30, 30], animate: true });
  };

  // Add current GPS location as a corner point
  const handleAddCurrentLocationPoint = () => {
    if (!currentGpsPos) {
      showToast('GPS অবস্থান এখনও পাওয়া যায়নি। ফোনের লোকেশন চালু আছে কিনা নিশ্চিত করুন।', 'warning');
      return;
    }
    const newPoint: GpsPoint = {
      id: Date.now().toString(),
      lat: currentGpsPos.lat,
      lng: currentGpsPos.lng,
      accuracy: currentGpsPos.accuracy,
      timestamp: Date.now()
    };
    setGpsPoints(prev => [...prev, newPoint]);
    showToast(`পয়েন্ট #${gpsPoints.length + 1} সফলভাবে যুক্ত হয়েছে!`, 'success');
  };

  // Undo last point
  const handleUndoLastPoint = () => {
    if (gpsPoints.length === 0) return;
    setGpsPoints(prev => prev.slice(0, -1));
    showToast('শেষ পয়েন্টটি বাদ দেওয়া হয়েছে।', 'info');
  };

  // Clear all GPS points
  const handleClearAllGpsPoints = () => {
    if (gpsPoints.length === 0) return;
    setGpsPoints([]);
    setIsGpsTracking(false);
    showToast('পলিগনের সব পয়েন্ট সফলভাবে মুছে ফেলা হয়েছে।', 'success');
  };

  // ================= AREA CALCULATIONS =================
  const calculatedSqFt = useMemo((): { sqFt: number; perimeterFeet: number; formulaNote: string; isAccurate: boolean } => {
    switch (activeTab) {
      case 'gps_polygon': {
        if (gpsPoints.length < 3) {
          return {
            sqFt: 0,
            perimeterFeet: 0,
            formulaNote: 'জমির ক্ষেত্রফল মাপতে কমপক্ষে ৩টি কোণা/পয়েন্ট যোগ করুন',
            isAccurate: false
          };
        }

        const areaSqM = calculatePolygonAreaSqMeters(gpsPoints);
        const areaSqFeet = areaSqM * SQFT_PER_SQ_METER;

        // Calculate Perimeter (সীমানা দৈর্ঘ্য)
        let perimeterMeters = 0;
        for (let i = 0; i < gpsPoints.length; i++) {
          const next = (i + 1) % gpsPoints.length;
          perimeterMeters += haversineDistanceMeters(
            gpsPoints[i].lat,
            gpsPoints[i].lng,
            gpsPoints[next].lat,
            gpsPoints[next].lng
          );
        }
        const perimeterFeet = perimeterMeters * 3.28084;

        return {
          sqFt: areaSqFeet,
          perimeterFeet,
          formulaNote: `GPS পলিগন (${gpsPoints.length}টি কোণা) সূত্রে ভূ-পৃষ্ঠের নিখুঁত জিয়োডেসিক পরিমাপ`,
          isAccurate: true
        };
      }

      case 'quadrilateral': {
        const n = toFeet(Utils.calculateFromString(quadNorth), unit);
        const s = toFeet(Utils.calculateFromString(quadSouth), unit);
        const e = toFeet(Utils.calculateFromString(quadEast), unit);
        const w = toFeet(Utils.calculateFromString(quadWest), unit);
        const d = toFeet(Utils.calculateFromString(quadDiagonal), unit);

        if (n <= 0 || s <= 0 || e <= 0 || w <= 0) {
          return { sqFt: 0, perimeterFeet: 0, formulaNote: 'অনুগ্রহ করে চারটি বাহুর মাপ লিখুন', isAccurate: false };
        }

        const perimeterFeet = n + s + e + w;

        // If diagonal is provided: Heron's formula for 2 triangles
        if (d > 0) {
          const s1 = (n + w + d) / 2;
          const area1Sq = s1 * (s1 - n) * (s1 - w) * (s1 - d);

          const s2 = (s + e + d) / 2;
          const area2Sq = s2 * (s2 - s) * (s2 - e) * (s2 - d);

          if (area1Sq > 0 && area2Sq > 0) {
            const area1 = Math.sqrt(area1Sq);
            const area2 = Math.sqrt(area2Sq);
            return {
              sqFt: area1 + area2,
              perimeterFeet,
              formulaNote: 'হেরনের সূত্রে ২টি ত্রিভুজে নিখুঁত নির্ভুল ক্ষেত্রফল',
              isAccurate: true
            };
          } else {
            const avgLength = (n + s) / 2;
            const avgWidth = (e + w) / 2;
            return {
              sqFt: avgLength * avgWidth,
              perimeterFeet,
              formulaNote: 'কর্ণের মান অমিল হওয়ায় গড়ের সূত্রে হিসাব করা হয়েছে',
              isAccurate: false
            };
          }
        } else {
          const avgLength = (n + s) / 2;
          const avgWidth = (e + w) / 2;
          return {
            sqFt: avgLength * avgWidth,
            perimeterFeet,
            formulaNote: 'গড় পদ্ধতি: (উত্তর+দক্ষিণ)/২ × (পূর্ব+পশ্চিম)/২ (নিখুঁত করতে কর্ণ লিখুন)',
            isAccurate: false
          };
        }
      }

      case 'triangle': {
        if (triMode === 'baseHeight') {
          const b = toFeet(Utils.calculateFromString(triBase), unit);
          const h = toFeet(Utils.calculateFromString(triHeight), unit);
          if (b <= 0 || h <= 0) return { sqFt: 0, perimeterFeet: 0, formulaNote: 'ভূমি ও উচ্চতার মাপ লিখুন', isAccurate: false };
          return {
            sqFt: (b * h) / 2,
            perimeterFeet: b * 3, // rough
            formulaNote: 'ভূমি × উচ্চতা ÷ ২ সূত্রে নিখুঁত হিসাব',
            isAccurate: true
          };
        } else {
          const a = toFeet(Utils.calculateFromString(triA), unit);
          const b = toFeet(Utils.calculateFromString(triB), unit);
          const c = toFeet(Utils.calculateFromString(triC), unit);
          if (a <= 0 || b <= 0 || c <= 0) return { sqFt: 0, perimeterFeet: 0, formulaNote: 'ত্রিভুজের ৩টি বাহুর মাপ লিখুন', isAccurate: false };
          const s = (a + b + c) / 2;
          const prod = s * (s - a) * (s - b) * (s - c);
          if (prod <= 0) return { sqFt: 0, perimeterFeet: 0, formulaNote: 'বাহুগুলোর পরিমাপ ত্রিভুজ গঠন করে না', isAccurate: false };
          return {
            sqFt: Math.sqrt(prod),
            perimeterFeet: a + b + c,
            formulaNote: 'হেরন সূত্রে ৩ বাহুর নিখুঁত ক্ষেত্রফল',
            isAccurate: true
          };
        }
      }

      case 'rectangle': {
        const l = toFeet(Utils.calculateFromString(rectLength), unit);
        const w = toFeet(Utils.calculateFromString(rectWidth), unit);
        if (l <= 0 || w <= 0) return { sqFt: 0, perimeterFeet: 0, formulaNote: 'দৈর্ঘ্য ও প্রস্থের মাপ লিখুন', isAccurate: false };
        return {
          sqFt: l * w,
          perimeterFeet: 2 * (l + w),
          formulaNote: 'দৈর্ঘ্য × প্রস্থ সূত্রে ক্ষেত্রফল',
          isAccurate: true
        };
      }

      case 'circle': {
        if (circleMode === 'circle') {
          const r = toFeet(Utils.calculateFromString(circleRadius), unit);
          if (r <= 0) return { sqFt: 0, perimeterFeet: 0, formulaNote: 'বৃত্তের ব্যাসার্ধ লিখুন', isAccurate: false };
          return {
            sqFt: Math.PI * r * r,
            perimeterFeet: 2 * Math.PI * r,
            formulaNote: 'π × r² সূত্রে বৃত্তাকার জমির ক্ষেত্রফল',
            isAccurate: true
          };
        } else {
          const a = toFeet(Utils.calculateFromString(ellipseMajor), unit) / 2;
          const b = toFeet(Utils.calculateFromString(ellipseMinor), unit) / 2;
          if (a <= 0 || b <= 0) return { sqFt: 0, perimeterFeet: 0, formulaNote: 'উপবৃত্ত বা পুকুরের লম্বা ও খাটো ব্যাস লিখুন', isAccurate: false };
          const approxPerimeter = Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
          return {
            sqFt: Math.PI * a * b,
            perimeterFeet: approxPerimeter,
            formulaNote: 'π × a × b সূত্রে উপবৃত্তাকার পুকুরের ক্ষেত্রফল',
            isAccurate: true
          };
        }
      }

      case 'multi_plot': {
        let total = 0;
        multiPlots.forEach(p => {
          if (p.directShatak && Utils.calculateFromString(p.directShatak) > 0) {
            total += Utils.calculateFromString(p.directShatak) * SQFT_PER_SHATAK;
          } else {
            const l = toFeet(Utils.calculateFromString(p.length), unit);
            const w = toFeet(Utils.calculateFromString(p.width), unit);
            if (l > 0 && w > 0) {
              total += l * w;
            }
          }
        });
        return {
          sqFt: total,
          perimeterFeet: 0,
          formulaNote: `${multiPlots.length}টি প্লটের সমন্বিত সর্বমোট ক্ষেত্রফল`,
          isAccurate: true
        };
      }

      case 'converter': {
        const val = Utils.calculateFromString(converterInput);
        if (val <= 0) return { sqFt: 0, perimeterFeet: 0, formulaNote: 'রূপান্তরের মান লিখুন', isAccurate: true };
        let sqFt = 0;
        switch (converterUnit) {
          case 'shatak': sqFt = val * SQFT_PER_SHATAK; break;
          case 'katha': sqFt = val * SQFT_PER_KATHA; break;
          case 'bigha': sqFt = val * (bighaShatakValue * SQFT_PER_SHATAK); break;
          case 'acre': sqFt = val * SQFT_PER_ACRE; break;
          case 'hectare': sqFt = val * SQFT_PER_HECTARE; break;
          case 'chhatak': sqFt = val * SQFT_PER_CHHATAK; break;
          case 'ganda': sqFt = val * SQFT_PER_GANDA; break;
          case 'kani': sqFt = val * SQFT_PER_KANI; break;
          case 'sqft': sqFt = val; break;
          case 'cft': sqFt = val; break;
          case 'sqmeter': sqFt = val * SQFT_PER_SQ_METER; break;
          case 'sqyard': sqFt = val * SQFT_PER_SQ_YARD; break;
          case 'sqlink': sqFt = val * SQFT_PER_SQ_LINK; break;
          default: sqFt = val * SQFT_PER_SHATAK;
        }
        return {
          sqFt,
          perimeterFeet: 0,
          formulaNote: 'স্বয়ংক্রিয় একক রূপান্তর',
          isAccurate: true
        };
      }

      default:
        return { sqFt: 0, perimeterFeet: 0, formulaNote: '', isAccurate: false };
    }
  }, [
    activeTab,
    gpsPoints,
    unit,
    bighaShatakValue,
    quadNorth,
    quadSouth,
    quadEast,
    quadWest,
    quadDiagonal,
    triMode,
    triA,
    triB,
    triC,
    triBase,
    triHeight,
    rectLength,
    rectWidth,
    circleMode,
    circleRadius,
    ellipseMajor,
    ellipseMinor,
    multiPlots,
    converterInput,
    converterUnit
  ]);

  // Derived Land Unit Values
  const sqFt = calculatedSqFt.sqFt;
  const totalShatak = sqFt > 0 ? sqFt / SQFT_PER_SHATAK : 0;
  const totalKatha = sqFt > 0 ? sqFt / SQFT_PER_KATHA : 0;
  const totalBighaCustom = sqFt > 0 ? sqFt / (bighaShatakValue * SQFT_PER_SHATAK) : 0;
  const totalAcre = sqFt > 0 ? sqFt / SQFT_PER_ACRE : 0;
  const totalHectare = sqFt > 0 ? sqFt / SQFT_PER_HECTARE : 0;
  const totalSqMeter = sqFt > 0 ? sqFt / SQFT_PER_SQ_METER : 0;
  const totalSqYard = sqFt > 0 ? sqFt / SQFT_PER_SQ_YARD : 0;
  const totalSqLink = sqFt > 0 ? sqFt / SQFT_PER_SQ_LINK : 0;
  const totalChhatak = sqFt > 0 ? sqFt / SQFT_PER_CHHATAK : 0;
  const totalGanda = sqFt > 0 ? sqFt / SQFT_PER_GANDA : 0;
  const totalKani = sqFt > 0 ? sqFt / SQFT_PER_KANI : 0;

  // CFT / Cubic Feet (ঘনফুট) calculation with depth/height
  const depthValue = useMemo(() => {
    const d = Utils.calculateFromString(cftDepth);
    return d > 0 ? d : 1;
  }, [cftDepth]);

  const effectiveDepthFeet = useMemo(() => {
    return cftDepthUnit === 'inch' ? (depthValue / 12) : depthValue;
  }, [depthValue, cftDepthUnit]);

  const totalCft = useMemo(() => {
    return sqFt > 0 ? (sqFt * effectiveDepthFeet) : 0;
  }, [sqFt, effectiveDepthFeet]);

  // Breakdown in Traditional Format: বিঘা - কাঠা
  const bighaBreakdown = useMemo(() => {
    if (sqFt <= 0) return '০ বিঘা ০ কাঠা';
    const kathaPerBigha = bighaShatakValue === 33 ? 20 : (bighaShatakValue / 1.65289);
    const bighas = Math.floor(totalKatha / kathaPerBigha);
    const remainingKathaRaw = totalKatha % kathaPerBigha;
    const kathas = Math.round(remainingKathaRaw * 100) / 100;

    const parts: string[] = [];
    if (bighas > 0) parts.push(`${bighas} বিঘা`);
    if (kathas > 0) parts.push(`${Utils.toCleanString(kathas)} কাঠা`);

    if (parts.length === 0) return bighas > 0 ? `${bighas} বিঘা` : '০ কাঠা';
    return parts.join(' ');
  }, [sqFt, totalKatha, bighaShatakValue]);

  // Billing Calculation
  const rateValue = Utils.calculateFromString(ratePerUnit);
  const calculatedTotalBill = useMemo(() => {
    if (rateValue <= 0 || sqFt <= 0) return 0;
    switch (rateUnit) {
      case 'bigha': return totalBighaCustom * rateValue;
      case 'shatak': return totalShatak * rateValue;
      case 'katha': return totalKatha * rateValue;
      case 'acre': return totalAcre * rateValue;
      case 'cft': return totalCft * rateValue;
      default: return totalBighaCustom * rateValue;
    }
  }, [rateValue, sqFt, rateUnit, totalBighaCustom, totalShatak, totalKatha, totalAcre, totalCft]);

  // Multi-plot helpers
  const handleAddPlot = () => {
    setMultiPlots(prev => [
      ...prev,
      { id: Date.now().toString(), name: `প্লট ${prev.length + 1}`, length: '', width: '', directShatak: '' }
    ]);
  };

  const handleRemovePlot = (id: string) => {
    if (multiPlots.length <= 1) return;
    setMultiPlots(prev => prev.filter(p => p.id !== id));
  };

  const handleUpdatePlot = (id: string, field: 'name' | 'length' | 'width' | 'directShatak', value: string) => {
    setMultiPlots(prev => prev.map(p => (p.id === id ? { ...p, [field]: value } : p)));
  };

  // Reset inputs for current tab
  const handleResetCurrent = () => {
    if (activeTab === 'gps_polygon') {
      handleClearAllGpsPoints();
    } else if (activeTab === 'quadrilateral') {
      setQuadNorth('');
      setQuadSouth('');
      setQuadEast('');
      setQuadWest('');
      setQuadDiagonal('');
    } else if (activeTab === 'triangle') {
      setTriA('');
      setTriB('');
      setTriC('');
      setTriBase('');
      setTriHeight('');
    } else if (activeTab === 'rectangle') {
      setRectLength('');
      setRectWidth('');
    } else if (activeTab === 'circle') {
      setCircleRadius('');
      setEllipseMajor('');
      setEllipseMinor('');
    } else if (activeTab === 'multi_plot') {
      setMultiPlots([
        { id: '1', name: 'প্লট ১', length: '', width: '', directShatak: '' },
        { id: '2', name: 'প্লট ২', length: '', width: '', directShatak: '' }
      ]);
    } else if (activeTab === 'converter') {
      setConverterInput('1');
    }
    setRatePerUnit('');
  };

  // Save current measurement to saved records
  const handleSaveRecord = () => {
    if (sqFt <= 0) return;
    const newRecord: SavedLandMeasurement = {
      id: Date.now().toString(),
      customerName: customerName.trim() || 'সাধারণ পরিমাপ',
      plotInfo: plotNumber.trim() || `প্লট #${savedRecords.length + 1}`,
      date: new Date().toISOString().split('T')[0],
      shapeType: getShapeLabel(activeTab),
      totalSqFt: sqFt,
      totalShatak,
      bighaText: bighaBreakdown,
      ratePerUnit: rateValue > 0 ? rateValue : undefined,
      rateUnit: rateValue > 0 ? rateUnit : undefined,
      totalBill: calculatedTotalBill > 0 ? calculatedTotalBill : undefined,
      detailsNote: calculatedSqFt.formulaNote,
      pointsCount: activeTab === 'gps_polygon' ? gpsPoints.length : undefined
    };

    setSavedRecords(prev => [newRecord, ...prev]);
    showToast('পরিমাপ রেকর্ড সফলভাবে সংরক্ষিত হয়েছে!', 'success');
  };

  // Copy result summary
  const handleCopySummary = () => {
    const lines = [
      `🌾 জমি / মাঠের পরিমাপ বিবরণ`,
      customerName ? `গ্রাহক: ${customerName}` : '',
      plotNumber ? `দাগ/প্লট: ${plotNumber}` : '',
      `পদ্ধতি: ${getShapeLabel(activeTab)}`,
      `মোট ক্ষেত্রফল: ${Utils.toCleanString(sqFt)} বর্গফুট`,
      `শতক/শতাংশ: ${Utils.toCleanString(totalShatak)} শতক`,
      `বিঘা-কাঠা: ${bighaBreakdown}`,
      `একর: ${Utils.toCleanString(totalAcre)} একর`,
      `ঘনফুট (CFT): ${Utils.toCleanString(totalCft)} CFT${effectiveDepthFeet !== 1 ? ` (${Utils.toCleanString(depthValue)} ${cftDepthUnit === 'inch' ? 'ইঞ্চি' : 'ফুট'} গভীরতায়)` : ''}`,
      calculatedSqFt.perimeterFeet > 0 ? `মোট সীমানা (Perimeter): ${Utils.toCleanString(calculatedSqFt.perimeterFeet)} ফুট` : '',
      calculatedTotalBill > 0 ? `কাজের রেট: ৳${Utils.toCleanString(rateValue)}/${getRateUnitLabel(rateUnit)} | মোট বিল: ৳${Utils.toCleanString(calculatedTotalBill)}` : '',
      `তারিখ: ${new Date().toLocaleDateString('bn-BD')}`
    ].filter(Boolean);

    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  // Send to Hisab Book
  const handleSendToHisabBook = () => {
    if (!onAddToHisab) return;
    const details = `${workDetails} (${getShapeLabel(activeTab)}: ${Utils.toCleanString(totalShatak)} শতক / ${bighaBreakdown}${plotNumber ? ` - দাগ: ${plotNumber}` : ''})`;
    onAddToHisab({
      name: customerName.trim(),
      workDetails: details,
      qty: rateUnit === 'cft' ? Math.round(totalCft * 100) / 100 : (Math.round(totalBighaCustom * 100) / 100 || Math.round(totalShatak * 100) / 100),
      rate: rateValue,
      bill: Math.round(calculatedTotalBill)
    });
  };

  function getShapeLabel(mode: ShapeMode): string {
    switch (mode) {
      case 'gps_polygon': return 'জিপিএস পলিগন (GPS)';
      case 'quadrilateral': return '৪ কোণা জমি';
      case 'triangle': return 'ত্রিভুজ জমি';
      case 'rectangle': return 'আয়তাকার জমি';
      case 'circle': return 'বৃত্তাকার/পুকুর';
      case 'multi_plot': return 'একাধিক প্লট যোগ';
      case 'converter': return 'একক রূপান্তর';
    }
  }

  function getRateUnitLabel(rUnit: RateUnit): string {
    switch (rUnit) {
      case 'bigha': return 'বিঘা';
      case 'shatak': return 'শতক';
      case 'katha': return 'কাঠা';
      case 'acre': return 'একর';
      case 'cft': return 'সিএফটি (CFT)';
    }
  }

  const unitLabels: Record<UnitLength, string> = {
    feet: 'ফুট (Feet)',
    haat: 'হাত (Haat)',
    gaj: 'গজ (Yard)',
    meter: 'মিটার (Meter)',
    link: 'লিংক / কড়ি (Chain Link)'
  };

  return (
    <div className="h-screen h-[100dvh] bg-[#E1E8EF] flex flex-col max-w-xl sm:max-w-2xl mx-auto shadow-2xl relative overflow-hidden text-slate-800">
      {/* Top Header */}
      <header className="bg-[#1B5E20] text-white px-3 sm:px-4 py-2.5 shadow-md flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center space-x-2.5">
          <button
            onClick={onBack}
            className="p-1.5 -ml-1 rounded-full hover:bg-white/15 text-white active:scale-95 transition-all"
            title="ফিরে যান"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-base sm:text-lg font-bold leading-tight flex items-center gap-1.5">
              <Compass size={18} className="text-emerald-300 animate-pulse" />
              <span>জমি বা মাঠের পরিমাপ</span>
            </h1>
            <p className="text-[11px] text-emerald-100/80 leading-none">
              GPS Polygon & Area Measurement Calculator
            </p>
          </div>
        </div>

        {/* Top Right Actions */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setShowSavedModal(true)}
            className="flex items-center space-x-1 bg-emerald-800/80 hover:bg-emerald-700/80 px-2.5 py-1 rounded-lg text-xs font-medium border border-emerald-400/30 text-emerald-100 transition-colors shadow-xs"
            title="সংরক্ষিত পরিমাপসমূহ"
          >
            <BookOpen size={14} />
            <span>রেকর্ড ({savedRecords.length})</span>
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-lg hover:bg-white/15 transition-colors ${showSettings ? 'bg-white/20 text-white' : 'text-emerald-100'}`}
            title="পরিমাপ সেটিংস"
          >
            <Sliders size={18} />
          </button>
        </div>
      </header>

      {/* In-App Toast Banner */}
      {inAppToast && (
        <div
          className={`px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-xs transition-all animate-in slide-in-from-top-1 duration-200 ${
            inAppToast.type === 'success'
              ? 'bg-emerald-700 text-white'
              : inAppToast.type === 'warning'
              ? 'bg-amber-600 text-white'
              : 'bg-slate-800 text-white'
          }`}
        >
          <div className="flex items-center space-x-2">
            <span className="text-sm">
              {inAppToast.type === 'success' ? '✓' : inAppToast.type === 'warning' ? '⚠' : 'ℹ'}
            </span>
            <span>{inAppToast.message}</span>
          </div>
          <button
            onClick={() => setInAppToast(null)}
            className="text-white/80 hover:text-white text-xs px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Settings Bar Dropdown */}
      {showSettings && (
        <div className="bg-emerald-900 text-white px-4 py-2.5 border-b border-emerald-700 text-xs shadow-inner flex flex-wrap items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center space-x-2">
            <span className="text-emerald-200">ইনপুট মাপার একক:</span>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as UnitLength)}
              className="bg-emerald-950 border border-emerald-500/50 rounded-md px-2 py-1 text-emerald-100 font-medium focus:outline-hidden focus:ring-1 focus:ring-emerald-300"
            >
              <option value="feet">ফুট (Feet - গজ/ফিতা)</option>
              <option value="haat">হাত (১ হাত = ১.৫ ফুট)</option>
              <option value="gaj">গজ (১ গজ = ৩ ফুট)</option>
              <option value="meter">মিটার (১ মি = ৩.২৮ ফুট)</option>
              <option value="link">লিংক / কড়ি (১ লিংক = ০.৬৬ ফুট)</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-emerald-200">১ বিঘা =</span>
            <input
              type="number"
              value={bighaShatakValue}
              onChange={(e) => setBighaShatakValue(Math.max(1, Number(e.target.value) || 33))}
              className="w-14 bg-emerald-950 border border-emerald-500/50 rounded-md px-2 py-1 text-center text-emerald-100 font-bold focus:outline-hidden focus:ring-1 focus:ring-emerald-300"
            />
            <span className="text-emerald-200">শতক (স্ট্যান্ডার্ড ৩৩)</span>
          </div>
        </div>
      )}

      {/* Horizontal Nav Tabs for Calculation Methods */}
      <div className="bg-white border-b border-slate-200 px-2 py-1.5 flex items-center space-x-1.5 overflow-x-auto no-scrollbar shrink-0 shadow-xs">
        <button
          onClick={() => setActiveTab('gps_polygon')}
          className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'gps_polygon'
              ? 'bg-[#1B5E20] text-white shadow-xs'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-300/80 hover:bg-emerald-100'
          }`}
        >
          <Navigation size={14} className={activeTab === 'gps_polygon' ? 'text-emerald-300' : 'text-emerald-700'} />
          <span>জিপিএস পলিগন (GPS)</span>
        </button>

        <button
          onClick={() => setActiveTab('quadrilateral')}
          className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'quadrilateral'
              ? 'bg-[#1B5E20] text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Square size={14} />
          <span>৪ কোণা জমি</span>
        </button>

        <button
          onClick={() => setActiveTab('triangle')}
          className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'triangle'
              ? 'bg-[#1B5E20] text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Triangle size={14} />
          <span>৩ কোণা জমি</span>
        </button>

        <button
          onClick={() => setActiveTab('rectangle')}
          className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'rectangle'
              ? 'bg-[#1B5E20] text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Square size={14} className="rotate-45" />
          <span>আয়তাকার / বর্গাকার</span>
        </button>

        <button
          onClick={() => setActiveTab('circle')}
          className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'circle'
              ? 'bg-[#1B5E20] text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Circle size={14} />
          <span>বৃত্তাকার / পুকুর</span>
        </button>

        <button
          onClick={() => setActiveTab('multi_plot')}
          className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'multi_plot'
              ? 'bg-[#1B5E20] text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Layers size={14} />
          <span>একাধিক প্লট যোগ</span>
        </button>

        <button
          onClick={() => setActiveTab('converter')}
          className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
            activeTab === 'converter'
              ? 'bg-[#1B5E20] text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Calculator size={14} />
          <span>একক রূপান্তর</span>
        </button>
      </div>

      {/* Main Scrollable Content */}
      <main className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-3 pb-24">
        {/* Customer & Plot Info */}
        <div className="bg-white rounded-xl p-3 border border-slate-200/90 shadow-xs space-y-2">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1 mb-1">
                <User size={12} className="text-emerald-700" />
                <span>কৃষক / জমির মালিক</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="মালিকের নাম লিখুন"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-emerald-600 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 flex items-center gap-1 mb-1">
                <MapPin size={12} className="text-emerald-700" />
                <span>দাগ / খতিয়ান / প্লট নং</span>
              </label>
              <input
                type="text"
                value={plotNumber}
                onChange={(e) => setPlotNumber(e.target.value)}
                placeholder="দাগ বা প্লট নম্বর"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-emerald-600 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* TAB 0: GPS POLYGON LAND MEASUREMENT (FEATURED) */}
        {activeTab === 'gps_polygon' && (
          <div className="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-xs space-y-3">
            {/* Header with GPS Status and Layer Switch */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                <div>
                  <h2 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <span>জিপিএস পলিগন সার্ভে (GPS Survey)</span>
                  </h2>
                  <p className="text-[10.5px] text-slate-500">
                    ম্যাপে ট্যাপ করে বা মাঠে হেঁটে জমির সীমানা চিহ্নিত করুন
                  </p>
                </div>
              </div>

              {/* Map Layer Switch, Refresh & Fullscreen */}
              <div className="flex flex-wrap items-center gap-1.5">
                <div className="bg-slate-100 p-0.5 rounded-lg flex text-[11px] shadow-xs">
                  <button
                    onClick={() => {
                      setMapLayerType('google_hybrid');
                      showToast('স্যাটেলাইট ম্যাপ মোড চালু হয়েছে', 'info');
                    }}
                    className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                      mapLayerType === 'google_hybrid' ? 'bg-[#1B5E20] text-white shadow-xs' : 'text-slate-600'
                    }`}
                    title="গুগল হাইব্রিড স্যাটেলাইট"
                  >
                    স্যাটেলাইট
                  </button>
                  <button
                    onClick={() => {
                      setMapLayerType('esri_sat');
                      showToast('এসরি স্যাটেলাইট মোড চালু হয়েছে', 'info');
                    }}
                    className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                      mapLayerType === 'esri_sat' ? 'bg-[#1B5E20] text-white shadow-xs' : 'text-slate-600'
                    }`}
                    title="এসরি ওয়ার্ল্ড স্যাটেলাইট"
                  >
                    এসরি
                  </button>
                  <button
                    onClick={() => {
                      setMapLayerType('osm_street');
                      showToast('স্ট্রিট ম্যাপ মোড চালু হয়েছে', 'info');
                    }}
                    className={`px-2 py-0.5 rounded-md font-semibold transition-all ${
                      mapLayerType === 'osm_street' ? 'bg-[#1B5E20] text-white shadow-xs' : 'text-slate-600'
                    }`}
                    title="স্ট্রিট ম্যাপ ভিউ"
                  >
                    ম্যাপ
                  </button>
                  <button
                    onClick={() => {
                      setMapLayerType('offline_canvas');
                      showToast('১০০% অফলাইন গ্রিড মোড চালু হয়েছে! ইন্টারনেট ছাড়া GPS পয়েন্ট নিতে পারবেন।', 'success');
                    }}
                    className={`px-2 py-0.5 rounded-md font-bold flex items-center gap-1 transition-all ${
                      mapLayerType === 'offline_canvas' ? 'bg-amber-600 text-white shadow-xs' : 'text-amber-700 hover:bg-amber-50'
                    }`}
                    title="১০০% অফলাইন মোড (ইন্টারনেট ছাড়া পরিমাপ)"
                  >
                    <WifiOff size={11} />
                    <span>অফলাইন</span>
                  </button>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setMapReloadKey(prev => prev + 1)}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
                    title="ম্যাপ রিফ্রেশ করুন"
                  >
                    <RefreshCw size={14} />
                  </button>

                  <button
                    onClick={() => setIsMapExpanded(!isMapExpanded)}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
                    title={isMapExpanded ? 'ম্যাপ ছোট করুন' : 'ম্যাপ বড় করুন'}
                  >
                    {isMapExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Offline Mode Banner when offline_canvas active */}
            {mapLayerType === 'offline_canvas' && (
              <div className="bg-amber-50 border border-amber-300/80 p-2.5 rounded-xl text-xs text-amber-900 flex items-center justify-between gap-2 shadow-xs animate-in fade-in duration-200">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-amber-200/70 text-amber-800 rounded-lg shrink-0">
                    <Radio size={16} className="animate-pulse text-amber-900" />
                  </div>
                  <div>
                    <span className="font-bold text-amber-950 block text-[11.5px]">
                      অফলাইন জিপিএস মোড সক্রিয় (No Internet Needed)
                    </span>
                    <span className="text-[10.5px] text-amber-800">
                      ইন্টারনেট ছাড়াই স্যাটেলাইট জিপিএস সিগন্যালে নিখুঁত জমি পরিমাপ ও রেখা আঁকা হচ্ছে।
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMapLayerType('google_hybrid')}
                  className="px-2 py-1 bg-amber-700 hover:bg-amber-800 text-white font-semibold text-[10.5px] rounded-lg shrink-0 transition-colors"
                >
                  অনলাইন স্যাটেলাইট
                </button>
              </div>
            )}

            {/* GPS Warning if error */}
            {gpsError && (
              <div className="bg-amber-50 border border-amber-200 p-2 rounded-lg text-xs text-amber-800 flex items-center space-x-1.5">
                <AlertCircle size={15} className="shrink-0 text-amber-600" />
                <span>{gpsError} (তবে আপনি ম্যাপে স্পর্শ করেও কোণা বসাতে পারেন)</span>
              </div>
            )}

            {/* Interactive Leaflet Map Container */}
            <div className="relative rounded-xl overflow-hidden border border-slate-300 shadow-inner bg-slate-800 min-h-[230px]">
              <div
                ref={mapContainerRef}
                id="gps-land-survey-map-container"
                className={`w-full transition-all duration-200 z-10 ${
                  isMapExpanded ? 'h-[360px]' : 'h-[230px]'
                }`}
              />

              {/* Top Map Overlay Badges */}
              <div className="absolute top-2 left-2 z-20 flex flex-wrap gap-1.5 pointer-events-none">
                <div className="bg-black/75 backdrop-blur-xs text-white text-[10.5px] px-2 py-0.5 rounded-md font-medium flex items-center gap-1 shadow-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>কোণা: {gpsPoints.length} টি</span>
                </div>
                {mapLayerType === 'offline_canvas' && (
                  <div className="bg-amber-900/85 backdrop-blur-xs text-amber-200 border border-amber-400/40 text-[10.5px] px-2 py-0.5 rounded-md font-bold flex items-center gap-1 shadow-md">
                    <WifiOff size={11} className="text-amber-300" />
                    <span>অফলাইন মোড</span>
                  </div>
                )}
                {currentGpsPos?.accuracy !== undefined && (
                  <div className="bg-black/75 backdrop-blur-xs text-emerald-300 text-[10.5px] px-2 py-0.5 rounded-md font-medium flex items-center gap-1 shadow-md">
                    <span>জিপিএস অ্যাকুরেসি: ±{Math.round(currentGpsPos.accuracy)} মি</span>
                  </div>
                )}
              </div>

              {/* Map Floating Control Buttons (Right Side) */}
              <div className="absolute top-2 right-2 z-20 flex flex-col space-y-1.5">
                <button
                  type="button"
                  onClick={handleLocateMe}
                  className="bg-white/95 hover:bg-white text-slate-800 p-2 rounded-lg shadow-md border border-slate-200/80 active:scale-95 transition-all flex items-center justify-center"
                  title="আমার বর্তমান অবস্থান (Locate Me)"
                >
                  <Crosshair size={17} className="text-blue-600" />
                </button>
                <button
                  type="button"
                  onClick={() => mapInstanceRef.current?.zoomIn()}
                  className="bg-white/95 hover:bg-white text-slate-800 p-2 rounded-lg shadow-md border border-slate-200/80 active:scale-95 transition-all flex items-center justify-center"
                  title="জুম ইন (+)"
                >
                  <Plus size={16} className="text-slate-800" />
                </button>
                <button
                  type="button"
                  onClick={() => mapInstanceRef.current?.zoomOut()}
                  className="bg-white/95 hover:bg-white text-slate-800 p-2 rounded-lg shadow-md border border-slate-200/80 active:scale-95 transition-all flex items-center justify-center"
                  title="জুম আউট (-)"
                >
                  <Minus size={16} className="text-slate-800" />
                </button>
                {gpsPoints.length >= 2 && (
                  <button
                    type="button"
                    onClick={handleFitPolygon}
                    className="bg-white/95 hover:bg-white text-slate-800 p-2 rounded-lg shadow-md border border-slate-200/80 active:scale-95 transition-all flex items-center justify-center"
                    title="পুরো পলিগন ভিউ (Fit Polygon)"
                  >
                    <Maximize2 size={17} className="text-emerald-700" />
                  </button>
                )}
              </div>

              {/* Bottom Quick Map Instructions */}
              <div className="absolute bottom-1.5 left-2 right-2 z-20 pointer-events-none">
                <div className="bg-black/65 backdrop-blur-xs text-white text-[10px] text-center px-2 py-0.5 rounded-md shadow-xs">
                  💡 জমির কোণাগুলোতে স্পর্শ করে পিন বসান। পিন ধরে সরিয়ে অবস্থান সূক্ষ্ম করতে পারেন।
                </div>
              </div>
            </div>

            {/* GPS Polygon Action Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {/* 1. Add Current GPS Point */}
              <button
                onClick={handleAddCurrentLocationPoint}
                className="flex items-center justify-center space-x-1.5 bg-[#1B5E20] hover:bg-[#144718] text-white py-2 px-2.5 rounded-lg text-xs font-bold shadow-xs active:scale-98 transition-all"
              >
                <Plus size={14} className="text-emerald-300" />
                <span>বর্তমান GPS পয়েন্ট</span>
              </button>

              {/* 2. Walk Tracking Mode */}
              <button
                type="button"
                onClick={() => {
                  if (!isGpsTracking) {
                    setIsGpsTracking(true);
                    showToast('হেঁটে অটো ট্র্যাকিং চালু হয়েছে! মাঠের সীমানা বরাবর হাঁটুন...', 'success');
                  } else {
                    setIsGpsTracking(false);
                    showToast('ট্র্যাকিং সমাপ্ত ও থামানো হয়েছে।', 'info');
                  }
                }}
                className={`flex items-center justify-center space-x-1.5 py-2 px-2.5 rounded-lg text-xs font-bold shadow-xs active:scale-98 transition-all ${
                  isGpsTracking
                    ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                    : 'bg-emerald-800 hover:bg-emerald-900 text-white'
                }`}
              >
                {isGpsTracking ? (
                  <>
                    <StopIcon size={14} />
                    <span>ট্র্যাকিং থামান</span>
                  </>
                ) : (
                  <>
                    <Footprints size={14} className="text-emerald-300" />
                    <span>হেঁটে অটো ট্র্যাক</span>
                  </>
                )}
              </button>

              {/* 3. Undo Last Point */}
              <button
                type="button"
                onClick={handleUndoLastPoint}
                disabled={gpsPoints.length === 0}
                className="flex items-center justify-center space-x-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 py-2 px-2 rounded-lg text-xs font-semibold border border-slate-300 transition-colors"
              >
                <Undo size={14} />
                <span>শেষ পয়েন্ট মুছুন</span>
              </button>

              {/* 4. Clear All */}
              <button
                type="button"
                onClick={handleClearAllGpsPoints}
                disabled={gpsPoints.length === 0}
                className="flex items-center justify-center space-x-1 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-700 py-2 px-2 rounded-lg text-xs font-semibold border border-rose-200 transition-colors cursor-pointer"
              >
                <Trash2 size={14} />
                <span>সব মুছুন</span>
              </button>
            </div>

            {/* Polygon Sides and Coordinate Breakdown (Collapsible / List) */}
            {gpsPoints.length > 0 && (
              <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1">
                    <Navigation size={13} className="text-emerald-700" />
                    <span>পলিগন কোণা ও বাহুর মাপ ({gpsPoints.length}টি পয়েন্ট):</span>
                  </span>
                  {calculatedSqFt.perimeterFeet > 0 && (
                    <span className="text-[11px] text-emerald-800 font-semibold bg-emerald-100 px-2 py-0.5 rounded-full">
                      মোট সীমানা: {Utils.toCleanString(calculatedSqFt.perimeterFeet)} ফুট ({Utils.toCleanString(calculatedSqFt.perimeterFeet / 3.28084)} মিটার)
                    </span>
                  )}
                </div>

                <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                  {gpsPoints.map((pt, idx) => {
                    const nextIdx = (idx + 1) % gpsPoints.length;
                    const nextPt = gpsPoints[nextIdx];
                    const distM = gpsPoints.length > 1 ? haversineDistanceMeters(pt.lat, pt.lng, nextPt.lat, nextPt.lng) : 0;
                    const distFt = distM * 3.28084;

                    return (
                      <div
                        key={pt.id}
                        className="flex items-center justify-between bg-white px-2 py-1 rounded-lg border border-slate-200 text-[11px]"
                      >
                        <div className="flex items-center space-x-1.5">
                          <span className="w-4 h-4 rounded-full bg-slate-800 text-white text-[9px] font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="text-slate-600 font-mono text-[10px]">
                            {pt.lat.toFixed(5)}, {pt.lng.toFixed(5)}
                          </span>
                        </div>

                        {gpsPoints.length > 1 && (
                          <div className="text-emerald-800 font-semibold text-[10.5px]">
                            বাহু {idx + 1} ➔ {nextIdx + 1}: <span className="font-bold">{Utils.toCleanString(distFt)}</span> ফুট ({Utils.toCleanString(distM)} মি)
                          </div>
                        )}

                        <button
                          onClick={() => setGpsPoints(prev => prev.filter(p => p.id !== pt.id))}
                          className="text-slate-400 hover:text-rose-600 p-0.5 transition-colors"
                          title="এই পয়েন্টটি বাদ দিন"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 1: Quadrilateral (৪ বাহু ও কর্ণ) */}
        {activeTab === 'quadrilateral' && (
          <div className="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                <h2 className="text-xs sm:text-sm font-bold text-slate-800">
                  ৪ কোণা জমির পরিমাপ ({unitLabels[unit]})
                </h2>
              </div>
              <button
                onClick={handleResetCurrent}
                className="text-[11px] text-slate-500 hover:text-rose-600 flex items-center gap-1 transition-colors"
              >
                <RotateCcw size={12} />
                <span>রিসেট</span>
              </button>
            </div>

            {/* Visual Field Preview Card */}
            <div className="relative bg-gradient-to-b from-emerald-50/60 to-emerald-100/40 rounded-xl p-4 border border-emerald-200/60 flex flex-col items-center justify-center my-1">
              <div className="w-full max-w-[280px] h-[140px] border-2 border-dashed border-emerald-600/60 bg-emerald-500/10 rounded-lg relative flex items-center justify-center">
                {/* North (Top) */}
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-white px-2 py-0.5 rounded-full border border-emerald-500 text-[10.5px] font-bold text-emerald-900 shadow-xs">
                  উত্তর: {quadNorth || '০'} {unit === 'feet' ? 'ফুট' : unit}
                </div>
                {/* South (Bottom) */}
                <div className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 bg-white px-2 py-0.5 rounded-full border border-emerald-500 text-[10.5px] font-bold text-emerald-900 shadow-xs">
                  দক্ষিণ: {quadSouth || '০'} {unit === 'feet' ? 'ফুট' : unit}
                </div>
                {/* West (Left) */}
                <div className="absolute -left-3.5 top-1/2 -translate-y-1/2 -rotate-90 bg-white px-2 py-0.5 rounded-full border border-emerald-500 text-[10.5px] font-bold text-emerald-900 shadow-xs">
                  পশ্চিম: {quadWest || '০'}
                </div>
                {/* East (Right) */}
                <div className="absolute -right-3.5 top-1/2 -translate-y-1/2 rotate-90 bg-white px-2 py-0.5 rounded-full border border-emerald-500 text-[10.5px] font-bold text-emerald-900 shadow-xs">
                  পূর্ব: {quadEast || '০'}
                </div>
                {/* Diagonal line */}
                {quadDiagonal && (
                  <div className="text-[10px] font-bold bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded border border-amber-400 z-10 shadow-xs">
                    কর্ণ: {quadDiagonal} {unit}
                  </div>
                )}
              </div>
            </div>

            {/* 4 Sides Inputs */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  ১. উত্তর বাহুর দৈর্ঘ্য (North)
                </label>
                <input
                  type="text"
                  value={quadNorth}
                  onChange={(e) => setQuadNorth(e.target.value)}
                  placeholder="উদাঃ 120 বা 60+40"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  ২. দক্ষিণ বাহুর দৈর্ঘ্য (South)
                </label>
                <input
                  type="text"
                  value={quadSouth}
                  onChange={(e) => setQuadSouth(e.target.value)}
                  placeholder="উদাঃ 118"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  ৩. পূর্ব বাহুর প্রস্থ (East)
                </label>
                <input
                  type="text"
                  value={quadEast}
                  onChange={(e) => setQuadEast(e.target.value)}
                  placeholder="উদাঃ 85"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  ৪. পশ্চিম বাহুর প্রস্থ (West)
                </label>
                <input
                  type="text"
                  value={quadWest}
                  onChange={(e) => setQuadWest(e.target.value)}
                  placeholder="উদাঃ 80"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Optional Diagonal Input for 100% Precision */}
            <div className="bg-amber-50/70 border border-amber-200/80 rounded-lg p-2.5 space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                  <span>মাঝের কর্ণ / ডায়াগোনাল (ঐচ্ছিক - ১০০% নির্ভুলতার জন্য)</span>
                </label>
                <span className="text-[10px] text-amber-800 bg-amber-200/60 px-1.5 py-0.2 rounded font-medium">
                  Heron's Formula
                </span>
              </div>
              <input
                type="text"
                value={quadDiagonal}
                onChange={(e) => setQuadDiagonal(e.target.value)}
                placeholder="উত্তর-পশ্চিম থেকে দক্ষিণ-পূর্ব কোণার দূরত্ব"
                className="w-full bg-white border border-amber-300 rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-900 placeholder-amber-700/50 focus:border-amber-600 focus:outline-hidden"
              />
              <p className="text-[10px] text-amber-800/90 leading-tight">
                * কর্ণ না লিখলে প্রচলিত গড় পদ্ধতিতে পরিমাপ হবে। কর্ণ দিলে হেরনের সূত্রে ২টি ত্রিভুজে বিভক্ত করে শতভাগ নিখুঁত পরিমাপ আসবে।
              </p>
            </div>
          </div>
        )}

        {/* TAB 2: Triangle (৩ কোণা জমি) */}
        {activeTab === 'triangle' && (
          <div className="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                <h2 className="text-xs sm:text-sm font-bold text-slate-800">
                  ৩ কোণা / ত্রিভুজ জমি ({unitLabels[unit]})
                </h2>
              </div>
              <button
                onClick={handleResetCurrent}
                className="text-[11px] text-slate-500 hover:text-rose-600 flex items-center gap-1 transition-colors"
              >
                <RotateCcw size={12} />
                <span>রিসেট</span>
              </button>
            </div>

            <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs">
              <button
                onClick={() => setTriMode('3sides')}
                className={`flex-1 py-1 text-center font-medium rounded-md transition-all ${
                  triMode === '3sides' ? 'bg-white text-emerald-800 font-bold shadow-xs' : 'text-slate-600'
                }`}
              >
                ৩টি বাহুর মাপ (হেরন সূত্র)
              </button>
              <button
                onClick={() => setTriMode('baseHeight')}
                className={`flex-1 py-1 text-center font-medium rounded-md transition-all ${
                  triMode === 'baseHeight' ? 'bg-white text-emerald-800 font-bold shadow-xs' : 'text-slate-600'
                }`}
              >
                ভূমি ও উচ্চতা (Base × Height)
              </button>
            </div>

            {triMode === '3sides' ? (
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    বাহু ১ (Side A)
                  </label>
                  <input
                    type="text"
                    value={triA}
                    onChange={(e) => setTriA(e.target.value)}
                    placeholder="উদাঃ 80"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    বাহু ২ (Side B)
                  </label>
                  <input
                    type="text"
                    value={triB}
                    onChange={(e) => setTriB(e.target.value)}
                    placeholder="উদাঃ 100"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    বাহু ৩ (Side C)
                  </label>
                  <input
                    type="text"
                    value={triC}
                    onChange={(e) => setTriC(e.target.value)}
                    placeholder="উদাঃ 120"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    জমির ভূমি / বেস (Base)
                  </label>
                  <input
                    type="text"
                    value={triBase}
                    onChange={(e) => setTriBase(e.target.value)}
                    placeholder="উদাঃ 150"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    লম্ব উচ্চতা (Height)
                  </label>
                  <input
                    type="text"
                    value={triHeight}
                    onChange={(e) => setTriHeight(e.target.value)}
                    placeholder="উদাঃ 75"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Rectangle / Square */}
        {activeTab === 'rectangle' && (
          <div className="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                <h2 className="text-xs sm:text-sm font-bold text-slate-800">
                  আয়তাকার বা বর্গাকার জমি ({unitLabels[unit]})
                </h2>
              </div>
              <button
                onClick={handleResetCurrent}
                className="text-[11px] text-slate-500 hover:text-rose-600 flex items-center gap-1 transition-colors"
              >
                <RotateCcw size={12} />
                <span>রিসেট</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  জমির দৈর্ঘ্য (Length)
                </label>
                <input
                  type="text"
                  value={rectLength}
                  onChange={(e) => setRectLength(e.target.value)}
                  placeholder="উদাঃ 140"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  জমির প্রস্থ (Width)
                </label>
                <input
                  type="text"
                  value={rectWidth}
                  onChange={(e) => setRectWidth(e.target.value)}
                  placeholder="উদাঃ 65"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                />
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Circle / Pond / Ellipse */}
        {activeTab === 'circle' && (
          <div className="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                <h2 className="text-xs sm:text-sm font-bold text-slate-800">
                  বৃত্তাকার বা উপবৃত্তাকার জমি / পুকুর ({unitLabels[unit]})
                </h2>
              </div>
              <button
                onClick={handleResetCurrent}
                className="text-[11px] text-slate-500 hover:text-rose-600 flex items-center gap-1 transition-colors"
              >
                <RotateCcw size={12} />
                <span>রিসেট</span>
              </button>
            </div>

            <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs">
              <button
                onClick={() => setCircleMode('circle')}
                className={`flex-1 py-1 text-center font-medium rounded-md transition-all ${
                  circleMode === 'circle' ? 'bg-white text-emerald-800 font-bold shadow-xs' : 'text-slate-600'
                }`}
              >
                গোল বৃত্তাকার জমি
              </button>
              <button
                onClick={() => setCircleMode('ellipse')}
                className={`flex-1 py-1 text-center font-medium rounded-md transition-all ${
                  circleMode === 'ellipse' ? 'bg-white text-emerald-800 font-bold shadow-xs' : 'text-slate-600'
                }`}
              >
                ডিম্বাকৃতি / পুকুর (উপবৃত্ত)
              </button>
            </div>

            {circleMode === 'circle' ? (
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  বৃত্তের ব্যাসার্ধ / কেন্দ্র থেকে সীমানা (Radius r)
                </label>
                <input
                  type="text"
                  value={circleRadius}
                  onChange={(e) => setCircleRadius(e.target.value)}
                  placeholder="উদাঃ 45"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    লম্বা দিক বা বড় ব্যাস (Major Diameter)
                  </label>
                  <input
                    type="text"
                    value={ellipseMajor}
                    onChange={(e) => setEllipseMajor(e.target.value)}
                    placeholder="উদাঃ 120"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    খাটো দিক বা ছোট ব্যাস (Minor Diameter)
                  </label>
                  <input
                    type="text"
                    value={ellipseMinor}
                    onChange={(e) => setEllipseMinor(e.target.value)}
                    placeholder="উদাঃ 70"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: Multi Plot Sum (একাধিক প্লট যোগ) */}
        {activeTab === 'multi_plot' && (
          <div className="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                <h2 className="text-xs sm:text-sm font-bold text-slate-800">
                  একাধিক প্লট / টুকরো জমি একত্রিত যোগ
                </h2>
              </div>
              <button
                onClick={handleAddPlot}
                className="text-xs text-white bg-emerald-800 hover:bg-emerald-900 px-2.5 py-1 rounded-lg flex items-center gap-1 font-semibold transition-colors shadow-xs"
              >
                <Plus size={13} />
                <span>নতুন প্লট যোগ</span>
              </button>
            </div>

            <div className="space-y-2 pt-1">
              {multiPlots.map((plot, index) => (
                <div key={plot.id} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={plot.name}
                      onChange={(e) => handleUpdatePlot(plot.id, 'name', e.target.value)}
                      className="text-xs font-bold text-slate-800 bg-transparent border-b border-slate-300 focus:border-emerald-600 focus:outline-hidden px-1"
                    />
                    {multiPlots.length > 1 && (
                      <button
                        onClick={() => handleRemovePlot(plot.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                        title="প্লট মুছুন"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10.5px] text-slate-600 block mb-0.5">দৈর্ঘ্য ({unit})</label>
                      <input
                        type="text"
                        value={plot.length}
                        onChange={(e) => handleUpdatePlot(plot.id, 'length', e.target.value)}
                        placeholder="উদাঃ 100"
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold focus:border-emerald-600 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="text-[10.5px] text-slate-600 block mb-0.5">প্রস্থ ({unit})</label>
                      <input
                        type="text"
                        value={plot.width}
                        onChange={(e) => handleUpdatePlot(plot.id, 'width', e.target.value)}
                        placeholder="উদাঃ 50"
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold focus:border-emerald-600 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="text-[10.5px] text-slate-600 block mb-0.5">বা সরাসরি শতক</label>
                      <input
                        type="text"
                        value={plot.directShatak}
                        onChange={(e) => handleUpdatePlot(plot.id, 'directShatak', e.target.value)}
                        placeholder="উদাঃ 12.5"
                        className="w-full bg-emerald-50/50 border border-emerald-200 rounded-lg px-2 py-1 text-xs font-semibold text-emerald-900 focus:border-emerald-600 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: Converter (একক রূপান্তরকারী) */}
        {activeTab === 'converter' && (
          <div className="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                <h2 className="text-xs sm:text-sm font-bold text-slate-800">
                  ইউনিভার্সাল জমি একক রূপান্তরকারী (Unit Converter)
                </h2>
              </div>
              <button
                onClick={handleResetCurrent}
                className="text-[11px] text-slate-500 hover:text-rose-600 flex items-center gap-1 transition-colors"
              >
                <RotateCcw size={12} />
                <span>রিসেট</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  রূপান্তরের পরিমাণ / মান
                </label>
                <input
                  type="text"
                  value={converterInput}
                  onChange={(e) => setConverterInput(e.target.value)}
                  placeholder="উদাঃ 1 বা 33"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm font-bold text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  বর্তমান একক
                </label>
                <select
                  value={converterUnit}
                  onChange={(e) => setConverterUnit(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-hidden"
                >
                  <option value="shatak">শতক / শতাংশ (Shatak)</option>
                  <option value="katha">কাঠা (Katha)</option>
                  <option value="bigha">বিঘা (Bigha - ৩৩ শতক)</option>
                  <option value="acre">একর (Acre - ১০০ শতক)</option>
                  <option value="hectare">হেক্টর (Hectare)</option>
                  <option value="chhatak">ছটাক (Chhatak)</option>
                  <option value="ganda">গণ্ডা (Ganda)</option>
                  <option value="kani">কানি (Kani - ৪০ শতক)</option>
                  <option value="sqft">বর্গফুট (Sq. Feet)</option>
                  <option value="cft">ঘনফুট (CFT / Cu.Ft)</option>
                  <option value="sqmeter">বর্গমিটার (Sq. Meter)</option>
                  <option value="sqyard">বর্গগজ (Sq. Yard)</option>
                  <option value="sqlink">বর্গলিংক (Sq. Link)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* RESULTS & BREAKDOWN DISPLAY CARD */}
        <div className="bg-gradient-to-br from-[#1B5E20] to-[#0D3811] text-white rounded-2xl p-4 shadow-lg border border-emerald-600/40 relative overflow-hidden space-y-3.5">
          <div className="flex items-center justify-between border-b border-emerald-400/20 pb-2">
            <span className="text-xs font-semibold text-emerald-200 flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-emerald-400" />
              <span>পরিমাপের ফলাফল ({getShapeLabel(activeTab)})</span>
            </span>
            <span className="text-[10.5px] bg-emerald-800/80 text-emerald-100 px-2 py-0.5 rounded-full border border-emerald-400/30">
              {calculatedSqFt.formulaNote}
            </span>
          </div>

          {/* Primary Big Numbers */}
          <div className="grid grid-cols-2 gap-3 text-center">
            {/* 1. Total Shatak */}
            <div className="bg-black/20 backdrop-blur-xs p-3 rounded-xl border border-emerald-400/20">
              <span className="text-[11px] text-emerald-200 font-medium block mb-0.5">মোট শতক / শতাংশ</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {Utils.toCleanString(totalShatak)}
                <span className="text-xs font-normal ml-1 text-emerald-200">শতক</span>
              </div>
            </div>

            {/* 2. Bigha - Katha */}
            <div className="bg-black/20 backdrop-blur-xs p-3 rounded-xl border border-emerald-400/20">
              <span className="text-[11px] text-emerald-200 font-medium block mb-0.5">বিঘা - কাঠা</span>
              <div className="text-lg sm:text-xl font-bold text-amber-300 leading-tight flex items-center justify-center min-h-[36px]">
                {bighaBreakdown}
              </div>
            </div>
          </div>

          {/* Detailed All Units Table */}
          <div className="bg-black/30 rounded-xl p-2.5 border border-emerald-400/15 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-bold text-emerald-300 block">অন্যান্য এককে জমির পরিমাণ:</span>
              <button
                type="button"
                onClick={() => setShowCftDepthSetting(!showCftDepthSetting)}
                className="text-[10px] text-amber-300 hover:text-amber-200 underline font-medium flex items-center gap-1"
                title="মাটি কাটা / ভরাট / গভীরতা পরিবর্তন করুন"
              >
                <span>⚙️ গভীরতা/CFT সেটিং</span>
              </button>
            </div>

            {showCftDepthSetting && (
              <div className="bg-emerald-950/80 p-2 rounded-lg border border-amber-400/30 flex items-center justify-between gap-2 text-xs animate-in fade-in duration-150">
                <span className="text-[10.5px] text-emerald-200 font-medium">মাটি/ভরাট গভীরতা:</span>
                <div className="flex items-center space-x-1.5">
                  <input
                    type="text"
                    value={cftDepth}
                    onChange={(e) => setCftDepth(e.target.value)}
                    placeholder="1"
                    className="w-16 bg-black/50 border border-emerald-400/40 rounded px-2 py-1 text-xs font-bold text-amber-300 text-center focus:outline-hidden"
                  />
                  <select
                    value={cftDepthUnit}
                    onChange={(e) => setCftDepthUnit(e.target.value as 'feet' | 'inch')}
                    className="bg-black/50 border border-emerald-400/40 rounded px-1.5 py-1 text-[11px] font-semibold text-emerald-100 focus:outline-hidden"
                  >
                    <option value="feet">ফুট (ft)</option>
                    <option value="inch">ইঞ্চি (in)</option>
                  </select>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-emerald-950/40 p-1.5 rounded-lg text-center">
                <span className="text-[10px] text-emerald-300 block">বর্গফুট (Sq.Ft)</span>
                <span className="font-bold text-white text-[11.5px]">{Utils.toCleanString(sqFt)}</span>
              </div>
              <div className="bg-emerald-950/40 p-1.5 rounded-lg text-center">
                <span className="text-[10px] text-emerald-300 block">কাঠা (Katha)</span>
                <span className="font-bold text-white text-[11.5px]">{Utils.toCleanString(totalKatha)}</span>
              </div>
              <div className="bg-emerald-950/40 p-1.5 rounded-lg text-center">
                <span className="text-[10px] text-emerald-300 block">একর (Acre)</span>
                <span className="font-bold text-white text-[11.5px]">{Utils.toCleanString(totalAcre)}</span>
              </div>
              <div className="bg-emerald-950/40 p-1.5 rounded-lg text-center">
                <span className="text-[10px] text-emerald-300 block">ছটাক (Chhatak)</span>
                <span className="font-bold text-white text-[11.5px]">{Utils.toCleanString(totalChhatak)}</span>
              </div>
              <div className="bg-emerald-950/40 p-1.5 rounded-lg text-center">
                <span className="text-[10px] text-emerald-300 block">কানি (Kani)</span>
                <span className="font-bold text-white text-[11.5px]">{Utils.toCleanString(totalKani)}</span>
              </div>
              <div className="bg-emerald-950/40 p-1.5 rounded-lg text-center">
                <span className="text-[10px] text-emerald-300 block">বর্গমিটার (Sq.M)</span>
                <span className="font-bold text-white text-[11.5px]">{Utils.toCleanString(totalSqMeter)}</span>
              </div>
              <div className="bg-amber-950/40 border border-amber-400/40 p-1.5 rounded-lg text-center col-span-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10.5px] text-amber-300 font-semibold">
                    ঘনফুট (CFT {effectiveDepthFeet !== 1 ? `• ${Utils.toCleanString(depthValue)} ${cftDepthUnit === 'inch' ? 'ইঞ্চি' : 'ফুট'} গভীরতায়` : ''})
                  </span>
                  <span className="font-extrabold text-amber-200 text-sm">
                    {Utils.toCleanString(totalCft)} <span className="text-xs font-normal text-amber-300">CFT</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Billing & Rate Calculator */}
          <div className="bg-emerald-950/70 p-3 rounded-xl border border-emerald-400/30 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-200">
              <span className="flex items-center gap-1">
                <DollarSign size={13} className="text-amber-400" />
                <span>কাজের রেট ও মজুরি বিলিং হিসাব (ঐচ্ছিক):</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10.5px] text-emerald-200 block mb-0.5">কাজের দর / রেট (টাকা)</label>
                <input
                  type="text"
                  value={ratePerUnit}
                  onChange={(e) => setRatePerUnit(e.target.value)}
                  placeholder="উদাঃ 1200 বা 500"
                  className="w-full bg-black/40 border border-emerald-400/40 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white placeholder-emerald-400/40 focus:border-emerald-300 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-[10.5px] text-emerald-200 block mb-0.5">রেটের একক</label>
                <select
                  value={rateUnit}
                  onChange={(e) => setRateUnit(e.target.value as RateUnit)}
                  className="w-full bg-black/40 border border-emerald-400/40 rounded-lg px-2 py-1.5 text-xs font-semibold text-emerald-100 focus:border-emerald-300 focus:outline-hidden"
                >
                  <option value="bigha">প্রতি বিঘা (Bigha)</option>
                  <option value="shatak">প্রতি শতক (Shatak)</option>
                  <option value="katha">প্রতি কাঠা (Katha)</option>
                  <option value="acre">প্রতি একর (Acre)</option>
                  <option value="cft">প্রতি সিএফটি / ঘনফুট (CFT)</option>
                </select>
              </div>
            </div>

            {calculatedTotalBill > 0 && (
              <div className="bg-amber-400/20 border border-amber-300/40 p-2 rounded-lg flex items-center justify-between text-xs">
                <span className="text-amber-200 font-semibold">সর্বমোট কাজের বিল:</span>
                <span className="text-base font-extrabold text-amber-300">
                  ৳ {Utils.toCleanString(calculatedTotalBill)}
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons: Save, Copy, Add to Hisab */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              onClick={handleSaveRecord}
              disabled={sqFt <= 0}
              className="flex items-center justify-center space-x-1 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white py-2 px-2 rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              <Save size={14} />
              <span>সংরক্ষণ</span>
            </button>

            <button
              onClick={handleCopySummary}
              disabled={sqFt <= 0}
              className="flex items-center justify-center space-x-1 bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50 text-white py-2 px-2 rounded-xl text-xs font-semibold shadow-xs transition-colors"
            >
              {copiedText ? <Check size={14} className="text-emerald-300" /> : <Copy size={14} />}
              <span>{copiedText ? 'কপি হয়েছে' : 'কপি করুন'}</span>
            </button>

            <button
              onClick={handleSendToHisabBook}
              disabled={sqFt <= 0}
              className="flex items-center justify-center space-x-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 py-2 px-2 rounded-xl text-xs font-bold shadow-md transition-colors"
            >
              <FileSpreadsheet size={14} />
              <span>হিসাব খাতায়</span>
            </button>
          </div>
        </div>
      </main>

      {/* SAVED MEASUREMENTS MODAL */}
      {showSavedModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="bg-[#1B5E20] text-white p-3.5 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                <BookOpen size={18} className="text-emerald-300" />
                <h3 className="font-bold text-sm sm:text-base">সংরক্ষিত জমি পরিমাপ রেকর্ড</h3>
              </div>
              <button
                onClick={() => setShowSavedModal(false)}
                className="p-1 rounded-full hover:bg-white/20 text-white transition-colors"
              >
                <ArrowLeft size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {savedRecords.length === 0 ? (
                <div className="text-center py-10 text-slate-400 space-y-2">
                  <Ruler size={36} className="mx-auto text-slate-300" />
                  <p className="text-sm">কোনো সংরক্ষিত পরিমাপ রেকর্ড পাওয়া যায়নি।</p>
                  <p className="text-xs text-slate-400">মাপ সম্পন্ন করার পর "সংরক্ষণ" বাটনে ক্লিক করুন।</p>
                </div>
              ) : (
                savedRecords.map((record) => (
                  <div
                    key={record.id}
                    className="bg-slate-50 hover:bg-emerald-50/40 p-3 rounded-xl border border-slate-200 transition-colors relative space-y-1.5"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900">{record.customerName}</h4>
                        <p className="text-[11px] text-slate-500">{record.plotInfo} • {record.shapeType} • {record.date}</p>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm('আপনি কি এই রেকর্ডটি মুছে ফেলতে চান?')) {
                            setSavedRecords(prev => prev.filter(r => r.id !== record.id));
                          }
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                        title="মুছুন"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-white p-2 rounded-lg border border-slate-200/80 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block">মোট জমি</span>
                        <span className="font-bold text-emerald-800 text-xs">
                          {Utils.toCleanString(record.totalShatak)} শতক ({record.bighaText})
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">বর্গফুট ও বিল</span>
                        <span className="font-semibold text-slate-800 text-xs">
                          {Utils.toCleanString(record.totalSqFt)} Sq.Ft {record.totalBill ? `| ৳${Utils.toCleanString(record.totalBill)}` : ''}
                        </span>
                      </div>
                    </div>

                    {/* Quick Add to Hisab */}
                    <div className="flex items-center justify-end space-x-2 pt-1">
                      <button
                        onClick={() => {
                          setShowSavedModal(false);
                          if (onAddToHisab) {
                            onAddToHisab({
                              name: record.customerName,
                              workDetails: `জমি পরিমাপ (${record.shapeType}: ${Utils.toCleanString(record.totalShatak)} শতক / ${record.bighaText})`,
                              qty: Math.round(record.totalShatak * 100) / 100,
                              rate: record.ratePerUnit || 0,
                              bill: record.totalBill || 0
                            });
                          }
                        }}
                        className="px-2.5 py-1 bg-emerald-800 text-white rounded-lg text-xs font-semibold hover:bg-emerald-900 transition-colors flex items-center gap-1"
                      >
                        <FileSpreadsheet size={13} />
                        <span>হিসাবে যুক্ত করুন</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
              <span className="text-xs text-slate-500">মোট রেকর্ড: {savedRecords.length} টি</span>
              <button
                onClick={() => setShowSavedModal(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
