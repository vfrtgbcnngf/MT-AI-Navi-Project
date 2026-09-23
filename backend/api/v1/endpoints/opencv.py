from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse, Response
import pandas as pd
import io
import openpyxl
from openpyxl.styles import Alignment, Border, Side, PatternFill, Font
import json
import os
import time
from dotenv import load_dotenv
from google import genai
from google.genai import types
from openpyxl.styles import Border, Side

load_dotenv()

router = APIRouter(prefix="/opencv", tags=["OpenCV"])

api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("⚠️ 경고: GEMINI_API_KEY가 .env 파일에 감지되지 않았습니다.")

client = genai.Client(api_key=api_key)


# ==========================================
# 1. 원본 유지: 일반 텍스트 + 표 혼합 추출
# ==========================================
@router.post("/extract-text-table")
async def extract_text_table(file: UploadFile = File(...)):
    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="유효하지 않은 이미지 파일입니다.")

    prompt = (
        "You are an expert OCR and document layout analysis engine. "
        "Analyze the image and extract ALL contents into a strict JSON object with two fields:\n"
        "1. 'text_content': A string containing all general text paragraphs, titles, or descriptions found outside or alongside the table.\n"
        "2. 'table_data': A 2D array (list of lists of strings) representing the table structure. "
        "Ensure that EVERY row in 'table_data' has the exact same number of columns matching the grid layout. "
        "For empty cells, merged cells, or missing values, insert empty strings \"\" to prevent column shifts.\n"
        "CRITICAL: Return ONLY valid JSON. No markdown formatting like ```json."
    )

    max_retries = 3
    retry_delay = 3

    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model='models/gemini-flash-lite-latest', 
                contents=[
                    types.Part.from_bytes(
                        data=image_bytes,
                        mime_type=file.content_type or "image/jpeg",
                    ),
                    prompt
                ]
            )

            raw_text = response.text.strip()
            
            if raw_text.startswith("```"):
                raw_text = raw_text.split("```")[1]
                if raw_text.startswith("json"):
                    raw_text = raw_text[4:].strip()
                raw_text = raw_text.rstrip("`").strip()

            parsed_data = json.loads(raw_text)
            return JSONResponse(content=parsed_data)

        except Exception as e:
            print(f"⚠️ 시도 {attempt + 1}/{max_retries} 실패: {str(e)}")
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
            else:
                raise HTTPException(
                    status_code=503, 
                    detail=f"제미나이 서버 혼잡(503)으로 처리 실패: {str(e)}"
                )


