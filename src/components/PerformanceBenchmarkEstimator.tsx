import React, { useState, useMemo } from 'react';
import {
  Gauge,
  Zap,
  Cpu,
  HardDrive,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Sliders,
  TrendingUp,
  Clock,
  Layers,
  Sparkles,
} from 'lucide-react';

interface HardwarePreset {
  id: string;
  name: string;
  category: 'nvidia' | 'apple' | 'custom';
  vramGB: number;
  bandwidthGBs: number;
  computeTFLOPS: number;
  pcieBandwidthGBs: number;
  isUMA: boolean;
}

const HARDWARE_PRESETS: HardwarePreset[] = [
  {
    id: 'rtx-4090',
    name: 'NVIDIA RTX 4090 (24GB)',
    category: 'nvidia',
    vramGB: 24,
    bandwidthGBs: 1008,
    computeTFLOPS: 83,
    pcieBandwidthGBs: 31.5, // PCIe 4.0 x16
    isUMA: false,
  },
  {
    id: 'rtx-3090',
    name: 'NVIDIA RTX 3090 (24GB)',
    category: 'nvidia',
    vramGB: 24,
    bandwidthGBs: 936,
    computeTFLOPS: 36,
    pcieBandwidthGBs: 31.5,
    isUMA: false,
  },
  {
    id: 'rtx-4080',
    name: 'NVIDIA RTX 4080 (16GB)',
    category: 'nvidia',
    vramGB: 16,
    bandwidthGBs: 717,
    computeTFLOPS: 49,
    pcieBandwidthGBs: 31.5,
    isUMA: false,
  },
  {
    id: 'rtx-4070',
    name: 'NVIDIA RTX 4070 (12GB)',
    category: 'nvidia',
    vramGB: 12,
    bandwidthGBs: 504,
    computeTFLOPS: 29,
    pcieBandwidthGBs: 31.5,
    isUMA: false,
  },
  {
    id: 'rtx-3060',
    name: 'NVIDIA RTX 3060 (12GB)',
    category: 'nvidia',
    vramGB: 12,
    bandwidthGBs: 360,
    computeTFLOPS: 13,
    pcieBandwidthGBs: 15.7, // PCIe 3.0 / 4.0 x8
    isUMA: false,
  },
  {
    id: 'rtx-4060',
    name: 'NVIDIA RTX 4060 (8GB)',
    category: 'nvidia',
    vramGB: 8,
    bandwidthGBs: 272,
    computeTFLOPS: 15,
    pcieBandwidthGBs: 15.7,
    isUMA: false,
  },
  {
    id: 'apple-m3-max',
    name: 'Apple M3/M4 Max (64GB~128GB UMA)',
    category: 'apple',
    vramGB: 96,
    bandwidthGBs: 400,
    computeTFLOPS: 32,
    pcieBandwidthGBs: 400, // Zero-copy UMA bus
    isUMA: true,
  },
  {
    id: 'apple-m3-pro',
    name: 'Apple M3/M4 Pro (36GB UMA)',
    category: 'apple',
    vramGB: 36,
    bandwidthGBs: 200,
    computeTFLOPS: 14,
    pcieBandwidthGBs: 200,
    isUMA: true,
  },
  {
    id: 'apple-m2-ultra',
    name: 'Apple M2 Ultra (192GB UMA)',
    category: 'apple',
    vramGB: 192,
    bandwidthGBs: 800,
    computeTFLOPS: 54,
    pcieBandwidthGBs: 800,
    isUMA: true,
  },
];

