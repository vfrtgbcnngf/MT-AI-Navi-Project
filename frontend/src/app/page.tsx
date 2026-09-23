'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

// 1. 기존에 작성하신 모든 로직이 담긴 내부 컴포넌트
function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 챗봇 대화 내역 상태
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([
    {
      role: 'assistant',
      text: '안녕하세요! MT AI Navi Studio AI 어시스턴트입니다. 🤖\n"로그인 해줘" 또는 "회원가입 보여줘"라고 말씀하시면 모달 창을 열어드립니다.'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 모달 상태 관리 ('login' | 'signup' | null)
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // 회원가입 입력 폼 상태
  const [signupForm, setSignupForm] = useState({
    username: '',
    nickname: '',
    email: '',
    password: '',
    phone: '',
    birth: '',
    interests: [] as string[]
  });

  // 로그인 입력 폼 상태
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });

  // 폼 초기화 함수 추가
  const resetLoginForm = () => {
    setLoginForm({ email: '', password: '' });
  };

  const resetSignupForm = () => {
    setSignupForm({
      username: '',
      nickname: '',
      email: '',
      password: '',
      phone: '',
      birth: '',
      interests: []
    });
  };

  // 모달을 안전하게 열고 닫는 핸들러 (폼 초기화 포함)
  const handleOpenModal = (type: string) => {
    if (type === 'login') {
      resetLoginForm();
    } else if (type === 'signup') {
      resetSignupForm();
    }
    setActiveModal(type);
    router.push(`/?modal=${type}`);
  };

  const handleCloseModal = () => {
    setActiveModal(null);
    resetLoginForm();
    resetSignupForm();
    router.push('/');
  };

  // URL 쿼리 파라미터 감지 및 모달 자동 연동
  useEffect(() => {
    const modalType = searchParams.get('modal');
    if (modalType === 'login' || modalType === 'signup' || modalType === 'signup_detailed') {
      const target = modalType === 'signup_detailed' ? 'signup' : modalType;
      setActiveModal(target);
    } else {
      setActiveModal(null);
    }
  }, [searchParams]);

  // FastAPI 백엔드 에러 객체를 안전하게 문자열 메시지로 변환하는 헬퍼 함수
  const getErrorMessage = (errorData: any, defaultMsg: string) => {
    if (!errorData) return defaultMsg;
    if (typeof errorData.detail === 'string') return errorData.detail;
    if (Array.isArray(errorData.detail)) {
      return errorData.detail.map((err: any) => err.msg).join(', ');
    }
    if (typeof errorData === 'string') return errorData;
    return defaultMsg;
  };

  // FastAPI 백엔드 통신 및 액션 처리 함수
  const handleSendMessage = async (userText: string) => {
    if (!userText.trim()) return;

    setInputValue(''); 

    const newMessages = [...messages, { role: 'user' as const, text: userText }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const res = await fetch('http://localhost:8000/api/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText }),
      });

      const data = await res.json();

      if (res.ok) {
        const aiReply = data.reply;
        const action = data.action; 

        setMessages([...newMessages, { role: 'assistant', text: aiReply }]);

        // 백엔드에서 전달된 액션 처리
        if (action) {
          if (action.type === 'navigate' && action.path) {
            setTimeout(() => {
              router.push(action.path);
            }, 500);
          } else if (action.type === 'open_modal') {
            setTimeout(() => {
              const targetModal = action.target === 'signup_detailed' ? 'signup' : action.target;
              if (targetModal === 'login') resetLoginForm();
              if (targetModal === 'signup') resetSignupForm();
              
              setActiveModal(targetModal);
              router.push(`/?modal=${action.target}`);
            }, 500);
          }
        }

      } else {
        const errorMsg = getErrorMessage(data, '⚠️ 백엔드 응답 오류가 발생했습니다.');
        setMessages([...newMessages, { role: 'assistant', text: errorMsg }]);
      }
    } catch (error) {
      console.error(error);
      setMessages([...newMessages, { role: 'assistant', text: '⚠️ FastAPI 백엔드 서버(Port 8000)와 통신할 수 없습니다. 서버가 실행 중인지 확인해주세요.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  // 회원가입 제출 핸들러
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:8000/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupForm),
      });
      const data = await res.json();
      if (res.ok) {
        alert('회원가입이 완료되었습니다!');
        setActiveModal(null);
        resetSignupForm();
        router.push('/');
      } else {
        const errorMessage = getErrorMessage(data, '회원가입에 실패했습니다.');
        alert(errorMessage);
      }
    } catch (err) {
      console.error(err);
      alert('서버 통신 오류가 발생했습니다.');
    }
  };

  // 로그인 제출 핸들러
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginForm.email,      
          password: loginForm.password
        }),
      });

      const data = await res.json();
      
      if (res.ok) {
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('username', data.username);
        
        window.dispatchEvent(new Event('auth-change'));

        alert('로그인 성공!');
        setActiveModal(null);
        resetLoginForm();
        router.push('/');
      } else {
        const errorMessage = getErrorMessage(data, '로그인에 실패했습니다.');
        alert(errorMessage);
      }
    } catch (err) {
      console.error(err);
      alert('서버 통신 오류가 발생했습니다.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-8 pb-12 relative">
      
      {/* 1. 상단: FastAPI 연동 챗봇 섹션 */}
      <section className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500 flex items-center justify-center shadow-lg text-xl">
                🤖
              </div>
              <div>
                <h2 className="font-bold text-base text-white">MT AI Navi Studio AI Assistant</h2>
                <p className="text-xs text-blue-200">FastAPI Intent Backend + Gemini Integration</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => handleOpenModal('login')}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white rounded-full text-xs font-semibold transition-all cursor-pointer"
              >
                🔐 로그인 팝업
              </button>
              <button 
                onClick={() => handleOpenModal('signup')}
                className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-full text-xs font-semibold transition-all shadow cursor-pointer"
              >
                📝 회원가입 팝업
              </button>
            </div>
          </div>

          {/* 대화 내역 박스 */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 flex flex-col gap-4 max-h-72 overflow-y-auto border border-white/10 shadow-inner">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xl rounded-2xl px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-xs' 
                    : 'bg-white/15 text-slate-100 rounded-bl-xs border border-white/10'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/15 text-slate-300 rounded-2xl px-4 py-3 text-xs animate-pulse">
                  FastAPI 백엔드에서 사용자 의도를 분석 중입니다... ⚙️
                </div>
              </div>
            )}
          </div>

          {/* 빠른 추천 버튼 영역 */}
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => handleSendMessage('회원가입 보여줘')}
              className="px-3 py-1.5 bg-blue-600/60 hover:bg-blue-600 border border-blue-400/40 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              📝 "회원가입 보여줘"
            </button>
            <button 
              onClick={() => handleSendMessage('로그인 해줘')}
              className="px-3 py-1.5 bg-blue-600/60 hover:bg-blue-600 border border-blue-400/40 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              🔐 "로그인 해줘"
            </button>
          </div>

          {/* 직접 입력 폼 */}
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputValue); }} 
            className="flex gap-2"
          >
            <input 
              type="text" 
              value={inputValue} 
              onChange={(e) => setInputValue(e.target.value)} 
              placeholder="예: '회원가입 보여줘', '로그인 해줘'..." 
              className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-xs text-white placeholder-slate-300 focus:outline-none focus:border-blue-400"
            />
            <button 
              type="submit" 
              disabled={isLoading}
              className="px-5 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-xl text-xs transition-all shadow cursor-pointer"
            >
              전송
            </button>
          </form>
        </div>
      </section>

      {/* 2. 하단: 전체 스튜디오 기능 모음 카드 Grid */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">✨ 전체 AI 스튜디오 기능 모음</h2>
          <span className="text-xs text-slate-500">원하시는 메뉴를 선택하여 시작하세요</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/ml-dl" className="group bg-white p-6 rounded-2xl border border-slate-200 hover:border-blue-500/50 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">🧠</div>
              <h3 className="font-bold text-slate-800 text-base group-hover:text-blue-600 transition-colors">딥러닝</h3>
              <p className="text-xs text-slate-500 leading-relaxed">신경망 모델 학습 상태를 모니터링하고 파라미터를 시각적으로 조정합니다.</p>
            </div>
            <span className="text-xs font-semibold text-blue-600 mt-4 flex items-center gap-1">실행하기 &rarr;</span>
          </Link>

          <Link href="/fine-tuning" className="group bg-white p-6 rounded-2xl border border-slate-200 hover:border-blue-500/50 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">⚡</div>
              <h3 className="font-bold text-slate-800 text-base group-hover:text-indigo-600 transition-colors">파인튜닝</h3>
              <p className="text-xs text-slate-500 leading-relaxed">커스텀 데이터셋을 활용해 맞춤형 AI 모델 가중치를 최적화하고 관리합니다.</p>
            </div>
            <span className="text-xs font-semibold text-indigo-600 mt-4 flex items-center gap-1">실행하기 &rarr;</span>
          </Link>

          <Link href="/opencv" className="group bg-white p-6 rounded-2xl border border-slate-200 hover:border-blue-500/50 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">👁️</div>
              <h3 className="font-bold text-slate-800 text-base group-hover:text-emerald-600 transition-colors">OpenCV</h3>
              <p className="text-xs text-slate-500 leading-relaxed">실시간 영상 및 이미지 필터링, 객체 감지 알고리즘 테스트를 수행합니다.</p>
            </div>
            <span className="text-xs font-semibold text-emerald-600 mt-4 flex items-center gap-1">실행하기 &rarr;</span>
          </Link>

          <Link href="/art-critique" className="group bg-white p-6 rounded-2xl border border-slate-200 hover:border-blue-500/50 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">🎨</div>
              <h3 className="font-bold text-slate-800 text-base group-hover:text-amber-600 transition-colors">아트 & 포춘</h3>
              <p className="text-xs text-slate-500 leading-relaxed">이미지 분석 및 변환, Gemini 기반의 AI 사주 및 운세 콘텐츠를 생성합니다.</p>
            </div>
            <span className="text-xs font-semibold text-amber-600 mt-4 flex items-center gap-1">실행하기 &rarr;</span>
          </Link>

          <Link href="/weather" className="group bg-white p-6 rounded-2xl border border-slate-200 hover:border-blue-500/50 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">🌤️</div>
              <h3 className="font-bold text-slate-800 text-base group-hover:text-sky-600 transition-colors">날씨</h3>
              <p className="text-xs text-slate-500 leading-relaxed">실시간 기상 정보 및 지역별 기상 예측 데이터를 조회합니다.</p>
            </div>
            <span className="text-xs font-semibold text-sky-600 mt-4 flex items-center gap-1">실행하기 &rarr;</span>
          </Link>

          <Link href="/calendar" className="group bg-white p-6 rounded-2xl border border-slate-200 hover:border-blue-500/50 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">📅</div>
              <h3 className="font-bold text-slate-800 text-base group-hover:text-rose-600 transition-colors">캘린더</h3>
              <p className="text-xs text-slate-500 leading-relaxed">일정 관리 및 프로젝트 마감일을 체계적으로 관리합니다.</p>
            </div>
            <span className="text-xs font-semibold text-rose-600 mt-4 flex items-center gap-1">실행하기 &rarr;</span>
          </Link>

          <Link href="/map" className="group bg-white p-6 rounded-2xl border border-slate-200 hover:border-blue-500/50 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">🗺️</div>
              <h3 className="font-bold text-slate-800 text-base group-hover:text-teal-600 transition-colors">지도</h3>
              <p className="text-xs text-slate-500 leading-relaxed">위치 기반 정보와 인터랙티브 지도 서비스를 연동하여 확인합니다.</p>
            </div>
            <span className="text-xs font-semibold text-teal-600 mt-4 flex items-center gap-1">실행하기 &rarr;</span>
          </Link>

          <Link href="/calculator" className="group bg-white p-6 rounded-2xl border border-slate-200 hover:border-blue-500/50 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
            <div className="flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold text-lg group-hover:scale-110 transition-transform">🧮</div>
              <h3 className="font-bold text-slate-800 text-base group-hover:text-violet-600 transition-colors">계산기</h3>
              <p className="text-xs text-slate-500 leading-relaxed">다양한 공학 및 데이터 계산 유틸리티를 간편하게 이용합니다.</p>
            </div>
            <span className="text-xs font-semibold text-violet-600 mt-4 flex items-center gap-1">실행하기 &rarr;</span>
          </Link>
        </div>
      </section>

      {/* 3. 모달 팝업 레이어 */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          
          {/* 로그인 모달 */}
          {activeModal === 'login' && (
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-200">
              <button 
                onClick={handleCloseModal}
                className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer"
              >
                ✕
              </button>

              <div>
                <h2 className="text-xl font-bold text-slate-900">로그인</h2>
              </div>

              <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700">이메일</label>
                  <input 
                    type="email" 
                    required
                    placeholder="example@email.com"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    className="px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700">비밀번호</label>
                  <input 
                    type="password" 
                    required
                    placeholder="••••••••"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <button 
                  type="submit"
                  className="mt-2 w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all shadow-md cursor-pointer"
                >
                  로그인하기
                </button>
              </form>
            </div>
          )}

          {/* 회원가입 모달 */}
          {activeModal === 'signup' && (
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl p-8 relative flex flex-col gap-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
              <button 
                onClick={handleCloseModal}
                className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer"
              >
                ✕
              </button>

              <div>
                <h2 className="text-xl font-bold text-slate-900">회원가입</h2>
                <p className="text-xs text-slate-500 mt-1">모든 AI 툴을 무료로 이용하고 다양한 혜택을 받아보세요.</p>
              </div>

              <form onSubmit={handleSignupSubmit} className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-700">이름 (실명)</label>
                    <input 
                      type="text" 
                      required
                      placeholder="홍길동"
                      value={signupForm.username}
                      onChange={(e) => setSignupForm({ ...signupForm, username: e.target.value })}
                      className="px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-700">닉네임</label>
                    <input 
                      type="text" 
                      required
                      placeholder="스튜디오마스터"
                      value={signupForm.nickname}
                      onChange={(e) => setSignupForm({ ...signupForm, nickname: e.target.value })}
                      className="px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700">이메일 주소</label>
                  <input 
                    type="email" 
                    required
                    placeholder="example@email.com"
                    value={signupForm.email}
                    onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                    className="px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-700">비밀번호</label>
                  <input 
                    type="password" 
                    required
                    placeholder="영문, 숫자 조합 8자리 이상"
                    value={signupForm.password}
                    onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                    className="px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-700">휴대폰 번호</label>
                    <input 
                      type="text" 
                      placeholder="010-1234-5678"
                      value={signupForm.phone}
                      onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })}
                      className="px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-700">생년월일</label>
                    <input 
                      type="date" 
                      value={signupForm.birth}
                      onChange={(e) => setSignupForm({ ...signupForm, birth: e.target.value })}
                      className="px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-700">관심 기술 및 분야 (복수 선택 가능)</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['딥러닝/AI', '파인튜닝', 'OpenCV', '웹개발(Next.js)', '백엔드(FastAPI)', '데이터분석'].map((tech) => (
                      <label key={tech} className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 cursor-pointer hover:bg-slate-50">
                        <input 
                          type="checkbox"
                          checked={signupForm.interests.includes(tech)}
                          onChange={(e) => {
                            const updated = e.target.checked 
                              ? [...signupForm.interests, tech]
                              : signupForm.interests.filter(item => item !== tech);
                            setSignupForm({ ...signupForm, interests: updated });
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        {tech}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input type="checkbox" required id="terms" className="rounded text-blue-600 focus:ring-blue-500" />
                  <label htmlFor="terms" className="text-xs text-slate-600 cursor-pointer">
                    [필수] 서비스 이용약관 및 개인정보 처리방침 동의
                  </label>
                </div>

                <button 
                  type="submit"
                  className="mt-2 w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all shadow-md cursor-pointer"
                >
                  가입 완료
                </button>
              </form>
            </div>
          )}

        </div>
      )}

    </div>
  );
}

// 2. Next.js 빌드 에러를 방지하기 위해 Suspense로 감싸는 메인 페이지 컴포넌트
export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh] text-slate-400 text-xs">
        페이지를 불러오는 중입니다... ⚙️
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
