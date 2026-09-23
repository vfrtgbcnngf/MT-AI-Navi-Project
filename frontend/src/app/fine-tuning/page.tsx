"use client";

import React, { useState, useRef } from 'react';

interface FineTuneResponse {
  success: boolean;
  jobId: string;
  taskType: string;
  baseModel: string;
  epochs: number;
  status: string;
  metrics: {
    initialLoss: number;
    finalLoss: number;
    accuracy: string;
    domainScore: number;
  };
  learnedInsight: string;
  uploadedFilesCount: number;
  filesSummary: { filename: string; size: number; type: string }[];
  message: string;
}

export default function FineTuningPage() {
  const [taskType, setTaskType] = useState<string>('multimodal');
  const [modelName, setModelName] = useState<string>('gemini-2.5-flash');
  const [epochs, setEpochs] = useState<number>(3);
  
  const [textFile, setTextFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<FileList | null>(null);

  const API_BASE_URL = 
    typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? 'http://localhost:8000'
      : 'https://mt-ai-navi-project.onrender.com'; // 👈 본인의 실제 Render 백엔드 주소로 딱 한 번만 입력해두세요!

  // 파일 입력 DOM을 직접 제어하기 위한 Ref 선언
  const textInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<FineTuneResponse | null>(null);

  const handleFineTuneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('task_type', taskType);
    formData.append('model_name', modelName);
    formData.append('epochs', epochs.toString());

    if (textFile) {
      formData.append('text_file', textFile);
    }
    if (imageFiles) {
      for (let i = 0; i < imageFiles.length; i++) {
        formData.append('image_files', imageFiles[i]);
      }
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/finetune/submit`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Fine-tuning submission failed: ${errText}`);
      }

      const data: FineTuneResponse = await response.json();
      setResult(data);
    } catch (err) {
      console.error("파인튜닝 요청 에러:", err);
      alert("파인튜닝 작업 요청 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setTaskType('multimodal');
    setModelName('gemini-2.5-flash');
    setEpochs(3);
    setTextFile(null);
    setImageFiles(null);
    setResult(null);

    // 파일 입력창 UI의 선택된 파일명 표시 초기화
    if (textInputRef.current) textInputRef.current.value = "";
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  return (
    <div className="p-8 bg-slate-50 text-slate-900 min-h-screen space-y-8">
      <div className="border-b border-slate-200 pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-pink-600">
            🧬 AI Model Fine-Tuning Lab
          </h1>
          <p className="text-sm text-slate-500 mt-1">텍스트 및 이미지 커스텀 데이터셋을 활용한 인공지능 모델 파인튜닝 학습 제어 및 성능 검증</p>
        </div>
        {result && (
          <button 
            onClick={handleReset}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition shadow-sm"
          >
            🔄 새 학습 설정 초기화
          </button>
        )}
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <h2 className="text-lg font-bold text-indigo-600">⚙️ 학습 파라미터 및 커스텀 데이터셋 구성</h2>
        
        <form onSubmit={handleFineTuneSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">학습 유형 (Task Type)</label>
              <select 
                value={taskType} 
                onChange={(e) => setTaskType(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-500"
              >
                <option value="multimodal">텍스트 + 이미지 멀티모달</option>
                <option value="text">텍스트 전용 (Text-only)</option>
                <option value="vision">이미지 비전 전용 (Vision-only)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">기반 모델 (Base Model)</label>
              <select 
                value={modelName} 
                onChange={(e) => setModelName(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-500"
              >
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                <option value="custom-regression-v1">Custom Regression Core</option>
                <option value="multimodal-vision-v2">Multimodal Vision v2</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">학습 에폭 (Epochs)</label>
              <input 
                type="number" 
                min={1} 
                max={50}
                value={epochs} 
                onChange={(e) => setEpochs(Number(e.target.value))}
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase">📄 텍스트 데이터셋 (JSONL / CSV / TXT)</label>
              <input 
                type="file" 
                ref={textInputRef}
                accept=".jsonl,.csv,.txt"
                onChange={(e) => setTextFile(e.target.files?.[0] || null)}
                className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer w-full"
              />
              {textFile && <p className="text-xs text-indigo-600 font-semibold">선택됨: {textFile.name}</p>}
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase">🖼️ 이미지 데이터셋 (다중 선택 가능)</label>
              <input 
                type="file" 
                ref={imageInputRef}
                multiple 
                accept="image/*"
                onChange={(e) => setImageFiles(e.target.files)}
                className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-pink-600 file:text-white hover:file:bg-pink-500 cursor-pointer w-full"
              />
              {imageFiles && imageFiles.length > 0 && <p className="text-xs text-pink-600 font-semibold">{imageFiles.length}개의 이미지 선택됨</p>}
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white rounded-xl font-bold text-sm shadow transition disabled:opacity-50"
          >
            {loading ? '딥러닝 파인튜닝 학습 파이프라인 구동 중...' : '🚀 커스텀 모델 파인튜닝 및 가중치 업데이트 시작'}
          </button>
        </form>

        {result && (
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4 mt-6 animate-fadeIn">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-indigo-600">📊 파인튜닝 학습 결과 리포트</h3>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleReset}
                  className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition"
                >
                  🔄 초기화
                </button>
                <span className="text-xs px-2.5 py-1 bg-emerald-100 text-emerald-700 font-bold rounded-full">{result.status}</span>
              </div>
            </div>
            
            <p className="text-sm font-semibold text-slate-700">{result.message}</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 text-xs">
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-slate-400 block">초기 손실률 (Initial Loss)</span>
                <span className="font-bold text-rose-500 text-sm">{result.metrics.initialLoss}</span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-slate-400 block">최종 수렴 Loss</span>
                <span className="font-bold text-emerald-600 text-sm">{result.metrics.finalLoss}</span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-slate-400 block">모델 정확도 (Accuracy)</span>
                <span className="font-bold text-indigo-600 text-sm">{result.metrics.accuracy}</span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-200">
                <span className="text-slate-400 block">도메인 적합도 점수</span>
                <span className="font-bold text-pink-600 text-sm">{result.metrics.domainScore} 점</span>
              </div>
            </div>

            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 space-y-1">
              <span className="text-xs font-bold text-indigo-700">💡 학습 데이터 분석 및 가중치 반영 인사이트:</span>
              <p className="text-xs text-indigo-900 font-medium">{result.learnedInsight}</p>
            </div>

            {result.filesSummary.length > 0 && (
              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                <span className="text-xs font-bold text-slate-500">📁 학습에 기여한 데이터셋 파일 목록:</span>
                <ul className="text-xs text-slate-600 space-y-1">
                  {result.filesSummary.map((f, idx) => (
                    <li key={idx} className="flex justify-between">
                      <span>• {f.filename}</span>
                      <span className="text-slate-400">({(f.size / 1024).toFixed(1)} KB)</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
