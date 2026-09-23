'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('http://localhost:8000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('username', data.username);
      
      // 💡 로그인 성공 시 입력값 초기화
      setEmail('');
      setPassword('');

      alert('로그인 성공!');
      router.push('/'); // 홈으로 이동
    } else {
      alert(data.detail || '로그인 실패');
      // 💡 실패 시 비밀번호만 지워주고 싶다면 아래 주석을 해제하세요
      // setPassword('');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 bg-white p-6 rounded-2xl shadow-md border border-slate-100">
      <h2 className="text-xl font-bold mb-6 text-slate-800">로그인</h2>
      <form onSubmit={handleLogin} className="flex flex-col gap-4">
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
          로그인하기
        </button>
      </form>
    </div>
  );
}