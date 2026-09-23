'use client';

import './globals.css';
import Sidebar from '@/components/Sidebar';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeModal, setActiveModal] = useState<'login' | 'signup' | null>(null);

  // 로그인 입력폼 상태
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // 회원가입 입력폼 상태
  const [signupUsername, setSignupUsername] = useState('');
  const [signupNickname, setSignupNickname] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupBirth, setSignupBirth] = useState('');
  const [signupInterests, setSignupInterests] = useState<string[]>([]);
  const [signupAgree, setSignupAgree] = useState(false);

  // 로그인 상태 관리
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      const savedName = localStorage.getItem('username');
      if (token) {
        setIsLoggedIn(true);
        if (savedName) setUsername(savedName);
      } else {
        setIsLoggedIn(false);
        setUsername('');
      }
    };

    // 처음 렌더링될 때 체크
    checkAuth();

    // 다른 곳(page.tsx 등)에서 로그인/로그아웃 했을 때 신호를 받기 위함
    window.addEventListener('auth-change', checkAuth);
    return () => {
      window.removeEventListener('auth-change', checkAuth);
    };
  }, []);

  // 💡 입력 폼 초기화 함수
  const resetForms = () => {
    setLoginEmail('');
    setLoginPassword('');
    setSignupUsername('');
    setSignupNickname('');
    setSignupEmail('');
    setSignupPassword('');
    setSignupPhone('');
    setSignupBirth('');
    setSignupInterests([]);
    setSignupAgree(false);
  };

  // 💡 모달 닫기 + 초기화 함수
  const handleCloseModal = () => {
    setActiveModal(null);
    resetForms();
  };

  const handleInterestChange = (interest: string) => {
    if (signupInterests.includes(interest)) {
      setSignupInterests(signupInterests.filter((item) => item !== interest));
    } else {
      setSignupInterests([...signupInterests, interest]);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupAgree) {
      alert('이용약관에 동의해 주세요.');
      return;
    }

    try {
      const res = await fetch('http://localhost:8000/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: signupUsername,
          nickname: signupNickname,
          email: signupEmail,
          password: signupPassword,
          phone: signupPhone,
          birth: signupBirth,
          interests: signupInterests,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert('회원가입이 완료되었습니다! 로그인해 주세요.');
        handleCloseModal(); // 성공 시 모달 닫기 및 폼 초기화
      } else {
        alert(data.detail || '회원가입 실패');
      }
    } catch (error) {
      alert('서버와 통신할 수 없습니다.');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('username', data.username);
        setIsLoggedIn(true);
        setUsername(data.username);
        alert('로그인 성공!');
        handleCloseModal(); // 성공 시 모달 닫기 및 폼 초기화
      } else {
        alert(data.detail || '로그인 실패');
      }
    } catch (error) {
      alert('서버와 통신할 수 없습니다.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    setIsLoggedIn(false);
    setUsername('');
    alert('로그아웃 되었습니다.');
  };

  const handleWithdraw = async () => {
    if (!confirm('정말 회원탈퇴를 진행하시겠습니까?')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:8000/api/v1/auth/withdraw', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        handleLogout();
        alert('회원탈퇴가 완료되었습니다.');
      } else {
        alert('탈퇴 처리 중 오류가 발생했습니다.');
      }
    } catch (error) {
      alert('서버와 통신할 수 없습니다.');
    }
  };

  return (
    <html lang="ko">
      <body className="flex flex-col h-screen bg-slate-50 text-slate-900 relative">
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              aria-label="메뉴 토글"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="font-bold text-lg tracking-wide text-blue-600">MT AI Navi Studio</span>
          </div>

          <nav className="hidden lg:flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
            <Link href="/" className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-white rounded-lg transition-all">홈</Link>
            <Link href="/ml-dl" className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-white rounded-lg transition-all">딥러닝</Link>
            <Link href="/fine-tuning" className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-white rounded-lg transition-all">파인튜닝</Link>
            <Link href="/opencv" className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-white rounded-lg transition-all">OpenCV</Link>
            <Link href="/art-critique" className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-white rounded-lg transition-all">아트 & 포춘</Link>
            <Link href="/weather" className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-white rounded-lg transition-all">날씨</Link>
            <Link href="/calendar" className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-white rounded-lg transition-all">캘린더</Link>
            <Link href="/map" className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-white rounded-lg transition-all">지도</Link>
            <Link href="/calculator" className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 hover:bg-white rounded-lg transition-all">계산기</Link>
          </nav>

          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-700">
                  <strong className="text-blue-600">{username}</strong>님 환영합니다!
                </span>
                <button 
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  로그아웃
                </button>
                <button 
                  onClick={handleWithdraw}
                  className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                >
                  회원탈퇴
                </button>
              </div>
            ) : (
              <>
                <button 
                  onClick={() => setActiveModal('login')}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  로그인
                </button>
                <button 
                  onClick={() => setActiveModal('signup')}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
                >
                  회원가입
                </button>
              </>
            )}
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
          <main className="flex-1 overflow-y-auto p-8 bg-slate-50">
            {children}
          </main>
        </div>

        {/* 로그인 모달 */}
        {activeModal === 'login' && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative border border-slate-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-800">로그인</h3>
                <button 
                  onClick={handleCloseModal}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">이메일</label>
                  <input 
                    type="email" 
                    value={loginEmail} 
                    onChange={(e) => setLoginEmail(e.target.value)} 
                    placeholder="example@email.com" 
                    required 
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">비밀번호</label>
                  <input 
                    type="password" 
                    value={loginPassword} 
                    onChange={(e) => setLoginPassword(e.target.value)} 
                    placeholder="••••••••" 
                    required 
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" 
                  />
                </div>
                <button type="submit" className="w-full py-2.5 mt-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors text-sm">
                  로그인하기
                </button>
              </form>
            </div>
          </div>
        )}

        {/* 회원가입 모달 */}
        {activeModal === 'signup' && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 relative border border-slate-100 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4 sticky top-0 bg-white py-2 border-b border-slate-100 z-10">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">회원가입</h3>
                  <p className="text-xs text-slate-500">모든 AI 툴을 무료로 이용하고 다양한 혜택을 받아보세요.</p>
                </div>
                <button 
                  onClick={handleCloseModal}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  ✕
                </button>
              </div>
              
              <form onSubmit={handleSignup} className="flex flex-col gap-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">이름 (실명)</label>
                    <input 
                      type="text" 
                      value={signupUsername} 
                      onChange={(e) => setSignupUsername(e.target.value)} 
                      placeholder="홍길동" 
                      required 
                      className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">닉네임</label>
                    <input 
                      type="text" 
                      value={signupNickname} 
                      onChange={(e) => setSignupNickname(e.target.value)} 
                      placeholder="스튜디오마스터" 
                      className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">이메일 주소</label>
                  <input 
                    type="email" 
                    value={signupEmail} 
                    onChange={(e) => setSignupEmail(e.target.value)} 
                    placeholder="example@email.com" 
                    required 
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">비밀번호</label>
                  <input 
                    type="password" 
                    value={signupPassword} 
                    onChange={(e) => setSignupPassword(e.target.value)} 
                    placeholder="영문, 숫자 조합 8자리 이상" 
                    required 
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">휴대폰 번호</label>
                    <input 
                      type="tel" 
                      value={signupPhone} 
                      onChange={(e) => setSignupPhone(e.target.value)} 
                      placeholder="010-1234-5678" 
                      className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">생년월일</label>
                    <input 
                      type="date" 
                      value={signupBirth} 
                      onChange={(e) => setSignupBirth(e.target.value)} 
                      className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 text-slate-600" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">관심 기술 및 분야 (복수 선택 가능)</label>
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {['딥러닝/AI', '파인튜닝', 'OpenCV', '웹개발(Next.js)', '백엔드(FastAPI)', '데이터분석'].map((tech) => (
                      <label key={tech} className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer bg-slate-50 p-2 rounded-lg border border-slate-100 hover:bg-slate-100">
                        <input 
                          type="checkbox" 
                          checked={signupInterests.includes(tech)} 
                          onChange={() => handleInterestChange(tech)} 
                        />
                        {tech}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={signupAgree} 
                      onChange={(e) => setSignupAgree(e.target.checked)} 
                      required
                    />
                    <span className="font-medium text-slate-800">[필수] 서비스 이용약관 및 개인정보 처리방침 동의</span>
                  </label>
                </div>

                <button type="submit" className="w-full py-2.5 mt-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors text-sm shadow-sm">
                  가입 완료
                </button>
              </form>
            </div>
          </div>
        )}
      </body>
    </html>
  );
}