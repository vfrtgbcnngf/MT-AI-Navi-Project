"use client";

import React, { useState } from 'react';

interface MLDLResponse {
  success: boolean;
  menuName: string;
  region: string;
  metrics: {
    anomalyCount: number;
    clusterCount: number;
    modelHealth: string;
    futureForecast: number[];
  };
  images: {
    trendChart: string;
    clusterChart: string;
  };
}

export default function MLDLMenuPage() {
  const [region, setRegion] = useState<string>('서울');
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<MLDLResponse | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [visionLoading, setVisionLoading] = useState<boolean>(false);
  const [visionResult, setVisionResult] = useState<string | null>(null);

  const fetchMLDLData = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/v1/mldl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ region }),
      });

      if (!response.ok) throw new Error('Network response was not ok');
      const result: MLDLResponse = await response.json();
      setData(result);
    } catch (err) {
      console.error("ML/DL 메뉴 연산 에러:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setVisionLoading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('region', region);

    try {
      const response = await fetch('http://localhost:8000/api/v1/mldl/upload-analysis', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Vision analysis failed: ${response.status} ${errorText}`);
      }
      const resData = await response.json();
      setVisionResult(resData.visionReport);
    } catch (err) {
      console.error("이미지 분석 에러:", err);
      alert("이미지 분석 중 오류가 발생했습니다.");
    } finally {
      setVisionLoading(false);
    }
  };

  return (
    <div className="p-8 bg-slate-50 text-slate-900 min-h-screen space-y-8">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-pink-600">
          🤖 Deep Learning & Machine Learning Lab
        </h1>
        <p className="text-sm text-slate-500 mt-1">빅데이터 기반 인공지능 모델링 및 이미지 멀티모달 비전 분석</p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <h2 className="text-lg font-bold text-indigo-600">📈 실시간 시계열 회귀 예측 및 이상치 탐지</h2>
        <form onSubmit={fetchMLDLData} className="flex gap-3 w-full md:w-auto">
          <input 
            type="text" 
            value={region} 
            onChange={(e) => setRegion(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-500 w-full md:w-64"
            placeholder="검색어 또는 지역 입력"
          />
          <button 
            type="submit"
            disabled={loading}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-sm shadow transition whitespace-nowrap disabled:opacity-50"
          >
            {loading ? '연산 중...' : '모델 실행'}
          </button>
        </form>

        {data && (
          <div className="space-y-6 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-400 uppercase font-semibold">모델 상태</span>
                <p className="text-base font-bold text-emerald-600 mt-1">{data.metrics.modelHealth}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-400 uppercase font-semibold">이상치 감지</span>
                <p className="text-base font-bold text-pink-600 mt-1">{data.metrics.anomalyCount} 건</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-400 uppercase font-semibold">군집 분석</span>
                <p className="text-base font-bold text-indigo-600 mt-1">{data.metrics.clusterCount}개 그룹</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col items-center">
                <h3 className="text-xs font-bold text-slate-700 mb-3 self-start">📈 Time-Series Linear Regression</h3>
                {data.images?.trendChart && (
                  <img src={`data:image/png;base64,${data.images.trendChart}`} alt="Trend" className="rounded shadow-sm max-w-full" />
                )}
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col items-center">
                <h3 className="text-xs font-bold text-slate-700 mb-3 self-start">📊 KMeans & Anomaly Detection</h3>
                {data.images?.clusterChart && (
                  <img src={`data:image/png;base64,${data.images.clusterChart}`} alt="Cluster" className="rounded shadow-sm max-w-full" />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <h2 className="text-lg font-bold text-pink-600">🖼️ Deep Learning & Machine Learning 이미지 비전 분석</h2>
        <form onSubmit={handleImageUpload} className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <input 
            type="file" 
            accept="image/*"
            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
            className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-pink-600 file:text-white hover:file:bg-pink-500 cursor-pointer"
          />
          <button 
            type="submit" 
            disabled={visionLoading || !selectedFile}
            className="px-5 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-lg font-bold text-sm shadow transition disabled:opacity-50 whitespace-nowrap"
          >
            {visionLoading ? '비전 모델 분석 중...' : '이미지 딥러닝 분석 실행'}
          </button>
        </form>

        {visionResult && (
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-2">
            <h3 className="text-sm font-bold text-indigo-600">🔍 AI 비전 리포트 결과</h3>
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{visionResult}</p>
          </div>
        )}
      </div>
    </div>
  );
}