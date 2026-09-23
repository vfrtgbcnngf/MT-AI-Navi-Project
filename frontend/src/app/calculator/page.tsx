'use client';

import React, { useState } from 'react';

// 자주 쓰는 수학 특수기호 목록
const MATH_SYMBOLS = [
  { label: '교집합 (∩)', symbol: '∩' },
  { label: '합집합 (∪)', symbol: '∪' },
  { label: '제곱/지수 (^)', symbol: '^' },
  { label: '제곱근 (√)', symbol: '√' },
  { label: '적분 (∫)', symbol: '∫' },
  { label: '시그마 (∑)', symbol: '∑' },
  { label: '파이 (π)', symbol: 'π' },
  { label: '세타 (θ)', symbol: 'θ' },
  { label: '무한대 (∞)', symbol: '∞' },
  { label: '포함 (⊂)', symbol: '⊂' },
  { label: '포함됨 (⊃)', symbol: '⊃' },
  { label: '여집합 (ᶜ)', symbol: 'ᶜ' },
];

export default function CalculatorPage() {
  const [expression, setExpression] = useState('');
  const [chatLog, setChatLog] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    { sender: 'ai', text: '안녕하세요! 전공 수학 조교입니다. 사칙연산, 로그, 적분, 집합(교집합/합집합)까지 무엇이든 물어보세요!' }
  ]);
  const [loading, setLoading] = useState(false);
  const [showSymbols, setShowSymbols] = useState(false); // 특수기호 목록 표시 여부

  const API_BASE_URL = 
    typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://localhost:8000'
      : 'https://mt-ai-navi-project.onrender.com'; // 👈 본인의 실제 Render 백엔드 주소로 딱 한 번만 입력해두세요!

  // 특수기호 클릭 시 입력창에 추가하고 목록 숨기기
  const handleSymbolClick = (symbol: string) => {
    setExpression((prev) => prev + symbol);
    setShowSymbols(false); // 기호 누르면 목록 숨김
  };

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expression.trim()) return;

    const userQuery = expression;
    setChatLog((prev) => [...prev, { sender: 'user', text: userQuery }]);
    setExpression('');
    setShowSymbols(false); // 전송 시에도 기호 목록 닫기
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/calculator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expression: userQuery }),
      });
      const data = await res.json();

      if (data.success) {
        setChatLog((prev) => [...prev, { sender: 'ai', text: data.response }]);
      } else {
        setChatLog((prev) => [...prev, { sender: 'ai', text: data.response }]);
      }
    } catch (err) {
      setChatLog((prev) => [...prev, { sender: 'ai', text: '백엔드 서버와 통신 중 문제가 발생했습니다. 파이썬 서버가 실행 중인지 확인해주세요!' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-slate-800">🤖 AI 전공 수학 조교</h2>
        <p className="text-sm text-slate-500">수학 공식, 용어 설명, 고차원 풀이 과정을 AI가 상세히 안내해 드립니다.</p>
      </div>

      {/* 대화 로그 영역 */}
      <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-6 overflow-y-auto flex flex-col gap-4 shadow-sm">
        {chatLog.map((chat, idx) => (
          <div key={idx} className={`flex ${chat.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed whitespace-pre-wrap ${
              chat.sender === 'user' 
                ? 'bg-blue-600 text-white rounded-br-xs shadow-sm' 
                : 'bg-slate-50 text-slate-800 rounded-bl-xs border border-slate-200/80 shadow-xs'
            }`}>
              {chat.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-50 text-slate-500 rounded-2xl rounded-bl-xs px-5 py-3.5 text-sm animate-pulse border border-slate-200/80">
              수학 조교가 열심히 풀이와 개념을 정리하고 있습니다... ⏳
            </div>
          </div>
        )}
      </div>

      {/* 특수기호 선택 레이어 (토글 형식) */}
      {showSymbols && (
        <div className="my-2 p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-4 sm:grid-cols-6 gap-2 shadow-sm animate-fadeIn">
          {MATH_SYMBOLS.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSymbolClick(item.symbol)}
              className="px-3 py-2 bg-white border border-slate-200 hover:border-blue-500 hover:bg-blue-50 text-slate-700 text-xs font-medium rounded-lg transition-all shadow-2xs text-center"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* 입력 폼 */}
      <form onSubmit={handleCalculate} className="mt-4 flex gap-2 items-center">
        {/* 특수기호 열기/닫기 토글 버튼 */}
        <button
          type="button"
          onClick={() => setShowSymbols(!showSymbols)}
          className={`px-4 py-3 text-sm font-semibold rounded-xl border transition-colors shadow-sm whitespace-nowrap ${
            showSymbols 
              ? 'bg-slate-800 text-white border-slate-800' 
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
          }`}
        >
          {showSymbols ? '기호 닫기 ✕' : '특수기호 🧮'}
        </button>

        <input 
          type="text" 
          value={expression}
          onChange={(e) => setExpression(e.target.value)}
          placeholder="수식이나 질문을 입력하세요 (예: A ∩ B, log2(16), 적분 등)" 
          className="flex-1 px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 shadow-sm"
        />

        <button 
          type="submit"
          className="px-6 py-3 bg-blue-600 text-white font-semibold text-sm rounded-xl hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap"
        >
          AI에게 물어보기
        </button>
      </form>
    </div>
  );
}
