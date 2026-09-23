from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
from google import genai

router = APIRouter(tags=["chat"])

class ChatRequest(BaseModel):
    message: str

@router.post("/chat")
async def chat_endpoint(req: ChatRequest):
    user_msg = req.message.strip().lower()
    
    # 💡 조사와 공백을 강력하게 제거하여 비교용 정제 메시지 생성
    clean_msg = (
        user_msg.replace(" ", "")
        .replace("&", "")
        .replace("과", "")
        .replace("의", "")
        .replace("로", "")
        .replace("으로", "")
        .replace("에서", "")
        .replace("에", "")
        .replace("를", "")
        .replace("을", "")
        .replace("은", "")
        .replace("는", "")
    )

    # 1. 로그인 / 회원가입 모달 제어 매핑
    if any(kw in user_msg for kw in ['로그인', 'sign in', 'signin']):
        return {
            "reply": "알겠습니다! 로그인 폼을 열어드리겠습니다. 🔐",
            "action": {"type": "open_modal", "target": "login"}
        }
    
    if any(kw in user_msg for kw in ['회원가입', '가입', 'sign up', 'signup', 'register']):
        return {
            "reply": "알겠습니다! 상세 회원가입 폼을 열어드리겠습니다. 📝",
            "action": {"type": "open_modal", "target": "signup_detailed"}
        }

    # 2. 메뉴 이동 매핑 (구체적인 조합 키워드 우선 배치)
    route_map = {
        # 운세 / 사주 관련 복합 키워드 (아트/포춘 + 운세/사주 조합 전체 수용)
        '아트포춘운세': {"path": "/art-critique?tab=3", "name": "아트 & 포춘 (AI 운세 측정)"},
        '아트운세': {"path": "/art-critique?tab=3", "name": "아트 & 포춘 (AI 운세 측정)"},
        '포춘운세': {"path": "/art-critique?tab=3", "name": "아트 & 포춘 (AI 운세 측정)"},
        '아트포춘사주': {"path": "/art-critique?tab=3", "name": "아트 & 포춘 (AI 운세 측정)"},
        '아트사주': {"path": "/art-critique?tab=3", "name": "아트 & 포춘 (AI 운세 측정)"},
        '포춘사주': {"path": "/art-critique?tab=3", "name": "아트 & 포춘 (AI 운세 측정)"},
        '아트포춘운세측정': {"path": "/art-critique?tab=3", "name": "아트 & 포춘 (AI 운세 측정)"},

        # 비평 관련 복합 키워드
        '아트포춘비평': {"path": "/art-critique?tab=1", "name": "아트 & 포춘 (AI 작품 비평)"},
        '아트비평': {"path": "/art-critique?tab=1", "name": "아트 & 포춘 (AI 작품 비평)"},
        '포춘비평': {"path": "/art-critique?tab=1", "name": "아트 & 포춘 (AI 작품 비평)"},
        '아트포춘작품비평': {"path": "/art-critique?tab=1", "name": "아트 & 포춘 (AI 작품 비평)"},

        # 효과 변환 관련 복합 키워드
        '아트포춘효과': {"path": "/art-critique?tab=2", "name": "아트 & 포춘 (효과 변환 & 다운로드)"},
        '아트효과': {"path": "/art-critique?tab=2", "name": "아트 & 포춘 (효과 변환 & 다운로드)"},
        '포춘효과': {"path": "/art-critique?tab=2", "name": "아트 & 포춘 (효과 변환 & 다운로드)"},
        '아트포춘변환': {"path": "/art-critique?tab=2", "name": "아트 & 포춘 (효과 변환 & 다운로드)"},
        '아트변환': {"path": "/art-critique?tab=2", "name": "아트 & 포춘 (효과 변환 & 다운로드)"},
        '포춘변환': {"path": "/art-critique?tab=2", "name": "아트 & 포춘 (효과 변환 & 다운로드)"},
        '아트포춘효과변환': {"path": "/art-critique?tab=2", "name": "아트 & 포춘 (효과 변환 & 다운로드)"},

        # 단독 메뉴 및 기타 유틸리티
        '딥러닝': {"path": "/ml-dl", "name": "딥러닝"},
        '파인튜닝': {"path": "/fine-tuning", "name": "파인튜닝"},
        'opencv': {"path": "/opencv", "name": "OpenCV 컴퓨터비전"},
        '일기예보': {"path": "/weather", "name": "일기예보 및 날씨"},
        '날씨': {"path": "/weather", "name": "일기예보 및 날씨"},
        '기상': {"path": "/weather", "name": "일기예보 및 날씨"},
        '캘린더': {"path": "/calendar", "name": "캘린더"},
        '지도': {"path": "/map", "name": "지도"},
        '계산기': {"path": "/calculator", "name": "계산기"},
        '아트': {"path": "/art-critique?tab=1", "name": "아트 & 포춘 스튜디오"},
        '포춘': {"path": "/art-critique?tab=3", "name": "아트 & 포춘 스튜디오"},
        '비평': {"path": "/art-critique?tab=1", "name": "1. AI 작품 비평"},
        '변환': {"path": "/art-critique?tab=2", "name": "2. 효과 변환 & 다운로드"},
        '운세': {"path": "/art-critique?tab=3", "name": "3. AI 운세 측정"},
        '사주': {"path": "/art-critique?tab=3", "name": "3. AI 운세 측정"},
    }

    # 💡 정제된 `clean_msg`를 기준으로 `route_map`의 키가 포함되어 있는지 탐색
    for key, info in route_map.items():
        clean_key = key.replace(" ", "")
        if clean_key in clean_msg:
            return {
                "reply": f"알겠습니다! {info['name']}로 이동해드리겠습니다. 🚀",
                "action": {"type": "navigate", "path": info['path'], "name": info['name']}
            }

    # 3. "무슨 홈페이지야?" 같은 사이트 소개 인텐트 처리
    if any(kw in user_msg for kw in ['무슨 홈페이지', '어떤 사이트', '여기 뭐하는', '소개해줘', '홈페이지 설명', '어떤 곳']):
        intro_text = (
            "✨ **MT AI Navi Studio**는 최신 AI 기술과 다양한 유틸리티 기능을 통합하여 제공하는 **차세대 올인원 AI 웹 스튜디오**입니다! 🤖\n\n"
            "• **아트 & 포춘 스튜디오**: AI 작품 비평, 이미지 효과 변환, 띠/별자리 기반 AI 운세 측정을 제공합니다.\n"
            "• **기타 도구**: 딥러닝, 파인튜닝, OpenCV, 일기예보, 캘린더, 지도, 계산기 등\n\n"
            "원하시는 메뉴(예: **'아트 운세로'**, **'포춘 변환 보여줘'**)를 편하게 말씀해 주세요!"
        )
        return {"reply": intro_text, "action": None}

    # 4. 각 메뉴별 역할 및 설명 안내 인텐트 처리
    menu_explanations = {
        '딥러닝': "🧠 **딥러닝 메뉴**: 신경망 모델의 학습 상태를 실시간으로 모니터링하고 하이퍼파라미터를 시각적으로 조정할 수 있는 공간입니다.",
        '파인튜닝': "⚡ **파인튜닝 메뉴**: 커스텀 데이터셋을 활용해 맞춤형 AI 모델의 가중치를 최적화하고 관리하는 도구입니다.",
        'opencv': "👁️ **OpenCV 메뉴**: 실시간 웹캠/영상 필터링, 이미지 처리 및 객체 감지 알고리즘을 테스트할 수 있습니다.",
        '아트': "🎨 **아트 & 포춘 스튜디오**: 1) AI 작품 비평, 2) 이미지 효과 변환, 3) 5가지 지표의 정밀 AI 운세 측정을 지원하는 복합 문화/분석 공간입니다.",
        '포춘': "🎨 **아트 & 포춘 스튜디오**: 1) AI 작품 비평, 2) 이미지 효과 변환, 3) 5가지 지표의 정밀 AI 운세 측정을 지원하는 복합 문화/분석 공간입니다.",
        '일기예보': "🌤️ **일기예보 메뉴**: 실시간 기상 정보 확인 및 지역별 기후 데이터를 분석해 주는 유틸리티입니다.",
        '날씨': "🌤️ **일기예보 메뉴**: 실시간 기상 정보 확인 및 지역별 기후 데이터를 분석해 주는 유틸리티입니다.",
        '캘린더': "📅 **캘린더 메뉴**: 개인 일정 관리 및 AI 스케줄링을 체계적으로 정리할 수 있는 달력 서비스입니다.",
        '지도': "🗺️ **지도 메뉴**: 위치 기반 네비게이션 및 공간 데이터를 직관적으로 시각화합니다.",
        '계산기': "🔢 **계산기 메뉴**: 각종 수치 연산 및 과학용/데이터 계산을 수행할 수 있는 도구입니다."
    }

    if any(q_word in user_msg for q_word in ['뭐야', '설명', '역할', '기능', '어떤']):
        for keyword, desc in menu_explanations.items():
            if keyword in user_msg:
                return {"reply": desc, "action": None}

    # 5. 그 외 일반 대화는 Gemini API로 처리
    try:
        client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
        response = client.models.generate_content(
            model='gmodels/gemini-flash-lite-latest',
            contents=f"사용자 질문: {user_msg}\n친절하고 간결한 AI 어시스턴트로서 답변해줘."
        )
        return {
            "reply": response.text,
            "action": None
        }
    except Exception as e:
        return {
            "reply": f"입력하신 내용('{req.message}')을 접수했습니다. '아트 운세로'나 '포춘 변환 보여줘'처럼 메뉴 이동을 요청하실 수 있습니다!",
            "action": None
        }