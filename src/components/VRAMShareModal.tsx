import React, { useState } from 'react';
import { VRAMCalcInputs, VRAMCalcResult } from '../types';
import {
  Share2,
  Copy,
  Check,
  X,
  Link,
  Terminal,
  FileText,
  Code2,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

interface VRAMShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  inputs: VRAMCalcInputs;
  result: VRAMCalcResult;
}

export const VRAMShareModal: React.FC<VRAMShareModalProps> = ({
  isOpen,
  onClose,
  inputs,
  result,
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'url' | 'command' | 'json'>('summary');
  const [copiedType, setCopiedType] = useState<string | null>(null);

  if (!isOpen) return null;

  // Generate shareable URL with parameters
  const baseUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
  const shareUrl = `${baseUrl}?m=${inputs.modelParams}&q=${encodeURIComponent(
    inputs.quantName
  )}&b=${inputs.quantBits}&ctx=${inputs.contextWindow}&kv=${inputs.kvPrecision}&tab=gguf`;

  // Formatted team report text (Markdown compatible for Slack, Discord, Notion, Jira)
  const summaryReportText = `[Ollama 로컬 LLM VRAM 계산 설정 공유]
• 모델 크기: ${inputs.modelParams}B Parameters
• GGUF 정밀도: ${inputs.quantName} (${inputs.quantBits} bpw)
• 컨텍스트 길이: ${inputs.contextWindow.toLocaleString()} 토큰 (${(inputs.contextWindow / 1024).toFixed(0)}K)
• KV 캐시 설정: ${inputs.kvPrecision === 16 ? 'FP16 (기본)' : inputs.kvPrecision === 8 ? 'q8_0 (50% 절감 권장)' : 'q4_0'}
• 필요 VRAM: 총 ${result.totalVRAM} GB (가중치 ${result.weightsVRAM}GB + KV 캐시 ${result.kvCacheVRAM}GB + CUDA 버퍼 ${result.cudaContextVRAM}GB)
• 하드웨어 판정: ${
    result.totalVRAM <= 12
      ? 'RTX 3060/4070 (12GB) 적재 가능'
      : result.totalVRAM <= 16
      ? 'RTX 4080 (16GB) 적재 가능'
      : result.totalVRAM <= 24
      ? 'RTX 3090/4090 (24GB) 100% Full VRAM 상주'
      : result.totalVRAM <= 48
      ? 'Dual RTX 3090 (48GB) 또는 부분 RAM 오프로딩 필요'
      : 'A100/H100 (80GB) 데이터센터 필요'
  }
• 호스트 권장 RAM: ${result.recommendedRAM} GB 이상
• 빠른 복제 URL: ${shareUrl}`;

  // Ollama Bash CLI command to replicate environment
  const ollamaCommand = `# 1. KV 캐시 양자화 환경변수 설정 (50% VRAM 절감)
export OLLAMA_KV_CACHE_TYPE=${inputs.kvPrecision === 8 ? 'q8_0' : inputs.kvPrecision === 4 ? 'q4_0' : 'f16'}
export OLLAMA_NUM_PARALLEL=${inputs.batchSize}

# 2. 모델 실행 (컨텍스트: ${inputs.contextWindow} 토큰)
ollama run ${
    inputs.modelParams === 8
      ? 'llama3.2:8b'
      : inputs.modelParams === 14
      ? 'deepseek-r1:14b'
      : inputs.modelParams === 32
      ? 'qwen2.5-coder:32b'
      : inputs.modelParams === 70
      ? 'llama3.1:70b'
      : 'custom-model'
}-${inputs.quantName.toLowerCase()}`;

  // JSON export payload
  const jsonPayload = JSON.stringify(
    {
      type: 'ollama_vram_config',
      exportedAt: new Date().toISOString(),
      inputs,
      result: {
        weightsVRAM: result.weightsVRAM,
        kvCacheVRAM: result.kvCacheVRAM,
        cudaContextVRAM: result.cudaContextVRAM,
        totalVRAM: result.totalVRAM,
        recommendedRAM: result.recommendedRAM,
      },
    },
    null,
    2
  );

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">VRAM 계산기 설정 팀원 공유</h3>
              <p className="text-xs text-slate-500">
                현재 계산된 VRAM 설정값과 실행 가이드를 팀원들과 즉시 공유합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Highlights Summary Bar */}
        <div className="px-5 py-3 bg-emerald-50/60 border-b border-emerald-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">
              {inputs.modelParams}B · {inputs.quantName}
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-600 font-mono">
              {(inputs.contextWindow / 1024).toFixed(0)}K Ctx
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-emerald-700 font-mono font-bold">
              KV {inputs.kvPrecision === 16 ? 'FP16' : `q${inputs.kvPrecision}_0`}
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-mono">
            <span className="text-slate-500">총 VRAM:</span>
            <span className="font-bold text-slate-900 text-sm">{result.totalVRAM} GB</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 pt-3 border-b border-slate-200 flex items-center gap-1 bg-white overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex items-center gap-1.5 px-3 py-2 font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'summary'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>팀 리포트 (Slack/Notion)</span>
          </button>

          <button
            onClick={() => setActiveTab('url')}
            className={`flex items-center gap-1.5 px-3 py-2 font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'url'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Link className="w-3.5 h-3.5" />
            <span>원클릭 복제 URL</span>
          </button>

          <button
            onClick={() => setActiveTab('command')}
            className={`flex items-center gap-1.5 px-3 py-2 font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'command'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Ollama CLI 환경변수</span>
          </button>

          <button
            onClick={() => setActiveTab('json')}
            className={`flex items-center gap-1.5 px-3 py-2 font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'json'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>JSON 데이터</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-5 overflow-y-auto flex-1 custom-scrollbar text-xs">
          {activeTab === 'summary' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-slate-600 text-[11px]">
                <span>메신저(슬랙, 팀즈) 및 문서에 붙여넣기 적합한 요약문입니다:</span>
                <span className="font-mono text-emerald-700">Markdown 서식</span>
              </div>
              <pre className="p-3.5 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap overflow-x-auto border border-slate-800">
                {summaryReportText}
              </pre>
            </div>
          )}

          {activeTab === 'url' && (
            <div className="space-y-3">
              <p className="text-slate-600 leading-relaxed">
                팀원이 아래 링크를 브라우저에서 열면, 현재 설정된 모델 크기({inputs.modelParams}B),
                양자화 레벨({inputs.quantName}), 컨텍스트({(inputs.contextWindow / 1024).toFixed(0)}K),
                KV 캐시 정밀도가 계산기에 즉시 자동으로 동기화됩니다.
              </p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] text-slate-800 break-all select-all">
                  {shareUrl}
                </span>
              </div>
              <div className="p-3 bg-emerald-50/50 border border-emerald-200 rounded-lg text-[11px] text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>링크 클릭 시 계산기와 Chart.js 막대 차트가 동일한 값으로 렌더링됩니다.</span>
              </div>
            </div>
          )}

          {activeTab === 'command' && (
            <div className="space-y-3">
              <p className="text-slate-600 leading-relaxed">
                로컬 터미널이나 서버에서 동일한 VRAM 최적화 조건(KV 캐시 양자화 적용)으로 Ollama를 구동할 때
                사용하는 환경 변수 및 실행 커맨드입니다.
              </p>
              <pre className="p-3.5 bg-slate-900 text-emerald-400 rounded-xl font-mono text-[11.5px] leading-relaxed whitespace-pre-wrap overflow-x-auto border border-slate-800">
                {ollamaCommand}
              </pre>
            </div>
          )}

          {activeTab === 'json' && (
            <div className="space-y-3">
              <p className="text-slate-600 leading-relaxed">
                파이프라인 또는 타 도구에서 활용할 수 있는 순수 JSON 데이터 규격입니다.
              </p>
              <pre className="p-3.5 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] leading-relaxed whitespace-pre-wrap overflow-x-auto border border-slate-800 max-h-56 custom-scrollbar">
                {jsonPayload}
              </pre>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500">
            {copiedType ? (
              <span className="text-emerald-700 font-semibold flex items-center gap-1 animate-in fade-in">
                <Check className="w-3.5 h-3.5" />
                클립보드에 복사되었습니다!
              </span>
            ) : (
              <span>원하는 탭의 내용을 클립보드로 복사하세요.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
            >
              닫기
            </button>
            <button
              onClick={() => {
                if (activeTab === 'summary') handleCopy(summaryReportText, 'summary');
                else if (activeTab === 'url') handleCopy(shareUrl, 'url');
                else if (activeTab === 'command') handleCopy(ollamaCommand, 'command');
                else handleCopy(jsonPayload, 'json');
              }}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
            >
              {copiedType ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedType ? '복사 완료' : '클립보드에 복사'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
