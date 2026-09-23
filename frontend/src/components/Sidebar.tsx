'use client';

import Link from 'next/link';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-20 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`fixed md:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 p-4 flex flex-col h-full text-slate-700 transition-transform duration-300 transform ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden md:p-0 md:border-none'}`}>
        <h1 className="text-xl font-bold mb-6 text-blue-600 whitespace-nowrap">AI Studio</h1>
        <nav className="flex flex-col gap-1.5 flex-1 overflow-y-auto pr-2 whitespace-nowrap">
          <Link href="/" className="p-2.5 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors text-slate-700">대시보드 홈</Link>
          
          <div className="text-xs font-semibold text-slate-400 mt-5 mb-1 px-1 tracking-wider">AI CORE</div>
          <Link href="/ml-dl" className="p-2.5 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors text-slate-700">딥러닝 & 머신러닝</Link>
          <Link href="/fine-tuning" className="p-2.5 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors text-slate-700">모델 파인튜닝</Link>

          <div className="text-xs font-semibold text-slate-400 mt-5 mb-1 px-1 tracking-wider">VISION & ART</div>
          <Link href="/opencv" className="p-2.5 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors text-slate-700">OpenCV (이미지→엑셀)</Link>
          <Link href="/art-critique" className="p-2.5 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors text-slate-700">아트 & 포춘</Link>

          <div className="text-xs font-semibold text-slate-400 mt-5 mb-1 px-1 tracking-wider">UTILITIES</div>
          <Link href="/weather" className="p-2.5 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors text-slate-700">일기예보</Link>
          <Link href="/calendar" className="p-2.5 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors text-slate-700">캘린더</Link>
          <Link href="/map" className="p-2.5 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors text-slate-700">지도 (길찾기)</Link>
          <Link href="/calculator" className="p-2.5 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors text-slate-700">계산기</Link>
        </nav>
      </aside>
    </>
  );
}