# ==========================================
# 2. 원본 유지: 일반 엑셀 다운로드
# ==========================================
@router.post("/download-excel")
async def download_excel(data: dict):
    try:
        table_data = data.get("table_data", [])
        text_content = data.get("text_content", "")

        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            rows_to_write = []
            if text_content:
                for line in text_content.split("\n"):
                    rows_to_write.append([line])
                rows_to_write.append([])  # 빈 줄 구분
            
            table_start_row = len(rows_to_write) + 1  # 엑셀 상 표 시작 행 위치

            if table_data:
                max_cols = max(len(row) for row in table_data)
                for row in table_data:
                    while len(row) < max_cols:
                        row.append("")
                    rows_to_write.append([str(cell) if cell is not None else "" for cell in row[:max_cols]])

            df = pd.DataFrame(rows_to_write)
            df.to_excel(writer, index=False, header=False, sheet_name='Document')

        output.seek(0)
        wb = openpyxl.load_workbook(output)
        ws = wb.active

        thin_border = Border(
            left=Side(style='thin', color='000000'),
            right=Side(style='thin', color='000000'),
            top=Side(style='thin', color='000000'),
            bottom=Side(style='thin', color='000000')
        )
        header_fill = PatternFill(start_color="EAEAEA", end_color="EAEAEA", fill_type="solid")
        header_font = Font(bold=True)

        if table_data:
            for row_idx in range(table_start_row, ws.max_row + 1):
                for col_idx in range(1, max_cols + 1):
                    cell = ws.cell(row=row_idx, column=col_idx)
                    cell.border = thin_border
                    if row_idx == table_start_row:
                        cell.fill = header_fill
                        cell.font = header_font
                        cell.alignment = Alignment(horizontal="center", vertical="center")

        for col in ws.columns:
            col_letter = openpyxl.utils.get_column_letter(col[0].column)
            max_len = max((len(str(cell.value or '')) for cell in col), default=10)
            ws.column_dimensions[col_letter].width = max(max_len + 4, 18)

        final_output = io.BytesIO()
        wb.save(final_output)
        final_output.seek(0)

        return Response(
            content=final_output.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=mixed_document_result.xlsx"}
        )
    except Exception as e:
        print(f"🔥 Excel Generation Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"엑셀 생성 중 오류 발생: {str(e)}")


# ==========================================
# 3. 원본 유지: 표 없는 텍스트 전용 엑셀 다운로드
# ==========================================
@router.post("/download-text-excel")
async def download_text_excel(data: dict):
    try:
        text_content = data.get("text_content", "")
        if not text_content:
            raise HTTPException(status_code=400, detail="변환할 텍스트 내용이 없습니다.")

        lines = text_content.split("\n")
        cleaned_data = [[line] for line in lines]

        df = pd.DataFrame(cleaned_data)
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, header=False, sheet_name='DocumentText')
        
        output.seek(0)
        wb = openpyxl.load_workbook(output)
        ws = wb.active

        for col in ws.columns:
            col_letter = openpyxl.utils.get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = 80

        final_output = io.BytesIO()
        wb.save(final_output)
        final_output.seek(0)

        return Response(
            content=final_output.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=recognized_document.xlsx"}
        )
    except Exception as e:
        print(f"🔥 Text Excel Generation Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"텍스트 엑셀 생성 중 오류 발생: {str(e)}")


# ==========================================
# 4. 셀 병합 표 + 일반 텍스트 동시 추출
# ==========================================
@router.post("/extract-merged-table")
async def extract_merged_table(file: UploadFile = File(...)):
    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="유효하지 않은 이미지 파일입니다.")

    prompt = (
        "You are an expert OCR and complex table layout analysis engine. "
        "Analyze the image and extract contents into a strict JSON object with TWO fields:\n"
        "1. 'text_content': A string containing all general text paragraphs, titles, or descriptions found outside or alongside the table.\n"
        "2. 'merged_table_data': A 2D array (list of lists of strings) representing the exact table grid. "
        "For cells that span vertically or horizontally across multiple rows or columns, replicate the exact cell text in all corresponding grid slots so that the grid shape and alignment are perfectly preserved. "
        "Ensure every row has the exact same number of columns.\n"
        "CRITICAL: Return ONLY valid JSON format. No markdown formatting like ```json."
    )

    max_retries = 3
    retry_delay = 3

    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model='models/gemini-flash-lite-latest', 
                contents=[
                    types.Part.from_bytes(
                        data=image_bytes,
                        mime_type=file.content_type or "image/jpeg",
                    ),
                    prompt
                ]
            )

            raw_text = response.text.strip()
            
            if raw_text.startswith("```"):
                raw_text = raw_text.split("```")[1]
                if raw_text.startswith("json"):
                    raw_text = raw_text[4:].strip()
                raw_text = raw_text.rstrip("`").strip()

            parsed_data = json.loads(raw_text)
            return JSONResponse(content=parsed_data)

        except Exception as e:
            print(f"⚠️ 표 분석 시도 {attempt + 1}/{max_retries} 실패: {str(e)}")
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
            else:
                raise HTTPException(
                    status_code=503, 
                    detail=f"제미나이 서버 혼잡(503)으로 처리 실패: {str(e)}"
                )


# ==========================================
# 5. 기존 병합 표 전용 엑셀 다운로드
# ==========================================
@router.post("/extract-merged-table")
async def extract_merged_table(file: UploadFile = File(...)):
    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="유효하지 않은 이미지 파일입니다.")

    # 어떤 복잡한 문서(행정서식, 계약서, 복합 표)든 완벽하게 그리드와 병합 구조를 파싱하도록 프롬프트 고도화
    prompt = (
        "You are an expert document layout and complex table structure analysis engine. "
        "Analyze the image and extract ALL contents into a strict JSON object with TWO fields:\n"
        "1. 'text_content': A string containing all general text paragraphs, titles, headings, or descriptions found outside or alongside the table.\n"
        "2. 'merged_table_data': A 2D array (list of lists of strings) representing the table structure. "
        "CRITICAL RULES FOR TABLE EXTRACTION:\n"
        "- Represent every single cell in the logical grid. To handle merged cells accurately, repeat the text in every cell that belongs to the merged span so that the grid dimensions remain completely uniform (rectangular).\n"
        "- Ensure that EVERY row has the exact same number of columns. Pad missing or empty cells with empty strings \"\".\n"
        "- Preserve all hierarchical headings, subcategories, and detailed descriptions.\n"
        "CRITICAL: Return ONLY valid JSON format. No markdown formatting like ```json."
    )

    max_retries = 3
    retry_delay = 3

    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model='models/gemini-flash-lite-latest', 
                contents=[
                    types.Part.from_bytes(
                        data=image_bytes,
                        mime_type=file.content_type or "image/jpeg",
                    ),
                    prompt
                ]
            )

            raw_text = response.text.strip()
            
            if raw_text.startswith("```"):
                raw_text = raw_text.split("```")[1]
                if raw_text.startswith("json"):
                    raw_text = raw_text[4:].strip()
                raw_text = raw_text.rstrip("`").strip()

            parsed_data = json.loads(raw_text)
            return JSONResponse(content=parsed_data)

        except Exception as e:
            print(f"⚠️ 표 분석 시도 {attempt + 1}/{max_retries} 실패: {str(e)}")
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
            else:
                raise HTTPException(
                    status_code=503, 
                    detail=f"제미나이 서버 혼잡(503)으로 처리 실패: {str(e)}"
                )


