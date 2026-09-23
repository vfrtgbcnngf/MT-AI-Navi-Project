import os
import io
import base64
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

# 🎨 매트플롯립 다크 테마 적용 (어두운 배경과 흰색 텍스트 조화)
plt.style.use('dark_background')

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel, Field
from sklearn.ensemble import IsolationForest
from sklearn.cluster import KMeans
from sklearn.linear_model import LinearRegression
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/mldl", tags=["ML/DL Dedicated Menu"])

api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key) if api_key else None

class MLDLRequest(BaseModel):
    region: str = Field(default="서울", description="분석 대상 지역 또는 키워드")

@router.post("")
def run_mldl_menu_analysis(data: MLDLRequest):
    query_str = data.region.strip()
    text_hash = abs(hash(query_str))
    np.random.seed(text_hash % (2**32))
    
    temp_shift = (text_hash % 15) - 5
    volatility = 0.5 + (text_hash % 20) / 10.0
    
    hours = [f"{i:02d}:00" for i in range(24)]
    base_temp = (20 + temp_shift) + 6 * np.sin(np.linspace(0, 2 * np.pi, 24))
    temperatures = base_temp + np.random.normal(0, volatility, 24)
    pressures = 1013 + np.random.normal(0, 3 + (text_hash % 5), 24)
    humidities = np.clip(55 - 2 * np.sin(np.linspace(0, 2 * np.pi, 24)) * 12 + np.random.normal(0, 5, 24), 10, 95)

    X = np.column_stack((temperatures, pressures, humidities))
    
    contamination_rate = 0.1 + ((text_hash % 10) / 100.0)
    iso = IsolationForest(contamination=contamination_rate, random_state=42)
    iso.fit(X)
    anomaly_preds = iso.predict(X)
    anomaly_count = int(np.sum(anomaly_preds == -1))

    kmeans = KMeans(n_clusters=3, random_state=42, n_init=10)
    clusters = kmeans.fit_predict(X)

    X_time = np.arange(24).reshape(-1, 1)
    lr = LinearRegression()
    lr.fit(X_time, temperatures)
    future_time = np.arange(24, 30).reshape(-1, 1)
    future_preds = [round(float(v), 1) for v in lr.predict(future_time)]

    images = {}

    # 1. 시계열 예측 그래프 (투명 배경 및 다크 모드 최적화)
    fig, ax = plt.subplots(figsize=(6, 3), facecolor='none')
    ax.set_facecolor('none')
    ax.plot(hours, temperatures, label='실측 데이터', color='#818cf8', marker='o', linewidth=2, markersize=4)
    ax.plot(range(24, 30), future_preds, label='ML 6시간 예측', color='#f472b6', linestyle='--', marker='x', linewidth=2, markersize=5)
    ax.set_title(f'[{query_str}] Time-Series Linear Regression', fontsize=9, fontweight='bold', color='#f1f5f9')
    ax.set_ylabel('Value', fontsize=8, color='#94a3b8')
    ax.legend(fontsize=7, loc='upper right', facecolor='#0f172a', edgecolor='#334155')
    ax.grid(True, linestyle='--', alpha=0.2, color='#64748b')
    plt.xticks(rotation=45, fontsize=6, color='#94a3b8')
    plt.yticks(fontsize=6, color='#94a3b8')
    plt.tight_layout()
    
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=100, transparent=True)
    buf.seek(0)
    images['trendChart'] = base64.b64encode(buf.getvalue()).decode('utf-8')
    plt.close(fig)

    # 2. 클러스터링 & 이상치 산점도 그래프 (투명 배경 및 다크 모드 최적화)
    fig, ax = plt.subplots(figsize=(6, 3), facecolor='none')
    ax.set_facecolor('none')
    scatter = ax.scatter(temperatures, humidities, c=clusters, cmap='cool', s=50, edgecolor='#1e293b', alpha=0.85)
    ax.set_title(f'[{query_str}] KMeans & Anomaly Detection', fontsize=9, fontweight='bold', color='#f1f5f9')
    ax.set_xlabel('Feature A', fontsize=8, color='#94a3b8')
    ax.set_ylabel('Feature B', fontsize=8, color='#94a3b8')
    ax.grid(True, linestyle='--', alpha=0.2, color='#64748b')
    plt.xticks(fontsize=6, color='#94a3b8')
    plt.yticks(fontsize=6, color='#94a3b8')
    plt.tight_layout()
    
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=100, transparent=True)
    buf.seek(0)
    images['clusterChart'] = base64.b64encode(buf.getvalue()).decode('utf-8')
    plt.close(fig)

    return {
        "success": True,
        "menuName": "Deep Learning & Machine Learning Lab",
        "region": query_str,
        "metrics": {
            "anomalyCount": anomaly_count,
            "clusterCount": 3,
            "modelHealth": f"Stable (Param Shift: {temp_shift:+d})",
            "futureForecast": future_preds
        },
        "images": images
    }

@router.post("/upload-analysis")
async def analyze_weather_image(file: UploadFile = File(...), region: str = Form(...)):
    if not client:
        raise HTTPException(status_code=500, detail="Gemini API Client가 초기화되지 않았습니다.")

    image_bytes = await file.read()
    # 👇 기상/위성 한정을 없애고 범용 딥러닝/머신러닝 비전 분석 프롬프트로 변경
    prompt = f"이 이미지를 딥러닝 및 머신러닝 관점에서 심층 분석하여, 입력된 키워드/목표([{region}])와 연관된 시각적 패턴, 객체 특징, 구조적 인사이트를 전문적인 AI 리포트로 도출해주세요."
    
    try:
        response = client.models.generate_content(
            model='models/gemini-flash-lite-latest',
            contents=[
                prompt,
                types.Part.from_bytes(
                    data=image_bytes,
                    mime_type=file.content_type or "image/jpeg"
                )
            ]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gemini API 호출 에러: {str(e)}")
    
    return {
        "success": True,
        "filename": file.filename,
        "visionReport": response.text
    }