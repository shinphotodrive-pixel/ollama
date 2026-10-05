import React, { useState } from 'react';
import { MODEL_PRESETS, ModelPreset } from '../utils/modelfileTemplates';
import { Copy, Check, Download, Info, HardDrive, Cpu, AlertTriangle, ArrowRight } from 'lucide-react';
import { GPUArchitectureComparison } from './GPUArchitectureComparison';
import { VRAMBottleneckChecklist } from './VRAMBottleneckChecklist';

export const TabArchitecture: React.FC = () => {
  // Preset selection
  const [selectedPresetId, setSelectedPresetId] = useState<string>('llama3.2-8b');
  const currentPreset = MODEL_PRESETS.find((p) => p.id === selectedPresetId) || MODEL_PRESETS[0];

  // Modelfile configuration state
  const [fromModel, setFromModel] = useState<string>(currentPreset.from);
  const [contextSize, setContextSize] = useState<number>(currentPreset.contextSize);
  const [temperature, setTemperature] = useState<number>(currentPreset.temperature);
  const [topP, setTopP] = useState<number>(currentPreset.topP);
  const [topK, setTopK] = useState<number>(currentPreset.topK);
  const [repeatPenalty, setRepeatPenalty] = useState<number>(currentPreset.repeatPenalty);
  const [systemPrompt, setSystemPrompt] = useState<string>(currentPreset.systemPrompt);
  const [adapter, setAdapter] = useState<string>('');
  const [includeTemplate, setIncludeTemplate] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [customModelName, setCustomModelName] = useState<string>('enterprise-agent');

  // Handle preset change
  const handlePresetChange = (presetId: string) => {
    setSelectedPresetId(presetId);
    const p = MODEL_PRESETS.find((item) => item.id === presetId);
    if (p) {
      setFromModel(p.from);
      setContextSize(p.contextSize);
      setTemperature(p.temperature);
      setTopP(p.topP);
      setTopK(p.topK);
      setRepeatPenalty(p.repeatPenalty);
      setSystemPrompt(p.systemPrompt);
    }
  };

  // Generate Modelfile text
  const generateModelfileCode = (): string => {
    let output = `# ========================================================\n`;
    output += `# Ollama Modelfile - 엔터프라이즈 환경 정의\n`;
    output += `# 생성 일시: ${new Date().toISOString().split('T')[0]}\n`;
    output += `# ========================================================\n\n`;

    output += `FROM ${fromModel}\n\n`;

    output += `# --- 런타임 하이퍼파라미터 ---\n`;
    output += `PARAMETER num_ctx ${contextSize}\n`;
    output += `PARAMETER temperature ${temperature}\n`;
    output += `PARAMETER top_p ${topP}\n`;
    output += `PARAMETER top_k ${topK}\n`;
    output += `PARAMETER repeat_penalty ${repeatPenalty}\n`;

    if (currentPreset.stopTokens && currentPreset.stopTokens.length > 0) {
      currentPreset.stopTokens.forEach((token) => {
        output += `PARAMETER stop "${token}"\n`;
      });
    }

    if (adapter.trim()) {
      output += `\n# --- LoRA 어댑터 가중치 ---\n`;
      output += `ADAPTER ${adapter.trim()}\n`;
    }

    if (includeTemplate && currentPreset.templateSnippet) {
      output += `\n# --- 프롬프트 템플릿 구조 ---\n`;
      output += `${currentPreset.templateSnippet}\n`;
    }

    if (systemPrompt.trim()) {
      output += `\n# --- 시스템 지침 (System Role) ---\n`;
      output += `SYSTEM """${systemPrompt.trim()}"""\n`;
    }

    return output;
  };

  const modelfileCode = generateModelfileCode();

  const handleCopy = () => {
    navigator.clipboard.writeText(modelfileCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([modelfileCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Modelfile';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* 1. Core Architecture Overview Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200">
        <div className="max-w-4xl">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            1. 코어 런타임 아키텍처 &amp; 하드웨어 오프로딩
          </h2>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            올라마(Ollama)는 Go 언어로 작성된 가벼운 REST 서버와 하부의 고성능 C++ 추론 엔진인{' '}
            <code className="text-xs font-mono bg-slate-100 text-emerald-800 px-1.5 py-0.5 rounded">llama.cpp</code>
            로 구성됩니다. 호스트 하드웨어를 자동 감지하여 <strong>Apple Silicon (Metal API)</strong>,{' '}
            <strong>NVIDIA (CUDA)</strong>, <strong>AMD (ROCm)</strong>, 그리고{' '}
            <strong>x86_64 CPU (AVX2 / AVX-512)</strong> 가속 라이브러리를 동적으로 로드합니다.
          </p>
        </div>

        {/* Offloading & Multi-GPU In-depth Cards */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">전체 오프로딩 (Full VRAM)</span>
                <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                  100% GPU
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                모든 가중치와 KV 캐시가 고대역폭 VRAM(GDDR6X / HBM: 1,000 ~ 3,000 GB/s)에 완벽히 적재됩니다.
                PCIe 버스 경유가 없어 최대 토큰 속도(Tokens/s)를 온전히 달성합니다.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200 text-[11px] text-slate-500">
              최대 권장: 가중치 + (컨텍스트 KV) &lt; 90% GPU VRAM
            </div>
          </div>

          <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900">부분 오프로딩 (Partial RAM)</span>
                <span className="text-[11px] font-mono text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                  GPU + System RAM
                </span>
              </div>
              <p className="mt-2 text-xs text-amber-900/80 leading-relaxed">
                VRAM 초과 시 앞선 레이어는 GPU에, 나머지 레이어는 시스템 RAM에 분산됩니다.
                토큰 생성마다 PCIe 버스(16~64 GB/s)를 통해 텐서를 왕복 교환하므로 속도가 <strong>70% ~ 90% 급락</strong>합니다.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-amber-200/60 text-[11px] text-amber-800">
              실무 팁: 부분 오프로딩보다는 한 단계 작은 모델의 100% VRAM 적재가 훨씬 우수
            </div>
          </div>

          <div className="p-4 bg-indigo-50/50 border border-indigo-200 rounded-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-950">다중 GPU 특성 (Multi-GPU Reality)</span>
                <span className="text-[11px] font-mono text-indigo-800 bg-indigo-100 px-1.5 py-0.5 rounded">
                  Layer Splitting
                </span>
              </div>
              <p className="mt-2 text-xs text-indigo-950/80 leading-relaxed">
                Ollama의 멀티 GPU 스케줄링(<code className="font-mono text-[10px]">OLLAMA_SCHED_SPREAD=1</code>)은 텐서 병렬화(TP)가 아닌{' '}
                <strong>레이어 순차 분할(Pipeline Splitting)</strong>입니다. 70B 모델 적재 용량은 확보되나, 단일 요청의 지연 시간은 줄어들지 않습니다.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-indigo-200/60 text-[11px] text-indigo-800">
              권장: 독립 인스턴스 2개 구동 후 Nginx 라운드로빈 로드밸런싱
            </div>
          </div>
        </div>
      </div>

      {/* 2. GPU Hardware Platform Comparison (NVIDIA CUDA vs Apple Silicon) */}
      <GPUArchitectureComparison />

      {/* 3. VRAM Bottleneck Prevention Checklist */}
      <VRAMBottleneckChecklist />

      {/* 4. Interactive Modelfile Builder */}
      <div className="bg-white p-6 rounded-xl border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-4 border-b border-slate-200">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              🛠️ 4. 엔터프라이즈 인터랙티브 Modelfile 생성기
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              기본 모델, 컨텍스트 크기, 템플릿 및 시스템 역할을 조합하여 즉시 배포 가능한 Modelfile을 생성합니다.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">프리셋:</span>
            <select
              value={selectedPresetId}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="text-xs font-semibold px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-600"
            >
              {MODEL_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Form (5 cols) */}
          <div className="lg:col-span-5 space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                기본 모델 (FROM)
              </label>
              <input
                type="text"
                value={fromModel}
                onChange={(e) => setFromModel(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                placeholder="예: llama3.2:8b-instruct-q4_K_M 또는 ./custom.gguf"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                {currentPreset.notes}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  컨텍스트 크기 (<code className="font-mono">num_ctx</code>)
                </label>
                <select
                  value={contextSize}
                  onChange={(e) => setContextSize(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600"
                >
                  <option value={4096}>4,096 토큰 (기본)</option>
                  <option value={8192}>8,192 토큰 (8K)</option>
                  <option value={16384}>16,384 토큰 (16K)</option>
                  <option value={32768}>32,768 토큰 (32K 권장)</option>
                  <option value={65536}>65,536 토큰 (64K)</option>
                  <option value={131072}>131,072 토큰 (128K 장문)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  온도 (<code className="font-mono">temperature</code>: {temperature})
                </label>
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.05"
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer mt-2"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>0.0 (결정론/코드)</span>
                  <span>1.0 (창의적)</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  top_p
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0.1"
                  max="1.0"
                  value={topP}
                  onChange={(e) => setTopP(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  top_k
                </label>
                <input
                  type="number"
                  step="5"
                  min="1"
                  max="100"
                  value={topK}
                  onChange={(e) => setTopK(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-slate-800"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  repeat_penalty
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="1.0"
                  max="1.5"
                  value={repeatPenalty}
                  onChange={(e) => setRepeatPenalty(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                시스템 프롬프트 (SYSTEM)
              </label>
              <textarea
                rows={3}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-600 leading-relaxed font-sans text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                LoRA 어댑터 (ADAPTER - 선택사항)
              </label>
              <input
                type="text"
                value={adapter}
                onChange={(e) => setAdapter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono focus:bg-white focus:outline-none"
                placeholder="예: ./adapters/korean-law-lora.gguf"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="toggle-template"
                checked={includeTemplate}
                onChange={(e) => setIncludeTemplate(e.target.checked)}
                className="accent-emerald-600 w-3.5 h-3.5 rounded"
              />
              <label htmlFor="toggle-template" className="text-slate-700 cursor-pointer select-none">
                채팅 템플릿(TEMPLATE) 구문 포함
              </label>
            </div>
          </div>

          {/* Preview & CLI Runner (7 cols) */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between bg-slate-900 text-slate-300 px-4 py-2.5 rounded-t-lg text-xs font-mono">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Modelfile
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? '복사됨' : '복사'}</span>
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-1 bg-emerald-700 hover:bg-emerald-600 text-white px-2.5 py-1 rounded transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>저장</span>
                  </button>
                </div>
              </div>

              <pre className="p-4 bg-slate-950 text-slate-100 font-mono text-xs rounded-b-lg overflow-x-auto leading-relaxed h-[360px] custom-scrollbar border-x border-b border-slate-800 select-all">
                {modelfileCode}
              </pre>
            </div>

            {/* Build & Run CLI Box */}
            <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="flex items-center justify-between text-xs text-slate-700 font-semibold mb-2">
                <span>터미널 빌드 및 실행 명령어</span>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-slate-500 font-normal">모델 이름:</span>
                  <input
                    type="text"
                    value={customModelName}
                    onChange={(e) => setCustomModelName(e.target.value)}
                    className="px-1.5 py-0.5 border border-slate-300 rounded bg-white font-mono text-[11px] text-emerald-700 w-32"
                  />
                </div>
              </div>
              <div className="bg-slate-900 p-2.5 rounded font-mono text-xs text-emerald-400 space-y-1">
                <div># 1. Modelfile을 기반으로 커스텀 모델 빌드</div>
                <div className="text-slate-100 select-all">ollama create {customModelName} -f ./Modelfile</div>
                <div className="pt-1 text-slate-400"># 2. 빌드된 모델 즉시 대화형 실행</div>
                <div className="text-slate-100 select-all">ollama run {customModelName}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
