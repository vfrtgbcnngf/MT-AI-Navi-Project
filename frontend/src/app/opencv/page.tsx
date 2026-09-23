"use client";

import React, { useState } from 'react';

export default function OpenCVTablePage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  
  const [tableData, setTableData] = useState<string[][]>([]);
  const [textContent, setTextContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const API_BASE_URL = 
    typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://localhost:8000'
      : 'https://mt-ai-navi-project.onrender.com'; // 👈 본인의 실제 Render 백엔드 주소로 딱 한 번만 입력해두세요!

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setTableData([]);
      setTextContent('');
    }
  };

  const handleExtractText = async () => {
    if (!file) return alert('이미지를 먼저 업로드해주세요.');

    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/opencv/extract-merged-table`, {
        method: 'POST',
        body: formData,
      });

      const responseText = await res.text();
      
      if (!res.ok) {
        throw new Error(`서버 에러 (${res.status}): ${responseText}`);
      }

      const result = JSON.parse(responseText);
      
      setTableData(result.merged_table_data || result.table_data || []);
      setTextContent(result.text_content || result.text || '');

    } catch (err: any) {
      console.error('분석 중 에러 발생:', err);
      alert(`오류 발생: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (!textContent && tableData.length === 0) {
      return alert('다운로드할 내용이 없습니다.');
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/opencv/download-mixed-merged-excel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text_content: textContent, 
          merged_table_data: tableData 
        }),
      });

      if (!res.ok) throw new Error('통합 엑셀 파일 생성 실패');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'integrated_document_result.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      alert('파일 다운로드 중 오류가 발생했습니다.');
    }
  };

  const maxCols = tableData.length > 0 ? Math.max(...tableData.map(row => row.length)) : 0;
  const normalizedTableData = tableData.map(row => {
    const newRow = [...row];
    while (newRow.length < maxCols) {
      newRow.push('');
    }
    return newRow;
  });

  const headerRow = normalizedTableData.length > 0 ? normalizedTableData[0] : [];
  const bodyRows = normalizedTableData.length > 1 ? normalizedTableData.slice(1) : [];
  const hasTable = tableData.length > 0;
  const hasText = textContent && textContent.trim().length > 0;

  return (
    <div className="min-h-screen bg-slate-100 p-8 flex flex-col items-center">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl p-8 space-y-6">
        
        <div>
          <h2 className="text-2xl font-bold text-slate-800">📸 병합 표 및 공문서 전문 분석 시스템</h2>
          <p className="text-sm text-slate-500 mt-1">
            표와 서술형 일반 텍스트가 혼재된 문서를 정밀하게 분석하여 화면에 출력하고 엑셀로 내보냅니다.
          </p>
        </div>

        <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-6 bg-slate-50 relative cursor-pointer hover:bg-slate-100/50 transition">
          <input 
            type="file" 
            accept="image/*" 
            onChange={handleFileChange} 
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
          {preview ? (
            <div className="flex flex-col items-center space-y-3">
              <img src={preview} alt="미리보기" className="max-h-40 object-contain rounded-lg shadow border" />
              <span className="text-xs text-indigo-600 font-semibold">클릭하여 다른 이미지로 교체</span>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2 text-center">
              <span className="text-3xl">📁</span>
              <span className="text-sm font-medium text-slate-700">분석할 문서 이미지를 여기에 업로드하세요</span>
            </div>
          )}
        </div>

        <button
          onClick={handleExtractText}
          disabled={!file || isLoading}
          className={`w-full py-3 px-4 rounded-xl font-bold text-white transition ${
            !file || isLoading ? 'bg-slate-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {isLoading ? 'AI가 문서 내용을 정밀 분석 중입니다...' : '🔍 문서 분석 시작'}
        </button>

        {(hasTable || hasText) && (
          <div className="space-y-6 pt-4 border-t border-slate-200">
            <div className="flex flex-wrap justify-between items-center bg-emerald-50 p-4 rounded-xl border border-emerald-200 gap-3">
              <span className="font-bold text-emerald-800">✨ 문서 분석 완료</span>
              
              <button
                onClick={handleDownloadExcel}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-5 rounded-lg shadow-md transition text-sm flex items-center space-x-1.5 cursor-pointer"
              >
                <span>📥 엑셀 다운로드</span>
              </button>
            </div>

            {hasText && (
              <div className="space-y-2">
                <h3 className="text-md font-bold text-slate-700">📝 추출된 일반 텍스트 / 본문</h3>
                <div className="p-4 bg-slate-50 border border-slate-300 rounded-xl whitespace-pre-wrap text-slate-700 text-sm leading-relaxed max-h-[300px] overflow-y-auto">
                  {textContent}
                </div>
              </div>
            )}

            {hasTable && (
              <div className="space-y-2">
                <h3 className="text-md font-bold text-slate-700">📊 감지된 표 영역</h3>
                <div className="overflow-x-auto border border-slate-300 rounded-xl max-h-[500px] shadow-sm">
                  <table className="w-full border-collapse border border-slate-300 bg-white text-sm text-left">
                    {headerRow.length > 0 && (
                      <thead>
                        <tr className="bg-slate-100 text-slate-800 font-bold text-center">
                          {headerRow.map((thText, idx) => (
                            <th key={idx} className="p-3 border border-slate-300">
                              {thText || '-'}
                            </th>
                          ))}
                        </tr>
                      </thead>
                    )}
                    <tbody>
                      {bodyRows.map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-slate-50">
                          {row.map((cellText, cellIndex) => {
                            const isEmpty = !cellText || String(cellText).trim() === '';
                            return (
                              <td 
                                key={cellIndex} 
                                className={`p-3 border border-slate-200 align-middle ${
                                  cellIndex === 0 ? 'font-medium bg-slate-50/50 text-center' : ''
                                } ${isEmpty ? 'text-slate-300 italic text-center' : 'text-slate-700'}`}
                              >
                                {isEmpty ? '-' : cellText}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
