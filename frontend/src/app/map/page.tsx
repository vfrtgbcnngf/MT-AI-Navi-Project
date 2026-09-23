"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

const MapContainer = dynamic(() => import('react-leaflet').then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((mod) => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then((mod) => mod.Popup), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then((mod) => mod.Polyline), { ssr: false });

interface Place {
  name: string;
  lat: number;
  lng: number;
  description: string;
}

interface RouteInfo {
  distance: string;
  duration: string;
  mode: string;
}

export default function MapPage() {
  const [query, setQuery] = useState("");
  const [center, setCenter] = useState<[number, number]>([37.5665, 126.9780]);
  const [zoom, setZoom] = useState(7);
  const [searchTitle, setSearchTitle] = useState("");
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][] | null>(null);
  const [travelMode, setTravelMode] = useState<string>('driving');
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  
  const [aiMessage, setAiMessage] = useState("검색어를 입력해 주세요 (예: '울산 맛집', '경주 절 추천')");
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [L, setL] = useState<any>(null);

  useEffect(() => {
    setIsMounted(true);
    import('leaflet').then((leaflet) => {
      setL(leaflet);
    });
  }, []);

  const fetchBackendRoute = async (start: [number, number], end: [number, number], mode: string) => {
    try {
      setAiMessage("🔄 백엔드 서버에서 최적의 경로 및 교통 정보를 계산 중입니다...");
      
      const response = await fetch('http://localhost:8000/api/v1/map/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_lat: start[0],
          start_lng: start[1],
          end_lat: end[0],
          end_lng: end[1],
          mode: mode
        }),
      });

      if (!response.ok) throw new Error("백엔드 길찾기 실패");

      const result = await response.json();
      if (result.success) {
        setRouteCoords(result.coordinates);
        setRouteInfo({
          distance: result.distance,
          duration: result.duration,
          mode: result.mode
        });
        setAiMessage(`🚀 [${result.mode}] 경로 안내가 준비되었습니다.`);
      }
    } catch (error) {
      console.error("백엔드 연동 오류:", error);
      setAiMessage("⚠️ 길찾기 데이터를 불러오는 중 백엔드 통신 오류가 발생했습니다.");
    }
  };

  const handleFindRoute = (mode: string = travelMode) => {
    if (!navigator.geolocation) {
      alert("이 브라우저는 위치 정보를 지원하지 않습니다.");
      return;
    }

    if (!selectedPlace) {
      alert("길찾기할 장소를 먼저 선택해 주세요.");
      return;
    }

    setTravelMode(mode);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        const currentPos: [number, number] = [userLat, userLng];

        setUserLocation(currentPos);
        setCenter(currentPos);
        setZoom(13);

        fetchBackendRoute(currentPos, [selectedPlace.lat, selectedPlace.lng], mode);
      },
      (error) => {
        console.error(error);
        alert("위치 정보를 가져오는 데 실패했습니다. 위치 권한을 허용해 주세요.");
        setAiMessage("⚠️ 위치 권한이 거부되었거나 위치를 가져올 수 없습니다.");
      },
      { enableHighAccuracy: true }
    );
  };

  // PIN 글자를 없애고 장소 이름 또는 간결한 마커 형태로 변경
  const getCustomIcon = (isSelected: boolean, placeName: string, isUser: boolean = false) => {
    if (!L) return undefined;

    if (isUser) {
      return L.divIcon({
        className: 'user-map-marker',
        html: `
          <div style="
            background-color: #ef4444;
            color: #ffffff;
            border: 2px solid #ffffff;
            padding: 6px 12px;
            border-radius: 9999px;
            font-weight: 700;
            font-size: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 4px;
          ">
            <span>🏠</span>
            <span>내 위치 (출발지)</span>
          </div>
        `,
        iconSize: [130, 36],
        iconAnchor: [65, 18],
      });
    }

    // 선택된 장소는 강조 표시, 일반 장소는 점 형태로 깔끔하게 표시
    if (isSelected) {
      return L.divIcon({
        className: 'selected-map-marker',
        html: `
          <div style="
            background-color: #4f46e5;
            color: #ffffff;
            border: 2px solid #ffffff;
            padding: 6px 12px;
            border-radius: 9999px;
            font-weight: 700;
            font-size: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 4px;
          ">
            <span>🎯</span>
            <span>${placeName} (도착지)</span>
          </div>
        `,
        iconSize: [160, 36],
        iconAnchor: [80, 18],
      });
    }

    // 선택되지 않은 일반 마커 (PIN 글자 대신 깔끔한 동그라미 아이콘 형태)
    return L.divIcon({
      className: 'normal-map-marker',
      html: `
        <div style="
          background-color: #ffffff;
          color: #4f46e5;
          border: 2px solid #4f46e5;
          width: 24px;
          height: 24px;
          border-radius: 9999px;
          font-weight: 700;
          font-size: 11px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          📍
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setRouteCoords(null);
    setUserLocation(null);
    setRouteInfo(null);
    setAiMessage("🤖 AI 백엔드가 20개 이상의 장소와 위치 좌표를 분석 중입니다...");

    try {
      const response = await fetch('http://localhost:8000/api/v1/map/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) throw new Error("검색 실패");

      const result = await response.json();
      const fetchedPlaces: Place[] = result.data.places;

      setSearchTitle(result.data.search_title);
      setPlaces(fetchedPlaces);

      if (fetchedPlaces.length > 0) {
        setCenter([fetchedPlaces[0].lat, fetchedPlaces[0].lng]);
        setZoom(14);
        setSelectedPlace(fetchedPlaces[0]);
      }
      setAiMessage(`✨ ${result.aiAnalysis}`);
    } catch (err) {
      console.error(err);
      setAiMessage("⚠️ 장소를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (!isMounted || !L) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 text-slate-500 font-bold">
        지도를 로딩 중입니다...
      </div>
    );
  }

  return (
    <div className="p-8 bg-slate-50 text-slate-900 min-h-screen space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-pink-600">
          🗺️ AI 추천맵
        </h1>
        <p className="text-sm text-slate-500 mt-1">20개 이상의 추천 장소와 대중교통 길찾기를 지원합니다.</p>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input 
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="예: '울산 맛집', '부산 해운대 절', '속초 카페'"
            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
          />
          <button 
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm shadow transition disabled:opacity-50"
          >
            {loading ? '검색 중...' : '🔍 통합 검색'}
          </button>
        </form>

        <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs font-semibold text-indigo-900">{aiMessage}</p>
          
          {selectedPlace && (
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button 
                type="button"
                onClick={() => handleFindRoute('driving')}
                className={`px-3 py-2 rounded-lg text-xs font-bold shadow transition ${travelMode === 'driving' && userLocation ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border border-slate-200'}`}
              >
                🚗 자동차
              </button>
              <button 
                type="button"
                onClick={() => handleFindRoute('transit')}
                className={`px-3 py-2 rounded-lg text-xs font-bold shadow transition ${travelMode === 'transit' && userLocation ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border border-slate-200'}`}
              >
                🚇 지하철/버스
              </button>
              <button 
                type="button"
                onClick={() => handleFindRoute('walking')}
                className={`px-3 py-2 rounded-lg text-xs font-bold shadow transition ${travelMode === 'walking' && userLocation ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border border-slate-200'}`}
              >
                🚶 도보
              </button>
              <button 
                type="button"
                onClick={() => handleFindRoute('cycling')}
                className={`px-3 py-2 rounded-lg text-xs font-bold shadow transition ${travelMode === 'cycling' && userLocation ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 border border-slate-200'}`}
              >
                🚲 자전거
              </button>
            </div>
          )}
        </div>

        {routeInfo && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900 font-bold">
            <span>📍 이동수단: {routeInfo.mode}</span>
            <span>📏 총 거리: {routeInfo.distance}</span>
            <span>⏱️ 예상 소요 시간: {routeInfo.duration}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4 lg:col-span-1 max-h-[550px] overflow-y-auto">
          <h2 className="font-bold text-slate-800 text-sm border-b pb-2">
            {searchTitle || "추천 장소 목록"}
          </h2>
          {places.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">검색 결과가 여기에 표시됩니다.</p>
          ) : (
            <div className="space-y-3">
              {places.map((place, idx) => (
                <div 
                  key={idx}
                  onClick={() => {
                    setCenter([place.lat, place.lng]);
                    setZoom(15);
                    setSelectedPlace(place);
                    setRouteCoords(null);
                    setUserLocation(null);
                    setRouteInfo(null);
                  }}
                  className={`p-3 rounded-xl border transition cursor-pointer ${
                    selectedPlace?.name === place.name 
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' 
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900">{idx + 1}. {place.name}</span>
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">추천</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{place.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm h-[550px] relative overflow-hidden lg:col-span-2">
          <MapContainer 
            center={center} 
            zoom={zoom} 
            scrollWheelZoom={true} 
            style={{ width: '100%', height: '100%', borderRadius: '0.75rem' }}
            key={`${center[0]}-${center[1]}-${zoom}`}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {userLocation && (
              <Marker position={userLocation} icon={getCustomIcon(false, "", true)}>
                <Popup>
                  <div className="text-xs font-bold text-red-600">출발지: 내 위치</div>
                </Popup>
              </Marker>
            )}

            {routeCoords && (
              <Polyline positions={routeCoords} color="#2563eb" weight={5} opacity={0.8} />
            )}

            {places.map((place, idx) => {
              const isSelected = selectedPlace?.name === place.name;
              return (
                <Marker 
                  key={idx} 
                  position={[place.lat, place.lng]}
                  icon={getCustomIcon(isSelected, place.name, false)}
                  eventHandlers={{
                    click: () => {
                      setSelectedPlace(place);
                      setRouteCoords(null);
                      setUserLocation(null);
                      setRouteInfo(null);
                    }
                  }}
                >
                  <Popup>
                    <div className="text-xs space-y-1">
                      <span className="font-bold text-indigo-600">도착지: {place.name}</span>
                      <p>{place.description}</p>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}