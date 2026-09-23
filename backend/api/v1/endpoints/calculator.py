import os
from fastapi import APIRouter
from pydantic import BaseModel
from google import genai
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/calculator", tags=["Calculator"])

api_key = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=api_key)

class CalcRequest(BaseModel):
    expression: str

@router.post("")
def calculate_expression(data: CalcRequest):
    try:
        prompt = f"""
        당신은 스마트하고 신뢰감 있는 전공 수학 튜터입니다.
        사용자가 다음과 같은 수학 질문, 공식, 수식, 또는 고차원 수학 용어(로그, 피타고라스, 적분, 통계, 기하, 벡터 등)의 설명을 요청했습니다:
        "{data.expression}"

        다음 가이드라인에 맞춰 답변을 작성해주세요:
        1. **톤앤매너**: 유치하거나 장황하지 않고, 깔끔하고 명확한 어조로 핵심을 짚어주세요. 수학적 엄밀함을 유지하되, 누구나 이해할 수 있게 직관적인 흐름으로 설명합니다.
        2. **단계별 풀이 (Step-by-Step)**: 논리적이고 깔끔한 단계별로 풀이와 개념을 정리해주세요.
        3. **눈에 띄는 정답 및 요점 강조 (매우 중요)**: 답변 하단의 최종 요약 박스는 반드시 시각적으로 강렬하게 눈에 띄도록 작성해주세요. 특히 **최종 결과나 핵심 키워드는 마크다운 볼드체(**)와 강조 기호를 사용하여 한눈에 확 들어오도록 만들어주세요.

        반드시 아래 형식을 정확히 지켜서 답변의 마지막을 장식해주세요:

        > 📌 **[ 핵심 요약 및 최종 정답 ]**
        > - **핵심 개념**: (개념을 명확하고 스마트하게 한 줄 요약)
        > - 🎯 **최종 결과**: **[여기에 눈에 띄는 최종 정답이나 핵심 결론 작성]**
        """

        response = client.models.generate_content(
            model='models/gemini-flash-lite-latest',
            contents=prompt,
        )
        
        ai_response = response.text
        return {"success": True, "result": data.expression, "response": ai_response}

    except Exception as e:
        return {
            "success": False, 
            "response": f'죄송합니다. 입력하신 수학 내용("{data.expression}")을 처리하는 중 오류가 발생했습니다. 다시 확인해 주세요!'
        }