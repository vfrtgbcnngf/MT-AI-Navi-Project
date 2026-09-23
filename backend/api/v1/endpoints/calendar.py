import os
import json
import calendar as py_calendar
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from google import genai
import holidays
from typing import List, Optional

router = APIRouter(prefix="/calendar", tags=["AI Calendar"])
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

CALENDAR_DB = {}

class ScheduleItem(BaseModel):
    date: str = Field(description="날짜 (YYYY-MM-DD 형식)")
    title: str = Field(description="일정 내용")
    time: str = Field(description="시간 (HH:MM 형식 또는 '시간 미정')")

class AICommandRequest(BaseModel):
    command: str = Field(description="사용자 자연어 명령")
    current_date: str = Field(description="기준 오늘 날짜 (YYYY-MM-DD)")

class AICommandResponse(BaseModel):
    action: str = Field(description="수행할 액션: create, update, delete, query")
    target_date: str = Field(description="대상 날짜 (YYYY-MM-DD)")
    schedule_title: str = Field(description="일정 제목 또는 키워드")
    schedule_time: str = Field(description="일정 시간")
    response_message: str = Field(description="응답 메시지")

def get_day_metadata(date_str: str):
    try:
        dt = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return {"is_red": False, "holiday_name": None, "day_of_week": ""}
    
    # 💡 language='ko' 추가
    kr_holidays = holidays.KR(years=dt.year, language='ko')
    weekday = dt.weekday()
    is_weekend = (weekday >= 5)
    holiday_name = kr_holidays.get(dt)
    
    is_red = is_weekend or (holiday_name is not None)
    days_ko = ["월", "화", "수", "목", "금", "토", "일"]
    
    return {
        "is_red": is_red,
        "holiday_name": holiday_name,
        "day_of_week": days_ko[weekday]
    }

@router.get("/schedules")
def get_all_schedules(year: int = Query(None), month: int = Query(None)):
    """요청된 연도/월의 모든 날짜에 대한 공휴일 및 일정 정보를 병합하여 반환"""
    target_year = year or datetime.now().year
    target_month = month or datetime.now().month
    
    # 💡 language='ko' 추가
    kr_holidays = holidays.KR(years=target_year, language='ko')
    _, last_day = py_calendar.monthrange(target_year, target_month)
    month_data = {}
    
    for day in range(1, last_day + 1):
        date_str = f"{target_year}-{target_month:02d}-{day:02d}"
        dt = datetime.strptime(date_str, "%Y-%m-%d").date()
        
        weekday = dt.weekday()
        is_weekend = (weekday >= 5)
        holiday_name = kr_holidays.get(dt)
        is_red = is_weekend or (holiday_name is not None)
        days_ko = ["월", "화", "수", "목", "금", "토", "일"]
        
        month_data[date_str] = {
            "is_red": is_red,
            "holiday_name": holiday_name,
            "day_of_week": days_ko[weekday],
            "items": CALENDAR_DB.get(date_str, [])
        }
        
    return {"success": True, "data": month_data}

@router.post("/schedule")
def add_manual_schedule(item: ScheduleItem):
    if item.date not in CALENDAR_DB:
        CALENDAR_DB[item.date] = []
    new_entry = {"id": str(datetime.now().timestamp()), "title": item.title, "time": item.time}
    CALENDAR_DB[item.date].append(new_entry)
    meta = get_day_metadata(item.date)
    return {
        "success": True, 
        "is_red": meta["is_red"],
        "holiday_name": meta["holiday_name"],
        "data": CALENDAR_DB[item.date]
    }


class ScheduleUpdateItem(BaseModel):
    date: str = Field(description="날짜 (YYYY-MM-DD)")
    id: str = Field(description="일정 ID")
    title: str = Field(description="수정할 일정 내용")
    time: str = Field(description="수정할 시간")

# 파일 내 기존 엔드포인트들 하단에 추가
@router.put("/schedule")
def update_manual_schedule(item: ScheduleUpdateItem):
    """기존 일정 항목의 ID를 찾아 내용 수정"""
    if item.date in CALENDAR_DB:
        for sched in CALENDAR_DB[item.date]:
            if sched["id"] == item.id:
                sched["title"] = item.title
                sched["time"] = item.time
                break
    meta = get_day_metadata(item.date)
    return {
        "success": True, 
        "is_red": meta["is_red"],
        "holiday_name": meta["holiday_name"],
        "data": CALENDAR_DB.get(item.date, [])
    }

@router.delete("/schedule/{date}/{item_id}")
def delete_manual_schedule(date: str, item_id: str):
    if date in CALENDAR_DB:
        CALENDAR_DB[date] = [item for item in CALENDAR_DB[date] if item["id"] != item_id]
    meta = get_day_metadata(date)
    return {
        "success": True, 
        "is_red": meta["is_red"],
        "holiday_name": meta["holiday_name"],
        "data": CALENDAR_DB.get(date, [])
    }

class AICommandRequest(BaseModel):
    command: str
    current_date: str
    current_view_year: int     # 프론트에서 넘겨준 현재 화면 연도
    current_view_month: int    # 프론트에서 넘겨준 현재 화면 월

