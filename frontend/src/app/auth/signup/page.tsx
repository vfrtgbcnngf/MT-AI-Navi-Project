'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const API_BASE_URL = 
    typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://localhost:8000'
      : 'https://your-backend-url.onrender.com'; // 👈 본인의 실제 Render 백엔드 주소로 딱 한 번만 입력해두세요!

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });
    const data = await res.json();
    if (res.ok) {
      // 💡 회원가입 성공 시 입력값 초기화
      setUsername('');
      setEmail('');
      setPassword('');

      alert('회원가입 완료! 로그인 페이지로 이동합니다.');
      router.push('/auth/login');
    } else {
      alert(data.detail || '회원가입 실패');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 bg-white p-6 rounded-2xl shadow-md border border-slate-100">
      <h2 className="text-xl font-bold mb-6 text-slate-800">회원가입</h2>
      <form onSubmit={handleSignup} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">이름</label>
          <input 
            type="text" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            required 
            className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" 
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">이메일</label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
            className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" 
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">비밀번호</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500" 
          />
        </div>
        <button type="submit" className="w-full py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors text-sm">
          가입완료
        </button>
      </form>
    </div>
  );
}
