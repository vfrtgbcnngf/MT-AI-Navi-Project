from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.v1.router import api_router

app = FastAPI(title="MTaiNavi Studio Backend", version="1.0.0")

# 프론트엔드(Next.js)와의 통신을 위한 CORS 설정
origins = [
    "http://localhost:3000",
    "https://mt-ai-navi-web.onrender.com",  # 👈 배포된 프론트엔드 주소 추가
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,       # 👈 여기에 정확한 리스트를 넣어주세요!
    allow_credentials=True,      # 👈 토큰 인증을 위해 필수
    allow_methods=["*"],
    allow_headers=["*"],
)

# v1 API 라우터 등록 (모든 엔드포인트는 /api/v1 경로 아래로 매핑됩니다)
app.include_router(api_router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {"message": "MTaiNavi FastAPI 백엔드 서버가 정상적으로 실행 중입니다."}
