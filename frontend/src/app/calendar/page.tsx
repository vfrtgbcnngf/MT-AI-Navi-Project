"use client";

import React, { useState, useEffect } from 'react';

interface Schedule {
  id: string;
  title: string;
  time: string;
}

interface DayData {
  is_red: boolean;
  holiday_name: string | null;
  day_of_week: string;
  items: Schedule[];
}

interface CalendarDB {
  [date: string]: DayData;
}

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedulesData, setSchedulesData] = useState<CalendarDB>({});
  
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  const API_BASE_URL = 
    typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://localhost:8000'
      : 'https://your-backend-url.onrender.com'; // 👈 본인의 실제 Render 백엔드 주소로 딱 한 번만 입력해두세요!
  
  const [newTitle, setNewTitle] = useState("");
  const [newTime, setNewTime] = useState("09:00");


  const [editingValues, setEditingValues] = useState<{ [id: string]: { title: string; time: string } }>({});

  const [aiCommand, setAiCommand] = useState("");
  const [aiResponseMsg, setAiResponseMsg] = useState("AI에게 자연어로 일정을 등록, 수정, 삭제, 조회해달라고 부탁해보세요!");
  const [isAiLoading, setIsAiLoading] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const lastDayDate = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const prevYear = () => setCurrentDate(new Date(year - 1, month, 1));
  const nextYear = () => setCurrentDate(new Date(year + 1, month, 1));

  const fetchSchedules = async (targetYear: number, targetMonth: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/calendar/schedules?year=${targetYear}&month=${targetMonth + 1}`);
      const result = await res.json();
      if (result.success) {
        setSchedulesData(result.data);
      }
    } catch (err) {
      console.error("일정 및 공휴일 불러오기 실패:", err);
    }
  };

  useEffect(() => {
    fetchSchedules(year, month);
  }, [year, month]);

  const handleDateClick = (day: number) => {
    const formattedMonth = String(month + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const dateStr = `${year}-${formattedMonth}-${formattedDay}`;
    
    setSelectedDateStr(dateStr);
    setNewTitle("");
    setNewTime("09:00");

    const currentItems = schedulesData[dateStr]?.items || [];
    const initialEditState: { [id: string]: { title: string; time: string } } = {};
    currentItems.forEach(item => {
      initialEditState[item.id] = { title: item.title, time: item.time };
    });
    setEditingValues(initialEditState); // 👈 상태가 바로 반영되도록 설정
  }

  // 일정이 없을 때 저장 및 자동 닫힘
  const handleSaveNewSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDateStr || !newTitle.trim()) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/calendar/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDateStr, title: newTitle, time: newTime })
      });
      const result = await res.json();
      if (result.success) {
        fetchSchedules(year, month);
        setNewTitle("");
        setNewTime("09:00");
        setSelectedDateStr(null); // 자동 닫힘
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 기존 일정이 있을 때 하단에서 추가 및 자동 닫힘
  const handleAddSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDateStr || !newTitle.trim()) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/calendar/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDateStr, title: newTitle, time: newTime })
      });
      const result = await res.json();
      if (result.success) {
        fetchSchedules(year, month);
        setNewTitle("");
        setNewTime("09:00");
        setSelectedDateStr(null); // 추가 버튼 누른 후 폼 자동 닫힘 반영
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateSchedule = async (id: string) => {
    if (!selectedDateStr) return;
    const targetEdit = editingValues[id];
    if (!targetEdit || !targetEdit.title.trim()) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/calendar/schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          date: selectedDateStr, 
          id: id, 
          title: targetEdit.title, 
          time: targetEdit.time 
        })
      });
      const result = await res.json();
      if (result.success) {
        fetchSchedules(year, month);
        setSelectedDateStr(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!selectedDateStr) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/calendar/schedule/${selectedDateStr}/${id}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (result.success) {
        fetchSchedules(year, month);
        setSelectedDateStr(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFieldChange = (id: string, field: 'title' | 'time', value: string) => {
    setEditingValues(prev => ({
      ...prev,
      [id]: {
        title: field === 'title' ? value : (prev[id]?.title || ''),
        time: field === 'time' ? value : (prev[id]?.time || '09:00')
      }
    }));
  };

  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiCommand.trim() || isAiLoading) return;

    setIsAiLoading(true);
    const todayStr = new Date().toISOString().split('T')[0];

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/calendar/ai-command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          command: aiCommand, 
          current_date: todayStr,
          current_view_year: year,       // 현재 화면 연도 (예: 2026)
          current_view_month: month + 1  // 현재 화면 월 (1~12)
        })
      });
      const data = await res.json();
      if (data.success) {
        setAiResponseMsg(data.message);

        // 백엔드가 계산해 준 target_year와 target_month가 있으면 화면 이동
        if (data.target_year && data.target_month) {
          setCurrentDate(new Date(data.target_year, data.target_month - 1, 1));
          fetchSchedules(data.target_year, data.target_month - 1);
        } else {
          fetchSchedules(year, month);
        }
      }
    } catch (err) {
      console.error(err);
      setAiResponseMsg("⚠️ AI 통신 중 오류가 발생했습니다.");
    } finally {
      setIsAiLoading(false);
      setAiCommand("");
    }
  };

  const daySchedules = selectedDateStr ? (schedulesData[selectedDateStr]?.items || []) : [];

  

  return (
    <div className="p-8 bg-slate-50 text-slate-900 min-h-screen space-y-8">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-pink-600">
          📅 AI 스마트 캘린더
        </h1>
        <p className="text-sm text-slate-500 mt-1">공휴일 및 주말 자동 빨간색 표시, AI 자연어 일정 관리를 지원합니다.</p>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-sm space-y-3">
        <h2 className="text-xs font-bold text-indigo-600 uppercase tracking-wider">✨ AI 자연어 비서</h2>
        <form onSubmit={handleAiSubmit} className="flex gap-2">
          <input 
            type="text" 
            value={aiCommand}
            onChange={(e) => setAiCommand(e.target.value)}
            placeholder="예: '내일 오후 3시에 미팅 잡아줘', '이번 주 일정 뭐 있어?'"
            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
          />
          <button 
            type="submit" 
            disabled={isAiLoading}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl shadow transition disabled:opacity-50"
          >
            {isAiLoading ? '분석 중...' : '🤖 AI 요청하기'}
          </button>
        </form>
        <p className="text-xs text-slate-600 bg-indigo-50 p-3 rounded-xl font-medium">{aiResponseMsg}</p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <button onClick={prevYear} className="p-2 hover:bg-slate-100 rounded-lg text-sm font-bold">〈〈 년</button>
              <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-lg text-sm font-bold">〈 월</button>
            </div>
            <h2 className="text-xl font-black text-slate-800">
              {year}년 {month + 1}월
            </h2>
            <div className="flex items-center gap-1">
              <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-lg text-sm font-bold">월 〉</button>
              <button onClick={nextYear} className="p-2 hover:bg-slate-100 rounded-lg text-sm font-bold">년 〉〉</button>
            </div>
          </div>
          <button 
            onClick={() => setCurrentDate(new Date())} 
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-bold rounded-lg text-slate-700 transition"
          >
            오늘로 이동
          </button>
        </div>

        <div className="grid grid-cols-7 text-center font-bold text-xs text-slate-400 border-b pb-2">
          <span className="text-red-500">일</span>
          <span>월</span><span>화</span><span>수</span><span>목</span><span>금</span>
          <span className="text-blue-500">토</span>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: firstDayIndex }).map((_, i) => (
            <div key={`empty-${i}`} className="h-28 bg-slate-50/50 rounded-xl border border-transparent"></div>
          ))}

          {Array.from({ length: lastDayDate }).map((_, i) => {
            const day = i + 1;
            const formattedMonth = String(month + 1).padStart(2, '0');
            const formattedDay = String(day).padStart(2, '0');
            const dateStr = `${year}-${formattedMonth}-${formattedDay}`;
            
            const dayData = schedulesData[dateStr];
            const isRed = dayData?.is_red ?? false;
            const holidayName = dayData?.holiday_name;
            const daySchedulesList = dayData?.items || [];

            return (
              <div 
                key={day}
                onClick={() => handleDateClick(day)}
                className="h-28 p-2 bg-white border border-slate-200 rounded-xl hover:border-indigo-500 hover:shadow-md transition cursor-pointer flex flex-col overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${isRed ? 'text-red-500' : 'text-slate-700'}`}>
                    {day}
                  </span>
                  {holidayName && (
                    <span className="text-[9px] bg-red-50 text-red-600 px-1 py-0.5 rounded font-bold truncate max-w-[70px]">
                      {holidayName}
                    </span>
                  )}
                </div>
                <div className="mt-1 space-y-1 overflow-y-auto flex-1">
                  {daySchedulesList.map((item) => (
                    <div key={item.id} className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-semibold break-words leading-tight">
                      {item.time} {item.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedDateStr && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md max-h-[85vh] p-6 rounded-2xl shadow-xl flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b pb-3 shrink-0">
              <h3 className="font-black text-slate-800 text-base">📌 {selectedDateStr} 일정 관리</h3>
              <button onClick={() => setSelectedDateStr(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-4 pr-1">
              {daySchedules.length > 0 ? (
                <>
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-500">등록된 일정 목록</h4>
                    {daySchedules.map((item) => {
                      const currentEdit = {
                        title: (editingValues[item.id]?.title ?? item.title) || "",
                        time: (editingValues[item.id]?.time ?? item.time) || "09:00"
                      };
                      return (
                        <div key={item.id} className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                          <input 
                            type="time" 
                            value={currentEdit.time}
                            onChange={(e) => handleFieldChange(item.id, 'time', e.target.value)}
                            className="px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold w-24"
                          />
                          <input 
                            type="text" 
                            value={currentEdit.title}
                            onChange={(e) => handleFieldChange(item.id, 'title', e.target.value)}
                            className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                          />
                          <div className="flex gap-1 shrink-0">
                            <button 
                              type="button"
                              onClick={() => handleUpdateSchedule(item.id)} 
                              className="px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg font-bold text-xs transition"
                            >
                              수정
                            </button>
                            <button 
                              type="button"
                              onClick={() => handleDeleteSchedule(item.id)} 
                              className="px-2.5 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-bold text-xs transition"
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <form onSubmit={handleAddSchedule} className="space-y-3 pt-3 border-t">
                    <h4 className="text-xs font-bold text-indigo-600">➕ 새로운 일정 추가하기</h4>
                    <div className="flex gap-2">
                      <input 
                        type="time" 
                        value={newTime}
                        onChange={(e) => setNewTime(e.target.value)}
                        className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold w-28"
                      />
                      <input 
                        type="text" 
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="새로운 일정 내용을 입력하세요"
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                      />
                    </div>
                    <button type="submit" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow transition">
                      추가
                    </button>
                  </form>
                </>
              ) : (
                <form onSubmit={handleSaveNewSchedule} className="space-y-3">
                  <h4 className="text-xs font-bold text-indigo-600">💾 일정 등록하기</h4>
                  <div className="flex gap-2">
                    <input 
                      type="time" 
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold w-28"
                    />
                    <input 
                      type="text" 
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="일정 내용을 입력하세요"
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                    />
                  </div>
                  <button type="submit" className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow transition">
                    저장
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
