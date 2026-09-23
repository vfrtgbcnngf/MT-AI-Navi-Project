from fastapi import APIRouter
from api.v1.endpoints import calculator
from api.v1.endpoints import weather
from api.v1.endpoints import mldl
from api.v1.endpoints import finetuning
from api.v1.endpoints import map
from api.v1.endpoints import calendar
from api.v1.endpoints import critique
from api.v1.endpoints import opencv
from api.v1.endpoints import auth
from api.v1.endpoints import chat



api_router = APIRouter()

# 계산기 라우터 추가
api_router.include_router(calculator.router)

# 2. 날씨 라우터 추가
api_router.include_router(weather.router)

api_router.include_router(mldl.router)

api_router.include_router(finetuning.router)

api_router.include_router(map.router)

api_router.include_router(calendar.router)

api_router.include_router(critique.router)

api_router.include_router(opencv.router)

api_router.include_router(auth.router)

api_router.include_router(chat.router)