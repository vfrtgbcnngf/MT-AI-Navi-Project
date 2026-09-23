'use client';

import React, { useState } from 'react';

export default function WeatherPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportText, setReportText] = useState('멀티 AI 기상 모델과 백엔드 빅데이터 엔진이 대기 상태를 다각도로 분석할 준비가 되었습니다.');
  
  const [chartImages, setChartImages] = useState({
    tempChart: '',
    rainChart: '',
    radarChart: '',
    heatmapChart: '',
    barChart: '',
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setReportText('다중 AI 앙상블 모델이 기상 위성 빅데이터를 교차 검증하고 matplotlib 시각화 엔진으로 5종 그래프를 렌더링 중입니다... 🌐');

    try {
      const res = await fetch('http://localhost:8000/api/v1/weather', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();

      if (data.success) {
        setReportText(data.report);
        setChartImages(data.images);
      } else {
        setReportText(data.report);
      }
    } catch (err) {
      setReportText('백엔드 서버 통신 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6 pb-12">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">🌐 멀티 AI 빅데이터 일기예보 대시보드</h2>
        <p className="text-sm text-slate-500">백엔드 파이썬 엔진이 꺾은선, 도넛, 레이더, 히트맵, 막대그래프 등 5종 분석 에셋을 제공합니다.</p>
      </div>

      {/* 검색 입력 폼 */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="예: 서울 오늘 날씨 심층 분석 / 부산 대기 상태" 
          className="flex-1 px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 shadow-sm"
        />
        <button 
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white font-semibold text-sm rounded-xl hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap disabled:bg-blue-300"
        >
          {loading ? '다중 분석 중...' : '멀티 AI 검색'}
        </button>
      </form>

      {/* AI 날씨 분석 리포트 */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-bold text-blue-600 mb-2">📌 멀티 AI 앙상블 기상 분석 리포트</h3>
        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{reportText}</p>
      </div>

      {/* 5가지 멀티 분석 그래프 대시보드 영역 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* 1. 꺾은선 (기온) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col items-center justify-between">
          <div className="w-full mb-1">
            <h4 className="text-sm font-bold text-slate-800">📈 모델 A: 기온 시계열 트렌드</h4>
            <p className="text-xs text-slate-400">Time-Series Line Chart</p>
          </div>
          <div className="h-44 w-full flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200 mt-2">
            {chartImages.tempChart ? (
              <img src={`data:image/png;base64,${chartImages.tempChart}`} alt="Temp Trend" className="max-h-full" />
            ) : (
              <span className="text-xs text-slate-400">데이터 대기 중...</span>
            )}
          </div>
        </div>

        {/* 2. 도넛 (강수확률) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col items-center justify-between">
          <div className="w-full mb-1">
            <h4 className="text-sm font-bold text-slate-800">🍩 모델 B: 강수 점유율 분포</h4>
            <p className="text-xs text-slate-400">Donut Ratio Chart</p>
          </div>
          <div className="h-44 w-full flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200 mt-2">
            {chartImages.rainChart ? (
              <img src={`data:image/png;base64,${chartImages.rainChart}`} alt="Rain Share" className="max-h-full" />
            ) : (
              <span className="text-xs text-slate-400">데이터 대기 중...</span>
            )}
          </div>
        </div>

        {/* 3. 방사형 레이더 (대기오염) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col items-center justify-between">
          <div className="w-full mb-1">
            <h4 className="text-sm font-bold text-slate-800">🕸️ 모델 C: 대기 환경 방사형 분석</h4>
            <p className="text-xs text-slate-400">Radar / Polar Multi-Index Chart</p>
          </div>
          <div className="h-44 w-full flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200 mt-2">
            {chartImages.radarChart ? (
              <img src={`data:image/png;base64,${chartImages.radarChart}`} alt="Radar AQI" className="max-h-full" />
            ) : (
              <span className="text-xs text-slate-400">데이터 대기 중...</span>
            )}
          </div>
        </div>

        {/* 4. 히트맵 바 (습도) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col items-center justify-between">
          <div className="w-full mb-1">
            <h4 className="text-sm font-bold text-slate-800">📊 모델 D: 습도 히트 분산 분포</h4>
            <p className="text-xs text-slate-400">Heat-Colored Bar Chart</p>
          </div>
          <div className="h-44 w-full flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200 mt-2">
            {chartImages.heatmapChart ? (
              <img src={`data:image/png;base64,${chartImages.heatmapChart}`} alt="Heatmap Humidity" className="max-h-full" />
            ) : (
              <span className="text-xs text-slate-400">데이터 대기 중...</span>
            )}
          </div>
        </div>

      </div>

      {/* 5. 독립 막대그래프 (하단 풀와이드 배치로 강조) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col items-center justify-between">
        <div className="w-full mb-1">
          <h4 className="text-sm font-bold text-slate-800">📶 모델 E: 시간대별 기압 흐름 (독립 막대그래프)</h4>
          <p className="text-xs text-slate-400">Atmospheric Pressure Bar Chart</p>
        </div>
        <div className="h-48 w-full flex items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200 mt-2">
          {chartImages.barChart ? (
            <img src={`data:image/png;base64,${chartImages.barChart}`} alt="Pressure Bar Chart" className="max-h-full" />
          ) : (
            <span className="text-xs text-slate-400">데이터 대기 중...</span>
          )}
        </div>
      </div>

    </div>
  );
}