# ⬇️ AI가 응답할 때 사용할 스키마 정의 (여기에 target_year, target_month가 반드시 있어야 합니다!)
class SingleCommand(BaseModel):
    action: str = Field(description="create, update, delete, 또는 query")
    target_date: Optional[str] = Field(description="YYYY-MM-DD 형식의 날짜 (상대 날짜인 경우 current_view_year, current_view_month를 기준으로 계산)")
    target_year: Optional[int] = Field(description="이동하거나 조작할 최종 연도 (예: 2026). 달력 이동이나 월 변경 요청 시 반드시 포함")
    target_month: Optional[int] = Field(description="이동하거나 조작할 최종 월 (1~12 숫자). 달력 이동이나 월 변경 요청 시 반드시 포함")
    schedule_title: Optional[str] = Field(description="일정 제목")
    schedule_time: Optional[str] = Field(description="일정 시간 (HH:MM)")
    response_message: Optional[str] = Field(description="사용자에게 보여줄 답변 메시지")

class AICommandResponse(BaseModel):
    commands: List[SingleCommand]

@router.post("/ai-command")
def process_ai_calendar_command(req: AICommandRequest):
    try:
        current_schedules_info = json.dumps(CALENDAR_DB, ensure_ascii=False)
        
        prompt = (
            f"실제 오늘 날짜: {req.current_date}\n"
            f"현재 달력 화면에 표시 중인 기준 연도/월: {req.current_view_year}년 {req.current_view_month}월\n"
            f"사용자 요청: '{req.command}'\n"
            f"현재 캘린더 DB 상태: {current_schedules_info}\n\n"
            "위 사용자 요청을 분석하여 캘린더 조작 및 이동 작업을 수행하세요.\n"
            "**일정 제목(`schedule_title`) 추출 핵심 규칙 (매우 중요)**:\n"
            "1. **불필요한 단어 제거**: '미팅', '새로', '추가', '등록', '해줘', '회의' 등 명령어성 단어나 수식어는 `schedule_title`에 절대 포함하지 마세요.\n"
            "   - 예시: '미팅 등록해줘' -> 제목에 '미팅'이 들어가면 안 되며, 구체적 내용이 없으면 빈 문자열('') 또는 '일정'으로 처리하세요.\n"
            "   - 예시: '새로 팀 회의 추가해줘' -> '새로'를 완전히 배제하고 오직 '팀 회의'만 추출하세요.\n"
            "2. 사용자의 문장에 여러 날짜나 여러 개의 요청이 포함된 경우 각각 독립된 명령으로 분리하여 `commands` 배열에 담으세요.\n"
            "3. 각 명령마다 정확한 `action`, `target_date`, `schedule_title`, `schedule_time`을 지정하세요.\n"
            "4. 달력 이동 요청이 포함된 경우 최종 도달할 `target_year`와 `target_month`를 숫자로 기입하세요."
        )

        response = client.models.generate_content(
            model='models/gemini-flash-lite-latest',
            contents=prompt,
            config={
                'response_mime_type': 'application/json',
                'response_schema': AICommandResponse,
            },
        )
        
        ai_data = json.loads(response.text)
        command_list = ai_data.get("commands", [])
        
        last_target_date = req.current_date
        last_action = "query"
        reply_messages = [] # 👈 메시지들을 담을 리스트 생성
        
        final_target_year = req.current_view_year
        final_target_month = req.current_view_month

        for cmd in command_list:
            action = cmd.get("action")
            target_date = cmd.get("target_date") or req.current_date
            title = cmd.get("schedule_title", "")
            time_str = cmd.get("schedule_time", "09:00")
            
            if cmd.get("target_year"):
                final_target_year = int(cmd.get("target_year"))
            if cmd.get("target_month"):
                final_target_month = int(cmd.get("target_month"))
            
            last_target_date = target_date
            last_action = action
            
            # 👈 각 명령의 응답 메시지를 리스트에 추가
            if cmd.get("response_message"):
                reply_messages.append(cmd.get("response_message"))

            if target_date not in CALENDAR_DB:
                CALENDAR_DB[target_date] = []

            if action == "create":
                new_item = {"id": str(datetime.now().timestamp()) + str(hash(title)), "title": title, "time": time_str}
                CALENDAR_DB[target_date].append(new_item)
            elif action == "delete":
                if not title or title.strip() == "":
                    CALENDAR_DB[target_date] = []
                else:
                    CALENDAR_DB[target_date] = [
                        item for item in CALENDAR_DB[target_date] 
                        if title.replace(" ", "") not in item["title"].replace(" ", "")
                    ]
            elif action == "update":
                for item in CALENDAR_DB[target_date]:
                    item["title"] = title
                    item["time"] = time_str
                    break

        # 👈 수집된 메시지들을 자연스럽게 결합 (메시지가 없으면 기본 문구)
        final_reply = " ".join(reply_messages) if reply_messages else "모든 요청이 처리되었습니다."

        meta = get_day_metadata(last_target_date)
        return {
            "success": True,
            "action": last_action,
            "target_date": last_target_date,
            "target_year": final_target_year,
            "target_month": final_target_month,
            "is_red": meta["is_red"],
            "holiday_name": meta["holiday_name"],
            "day_of_week": meta["day_of_week"],
            "schedules": CALENDAR_DB.get(last_target_date, []),
            "message": final_reply # 👈 합쳐진 메시지 반환
        }
    except Exception as e:
        print(f"AI Calendar Error: {e}")
        raise HTTPException(status_code=500, detail="AI 캘린더 처리 중 오류가 발생했습니다.")