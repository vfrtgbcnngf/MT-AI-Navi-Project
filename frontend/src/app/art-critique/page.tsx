'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
export const dynamic = 'force-dynamic';

function ArtworkCritiqueInner() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === '1') setActiveTab(1);
    else if (tabParam === '2') setActiveTab(2);
    else if (tabParam === '3') setActiveTab(3);
  }, [searchParams]);

  const zodiacList = ['쥐띠', '소띠', '호랑이띠', '토끼띠', '용띠', '뱀띠', '말띠', '양띠', '원숭이띠', '닭띠', '개띠', '돼지띠'];
  const constellationList = ['양자리', '황소자리', '쌍둥이자리', '게자리', '사자자리', '처녀자리', '천칭자리', '전갈자리', '사수자리', '염소자리', '물병자리', '물고기자리'];

  // 공통 상태: 업로드된 이미지
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // 1번 탭 상태 (비평)
  const [critiqueResult, setCritiqueResult] = useState<string>('');
  const [isLoadingCritique, setIsLoadingCritique] = useState(false);
  const [target, setTarget] = useState('');          // target 선언
  const [name, setName] = useState('');              // name 선언
  const [birthdate, setBirthdate] = useState('');    // birthdate 선언
  const [category, setCategory] = useState<'zodiac' | 'constellation'>('zodiac');

  // 2번 탭 상태 (효과 변환)
  const [transformedUrl, setTransformedUrl] = useState<string | null>(null);
  const [isTransforming, setIsTransforming] = useState(false);

  // 3번 탭 상태 (운세)
  const [fortuneType, setFortuneType] = useState<'zodiac' | 'constellation'>('zodiac');
  const [targetInput, setTargetInput] = useState(zodiacList[0]);
  const [nameInput, setNameInput] = useState('');      // 추가: 이름 상태
  const [birthInput, setBirthInput] = useState('');      // 추가: 생년월일 상태
  const [fortuneResult, setFortuneResult] = useState<{ 
    text: string;
    insight?: string;
    scores: { 
      overall: number; 
      wealth: number; 
      luck: number;
      relationship: number; // 👈 추가
      energy: number; 
    } 
  } | null>(null);

  const scores = fortuneResult?.scores || {
    overall: 0,
    wealth: 0,
    luck: 0,
    relationship: 0,
    energy: 0,
  };
  
  const scoreEntries = [
    { name: '종합운', val: scores.overall },
    { name: '재물운', val: scores.wealth },
    { name: '행운 흐름', val: scores.luck },
    { name: '대인관계운', val: scores.relationship },
    { name: '활력/건강운', val: scores.energy },
  ];
  scoreEntries.sort((a, b) => b.val - a.val);
  
  const highest = scoreEntries[0];
  const lowest = scoreEntries[scoreEntries.length - 1];
  const avgVal = Math.round(scoreEntries.reduce((acc, cur) => acc + cur.val, 0) / scoreEntries.length);

  let dynamicText = `현재 전체 평균 ${avgVal}점 대의 흐름을 보이고 있으며, 특히 ${highest.name}(${highest.val}%)이(가) 가장 강력하게 에너지를 이끌고 있습니다. `;

  if (highest.val - lowest.val >= 15) {
    dynamicText += `반면 상대적으로 ${lowest.name}(${lowest.val}%) 부문은 숨 고르기가 필요하므로, 강점인 ${highest.name}의 에너지를 활용해 균형을 보완하는 지혜가 요구됩니다.`;
  } else {
    dynamicText += `모든 지표가 큰 편차 없이 유기적으로 맞물려 있어, 어떤 분야에 도전하든 안정적인 시너지를 기대할 수 있는 탄탄한 국면입니다.`;
  }

  const [isLoadingFortune, setIsLoadingFortune] = useState(false);

  // 탭 전환 시 이전 데이터 초기화 함수
  const handleTabChange = (tab: 1 | 2 | 3) => {
    setActiveTab(tab);
    setSelectedFile(null);
    setPreviewUrl(null);
    setCritiqueResult('');
    setTransformedUrl(null);
    setFortuneResult(null);
    // 💡 3번 탭으로 초기화될 때 targetInput이 비지 않도록 기본 쥐띠 설정
    setFortuneType('zodiac');
    setTargetInput(zodiacList[0]);
    setNameInput('');
    setBirthInput('');
  };

  // 파일 선택 핸들러
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setTransformedUrl(null);
    }
  };

  // 1. 비평 요청 함수
  const handleAnalyze = async () => {
    if (!selectedFile) return alert('이미지를 먼저 업로드해주세요.');
    setIsLoadingCritique(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetch('http://localhost:8000/api/v1/critique/analyze', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) setCritiqueResult(data.critique);
    } catch (err) {
      console.error(err);
      alert('작품 분석 중 오류가 발생했습니다.');
    } finally {
      setIsLoadingCritique(false);
    }
  };

  // 2. 효과 변환 함수 (8가지 확장)
  const handleTransform = async (effect: string) => {
    if (!selectedFile) return alert('이미지를 먼저 업로드해주세요.');
    setIsTransforming(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('effect', effect);

    try {
      const res = await fetch('http://localhost:8000/api/v1/critique/transform', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) setTransformedUrl(data.transformed_image);
    } catch (err) {
      console.error(err);
      alert('이미지 변환 중 오류가 발생했습니다.');
    } finally {
      setIsTransforming(false);
    }
  };

  // 3. 운세 측정 함수
  const handleGetFortune = async () => {
    console.log("🔍 현재 입력된 상태값 확인:", { nameInput, birthInput, fortuneType, targetInput });

    if (!nameInput || !birthInput || !targetInput) {
      alert(`입력되지 않은 값이 있습니다.\n- 이름: ${nameInput || '없음'}\n- 생년월일: ${birthInput || '없음'}\n- 운세 대상: ${targetInput || '없음'}`);
      return;
    }

    try {
      setIsLoadingFortune(true);

      const res = await fetch('http://localhost:8000/api/v1/critique/fortune', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: fortuneType,
          target: targetInput,
          name: nameInput,
          birthdate: birthInput,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("🔥 서버가 반환한 에러 내용:", errorText);
        throw new Error(`백엔드 서버 통신 실패 (상태 코드: ${res.status})`);
      }

      const data = await res.json();
      
      if (data.success) {
        console.log("✨ 운세 응답 데이터:", data);
        setFortuneResult({
          text: data.fortune_text,
          insight: data.insight, // 백엔드에서 주는 insight가 있다면 반영
          scores: data.scores
        }); 
      } else {
        alert(data.message || '운세를 불러오지 못했습니다.');
      }
    } catch (err) {
      console.error('🔥 API 연동 에러:', err);
      alert('운세를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoadingFortune(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleGetFortune();
    }
  };

  const handleFortuneTypeChange = (type: 'zodiac' | 'constellation') => {
    setFortuneType(type);
    setTargetInput(type === 'zodiac' ? zodiacList[0] : constellationList[0]);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 bg-white rounded-2xl shadow-sm border border-slate-100 my-10">
      <h1 className="text-2xl font-bold text-slate-800">🎨 아트 앤 포춘 스튜디오</h1>

      {/* 3가지 메인 전환 버튼 */}
      <div className="grid grid-cols-3 gap-4">
        <button
          onClick={() => handleTabChange(1)}
          className={`py-3 px-4 rounded-xl font-semibold transition ${
            activeTab === 1 ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          1. AI 작품 비평
        </button>
        <button
          onClick={() => handleTabChange(2)}
          className={`py-3 px-4 rounded-xl font-semibold transition ${
            activeTab === 2 ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          2. 효과 변환 & 다운로드
        </button>
        <button
          onClick={() => handleTabChange(3)}
          className={`py-3 px-4 rounded-xl font-semibold transition ${
            activeTab === 3 ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          3. AI 운세 측정
        </button>
      </div>

      {/* --- 탭 1: AI 작품 비평 --- */}
      {activeTab === 1 && (
        <div className="space-y-6">
          <div className="relative border-2 border-dashed border-indigo-200 hover:border-indigo-500 bg-indigo-50/30 hover:bg-indigo-50/60 transition p-8 rounded-2xl text-center cursor-pointer group">
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
            />
            <div className="space-y-3 pointer-events-none">
              <div className="w-12 h-12 mx-auto bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xl group-hover:scale-110 transition shadow-sm">
                🖼️
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  {selectedFile ? <span className="text-indigo-600 font-bold">{selectedFile.name}</span> : "이곳을 클릭하거나 이미지를 드래그하여 업로드하세요"}
                </p>
                <p className="text-xs text-slate-400 mt-1">지원 형식: JPG, PNG, WEBP</p>
              </div>
            </div>
          </div>

          {previewUrl && (
            <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-center">
              <p className="text-xs font-semibold text-slate-500 mb-2">선택된 이미지 미리보기</p>
              <img src={previewUrl} alt="Preview" className="max-h-60 mx-auto rounded-lg shadow-sm object-contain" />
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={isLoadingCritique}
            className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition shadow-sm"
          >
            {isLoadingCritique ? 'AI가 작품을 분석 중입니다...' : '작품 비평 받기'}
          </button>
          
          {critiqueResult && (
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl whitespace-pre-wrap text-slate-700 leading-relaxed shadow-inner">
              <h3 className="font-bold text-lg mb-2 text-indigo-900">📝 AI 비평 결과</h3>
              {critiqueResult}
            </div>
          )}
        </div>
      )}

      {/* --- 탭 2: 효과 변환 & 다운로드 --- */}
      {activeTab === 2 && (
        <div className="space-y-6">
          <div className="relative border-2 border-dashed border-indigo-200 hover:border-indigo-500 bg-indigo-50/30 hover:bg-indigo-50/60 transition p-8 rounded-2xl text-center cursor-pointer group">
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
            />
            <div className="space-y-3 pointer-events-none">
              <div className="w-12 h-12 mx-auto bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-xl group-hover:scale-110 transition shadow-sm">
                ✨
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  {selectedFile ? <span className="text-indigo-600 font-bold">{selectedFile.name}</span> : "효과를 적용할 이미지를 업로드하세요"}
                </p>
                <p className="text-xs text-slate-400 mt-1">지원 형식: JPG, PNG, WEBP</p>
              </div>
            </div>
          </div>

          {previewUrl && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
              <div className="p-4 bg-white border border-slate-200 rounded-2xl text-center shadow-sm">
                <p className="text-sm font-semibold text-slate-500 mb-3 flex items-center justify-center gap-2">
                  <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
                  원본 이미지
                </p>
                <img src={previewUrl} alt="원본" className="max-h-64 mx-auto rounded-xl shadow-inner object-contain" />
              </div>

              <div className="p-4 bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-2xl text-center flex flex-col items-center justify-center min-h-[250px]">
                {isTransforming ? (
                  <div className="space-y-3 text-indigo-600">
                    <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
                    <p className="font-semibold text-sm">이미지 변환 중...</p>
                  </div>
                ) : transformedUrl ? (
                  <div className="w-full space-y-3">
                    <p className="text-sm font-semibold text-emerald-600 mb-3 flex items-center justify-center gap-2">
                      <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                      변환 완료!
                    </p>
                    <img src={transformedUrl} alt="변환 결과" className="max-h-64 mx-auto rounded-xl shadow-lg object-contain" />
                  </div>
                ) : (
                  <div className="text-slate-400 space-y-2">
                    <div className="text-3xl">🎨</div>
                    <p className="text-sm font-medium">효과 버튼을 누르면</p>
                    <p className="text-xs text-slate-400">이곳에 변환된 결과가 표시됩니다</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-6 gap-2 pt-2">
            <button onClick={() => handleTransform('grayscale')} disabled={isTransforming || !selectedFile} className="py-2.5 bg-slate-800 text-white rounded-xl text-xs font-medium hover:bg-slate-900 transition shadow-sm disabled:opacity-40">흑백</button>
            <button onClick={() => handleTransform('sepia')} disabled={isTransforming || !selectedFile} className="py-2.5 bg-amber-700 text-white rounded-xl text-xs font-medium hover:bg-amber-800 transition shadow-sm disabled:opacity-40">세피아</button>
            <button onClick={() => handleTransform('blur')} disabled={isTransforming || !selectedFile} className="py-2.5 bg-blue-600 text-white rounded-xl text-xs font-medium hover:bg-blue-700 transition shadow-sm disabled:opacity-40">블러</button>
            <button onClick={() => handleTransform('invert')} disabled={isTransforming || !selectedFile} className="py-2.5 bg-purple-600 text-white rounded-xl text-xs font-medium hover:bg-purple-700 transition shadow-sm disabled:opacity-40">반전</button>
            <button onClick={() => handleTransform('sharpen')} disabled={isTransforming || !selectedFile} className="py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-medium hover:bg-emerald-700 transition shadow-sm disabled:opacity-40">선명하게</button>
            <button onClick={() => handleTransform('contour')} disabled={isTransforming || !selectedFile} className="py-2.5 bg-rose-600 text-white rounded-xl text-xs font-medium hover:bg-rose-700 transition shadow-sm disabled:opacity-40">윤곽선</button>
            <button onClick={() => handleTransform('emboss')} disabled={isTransforming || !selectedFile} className="py-2.5 bg-cyan-700 text-white rounded-xl text-xs font-medium hover:bg-cyan-800 transition shadow-sm disabled:opacity-40">엠보싱</button>
            <button onClick={() => handleTransform('solarize')} disabled={isTransforming || !selectedFile} className="py-2.5 bg-orange-600 text-white rounded-xl text-xs font-medium hover:bg-orange-700 transition shadow-sm disabled:opacity-40">빛바램</button>
            <button onClick={() => handleTransform('edge_enhance')} disabled={isTransforming || !selectedFile} className="py-2.5 bg-indigo-700 text-white rounded-xl text-xs font-medium hover:bg-indigo-800 transition shadow-sm disabled:opacity-40">엣지강화</button>
            <button onClick={() => handleTransform('smooth')} disabled={isTransforming || !selectedFile} className="py-2.5 bg-teal-600 text-white rounded-xl text-xs font-medium hover:bg-teal-700 transition shadow-sm disabled:opacity-40">부드럽게</button>
            <button onClick={() => handleTransform('posterize')} disabled={isTransforming || !selectedFile} className="py-2.5 bg-pink-600 text-white rounded-xl text-xs font-medium hover:bg-pink-700 transition shadow-sm disabled:opacity-40">포스터</button>
          </div>

          {transformedUrl && (
            <a
              href={transformedUrl}
              download="transformed_artwork.jpg"
              className="block text-center py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition shadow-sm"
            >
              변환된 이미지 다운로드하기 📥
            </a>
          )}
        </div>
      )}

      {/* --- 탭 3: AI 운세 측정 및 그래프 시각화 --- */}
      {activeTab === 3 && (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
            <h3 className="font-bold text-slate-700 text-sm flex items-center gap-2">
              <span>🔮</span> Python 해시 백엔드 연동 AI 운세
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="이름 (예: 홍길동)"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="p-3 border border-slate-300 rounded-xl bg-white font-medium text-slate-700 focus:outline-indigo-500 shadow-sm"
              />
              <input
                type="date"
                value={birthInput}
                onChange={(e) => setBirthInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="p-3 border border-slate-300 rounded-xl bg-white font-medium text-slate-700 focus:outline-indigo-500 shadow-sm"
              />
            </div>

            <div className="flex gap-3 items-center pt-2">
              <select
                value={fortuneType}
                onChange={(e) => handleFortuneTypeChange(e.target.value as 'zodiac' | 'constellation')}
                className="p-3 border border-slate-300 rounded-xl bg-white font-medium text-slate-700 focus:outline-indigo-500 shadow-sm"
              >
                <option value="zodiac">띠별 운세</option>
                <option value="constellation">별자리 운세</option>
              </select>

              <select
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                className="flex-1 p-3 border border-slate-300 rounded-xl bg-white font-medium text-slate-700 focus:outline-indigo-500 shadow-sm"
              >
                {fortuneType === 'zodiac' ? (
                  zodiacList.map((z) => (
                    <option key={z} value={z}>{z}</option>
                  ))
                ) : (
                  constellationList.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))
                )}
              </select>

              <button
                type="button"
                onClick={handleGetFortune}
                disabled={isLoadingFortune}
                className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition shadow-sm disabled:opacity-50 whitespace-nowrap"
              >
                {isLoadingFortune ? '분석 중...' : '운세 보기'}
              </button>
            </div>
          </div>

          {fortuneResult && (
            <div className="space-y-6 animate-fadeIn">
              <div className="p-6 bg-indigo-50/60 border border-indigo-100 rounded-2xl text-slate-700 leading-relaxed whitespace-pre-wrap shadow-sm">
                <h3 className="font-bold text-lg mb-2 text-indigo-900">✨ {nameInput}님의 백엔드 정밀 검증 AI 운세</h3>
                {fortuneResult.text}
              </div>

              {/* 4가지 입체 그래프 그리드 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* 1. 입체 도넛 링 게이지 */}
                <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-slate-700">1. 종합 운세 입체 도넛</span>
                    <span className="text-xl">🌟</span>
                  </div>
                  <div className="flex items-center justify-center my-4">
                    <div className="relative w-32 h-32 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90 drop-shadow-md" viewBox="0 0 36 36">
                        <path className="text-slate-100" strokeWidth="4" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                        <path className="text-indigo-600 transition-all duration-1000" strokeDasharray={`${fortuneResult.scores.overall}, 100`} strokeWidth="4" strokeLinecap="round" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      </svg>
                      <div className="absolute text-center">
                        <span className="text-2xl font-extrabold text-indigo-600">{fortuneResult.scores.overall}%</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 text-center">종합 지수 반영</p>
                </div>

                {/* 2. 재물 & 비즈니스 밀도 곡선 */}
                <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-slate-700">2. 재물 & 비즈니스 밀도 곡선</span>
                    <span className="text-xl">💰</span>
                  </div>
                  <div className="bg-sky-50/50 p-4 rounded-xl border border-sky-100 my-2 relative">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-semibold text-sky-800">자산 밀도 분포</span>
                      <span className="text-lg font-extrabold text-sky-600">{fortuneResult.scores.wealth}%</span>
                    </div>
                    <svg className="w-full h-16 overflow-visible" viewBox="0 0 100 40">
                      <defs>
                        <linearGradient id="gradWealth" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#0284c7" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#0284c7" stopOpacity="0.05" />
                        </linearGradient>
                      </defs>
                      <path 
                        d={`M 0 38 Q 22 ${40 - (fortuneResult.scores.wealth * 0.38)} 50 ${40 - (fortuneResult.scores.wealth * 0.75)} T 100 38 L 100 40 L 0 40 Z`} 
                        fill="url(#gradWealth)" 
                      />
                      <path 
                        d={`M 0 38 Q 22 ${40 - (fortuneResult.scores.wealth * 0.38)} 50 ${40 - (fortuneResult.scores.wealth * 0.75)} T 100 38`} 
                        fill="none" 
                        stroke="#0369a1" 
                        strokeWidth="3.5" 
                        strokeLinecap="round" 
                      />
                    </svg>
                  </div>
                  <p className="text-xs text-slate-400 text-center">재물 점수 기반 KDE 밀도 맵</p>
                </div>

                {/* 3. 행운 스택 & 트렌드 맵 */}
                <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-slate-700">3. 행운 스택 & 트렌드 맵</span>
                    <span className="text-xl">🍀</span>
                  </div>
                  <div className="bg-gradient-to-br from-amber-50/60 to-orange-50/40 p-4 rounded-xl border border-amber-100/80 my-2 relative shadow-inner">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-3 text-[11px] font-semibold">
                        <span className="flex items-center gap-1.5 text-slate-600"><span className="w-2.5 h-2.5 bg-amber-400 rounded-full inline-block shadow-sm"></span>기본 운세</span>
                        <span className="flex items-center gap-1.5 text-orange-600"><span className="w-2.5 h-2.5 bg-orange-500 rounded-full inline-block shadow-sm"></span>잠재 행운</span>
                      </div>
                      <span className="text-lg font-extrabold text-amber-600">{fortuneResult.scores.luck}%</span>
                    </div>

                    {(() => {
                      const luck = fortuneResult.scores.luck;
                      const xPositions = [18, 42, 66, 90];
                      
                      const bars = xPositions.map((x, idx) => {
                        const baseVal = Math.min(Math.max((luck * (0.35 + idx * 0.12)) % 22, 12), 20);
                        const topVal = Math.min(Math.max((luck * (0.55 + (idx % 2) * 0.25)) % 26, 15), 24);
                        return { x, base: baseVal, top: topVal, total: baseVal + topVal };
                      });

                      const trendPoints = bars.map(b => ({ x: b.x, y: 50 - b.total }));
                      const trendPath = trendPoints.reduce((acc, p, i) => i === 0 ? `M ${p.x} ${p.y}` : `${acc} Q ${p.x - 12} ${p.y + 4} ${p.x} ${p.y}`, '');

                      return (
                        <svg className="w-full h-24 overflow-visible" viewBox="0 0 100 50">
                          <defs>
                            <linearGradient id="barGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#fcd34d" />
                              <stop offset="100%" stopColor="#f59e0b" />
                            </linearGradient>
                            <linearGradient id="barGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#fb923c" />
                              <stop offset="100%" stopColor="#ea580c" />
                            </linearGradient>
                            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                              <feGaussianBlur stdDeviation="1" result="blur" />
                              <feComposite in="SourceGraphic" in2="blur" operator="over" />
                            </filter>
                          </defs>

                          {[12, 25, 37].map((y, idx) => (
                            <line key={idx} x1="0" y1={y} x2="100" y2={y} stroke="#f1f5f9" strokeWidth="0.6" strokeDasharray="3 3" />
                          ))}

                          {bars.map((b, idx) => (
                            <g key={idx} className="transition-all duration-500">
                              <rect x={b.x - 5.5} y={50 - b.base} width="11" height={b.base} rx="3" fill="url(#barGrad1)" opacity="0.85" />
                              <rect x={b.x - 5.5} y={50 - b.total} width="11" height={b.top} rx="3" fill="url(#barGrad2)" opacity="0.95" />
                            </g>
                          ))}

                          <path d={trendPath} fill="none" stroke="#c2410c" strokeWidth="2" strokeDasharray="4 3" opacity="0.85" />

                          {trendPoints.map((p, i) => (
                            <circle key={i} cx={p.x} cy={p.y} r="3" fill="#fff" stroke="#9a3412" strokeWidth="1.5" filter="url(#glow)" />
                          ))}
                        </svg>
                      );
                    })()}
                  </div>
                  <p className="text-xs text-slate-400 text-center">프로페셔널 그라데이션 스택 & 트렌드 맵</p>
                </div>

                {/* 4. 멀티 다차원 레이더 맵 */}
                <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-slate-700">4. 멀티 다차원 레이더 맵</span>
                    <span className="text-xl">🌐</span>
                  </div>
                  <div className="flex items-center justify-center my-1">
                    <div className="w-36 h-36 relative flex items-center justify-center">
                      <svg className="w-full h-full overflow-visible drop-shadow-sm" viewBox="0 0 200 200">
                        {[0.3, 0.6, 1].map((lvl, idx) => {
                          const pts = [0, 1, 2, 3, 4].map(i => {
                            const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
                            const r = 60 * lvl;
                            return `${100 + r * Math.cos(angle)},${100 + r * Math.sin(angle)}`;
                          }).join(' ');
                          return <polygon key={idx} points={pts} fill="none" stroke="#cbd5e1" strokeWidth="1" />;
                        })}
                        {(() => {
                          const scs = [
                            fortuneResult.scores.overall,
                            fortuneResult.scores.wealth,
                            fortuneResult.scores.luck,
                            fortuneResult.scores.relationship,
                            fortuneResult.scores.energy
                          ];
                          const polyPts = scs.map((sc, i) => {
                            const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
                            const r = 60 * (sc / 100);
                            return `${100 + r * Math.cos(angle)},${100 + r * Math.sin(angle)}`;
                          }).join(' ');
                          return <polygon points={polyPts} fill="rgba(147, 51, 234, 0.3)" stroke="#9333ea" strokeWidth="2.5" />;
                        })()}
                      </svg>
                      <span className="absolute -top-1 text-[10px] font-bold text-slate-600">종합</span>
                      <span className="absolute right-1 top-10 text-[10px] font-bold text-slate-600">재물</span>
                      <span className="absolute right-4 bottom-4 text-[10px] font-bold text-slate-600">행운</span>
                      <span className="absolute left-4 bottom-4 text-[10px] font-bold text-slate-600">관계</span>
                      <span className="absolute left-1 top-10 text-[10px] font-bold text-slate-600">활력</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 text-center">5개 지표 입체 방사형 웹</p>
                </div>

              </div>

              {/* 💡 4개 그래프 영역 밑부분에 추가한 AI 종합 인사이트 박스 */}
              <div className="p-5 bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-2xl shadow-md space-y-2">
                <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm">
                  <span>💡</span> AI 종합 인사이트 분석
                </div>
                <p className="text-sm text-slate-200 leading-relaxed">
                  {fortuneResult.insight || dynamicText}
                </p>
              </div>

            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Next.js 빌드 시 useSearchParams 에러를 방지하기 위해 Suspense로 감싼 메인 export 컴포넌트
export default function ArtworkCritiquePage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-slate-500">로딩 중...</div>}>
      <ArtworkCritiqueInner />
    </Suspense>
  );
}
