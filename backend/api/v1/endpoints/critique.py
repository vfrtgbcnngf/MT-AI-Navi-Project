from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import google.generativeai as genai
from PIL import Image, ImageOps, ImageFilter, ImageEnhance
import io
import base64
import random
import os
import hashlib


# 상위 api_router와 연결되므로 여기서는 하위 경로인 '/critique'만 지정합니다.
router = APIRouter(prefix="/critique", tags=["critique"])

# 1. AI 작품 비평 (Gemini Vision 활용)
@router.post("/analyze")
async def analyze_artwork(file: UploadFile = File(...)):
    try:
        image_bytes = await file.read()
        image = Image.open(io.BytesIO(image_bytes))
        
        # 안전한 모델 호출 및 예외 방어
        model = genai.GenerativeModel('models/gemini-flash-lite-latest')
        prompt = (
            "이 미술 작품/사진에 대해 전문적이고 통찰력 있으면서도 흥미로운 비평을 작성해주세요. "
            "1. 구도와 색감 분석, 2. 전달되는 감정과 분위기, 3. 총평 순서로 구성해 주세요."
        )
        response = model.generate_content([prompt, image])
        
        return {
            "success": True,
            "critique": response.text
        }
    except Exception as e:
        print(f"🔥 Critique Analysis Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"작품 분석 중 오류 발생: {str(e)}")


# 2. 이미지 효과 변환 (흑백, 빈티지/세피아, 블러 등)
@router.post("/transform")
async def transform_image(file: UploadFile = File(...), effect: str = Form(...)):
    try:
        image_bytes = await file.read()
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        
        if effect == "grayscale":
            image = ImageOps.grayscale(image).convert("RGB")
        elif effect == "blur":
            image = image.filter(ImageFilter.GaussianBlur(radius=5))
        elif effect == "invert":
            image = ImageOps.invert(image)
        elif effect == "sepia":
            gray = ImageOps.grayscale(image)
            image = ImageOps.colorize(gray, "#704214", "#FFD700")
        elif effect == "sharpen":
            image = image.filter(ImageFilter.SHARPEN)
        elif effect == "contour":
            image = image.filter(ImageFilter.CONTOUR)
        elif effect == "emboss":
            image = image.filter(ImageFilter.EMBOSS)
        elif effect == "solarize":
            image = ImageOps.solarize(image, threshold=128)
        elif effect == "edge_enhance":
            image = image.filter(ImageFilter.EDGE_ENHANCE)
        elif effect == "smooth":
            image = image.filter(ImageFilter.SMOOTH)
        elif effect == "posterize":
            image = ImageOps.posterize(image, bits=3)
            
        buffered = io.BytesIO()
        image.save(buffered, format="JPEG")
        encoded_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
        
        return {
            "success": True,
            "transformed_image": f"data:image/jpeg;base64,{encoded_str}"
        }
    except Exception as e:
        print(f"🔥 Image Transform Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"이미지 변환 중 오류 발생: {str(e)}")


# 3. AI 운세 측정 (띠별 또는 별자리)
class FortuneRequest(BaseModel):
    category: str    # 'zodiac' 또는 'constellation'
    target: str      # 예: '용띠', '사자자리'
    name: str        # 이름
    birthdate: str   # 생년월일 (예: 1995-05-15)

@router.post("/fortune")
def get_ai_fortune(req: FortuneRequest):
    try:
        seed_string = f"{req.name}-{req.birthdate}-{req.target}"
        hash_val = int(hashlib.md5(seed_string.encode('utf-8')).hexdigest(), 16)
        
        scores = {
            "overall": 70 + (hash_val % 29),       # 총운 (70~98점)
            "wealth": 65 + ((hash_val // 7) % 31),   # 재물운 (65~95점)
            "luck": 75 + ((hash_val // 13) % 26),    # 행운지수 (75~100점)
            "relationship": 60 + ((hash_val // 19) % 38), # 대인관계운 (60~97점)
            "energy": 65 + ((hash_val // 23) % 32)        # 활력/건강운 (65~96점)
        }
        
        model = genai.GenerativeModel('models/gemini-flash-lite-latest')
        prompt = (
            f"사용자 정보:\n"
            f"- 이름: {req.name}\n"
            f"- 생년월일: {req.birthdate}\n"
            f"- 선택한 운세 유형 ({req.category}): {req.target}\n"
            f"- 백엔드 산정 지표: 총운 {scores['overall']}점, 재물운 {scores['wealth']}점, 행운 {scores['luck']}점\n\n"
            f"위 백엔드 지표와 사용자 정보를 바탕으로, 해당 이름과 생년월일을 다정하게 불러주며 "
            f"오늘의 운세를 재치 있고 전문적으로 분석해 주세요. "
            f"특히 재물과 행운을 끌어올릴 수 있는 실천적 조언을 포함해 주세요."
        )
        
        response = model.generate_content(prompt)
        
        return {
            "success": True,
            "target": req.target,
            "name": req.name,
            "fortune_text": response.text, # 💡 프론트엔드와 맞출 키값
            "scores": scores 
        }
    except Exception as e:
        print(f"🔥 Fortune Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"운세 측정 중 오류 발생: {str(e)}")