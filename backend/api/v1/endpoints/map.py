import os
import json
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from google import genai

router = APIRouter(prefix="/map", tags=["AI Map Navigator"])
# Google GenAI 클라이언트 초기화 (환경 변수에서 API 키 자동 로드)
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

class MapSearchRequest(BaseModel):
    query: str

class RouteRequest(BaseModel):
    start_lat: float
    start_lng: float
    end_lat: float
    end_lng: float
    mode: str  # driving, walking, cycling, transit

class PlaceItem(BaseModel):
    name: str = Field(description="추천 장소 이름")
    lat: float = Field(description="위도 (Latitude)")
    lng: float = Field(description="경도 (Longitude)")
    description: str = Field(description="추천 이유 또는 특징 설명")

class MultiLocationResponse(BaseModel):
    search_title: str = Field(description="검색 결과 요약 타이틀")
    places: list[PlaceItem] = Field(description="추천 장소 20개 이상 목록 (최대한 풍부하고 다양하게)")

@router.post("/search")
def gemini_multi_map_search(req: MapSearchRequest):
    """사용자 검색어에 맞춰 20개 이상의 다양한 장소를 대량 추천"""
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="검색어를 입력해주세요.")
    
    try:
        prompt = (
            f"사용자 요청: '{req.query}'. "
            "이 검색어와 관련하여 지역 내의 명소, 맛집, 핫플레이스, 카페, 문화공간 등을 "
            "누락 없이 **최소 20개 이상** 최대한 많이, 빠짐없이 골라주세요. "
            "특정 지역에만 치우치지 말고 인근 지역까지 포함하여 다양한 장소를 확보하고, "
            "각각의 정확한 위도(lat), 경도(lng), 이름, 상세 설명을 구조화된 JSON으로 반환해주세요."
        )

        response = client.models.generate_content(
            model='models/gemini-flash-lite-latest',
            contents=prompt,
            config={
                'response_mime_type': 'application/json',
                'response_schema': MultiLocationResponse,
            },
        )
        data = json.loads(response.text)
        return {
            "success": True,
            "data": data,
            "aiAnalysis": f"Gemini AI가 '{req.query}'와 관련된 20개 이상의 방대한 추천 장소 목록을 구성했습니다."
        }
    except Exception as e:
        print(f'Gemini API Error: {e}')
        raise HTTPException(status_code=500, detail="AI 분석 중 오류가 발생했습니다.")

@router.post("/route")
async def calculate_route(req: RouteRequest):
    """대중교통, 도보, 자전거, 자동차 이동수단별 실제 속도와 거리를 반영하여 소요 시간을 정확히 산출"""
    try:
        # 1. 대중교통(지하철/버스) 모드 처리
        if req.mode == "transit":
            # 위경도 간 대략적인 직선 거리 계산 (km)
            lat_diff = abs(req.start_lat - req.end_lat) * 111
            lng_diff = abs(req.start_lng - req.end_lng) * 88
            straight_dist = (lat_diff**2 + lng_diff**2)**0.5
            
            transit_dist = straight_dist * 1.3  # 우회 거리 감안
            duration_min = int((transit_dist / 25) * 60) + 10  # 평균 시속 25km + 환승/대기 시간 10분
            duration_str = f"{duration_min // 60}시간 {duration_min % 60}분" if duration_min >= 60 else f"{duration_min}분"

            return {
                "success": True,
                "mode": "지하철 / 버스 (대중교통)",
                "distance": f"{transit_dist:.1f} km",
                "duration": duration_str,
                "coordinates": [[req.start_lat, req.start_lng], [req.end_lat, req.end_lng]]
            }

        # 2. OSRM API 호출 (driving, walking, cycling)
        profile = 'car' if req.mode == 'driving' else ('foot' if req.mode == 'walking' else 'bike')
        url = f"https://router.project-osrm.org/route/v1/{profile}/{req.start_lng},{req.start_lat};{req.end_lng},{req.end_lat}?overview=full&geometries=geojson"
        
        async with httpx.AsyncClient() as httpx_client:
            res = await httpx_client.get(url)
            data = res.json()

        if "routes" in data and len(data["routes"]) > 0:
            route = data["routes"][0]
            coords = [[c[1], c[0]] for c in route["geometry"]["coordinates"]]
            distance_meters = route["distance"]
            distance_km = distance_meters / 1000

            # 이동수단별 실제 평균 속도 기반 소요 시간 재보정 (도보 시속 4km, 자전거 시속 15km)
            if req.mode == 'walking':
                duration_sec = (distance_meters / 4000) * 3600
            elif req.mode == 'cycling':
                duration_sec = (distance_meters / 15000) * 3600
            else:
                duration_sec = route["duration"]  # 자동차는 OSRM 결과 유지

            duration_min = int(duration_sec // 60)
            duration_str = f"{duration_min // 60}시간 {duration_min % 60}분" if duration_min >= 60 else f"{duration_min}분"
            
            mode_name = "자동차 / 택시" if req.mode == 'driving' else ("도보" if req.mode == 'walking' else "자전거")

            return {
                "success": True,
                "mode": mode_name,
                "distance": f"{distance_km:.1f} km",
                "duration": duration_str,
                "coordinates": coords
            }
        else:
            raise HTTPException(status_code=400, detail="경로를 찾을 수 없습니다.")

    except Exception as e:
        print(f"Route API Error: {e}")
        raise HTTPException(status_code=500, detail="길찾기 계산 중 오류가 발생했습니다.")