export const PerformanceBenchmarkEstimator: React.FC = () => {
  // 1. Hardware State
  const [selectedHwId, setSelectedHwId] = useState<string>('rtx-4090');
  const [customVram, setCustomVram] = useState<number>(24);
  const [customBandwidth, setCustomBandwidth] = useState<number>(1008);
  const [customCompute, setCustomCompute] = useState<number>(83);
  const [customPcieBandwidth, setCustomPcieBandwidth] = useState<number>(31.5);
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);

  // 2. Model & Workload State
  const [modelParams, setModelParams] = useState<number>(32); // 8, 14, 32, 70
  const [quantBits, setQuantBits] = useState<number>(4.8); // Q4_K_M default
  const [quantName, setQuantName] = useState<string>('Q4_K_M');
  const [promptTokens, setPromptTokens] = useState<number>(2048); // Prefill tokens
  const [outputTokens, setOutputTokens] = useState<number>(512); // Generation tokens
  const [kvPrecision, setKvPrecision] = useState<number>(8); // q8_0
  const [flashAttention, setFlashAttention] = useState<boolean>(true);

  // Active Hardware Specs
  const activeHw = useMemo(() => {
    if (isCustomMode) {
      return {
        id: 'custom',
        name: '사용자 지정 하드웨어',
        category: 'custom' as const,
        vramGB: customVram,
        bandwidthGBs: customBandwidth,
        computeTFLOPS: customCompute,
        pcieBandwidthGBs: customPcieBandwidth,
        isUMA: false,
      };
    }
    return HARDWARE_PRESETS.find((h) => h.id === selectedHwId) || HARDWARE_PRESETS[0];
  }, [
    isCustomMode,
    selectedHwId,
    customVram,
    customBandwidth,
    customCompute,
    customPcieBandwidth,
  ]);

  // Handle Preset Select
  const handleSelectPreset = (preset: HardwarePreset) => {
    setIsCustomMode(false);
    setSelectedHwId(preset.id);
  };

  // 3. Mathematical Benchmark Calculations
  const metrics = useMemo(() => {
    // A. Model Weights Memory (GB)
    const weightsGB = (modelParams * quantBits) / 8;

    // B. KV Cache Memory (GB)
    // Approximate GQA transformer formula: 2 * num_layers * hidden_dim * context * bytes_per_element
    // For 8B: hidden=4096, layers=32. For 32B: hidden=5120, layers=64. For 70B: hidden=8192, layers=80
    const layerFactor = modelParams <= 8 ? 32 : modelParams <= 14 ? 48 : modelParams <= 32 ? 64 : 80;
    const hiddenFactor = modelParams <= 8 ? 4096 : modelParams <= 14 ? 5120 : modelParams <= 32 ? 5120 : 8192;
    const gqaRatio = 0.25; // 8:1 GQA typical for Llama 3 / Qwen 2.5
    const bytesPerKv = kvPrecision === 16 ? 2 : kvPrecision === 8 ? 1 : 0.5;
    const kvCacheGB = (2 * layerFactor * hiddenFactor * gqaRatio * promptTokens * bytesPerKv) / (1024 ** 3);

    // C. CUDA Context & Activation Graph Overhead (GB)
    const cudaOverheadGB = activeHw.isUMA ? 0.3 : 0.8;
    const totalRequiredVRAM = Number((weightsGB + kvCacheGB + cudaOverheadGB).toFixed(2));

    // D. GPU Offload Ratio & Memory Spill
    const availableVRAM = activeHw.vramGB;
    const isSpill = totalRequiredVRAM > availableVRAM;
    const offloadRatio = isSpill ? Math.max(0.1, availableVRAM / totalRequiredVRAM) : 1.0;
    const spilledLayersPct = Math.round((1 - offloadRatio) * 100);

    // E. Autoregressive Token Generation Speed (Decoding, tok/s)
    // Memory-bound regime: Speed = Effective Memory Bandwidth (GB/s) / Model Weight Size (GB)
    // Factor in KV cache memory traffic overhead during long context
    const kvTrafficFactor = Math.max(0.85, 1.0 - (promptTokens / 131072) * 0.15);
    const gpuDecodingEfficiency = 0.82 * kvTrafficFactor;

    const gpuMaxToks = (activeHw.bandwidthGBs / weightsGB) * gpuDecodingEfficiency;

    // Spilled layers transfer speed over PCIe bus
    // PCIe 4.0 x16 ~ 24 GB/s effective, System RAM ~ 40~60 GB/s
    const effectivePcieBandwidth = Math.min(activeHw.pcieBandwidthGBs, 45);
    const pcieMaxToks = (effectivePcieBandwidth / weightsGB) * 0.7;

    // Harmonic weighted latency per token
    const gpuTimeMs = (1000 / gpuMaxToks) * offloadRatio;
    const pcieTimeMs = isSpill ? (1000 / pcieMaxToks) * (1 - offloadRatio) : 0;
    const interTokenLatencyMs = Number((gpuTimeMs + pcieTimeMs).toFixed(1));
    const estimatedDecodingToks = Number((1000 / interTokenLatencyMs).toFixed(1));

    // F. Prompt Processing Speed (Prefill, tok/s)
    // Compute-bound regime: FLOPs = 2 * params * prompt_tokens
    const faMultiplier = flashAttention ? 1.45 : 1.0;
    const computeEfficiency = 0.35 * faMultiplier; // MFU ~35-50%
    const theoreticalPrefillToks =
      ((activeHw.computeTFLOPS * 1e12 * computeEfficiency) / (2 * modelParams * 1e9));
    const estimatedPrefillToks = Math.round(
      isSpill ? theoreticalPrefillToks * 0.3 : theoreticalPrefillToks
    );

    // G. Time to First Token (TTFT, ms)
    const ttftMs = Math.round((promptTokens / estimatedPrefillToks) * 1000 + 20);

    // H. Total Inference Response Time (seconds)
    const totalTimeSec = Number(((ttftMs / 1000) + (outputTokens / estimatedDecodingToks)).toFixed(2));

    // I. Bottleneck Factor Analysis (%)
    let memoryBusBottleneck = 0;
    let pcieSpillBottleneck = 0;
    let computeBottleneck = 0;
    let kvOverheadBottleneck = 0;

    if (isSpill) {
      pcieSpillBottleneck = Math.min(85, Math.round((1 - offloadRatio) * 100 * 1.2));
      memoryBusBottleneck = Math.round((100 - pcieSpillBottleneck) * 0.6);
      computeBottleneck = Math.round((100 - pcieSpillBottleneck) * 0.2);
      kvOverheadBottleneck = 100 - pcieSpillBottleneck - memoryBusBottleneck - computeBottleneck;
    } else {
      memoryBusBottleneck = 72; // Normal memory-bound state for LLM decoding
      computeBottleneck = 14;
      kvOverheadBottleneck = Math.min(20, Math.round((promptTokens / 32768) * 14));
      pcieSpillBottleneck = 0;
    }

    return {
      weightsGB: Number(weightsGB.toFixed(2)),
      kvCacheGB: Number(kvCacheGB.toFixed(2)),
      totalRequiredVRAM,
      isSpill,
      spilledLayersPct,
      offloadRatio,
      estimatedDecodingToks,
      estimatedPrefillToks,
      interTokenLatencyMs,
      ttftMs,
      totalTimeSec,
      gpuMaxToks: Number(gpuMaxToks.toFixed(1)),
      bottlenecks: {
        memoryBus: memoryBusBottleneck,
        pcieSpill: pcieSpillBottleneck,
        compute: computeBottleneck,
        kvOverhead: kvOverheadBottleneck,
      },
    };
  }, [activeHw, modelParams, quantBits, promptTokens, outputTokens, kvPrecision, flashAttention]);

  // Speed Grade Rating
  const speedRating = useMemo(() => {
    const t = metrics.estimatedDecodingToks;
    if (t >= 70) return { label: '초고속 (Real-time Instant)', color: 'text-emerald-700 bg-emerald-100', rating: 'S' };
    if (t >= 35) return { label: '매우 쾌적 (Conversational Fluid)', color: 'text-emerald-800 bg-emerald-50', rating: 'A+' };
    if (t >= 18) return { label: '실용적 (Practical Speed)', color: 'text-indigo-800 bg-indigo-50', rating: 'B+' };
    if (t >= 8) return { label: '다소 느림 (Reading Pace)', color: 'text-amber-800 bg-amber-50', rating: 'C' };
    return { label: '극심한 지연 (PCIe/CPU Bottleneck)', color: 'text-rose-800 bg-rose-50', rating: 'F' };
  }, [metrics.estimatedDecodingToks]);

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">
              하드웨어 사양 기반 성능 벤치마크 추정기 &amp; 병목 구간 분석기
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            GPU 메모리 대역폭(GB/s), 텐서 연산력(TFLOPS), PCIe 오프로드 패널티를 기반으로 실측 예상 토큰 속도(tok/s)와 세부 병목 요인을 분석합니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-900 border border-indigo-200 rounded-lg font-mono">
            {activeHw.name}
          </span>
        </div>
      </div>

      {/* 2. Top KPI Result Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {/* Token Generation Speed */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span>토큰 생성 속도 (Decoding)</span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-slate-900 tabular-nums">
              {metrics.estimatedDecodingToks}{' '}
              <span className="text-xs font-normal text-slate-500">tok/s</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
              토큰당 지연시간: <strong>{metrics.interTokenLatencyMs} ms</strong>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${speedRating.color}`}>
              등급 {speedRating.rating} · {speedRating.label}
            </span>
          </div>
        </div>

        {/* Prompt Evaluation Speed */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span>프롬프트 처리 속도 (Prefill)</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-slate-900 tabular-nums">
              {metrics.estimatedPrefillToks}{' '}
              <span className="text-xs font-normal text-slate-500">tok/s</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
              입력 {promptTokens.toLocaleString()} 토큰 처리: <strong>{metrics.ttftMs} ms</strong>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500">
            첫 토큰 응답시간(TTFT): <strong className="text-slate-800">{(metrics.ttftMs / 1000).toFixed(2)}초</strong>
          </div>
        </div>

        {/* Total Turnaround Time */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span>총 응답 소요 시간</span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <div className="text-2xl font-black font-mono text-indigo-950 tabular-nums">
              {metrics.totalTimeSec}{' '}
              <span className="text-xs font-normal text-slate-500">초</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
              {outputTokens} 토큰 완결 기준
            </div>
          </div>
          <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500">
            초당 단어 환산: ~<strong>{(metrics.estimatedDecodingToks * 0.75).toFixed(0)} 단어/초</strong>
          </div>
        </div>

        {/* VRAM Memory Allocation Status */}
        <div
          className={`p-4 rounded-xl border space-y-1.5 flex flex-col justify-between ${
            metrics.isSpill
              ? 'bg-rose-50/60 border-rose-200 text-rose-950'
              : 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold text-xs">VRAM 적재 상태</span>
            {metrics.isSpill ? (
              <XCircle className="w-4 h-4 text-rose-600" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            )}
          </div>
          <div>
            <div className="text-2xl font-black font-mono tabular-nums">
              {metrics.isSpill ? (
                <span className="text-rose-700">PCIe 스왑 발생</span>
              ) : (
                <span className="text-emerald-800">100% VRAM</span>
              )}
            </div>
            <div className="text-[11px] font-mono mt-0.5">
              필요: <strong>{metrics.totalRequiredVRAM} GB</strong> / 가용: <strong>{activeHw.vramGB} GB</strong>
            </div>
          </div>
          <div className="pt-2 border-t border-current/20 text-[11px]">
            {metrics.isSpill ? (
              <span className="text-rose-800 font-bold">
                ⚠️ {metrics.spilledLayersPct}% 레이어 RAM 오프로드 (속도 급락)
              </span>
            ) : (
              <span className="text-emerald-800 font-medium">전체 레이어 고속 VRAM 상주 완료</span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Hardware & Workload Tuner Controls */}
      <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-4 text-xs">
        <div className="flex items-center justify-between font-bold text-slate-900">
          <span className="flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-slate-600" />
            <span>벤치마크 시뮬레이션 파라미터 제어</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCustomMode(!isCustomMode)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded border transition-colors ${
                isCustomMode
                  ? 'bg-indigo-600 text-white border-transparent'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {isCustomMode ? '프리셋 모드로 복귀' : '하드웨어 스펙 직접 입력'}
            </button>
          </div>
        </div>

        {/* Hardware Preset Buttons */}
        {!isCustomMode ? (
          <div>
            <label className="block text-[11px] text-slate-600 font-semibold mb-1.5">
              하드웨어 프리셋 선택
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {HARDWARE_PRESETS.map((hw) => {
                const isSelected = selectedHwId === hw.id;
                return (
                  <button
                    key={hw.id}
                    onClick={() => handleSelectPreset(hw)}
                    className={`p-2 rounded-lg border text-left transition-all text-xs ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-bold truncate text-[11.5px]">{hw.name}</div>
                    <div className="text-[10px] opacity-75 font-mono mt-0.5">
                      {hw.bandwidthGBs} GB/s · {hw.vramGB}GB
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-3 bg-white border border-slate-200 rounded-lg grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">VRAM 용량 (GB)</label>
              <input
                type="number"
                min="4"
                max="192"
                value={customVram}
                onChange={(e) => setCustomVram(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-1">메모리 대역폭 (GB/s)</label>
              <input
                type="number"
                min="100"
                max="3000"
                step="50"
                value={customBandwidth}
                onChange={(e) => setCustomBandwidth(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-1">연산 성능 (FP16 TFLOPS)</label>
              <input
                type="number"
                min="5"
                max="200"
                value={customCompute}
                onChange={(e) => setCustomCompute(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-1">PCIe 대역폭 (GB/s)</label>
              <select
                value={customPcieBandwidth}
                onChange={(e) => setCustomPcieBandwidth(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs"
              >
                <option value={31.5}>PCIe 4.0 x16 (31.5 GB/s)</option>
                <option value={15.7}>PCIe 3.0 x16 / 4.0 x8 (15.7 GB/s)</option>
                <option value={63.0}>PCIe 5.0 x16 (63.0 GB/s)</option>
                <option value={400}>통합 메모리 UMA (Zero-Copy 400 GB/s)</option>
              </select>
            </div>
          </div>
        )}

        {/* Workload Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-200">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              모델 크기: <span className="font-mono text-emerald-700">{modelParams}B</span>
            </label>
            <div className="grid grid-cols-4 gap-1">
              {[8, 14, 32, 70].map((m) => (
                <button
                  key={m}
                  onClick={() => setModelParams(m)}
                  className={`py-1 rounded font-semibold text-xs transition-colors ${
                    modelParams === m
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {m}B
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              GGUF 양자화 레벨: <span className="font-mono text-indigo-700">{quantName}</span>
            </label>
            <select
              value={`${quantBits}-${quantName}`}
              onChange={(e) => {
                const [b, n] = e.target.value.split('-');
                setQuantBits(Number(b));
                setQuantName(n);
              }}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-medium text-xs text-slate-800"
            >
              <option value="16.0-FP16">FP16 (16.0 bpw - 원본)</option>
              <option value="8.5-Q8_0">Q8_0 (8.5 bpw - 고정밀)</option>
              <option value="4.8-Q4_K_M">Q4_K_M (4.8 bpw - 골든 권장)</option>
              <option value="3.8-Q3_K_M">Q3_K_M (3.8 bpw - 3비트)</option>
              <option value="2.2-IQ2_XXS">IQ2_XXS (2.2 bpw - 극단 압축)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              프롬프트 길이 (Prefill): <span className="font-mono text-slate-900">{promptTokens.toLocaleString()} 토큰</span>
            </label>
            <select
              value={promptTokens}
              onChange={(e) => setPromptTokens(Number(e.target.value))}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 font-medium"
            >
              <option value={512}>512 토큰 (단문 질의)</option>
              <option value={2048}>2,048 토큰 (일반 대화)</option>
              <option value={8192}>8,192 토큰 (사내 문서 RAG)</option>
              <option value={32768}>32,768 토큰 (대용량 코드 분석)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              KV 캐시 정밀도: <span className="font-mono text-emerald-700">{kvPrecision === 16 ? 'FP16' : 'q8_0'}</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setKvPrecision(8)}
                className={`py-1 text-xs font-semibold rounded border transition-colors ${
                  kvPrecision === 8
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                q8_0 (권장)
              </button>
              <button
                onClick={() => setKvPrecision(16)}
                className={`py-1 text-xs font-semibold rounded border transition-colors ${
                  kvPrecision === 16
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                FP16 (기본)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Deep Bottleneck Diagnostic Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
        {/* Bottleneck Contributions Chart (6 cols) */}
        <div className="lg:col-span-6 bg-slate-900 text-white p-5 rounded-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>추론 지연 시간 병목 구간 기여도 분석</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              토큰당 {metrics.interTokenLatencyMs} ms 소요
            </span>
          </div>

          <div className="space-y-3 font-mono text-[11px]">
            {/* Metric 1: Memory Bus Bandwidth */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-slate-300">
                <span className="font-sans">1. VRAM 메모리 대역폭 가중치 스트리밍:</span>
                <span className="text-emerald-400 font-bold">{metrics.bottlenecks.memoryBus}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${metrics.bottlenecks.memoryBus}%` }}
                />
              </div>
            </div>

            {/* Metric 2: PCIe Bus Spill Overhead */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-slate-300">
                <span className="font-sans">2. PCIe 버스 RAM 스왑 지연 (VRAM 초과분):</span>
                <span
                  className={`font-bold ${
                    metrics.bottlenecks.pcieSpill > 0 ? 'text-rose-400' : 'text-slate-500'
                  }`}
                >
                  {metrics.bottlenecks.pcieSpill}%
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-rose-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${metrics.bottlenecks.pcieSpill}%` }}
                />
              </div>
            </div>

            {/* Metric 3: Compute Saturation */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-slate-300">
                <span className="font-sans">3. 텐서 코어 순방향 연산 (TFLOPS 한계):</span>
                <span className="text-amber-400 font-bold">{metrics.bottlenecks.compute}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-amber-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${metrics.bottlenecks.compute}%` }}
                />
              </div>
            </div>

            {/* Metric 4: KV Cache Memory Overhead */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-slate-300">
                <span className="font-sans">4. KV 캐시 읽기/쓰기 대역폭 점유:</span>
                <span className="text-indigo-400 font-bold">{metrics.bottlenecks.kvOverhead}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-indigo-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${metrics.bottlenecks.kvOverhead}%` }}
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 font-sans leading-relaxed">
            {metrics.isSpill ? (
              <span className="text-rose-300">
                🚨 <strong>치명적 병목 감지</strong>: VRAM 용량이 {metrics.totalRequiredVRAM - activeHw.vramGB}GB 부족하여 레이어의 {metrics.spilledLayersPct}%가 PCIe 버스를 통해 왕복하고 있습니다. 이로 인해 잠재 속도({metrics.gpuMaxToks} tok/s) 대비 <strong>{((1 - metrics.estimatedDecodingToks / metrics.gpuMaxToks) * 100).toFixed(0)}% 속도 손실</strong>이 발생 중입니다.
              </span>
            ) : (
              <span className="text-emerald-300">
                ✅ <strong>정상 상태</strong>: 모델과 KV 캐시가 100% VRAM에 상주하여 PCIe 병목이 없으며, 순수 메모리 대역폭({activeHw.bandwidthGBs} GB/s) 한계선에 도달한 최적 상태입니다.
              </span>
            )}
          </div>
        </div>

        {/* Bottleneck Explanation & Remediation Recommendations (6 cols) */}
        <div className="lg:col-span-6 bg-slate-50 border border-slate-200 p-5 rounded-xl space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>성능 극대화 최적화 가이드</span>
              </h4>
              <span className="text-[11px] text-slate-500 font-mono">실측 기반 추천</span>
            </div>

            <div className="mt-3 space-y-2.5 text-xs text-slate-700">
              {/* Recommendation 1 */}
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-900">
                    {metrics.isSpill
                      ? '양자화 비트 축소로 100% VRAM 적재 유도'
                      : 'Q4_K_M 골든 스탠다드 적용'}
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                    {metrics.isSpill
                      ? `현재 ${quantName}에서 Q4_K_M(4.8 bpw)으로 낮추면 필요 VRAM이 줄어 PCIe 스왑을 해소하고 속도가 즉시 ${metrics.gpuMaxToks} tok/s로 3~5배 도약합니다.`
                      : `가중치 크기(${metrics.weightsGB} GB)가 작을수록 대역폭 스트리밍 주기가 단축되어 속도가 비례 증가합니다.`}
                  </p>
                </div>
              </div>

              {/* Recommendation 2 */}
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-start gap-2">
                <HardDrive className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-900">
                    FlashAttention-2 &amp; KV 캐시 q8_0 활성화
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                    긴 컨텍스트({promptTokens.toLocaleString()} 토큰)에서 어텐션 맵 재계산 대역폭을 50% 절감하여 First Token Latency를 <strong>{metrics.ttftMs}ms</strong>로 단축합니다.
                  </p>
                </div>
              </div>

              {/* Recommendation 3 */}
              <div className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-start gap-2">
                <Cpu className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-slate-900">
                    GPU 하드웨어 업그레이드 ROI
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                    대역폭 360 GB/s(RTX 3060)에서 1,008 GB/s(RTX 4090)로 확장 시, 동일 모델 기준 토큰 생성 속도가 <strong>+180% 향상</strong>(2.8배 빠른 응답)됩니다.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-indigo-50/80 border border-indigo-200 rounded-lg text-[11px] text-indigo-950 flex items-center justify-between">
            <span className="font-semibold">이 모델 최적 권장 환경:</span>
            <span className="font-mono font-bold text-indigo-700">
              {metrics.totalRequiredVRAM <= 12
                ? 'RTX 3060/4070 (12GB)'
                : metrics.totalRequiredVRAM <= 16
                ? 'RTX 4080 (16GB)'
                : metrics.totalRequiredVRAM <= 24
                ? 'RTX 3090/4090 (24GB)'
                : 'Dual RTX 3090 (48GB) 또는 Mac Studio 64GB+'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
