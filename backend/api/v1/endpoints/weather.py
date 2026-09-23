import os
import io
import base64
import json
import platform
import numpy as np
import matplotlib
matplotlib.use('Agg')  # GUI 충돌 방지
import matplotlib.pyplot as plt
from fastapi import APIRouter
from pydantic import BaseModel, Field
from google import genai
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/weather", tags=["Weather"])

api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key)

# 운영체제별 Matplotlib 한글 폰트 자동 설정 (Glyph missing 경고 해결)
if platform.system() == 'Windows':
    plt.rc('font', family='Malgun Gothic')
elif platform.system() == 'Darwin':
    plt.rc('font', family='AppleGothic')
else:
    plt.rc('font', family='NanumGothic')

plt.rcParams['axes.unicode_minus'] = False

class WeatherChartData(BaseModel):
    tempData: list[int] = Field(description="시간대별 기온 데이터 (총 6개 값: 06시, 09시, 12시, 15시, 18시, 21시, 단위 °C)")
    rainData: list[int] = Field(description="시간대별 강수확률 데이터 (총 6개 값, 단위 %)")
    humidityData: list[int] = Field(description="시간대별 습도 데이터 (총 6개 값, 단위 %)")
    airQualityIndex: list[int] = Field(description="대기환경 지수 6가지 (PM10, PM2.5, 오존, 일산화탄소, 이산화질소, 아황산가스 지수 스코어 0~100)")
    pressureData: list[int] = Field(description="시간대별 기압 데이터 (총 6개 값: 단위 hPa, 예: 1012~1025 범위)")

class WeatherResponseModel(BaseModel):
    report: str = Field(description="전문적인 AI 기상 캐스터의 상세 날씨 분석 및 전망 리포트")
    charts: WeatherChartData = Field(description="다차원 대시보드 시각화를 위한 통계 수치 데이터")

class WeatherRequest(BaseModel):
    query: str

