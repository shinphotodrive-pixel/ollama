import React, { useState, useMemo, useEffect } from 'react';
import { calculateVRAM, QUANT_DATA } from '../utils/calculator';
import { VRAMCalcInputs, VRAMScenario } from '../types';
import {
  Layers,
  HardDrive,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  BarChart3,
  Download,
  Plus,
  BookmarkCheck,
  RotateCcw,
  Trash2,
  FileJson,
  Share2,
  Copy,
} from 'lucide-react';
import { VRAMChartJS } from './VRAMChartJS';
import { VRAMLiveChart } from './VRAMLiveChart';
import { VRAMScenarioSidebar } from './VRAMScenarioSidebar';
import { VRAMShareModal } from './VRAMShareModal';

export const TabQuantization: React.FC = () => {
  // Calculator inputs
  const [modelParams, setModelParams] = useState<number>(32);
  const [quantBits, setQuantBits] = useState<number>(4.8);
  const [quantName, setQuantName] = useState<string>('Q4_K_M');
  const [contextWindow, setContextWindow] = useState<number>(32768);
  const [kvPrecision, setKvPrecision] = useState<number>(8); // q8_0 default recommended
  const [batchSize, setBatchSize] = useState<number>(1);
  const [rightPanelTab, setRightPanelTab] = useState<'chart' | 'scenario' | 'hardware'>('chart');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);

  // Restore configuration from shared URL parameters if present
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      const m = params.get('m');
      const q = params.get('q');
      const b = params.get('b');
      const ctx = params.get('ctx');
      const kv = params.get('kv');

      if (m && !isNaN(Number(m))) setModelParams(Number(m));
      if (q) setQuantName(q);
      if (b && !isNaN(Number(b))) setQuantBits(Number(b));
      if (ctx && !isNaN(Number(ctx))) setContextWindow(Number(ctx));
      if (kv && !isNaN(Number(kv))) setKvPrecision(Number(kv));

      if (m || q || ctx) {
        setSaveSuccessMsg('팀원이 공유한 VRAM 설정 파라미터가 자동으로 로드되었습니다.');
        setTimeout(() => setSaveSuccessMsg(null), 4000);
      }
    } catch (e) {
      console.error('URL 파라미터 파싱 오류:', e);
    }
  }, []);

  // Scenarios state with realistic enterprise presets
  const [scenarios, setScenarios] = useState<VRAMScenario[]>([
    {
      id: 'sc-1',
      name: 'Llama 3.2 8B (Q4_K_M, 8K Ctx) - 로컬 표준 챗봇',
      createdAt: '2026-10-04T12:00:00.000Z',
      inputs: {
        modelParams: 8,
        quantBits: 4.8,
        quantName: 'Q4_K_M',
        contextWindow: 8192,
        kvPrecision: 8,
        batchSize: 1,
      },
      result: calculateVRAM({
        modelParams: 8,
        quantBits: 4.8,
        quantName: 'Q4_K_M',
        contextWindow: 8192,
        kvPrecision: 8,
        batchSize: 1,
      }),
      notes: 'RTX 3060/4060 8GB~12GB 완벽 적재 최적화',
    },
    {
      id: 'sc-2',
      name: 'Qwen 2.5 Coder 32B (Q4_K_M, 32K Ctx) - 개발 에이전트',
      createdAt: '2026-10-04T12:15:00.000Z',
      inputs: {
        modelParams: 32,
        quantBits: 4.8,
        quantName: 'Q4_K_M',
        contextWindow: 32768,
        kvPrecision: 8,
        batchSize: 1,
      },
      result: calculateVRAM({
        modelParams: 32,
        quantBits: 4.8,
        quantName: 'Q4_K_M',
        contextWindow: 32768,
        kvPrecision: 8,
        batchSize: 1,
      }),
      notes: 'RTX 3090/4090 24GB 단일 GPU 100% VRAM 상주',
    },
    {
      id: 'sc-3',
      name: 'DeepSeek R1 14B (Q8_0, 32K Ctx) - 고정밀 복합 추론',
      createdAt: '2026-10-04T12:30:00.000Z',
      inputs: {
        modelParams: 14,
        quantBits: 8.5,
        quantName: 'Q8_0',
        contextWindow: 32768,
        kvPrecision: 8,
        batchSize: 1,
      },
      result: calculateVRAM({
        modelParams: 14,
        quantBits: 8.5,
        quantName: 'Q8_0',
        contextWindow: 32768,
        kvPrecision: 8,
        batchSize: 1,
      }),
      notes: '16GB~24GB GPU 타겟 복합 수학/코드 검증',
    },
    {
      id: 'sc-4',
      name: 'Llama 3.1 70B (Q4_K_M, 16K Ctx) - 고성능 연구',
      createdAt: '2026-10-04T12:45:00.000Z',
      inputs: {
        modelParams: 70,
        quantBits: 4.8,
        quantName: 'Q4_K_M',
        contextWindow: 16384,
        kvPrecision: 8,
        batchSize: 1,
      },
      result: calculateVRAM({
        modelParams: 70,
        quantBits: 4.8,
        quantName: 'Q4_K_M',
        contextWindow: 16384,
        kvPrecision: 8,
        batchSize: 1,
      }),
      notes: 'Dual RTX 3090 (48GB) 또는 Mac Studio 64GB Unified RAM',
    },
  ]);

  // Chart metric
  const [chartMetric, setChartMetric] = useState<'vram' | 'speed' | 'accuracy' | 'ppl'>('vram');

  // Compute VRAM result
  const calcInputs: VRAMCalcInputs = {
    modelParams,
    quantBits,
    quantName,
    contextWindow,
    kvPrecision,
    batchSize,
  };

  const vramResult = useMemo(() => calculateVRAM(calcInputs), [calcInputs]);

  const handleQuantSelect = (bits: number, name: string) => {
    setQuantBits(bits);
    setQuantName(name);
  };

  // Scenario handlers
  const handleSaveScenario = (name: string, notes?: string) => {
    const newScenario: VRAMScenario = {
      id: `sc-${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
      inputs: { ...calcInputs },
      result: { ...vramResult },
      notes,
    };
    setScenarios((prev) => [newScenario, ...prev]);
    setSaveSuccessMsg(`'${name}' 시나리오가 저장되었습니다.`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleSaveCurrentDirect = () => {
    const defaultName = `${modelParams}B @ ${quantName} (${(contextWindow / 1024).toFixed(0)}K Ctx)`;
    handleSaveScenario(defaultName, `${vramResult.totalVRAM}GB 필요 VRAM`);
  };

  const handleDeleteScenario = (id: string) => {
    setScenarios((prev) => prev.filter((s) => s.id !== id));
  };

  const handleLoadScenario = (scenario: VRAMScenario) => {
    setModelParams(scenario.inputs.modelParams);
    setQuantBits(scenario.inputs.quantBits);
    setQuantName(scenario.inputs.quantName);
    setContextWindow(scenario.inputs.contextWindow);
    setKvPrecision(scenario.inputs.kvPrecision);
    setBatchSize(scenario.inputs.batchSize);
    setSaveSuccessMsg(`'${scenario.name}' 설정이 계산기에 적용되었습니다.`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleClearAllScenarios = () => {
    if (window.confirm('저장된 모든 시나리오를 비우시겠습니까?')) {
      setScenarios([]);
    }
  };

  const handleImportScenarios = (imported: VRAMScenario[]) => {
    setScenarios((prev) => [...imported, ...prev]);
    setSaveSuccessMsg(`${imported.length}개 시나리오를 성공적으로 불러왔습니다.`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Direct JSON download trigger
  const handleDownloadAllJSON = () => {
    const exportData = {
      app: 'Ollama Architecture & Local LLM Ops Dashboard',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      scenarioCount: scenarios.length,
      currentActiveConfig: {
        inputs: calcInputs,
        result: vramResult,
      },
      scenarios,
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    link.download = `ollama-vram-scenarios-${dateStr}.json`;
    link.click();
    URL.revokeObjectURL(url);

    setSaveSuccessMsg('시나리오 JSON 파일이 다운로드되었습니다.');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Quick clipboard share copy for teammates
  const handleQuickShareCopy = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
    const shareUrl = `${baseUrl}?m=${modelParams}&q=${encodeURIComponent(
      quantName
    )}&b=${quantBits}&ctx=${contextWindow}&kv=${kvPrecision}&tab=gguf`;

    const summaryText = `[Ollama 로컬 LLM VRAM 계산 설정]
• 모델 크기: ${modelParams}B Parameters
• GGUF 정밀도: ${quantName} (${quantBits} bpw)
• 컨텍스트 길이: ${contextWindow.toLocaleString()} 토큰 (${(contextWindow / 1024).toFixed(0)}K)
• KV 캐시: ${kvPrecision === 16 ? 'FP16' : kvPrecision === 8 ? 'q8_0' : 'q4_0'}
• 필요 VRAM: 총 ${vramResult.totalVRAM} GB (가중치 ${vramResult.weightsVRAM}GB + KV ${vramResult.kvCacheVRAM}GB + CUDA ${vramResult.cudaContextVRAM}GB)
• 하드웨어 판정: ${
      vramResult.totalVRAM <= 12
        ? 'RTX 3060/4070 (12GB) 적재 가능'
        : vramResult.totalVRAM <= 16
        ? 'RTX 4080 (16GB) 적재 가능'
        : vramResult.totalVRAM <= 24
        ? 'RTX 3090/4090 (24GB) 100% Full VRAM 상주'
        : vramResult.totalVRAM <= 48
        ? 'Dual RTX 3090 (48GB) 또는 부분 RAM 오프로딩 필요'
        : 'A100 (80GB) 데이터센터 필요'
    }
• 빠른 복제 URL: ${shareUrl}`;

    navigator.clipboard.writeText(summaryText);
    setSaveSuccessMsg('VRAM 계산 설정이 클립보드에 복사되었습니다. (팀 공유 완료)');
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  return (
    <div className="space-y-6">
      {/* 1. Intro Theory & PTQ Overview */}
      <div className="bg-white p-6 rounded-xl border border-slate-200">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          2. GGUF 양자화 아키텍처 &amp; 실시간 VRAM 산출기
        </h2>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-4xl">
          GGUF(GPT-Generated Unified Format)는 텐서 가중치와 토크나이저 메타데이터, 어텐션 하이퍼파라미터를
          단일 바이너리로 패키징한 포맷입니다. 사후 학습 양자화(PTQ) 중 실무 골든 스탠다드인{' '}
          <strong>Q4_K_M (4-bit Medium K-Quant)</strong>은 중요 레이어(Attention Q/V 프로젝션)에 6/8비트를,
          비핵심 가중치에 4비트를 차등 배분하여 <strong>FP16 대비 VRAM을 ~70% 절감</strong>하면서도{' '}
          <strong>함수 호출(Tool Calling) 정확도를 97.9% 보존</strong>합니다.
        </p>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="font-bold text-slate-800">k-quants (차등 정밀도)</span>
            <p className="text-slate-600 mt-1">
              어텐션 헤드와 다운 프로젝션에 높은 비트를 유지하여 언어 모델의 구조적 파괴 방지.
            </p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="font-bold text-slate-800">imatrix (중요도 행렬)</span>
            <p className="text-slate-600 mt-1">
              도메인 텍스트 캘리브레이션으로 활성화 분산이 큰 가중치 좌표를 선별 보존.
            </p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="font-bold text-slate-800">KV 캐시 양자화</span>
            <p className="text-slate-600 mt-1">
              <code className="font-mono text-emerald-700">OLLAMA_KV_CACHE_TYPE=q8_0</code>로 긴 문맥 VRAM 50% 절감.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Live VRAM Calculator + Hardware Compatibility */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Calculator Inputs (5 cols) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-slate-200 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-emerald-600" />
              <span>동적 VRAM 용량 산출기</span>
            </h3>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  handleQuickShareCopy();
                  setIsShareModalOpen(true);
                }}
                className="flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200 transition-colors"
                title="팀원과 VRAM 계산 데이터 복사 및 공유"
              >
                <Share2 className="w-3 h-3" />
                <span>공유하기</span>
              </button>
              <span className="text-xs font-mono text-slate-400">실시간 연산</span>
            </div>
          </div>

          <div className="space-y-3.5 text-xs">
            {/* Model Size */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-semibold text-slate-700">모델 파라미터 크기</label>
                <span className="font-mono font-bold text-emerald-700">{modelParams}B Parameters</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { label: '3B', val: 3 },
                  { label: '8B', val: 8 },
                  { label: '14B', val: 14 },
                  { label: '32B', val: 32 },
                  { label: '70B', val: 70 },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => setModelParams(item.val)}
                    className={`py-1.5 text-xs font-semibold rounded transition-colors ${
                      modelParams === item.val
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantization Level */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-semibold text-slate-700">GGUF 양자화 레벨</label>
                <span className="font-mono text-slate-600">{quantName} ({quantBits} bpw)</span>
              </div>
              <select
                value={`${quantBits}-${quantName}`}
                onChange={(e) => {
                  const [b, n] = e.target.value.split('-');
                  handleQuantSelect(Number(b), n);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
              >
                <option value="16.0-FP16">FP16 (16.0 bpw - 원본 부동소수점)</option>
                <option value="8.5-Q8_0">Q8_0 (8.5 bpw - 8비트 준무손실)</option>
                <option value="6.56-Q6_K">Q6_K (6.56 bpw - 고정밀 K-Quant)</option>
                <option value="5.5-Q5_K_M">Q5_K_M (5.5 bpw - 5비트 안정형)</option>
                <option value="4.8-Q4_K_M">Q4_K_M (4.8 bpw - 골든 스탠다드 권장)</option>
                <option value="4.5-Q4_0">Q4_0 (4.5 bpw - 레거시 4비트)</option>
                <option value="3.8-Q3_K_M">Q3_K_M (3.8 bpw - 3비트 압축)</option>
                <option value="3.65-IQ3_M">IQ3_M (3.65 bpw - imatrix 3비트)</option>
                <option value="2.2-IQ2_XXS">IQ2_XXS (2.2 bpw - 극단적 압축)</option>
              </select>
            </div>

            {/* Context Window */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-semibold text-slate-700">컨텍스트 윈도우 길이 (num_ctx)</label>
                <span className="font-mono text-slate-600 tabular-nums">{contextWindow.toLocaleString()} 토큰</span>
              </div>
              <select
                value={contextWindow}
                onChange={(e) => setContextWindow(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
              >
                <option value={4096}>4,096 토큰 (4K - 표준 챗봇)</option>
                <option value={8192}>8,192 토큰 (8K - 단문 RAG)</option>
                <option value={16384}>16,384 토큰 (16K - 문서 요약)</option>
                <option value={32768}>32,768 토큰 (32K - 대용량 소스코드)</option>
                <option value={65536}>65,536 토큰 (64K - 장문 리포트)</option>
                <option value={131072}>131,072 토큰 (128K - 방대 리서치)</option>
              </select>
            </div>

            {/* KV Cache Precision */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-semibold text-slate-700">
                  KV 캐시 양자화 (<code className="font-mono">OLLAMA_KV_CACHE_TYPE</code>)
                </label>
                <span className="font-mono text-emerald-700">
                  {kvPrecision === 16 ? 'FP16 (기본)' : kvPrecision === 8 ? 'q8_0 (50% 절감 권장)' : 'q4_0 (75% 절감)'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'FP16 (2B)', val: 16 },
                  { label: 'q8_0 (1B)', val: 8 },
                  { label: 'q4_0 (0.5B)', val: 4 },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => setKvPrecision(item.val)}
                    className={`py-1.5 text-xs font-semibold rounded border transition-colors ${
                      kvPrecision === item.val
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Result Calculation Output Card */}
          <div className="mt-4 p-4 bg-slate-900 text-white rounded-lg space-y-2.5">
            <div className="flex justify-between items-center text-xs text-slate-300">
              <span>모델 가중치 VRAM:</span>
              <span className="font-mono font-bold text-slate-100 tabular-nums">{vramResult.weightsVRAM} GB</span>
            </div>
            <div className="flex justify-between items-center text-xs text-slate-300">
              <span>KV 캐시 메모리 점유:</span>
              <span className="font-mono font-bold text-slate-100 tabular-nums">{vramResult.kvCacheVRAM} GB</span>
            </div>
            <div className="flex justify-between items-center text-xs text-slate-300">
              <span>CUDA 런타임 &amp; 활성화 버퍼:</span>
              <span className="font-mono font-bold text-slate-100 tabular-nums">{vramResult.cudaContextVRAM} GB</span>
            </div>
            <div className="pt-2 border-t border-slate-700 flex justify-between items-center text-sm font-bold">
              <span className="text-emerald-400">총 필요 VRAM:</span>
              <span className="text-lg font-mono text-emerald-300 tabular-nums">{vramResult.totalVRAM} GB</span>
            </div>
            <div className="text-[11px] text-slate-400 flex justify-between">
              <span>부분 오프로딩 시 권장 호스트 RAM:</span>
              <span className="font-mono text-slate-300 font-medium tabular-nums">{vramResult.recommendedRAM} GB 이상</span>
            </div>
          </div>

          {/* Scenario & Share Action Buttons in Calculator Card */}
          <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={handleSaveCurrentDirect}
                className="flex items-center justify-center gap-1 py-2 px-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
                title="현재 파라미터 설정을 시나리오로 저장"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">시나리오 저장</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadAllJSON}
                className="flex items-center justify-center gap-1 py-2 px-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                title="저장된 모든 시나리오를 JSON 파일로 다운로드"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">JSON</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleQuickShareCopy();
                  setIsShareModalOpen(true);
                }}
                className="flex items-center justify-center gap-1 py-2 px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
                title="현재 VRAM 계산 데이터를 클립보드에 복사하고 팀원과 공유"
              >
                <Share2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">공유하기</span>
              </button>
            </div>

            {saveSuccessMsg && (
              <div className="p-2 bg-emerald-50 border border-emerald-200 rounded text-[11px] text-emerald-800 flex items-center gap-1.5 animate-in fade-in duration-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">{saveSuccessMsg}</span>
              </div>
            )}
          </div>
        </div>

        {/* Live Chart.js & Hardware Suitability Panel (7 cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          {/* Segmented Top Selector */}
          <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <span className="text-xs font-bold text-slate-800">실시간 연산 결과 뷰:</span>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs overflow-x-auto">
              <button
                onClick={() => setRightPanelTab('chart')}
                className={`flex items-center gap-1.5 px-3 py-1 font-semibold rounded-md transition-colors whitespace-nowrap ${
                  rightPanelTab === 'chart'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Chart.js 실시간 막대 차트</span>
              </button>
              <button
                onClick={() => setRightPanelTab('scenario')}
                className={`flex items-center gap-1.5 px-3 py-1 font-semibold rounded-md transition-colors whitespace-nowrap ${
                  rightPanelTab === 'scenario'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>시나리오 저장 &amp; 비교 ({scenarios.length})</span>
              </button>
              <button
                onClick={() => setRightPanelTab('hardware')}
                className={`flex items-center gap-1.5 px-3 py-1 font-semibold rounded-md transition-colors whitespace-nowrap ${
                  rightPanelTab === 'hardware'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Cpu className="w-3.5 h-3.5 text-slate-500" />
                <span>하드웨어 적합성 목록</span>
              </button>
            </div>
          </div>

          {rightPanelTab === 'chart' ? (
            <VRAMLiveChart
              modelParams={modelParams}
              quantBits={quantBits}
              quantName={quantName}
              contextWindow={contextWindow}
              kvPrecision={kvPrecision}
              batchSize={batchSize}
              vramResult={vramResult}
            />
          ) : rightPanelTab === 'scenario' ? (
            <VRAMScenarioSidebar
              scenarios={scenarios}
              currentInputs={calcInputs}
              currentResult={vramResult}
              onSaveScenario={handleSaveScenario}
              onDeleteScenario={handleDeleteScenario}
              onLoadScenario={handleLoadScenario}
              onClearAllScenarios={handleClearAllScenarios}
              onImportScenarios={handleImportScenarios}
            />
          ) : (
            <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-emerald-600" />
                    <span>주요 하드웨어별 구동 적합성 판정</span>
                  </h3>
                  <span className="text-xs text-slate-500">필요 VRAM: {vramResult.totalVRAM} GB</span>
                </div>

                <div className="mt-4 space-y-2.5">
                  {vramResult.hardwareStatus.map((hw) => {
                    const isFull = hw.canRun === 'full';
                    const isPartial = hw.canRun === 'partial';

                    return (
                      <div
                        key={hw.name}
                        className={`p-3 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors ${
                          isFull
                            ? 'bg-emerald-50/50 border-emerald-200'
                            : isPartial
                            ? 'bg-amber-50/40 border-amber-200'
                            : 'bg-rose-50/30 border-rose-200'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 font-semibold text-slate-800">
                            {isFull ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            ) : isPartial ? (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            )}
                            <span>{hw.name}</span>
                            <span className="font-mono text-slate-500 text-[11px]">({hw.vram} GB)</span>
                          </div>
                          <p className="text-[11px] text-slate-600 pl-5.5">{hw.reason}</p>
                        </div>

                        <div className="shrink-0 self-end sm:self-center">
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded font-mono ${
                              isFull
                                ? 'bg-emerald-100 text-emerald-800'
                                : isPartial
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {isFull ? '100% Full VRAM' : isPartial ? 'Partial RAM Offload' : 'Out Of Memory'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-start gap-2">
                <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <p>
                  <strong>프로덕션 권장 수칙</strong>: 32B 모델(Q4_K_M)은 24GB VRAM GPU(RTX 3090/4090)에 적재 시 최대 32K 컨텍스트까지 100% VRAM에서 온전히 구동됩니다.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Saved Scenarios Multi-Comparison Matrix Table */}
      {scenarios.length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <FileJson className="w-4 h-4 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  저장된 VRAM 시나리오 다중 비교 매트릭스
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                저장된 여러 모델 파라미터 및 양자화 설정의 VRAM 요구량을 동시에 비교하고, JSON 파일로 다운로드합니다.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleSaveCurrentDirect}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition-colors whitespace-nowrap shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>현재 설정 추가</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadAllJSON}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg transition-colors whitespace-nowrap"
                title="시나리오 데이터를 JSON 파일로 다운로드"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>JSON 파일 다운로드</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleQuickShareCopy();
                  setIsShareModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-900 rounded-lg transition-colors whitespace-nowrap"
                title="현재 VRAM 설정 클립보드 복사 및 팀 공유"
              >
                <Share2 className="w-3.5 h-3.5 text-indigo-700" />
                <span>팀원 공유</span>
              </button>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                  <th className="p-2.5 font-bold">시나리오명</th>
                  <th className="p-2.5 font-bold">모델 크기</th>
                  <th className="p-2.5 font-bold">양자화 레벨</th>
                  <th className="p-2.5 font-bold">컨텍스트 (num_ctx)</th>
                  <th className="p-2.5 font-bold">가중치 VRAM</th>
                  <th className="p-2.5 font-bold">KV 캐시</th>
                  <th className="p-2.5 font-bold">총 필요 VRAM</th>
                  <th className="p-2.5 font-bold">현재 설정 대비 차이</th>
                  <th className="p-2.5 font-bold">타겟 GPU</th>
                  <th className="p-2.5 font-bold text-right">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {scenarios.map((sc) => {
                  const delta = Number((sc.result.totalVRAM - vramResult.totalVRAM).toFixed(2));
                  const isFull24 = sc.result.totalVRAM <= 24;
                  const isFull16 = sc.result.totalVRAM <= 16;
                  const isFull12 = sc.result.totalVRAM <= 12;

                  return (
                    <tr key={sc.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-2.5 font-bold text-slate-900">
                        <div>{sc.name}</div>
                        {sc.notes && <div className="text-[10px] text-slate-400 font-normal">{sc.notes}</div>}
                      </td>
                      <td className="p-2.5 font-mono tabular-nums">{sc.inputs.modelParams}B</td>
                      <td className="p-2.5 font-mono text-emerald-700 font-semibold">{sc.inputs.quantName}</td>
                      <td className="p-2.5 font-mono tabular-nums">{sc.inputs.contextWindow.toLocaleString()}</td>
                      <td className="p-2.5 font-mono tabular-nums">{sc.result.weightsVRAM} GB</td>
                      <td className="p-2.5 font-mono tabular-nums text-indigo-700">{sc.result.kvCacheVRAM} GB</td>
                      <td className="p-2.5 font-mono font-bold text-slate-900 tabular-nums">{sc.result.totalVRAM} GB</td>
                      <td className="p-2.5 font-mono tabular-nums">
                        {delta === 0 ? (
                          <span className="text-slate-400">동일</span>
                        ) : (
                          <span
                            className={`font-semibold px-1.5 py-0.5 rounded text-[11px] ${
                              delta > 0
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {delta > 0 ? `+${delta} GB` : `${delta} GB`}
                          </span>
                        )}
                      </td>
                      <td className="p-2.5">
                        {isFull12 ? (
                          <span className="text-emerald-700 font-medium">RTX 3060/4070 (12G)</span>
                        ) : isFull16 ? (
                          <span className="text-emerald-700 font-medium">RTX 4080 (16G)</span>
                        ) : isFull24 ? (
                          <span className="text-emerald-700 font-medium">RTX 3090/4090 (24G)</span>
                        ) : sc.result.totalVRAM <= 48 ? (
                          <span className="text-amber-800 font-medium">Dual 3090 (48G)</span>
                        ) : (
                          <span className="text-rose-800 font-medium">A100 (80G)</span>
                        )}
                      </td>
                      <td className="p-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleLoadScenario(sc)}
                            className="flex items-center gap-1 px-2 py-1 bg-white hover:bg-emerald-50 border border-slate-300 hover:border-emerald-300 text-slate-700 hover:text-emerald-800 rounded font-medium text-[11px] transition-colors"
                            title="이 시나리오 설정을 계산기에 즉시 적용"
                          >
                            <RotateCcw className="w-3 h-3 text-emerald-600" />
                            <span>적용</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteScenario(sc.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="시나리오 삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Chart.js Interactive VRAM Visualization */}
      <VRAMChartJS
        currentModelParams={modelParams}
        currentQuantBits={quantBits}
        currentQuantName={quantName}
        contextWindow={contextWindow}
        kvPrecision={kvPrecision}
        batchSize={batchSize}
      />

      {/* 4. Interactive Quantization Comparison Chart */}
      <div className="bg-white p-6 rounded-xl border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              <span>GGUF 정밀도 레벨별 트레이드오프 비교 차트</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              양자화 비트 수에 따른 메모리 절감, 추론 속도 및 정확도 보존율 실측 비교
            </p>
          </div>

          {/* Metric Selector Buttons */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
            <button
              onClick={() => setChartMetric('vram')}
              className={`px-2.5 py-1 font-semibold rounded transition-colors ${
                chartMetric === 'vram' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              VRAM 절감률 (%)
            </button>
            <button
              onClick={() => setChartMetric('speed')}
              className={`px-2.5 py-1 font-semibold rounded transition-colors ${
                chartMetric === 'speed' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              추론 속도 배율 (x)
            </button>
            <button
              onClick={() => setChartMetric('accuracy')}
              className={`px-2.5 py-1 font-semibold rounded transition-colors ${
                chartMetric === 'accuracy' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              도구 호출 정확도 (%)
            </button>
          </div>
        </div>

        {/* Visual Chart Bars */}
        <div className="mt-6 space-y-3">
          {QUANT_DATA.map((item) => {
            const isQ4KM = item.level === 'Q4_K_M';
            let barPct = 0;
            let displayVal = '';

            if (chartMetric === 'vram') {
              barPct = item.vramSavingPct;
              displayVal = `${item.vramSavingPct}% 절감`;
            } else if (chartMetric === 'speed') {
              barPct = Math.round(((item.speedMultiplier - 1.0) / 0.8) * 100);
              displayVal = `${item.speedMultiplier}x 배율`;
            } else if (chartMetric === 'accuracy') {
              barPct = item.accuracyRetention;
              displayVal = `${item.accuracyRetention}%`;
            }

            return (
              <div key={item.level} className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`font-mono font-bold ${isQ4KM ? 'text-emerald-700' : 'text-slate-800'}`}>
                      {item.level}
                    </span>
                    <span className="text-slate-500 text-[11px] hidden sm:inline">({item.name})</span>
                    {isQ4KM && (
                      <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        권장 표준
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 font-mono text-[11px] tabular-nums">
                    <span className="text-slate-500">{item.bpw} bpw</span>
                    <span className={`font-bold ${isQ4KM ? 'text-emerald-700' : 'text-slate-900'}`}>
                      {displayVal}
                    </span>
                  </div>
                </div>

                {/* Progress Track */}
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      isQ4KM
                        ? 'bg-emerald-600'
                        : chartMetric === 'accuracy' && item.accuracyRetention < 90
                        ? 'bg-rose-500'
                        : 'bg-slate-700'
                    }`}
                    style={{ width: `${Math.max(5, barPct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Comprehensive GGUF Table */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 overflow-x-auto">
        <h3 className="text-base font-bold text-slate-900 mb-3">
          📋 GGUF 양자화 레벨별 정밀 스펙 &amp; 실무 권장 가이드
        </h3>
        <table className="w-full text-xs text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
              <th className="p-2.5 font-bold">양자화 레벨</th>
              <th className="p-2.5 font-bold">비트 심도 (bpw)</th>
              <th className="p-2.5 font-bold">VRAM 절감</th>
              <th className="p-2.5 font-bold">속도 배율</th>
              <th className="p-2.5 font-bold">정확도 보존</th>
              <th className="p-2.5 font-bold">PPL 변화</th>
              <th className="p-2.5 font-bold">권장 실무 유스케이스</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-600">
            {QUANT_DATA.map((row) => {
              const isHighlight = row.level === 'Q4_K_M';
              return (
                <tr key={row.level} className={isHighlight ? 'bg-emerald-50/40 font-medium' : 'hover:bg-slate-50'}>
                  <td className="p-2.5 font-mono font-bold text-slate-800">
                    <span className={isHighlight ? 'text-emerald-800' : ''}>{row.level}</span>
                  </td>
                  <td className="p-2.5 font-mono tabular-nums">{row.bpw}</td>
                  <td className="p-2.5 font-mono tabular-nums text-slate-900">{row.vramSavingPct}%</td>
                  <td className="p-2.5 font-mono tabular-nums text-emerald-700">{row.speedMultiplier}x</td>
                  <td className="p-2.5 font-mono tabular-nums">{row.accuracyRetention}%</td>
                  <td className="p-2.5 font-mono tabular-nums text-slate-500">{row.perplexityDelta}</td>
                  <td className="p-2.5 text-slate-700">{row.recommendedUse}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* VRAM Team Share Modal */}
      <VRAMShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        inputs={calcInputs}
        result={vramResult}
      />
    </div>
  );
};