# ==============================================================================
# 🚀 [신규 추가] 일반 텍스트 + 셀 병합 표 통합 엑셀 다운로드 엔드포인트
# ==============================================================================
@router.post("/download-merged-excel")
async def download_merged_excel(data: dict):
    return await _generate_intelligent_merged_excel(data)

@router.post("/download-mixed-merged-excel")
async def download_mixed_merged_excel(data: dict):
    return await _generate_intelligent_merged_excel(data)


async def _generate_intelligent_merged_excel(data: dict):
    try:
        text_content = data.get("text_content", "")
        table_data = data.get("merged_table_data", []) or data.get("table_data", [])

        if not text_content and not table_data:
            raise HTTPException(status_code=400, detail="다운로드할 표 또는 텍스트 데이터가 없습니다.")

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "MergedDocument"

        current_row = 1

        # 1. 상단 일반 텍스트 배치
        if text_content:
            for line in text_content.split("\n"):
                ws.cell(row=current_row, column=1, value=line)
                current_row += 1
            current_row += 1  # 여백 행

        table_start_row = current_row
        max_cols = 1

        if table_data:
            max_cols = max(len(row) for row in table_data)
            max_rows = len(table_data)

            # 그리드 정규화
            normalized_grid = []
            for row in table_data:
                row_padded = [str(cell) if cell is not None else "" for cell in row]
                while len(row_padded) < max_cols:
                    row_padded.append("")
                normalized_grid.append(row_padded)

            # 2. 데이터 셀 기본 기입
            for r_i in range(max_rows):
                for c_i in range(max_cols):
                    ws.cell(row=table_start_row + r_i, column=c_i + 1, value=normalized_grid[r_i][c_i])

            # 3. 🧠 지능형 세로/가로 병합 처리 (중복 텍스트 자동 탐지 후 셀 병합)
            # 세로 방향 연속 동일 텍스트 병합
            for c_i in range(max_cols):
                r_i = 0
                while r_i < max_rows:
                    val = normalized_grid[r_i][c_i].strip()
                    if not val:
                        r_i += 1
                        continue
                    
                    end_r = r_i
                    while end_r + 1 < max_rows and normalized_grid[end_r + 1][c_i].strip() == val:
                        end_r += 1
                    
                    if end_r > r_i:
                        try:
                            ws.merge_cells(
                                start_row=table_start_row + r_i,
                                start_column=c_i + 1,
                                end_row=table_start_row + end_r,
                                end_column=c_i + 1
                            )
                        except Exception:
                            pass
                        r_i = end_r
                    r_i += 1

            # 가로 방향 연속 동일 텍스트 병합
            for r_i in range(max_rows):
                c_i = 0
                while c_i < max_cols:
                    val = normalized_grid[r_i][c_i].strip()
                    if not val:
                        c_i += 1
                        continue
                    
                    end_c = c_i
                    while end_c + 1 < max_cols and normalized_grid[r_i][end_c + 1].strip() == val:
                        end_c += 1
                    
                    if end_c > c_i:
                        try:
                            ws.merge_cells(
                                start_row=table_start_row + r_i,
                                start_column=c_i + 1,
                                end_row=table_start_row + r_i,
                                end_column=end_c + 1
                            )
                        except Exception:
                            pass
                        c_i = end_c
                    c_i += 1

        # 4. 전체 스타일링 (테두리, 정렬, 줄바꿈)
        thin_border = Border(
            left=Side(style='thin', color='000000'),
            right=Side(style='thin', color='000000'),
            top=Side(style='thin', color='000000'),
            bottom=Side(style='thin', color='000000')
        )
        header_fill = PatternFill(start_color="EAEAEA", end_color="EAEAEA", fill_type="solid")
        header_font = Font(bold=True)

        total_end_row = table_start_row + len(table_data) - 1 if table_data else ws.max_row
        for r in range(table_start_row, total_end_row + 1):
            for c in range(1, max_cols + 1):
                cell = ws.cell(row=r, column=c)
                cell.border = thin_border
                cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
                if r == table_start_row:
                    cell.fill = header_fill
                    cell.font = header_font

        # 5. 열 너비 자동 최적화
        for col in ws.columns:
            col_letter = openpyxl.utils.get_column_letter(col[0].column)
            max_len = max((len(str(cell.value or '')) for cell in col), default=10)
            ws.column_dimensions[col_letter].width = max(max_len + 4, 18)

        final_output = io.BytesIO()
        wb.save(final_output)
        final_output.seek(0)

        return Response(
            content=final_output.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=merged_table_result.xlsx"}
        )

    except Exception as e:
        print(f"🔥 Merged Excel Generation Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"병합 엑셀 생성 중 오류 발생: {str(e)}")