def generate_multi_ai_charts(charts: dict) -> dict:
    """백엔드에서 matplotlib를 활용해 5가지 종류의 고도화된 빅데이터 그래프 생성"""
    time_labels = ['06시', '09시', '12시', '15시', '18시', '21시']
    images = {}

    # 1. 꺾은선 그래프 (기온 트렌드)
    fig, ax = plt.subplots(figsize=(5, 3))
    ax.plot(time_labels, charts['tempData'], color='#f97316', marker='o', linewidth=2.5, markersize=6)
    ax.set_title('시간대별 기온 트렌드 (Line)', fontsize=9, fontweight='bold', color='#334155')
    ax.set_ylabel('°C', fontsize=8, color='#64748b')
    ax.grid(True, linestyle='--', alpha=0.4, color='#e2e8f0')
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    plt.tight_layout()
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=100, transparent=True)
    buf.seek(0)
    images['tempChart'] = base64.b64encode(buf.getvalue()).decode('utf-8')
    plt.close(fig)

    # 2. 도넛형 그래프 (평균 강수 분포)
    fig, ax = plt.subplots(figsize=(5, 3))
    avg_rain = sum(charts['rainData']) / len(charts['rainData'])
    remaining = max(0, 100 - avg_rain)
    ax.pie([avg_rain, remaining], colors=['#3b82f6', '#f1f5f9'], startangle=90, wedgeprops=dict(width=0.3, edgecolor='w'))
    ax.text(0, 0, f"{int(avg_rain)}%", ha='center', va='center', fontsize=12, fontweight='bold', color='#1e293b')
    ax.set_title('평균 강수확률 점유율 (Donut)', fontsize=9, fontweight='bold', color='#334155')
    plt.tight_layout()
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=100, transparent=True)
    buf.seek(0)
    images['rainChart'] = base64.b64encode(buf.getvalue()).decode('utf-8')
    plt.close(fig)

    # 3. 방사형 레이더 (대기 환경 지수)
    fig, ax = plt.subplots(figsize=(5, 3), subplot_kw=dict(polar=True))
    categories = ['미세먼지', '초미세먼지', '오존', '일산화탄소', '이산화질소', '아황산가스']
    values = charts['airQualityIndex']
    angles = np.linspace(0, 2 * np.pi, len(categories), endpoint=False).tolist()
    values += values[:1]
    angles += angles[:1]
    ax.plot(angles, values, color='#10b981', linewidth=2)
    ax.fill(angles, values, color='#10b981', alpha=0.25)
    ax.set_xticks(angles[:-1])
    ax.set_xticklabels(categories, fontsize=7, color='#64748b')
    ax.set_yticklabels([])
    ax.set_title('대기오염 지수 종합 분석 (Radar)', fontsize=9, fontweight='bold', color='#334155', pad=10)
    ax.spines['polar'].set_color('#cbd5e1')
    plt.tight_layout()
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=100, transparent=True)
    buf.seek(0)
    images['radarChart'] = base64.b64encode(buf.getvalue()).decode('utf-8')
    plt.close(fig)

    # 4. 히트맵 스타일 습도 분석 (오류 해결: plt.cm.YlGnBu 표준 컬러맵 사용)
    fig, ax = plt.subplots(figsize=(5, 3))
    colors = plt.cm.YlGnBu(np.array(charts['humidityData']) / 100.0)
    ax.bar(time_labels, charts['humidityData'], color=colors, width=0.55, edgecolor='#0f766e', linewidth=0.8)
    ax.set_title('시간대별 습도 분산 (Heat-Bar)', fontsize=9, fontweight='bold', color='#334155')
    ax.set_ylabel('%', fontsize=8, color='#64748b')
    ax.set_ylim(0, 100)
    ax.grid(axis='y', linestyle='--', alpha=0.4, color='#e2e8f0')
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    plt.tight_layout()
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=100, transparent=True)
    buf.seek(0)
    images['heatmapChart'] = base64.b64encode(buf.getvalue()).decode('utf-8')
    plt.close(fig)

    # 5. 전용 모던 막대그래프 (기압 / 바 차트)
    fig, ax = plt.subplots(figsize=(5, 3))
    ax.bar(time_labels, charts['pressureData'], color='#6366f1', width=0.5, alpha=0.85)
    ax.set_title('시간대별 기압 흐름 (Bar)', fontsize=9, fontweight='bold', color='#334155')
    ax.set_ylabel('hPa', fontsize=8, color='#64748b')
    min_p = min(charts['pressureData']) - 5
    max_p = max(charts['pressureData']) + 5
    ax.set_ylim(min_p, max_p)
    ax.grid(axis='y', linestyle='--', alpha=0.4, color='#e2e8f0')
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    plt.tight_layout()
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=100, transparent=True)
    buf.seek(0)
    images['barChart'] = base64.b64encode(buf.getvalue()).decode('utf-8')
    plt.close(fig)

    return images

@router.post("")
def get_weather_forecast(data: WeatherRequest):
    try:
        prompt = f"""
        당신은 다중 AI 앙상블 기반 빅데이터 기상 예측 시스템입니다.
        사용자가 요청한 지역: "{data.query}"

        기상 데이터를 종합 분석하여 아래 항목을 포함해 상세 리포트와 수치를 산출해주세요.
        - 전문적인 날씨 전망 리포트
        - 시간대별 기온, 강수확률, 습도 데이터 (각 6개)
        - 6가지 대기오염/환경 지수 스코어 (0~100 사이 값)
        - 시간대별 기압 데이터 6개 (단위 hPa, 예: 1010~1025 사이 값)
        """

        response = client.models.generate_content(
            model='models/gemini-flash-lite-latest',
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": WeatherResponseModel,
            },
        )
        
        parsed_data = json.loads(response.text)
        charts_data = parsed_data.get("charts")
        
        chart_images = generate_multi_ai_charts(charts_data)

        return {
            "success": True,
            "report": parsed_data.get("report"),
            "charts": charts_data,
            "images": chart_images
        }

    except Exception as e:
        print("❌ [DEBUG ERROR]:", str(e))
        import traceback
        traceback.print_exc()

        return {
            "success": False, 
            "report": f"멀티 AI 기상 분석 시스템 연산 중 오류가 발생했습니다. (원인: {str(e)})",
            "charts": {"tempData": [0]*6, "rainData": [0]*6, "humidityData": [0]*6, "airQualityIndex": [0]*6, "pressureData": [1013]*6},
            "images": {"tempChart": "", "rainChart": "", "radarChart": "", "heatmapChart": "", "barChart": ""}
        }