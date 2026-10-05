import React, { useState } from 'react';
import { calculateSpeculativeSpeedup } from '../utils/calculator';
import { Zap, Play, ChevronDown, ChevronUp, Copy, Check, Terminal, Code2, Cpu } from 'lucide-react';

interface ThinkingSample {
  id: string;
  title: string;
  prompt: string;
  thoughtProcess: string;
  finalAnswer: string;
}

const THINKING_SAMPLES: ThinkingSample[] = [
  {
    id: 'math',
    title: '동시성 대역폭 및 VRAM 계산',
    prompt: '24GB VRAM을 가진 RTX 4090에서 Qwen 2.5 32B (Q4_K_M) 모델을 실행할 때, KV 캐시를 q8_0으로 양자화하면 최대 동시 요청(Batch=4) 시 몇 K 토큰까지 수용 가능한가?',
    thoughtProcess: `1. 가중치 점유율 확인:
   - 32B * 4.8 bits / 8 = ~19.2GB (오버헤드 포함 약 19.8GB).
   - 남은 순수 여유 VRAM: 24GB - 19.8GB - 0.8GB(CUDA 런타임) = 3.4GB.

2. KV 캐시 공식 대입:
   - Qwen 2.5 32B는 레이어 64개, KV 헤드 8개, Head Dim 128.
   - q8_0이므로 토큰당 1바이트: 2 * 64 * 8 * 128 * 1 byte = 131,072 bytes (128 KB per token across all layers).
   - Batch 4 동시 처리 시: 4 * 128 KB = 512 KB per token length.

3. 최대 수용 컨텍스트 역산:
   - 총 가용 VRAM 3.4GB = 3,565,158,400 bytes.
   - 3,565,158,400 / 524,288 = 약 6,800 토큰 (각 요청당 약 6.8K 토큰).
   - 결론: 4개 세션 동시 구동 시 4K~6K 컨텍스트 윈도우가 안전 한계선임.`,
    finalAnswer: `### 🎯 계산 분석 결과

- **가중치 점유 VRAM**: 약 **19.8 GB** (32B @ Q4_K_M)
- **CUDA 런타임 버퍼**: 약 **0.8 GB**
- **가용 KV 캐시 공간**: 약 **3.4 GB**
- **q8_0 토큰당 KV 메모리**: 128 KB/token (Batch 1 기준)

**동시 세션(Batch=4) 최대 컨텍스트**:
각 요청당 약 **6,800 토큰(약 6.5K)**까지 100% VRAM에서 온전히 구동할 수 있습니다. 8K를 초과하면 즉시 PCIe 부분 오프로딩이 발생하므로, 프로덕션에서는 세션당 4K로 제한하거나 인스턴스를 수평 분주(Horizontally Shard)하는 것이 권장됩니다.`,
  },
  {
    id: 'security',
    title: '로컬 LLM 엔드포인트 보안 감사',
    prompt: '외부 망에서 Ollama 11434 포트를 개방했을 때 발생 가능한 RCE 및 VRAM 고갈 시나리오와 방어 대책을 요약하라.',
    thoughtProcess: `1. CVE-2024-37032(Probllama) 경로 탐색 취약점 고려:
   - /api/pull 호출 시 악성 다이제스트(../)로 파일시스템 덮어쓰기 가능 여부 검토.
   - 최신 버전 패치 확인 필요.

2. 미인증 DoS 벡터 분석:
   - 기본적으로 API 키/토큰 없음.
   - 외부 공격자가 /api/generate에 keep_alive=-1과 num_ctx=131072를 전송하면 VRAM 즉시 고갈 -> OOM Killer 트리거.

3. 완화 아키텍처 수립:
   - OLLAMA_HOST=127.0.0.1 고정
   - Nginx 리버스 프록시 + Bearer Token 인증
   - Rate limit (Limit_req) 및 body size 제한`,
    finalAnswer: `### 🛡️ 보안 취약점 요약 및 아키텍처 방어책

1. **위협 벡터**:
   - **원격 코드 실행(RCE)**: 구버전(&lt;0.1.34)의 경우 \`/api/pull\` 다이제스트 검증 부재로 임의 파일 덮어쓰기 발생 (CVE-2024-37032).
   - **VRAM 고갈 DoS**: 미인증 상태에서 거대 컨텍스트 요청으로 GPU 메모리를 점유하여 서비스 마비.

2. **프로덕션 방어 구성**:
   - **로컬 바인딩**: \`OLLAMA_HOST=127.0.0.1:11434\` 설정으로 외부 직접 접근 차단.
   - **인증 프록시 도입**: Nginx 또는 Envoy를 전진 배치하여 Bearer Token 인증 강제.
   - **자원 할당 상한**: \`OLLAMA_KEEP_ALIVE=5m\` 및 \`OLLAMA_MAX_LOADED_MODELS=1\` 설정.`,
  },
];

export const TabOptimization: React.FC = () => {
  // Speculative Decoding Inputs
  const [alpha, setAlpha] = useState<number>(0.75);
  const [kTokens, setKTokens] = useState<number>(4);
  const [draftLatency, setDraftLatency] = useState<number>(8); // ms
  const [targetLatency, setTargetLatency] = useState<number>(45); // ms

  const specResult = calculateSpeculativeSpeedup(alpha, kTokens, draftLatency, targetLatency);

  // DeepSeek R1 Parser Sandbox
  const [selectedSampleId, setSelectedSampleId] = useState<string>('math');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [streamProgress, setStreamProgress] = useState<number>(100);
  const [showThinking, setShowThinking] = useState<boolean>(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const activeSample = THINKING_SAMPLES.find((s) => s.id === selectedSampleId) || THINKING_SAMPLES[0];

  const handleSimulate = () => {
    setIsSimulating(true);
    setStreamProgress(0);

    const interval = setInterval(() => {
      setStreamProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsSimulating(false);
          return 100;
        }
        return prev + 10;
      });
    }, 120);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Optimization Mechanisms */}
      <div className="bg-white p-6 rounded-xl border border-slate-200">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          3. 추론 가속 최적화 &amp; 에이전트 연동 아키텍처
        </h2>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-4xl">
          로컬 LLM 서비스의 실사용 품질을 결정짓는 핵심은 <strong>TTFT(First Token 지연 시간)</strong>와{' '}
          <strong>토큰 생성 속도(Tokens/s)</strong>입니다. 프롬프트 프리픽스 캐싱(Prompt Prefix Caching)과{' '}
          <strong>투기적 디코딩(Speculative Decoding)</strong>, 그리고 DeepSeek R1의 사고 과정(&lt;think&gt;)
          스트리밍 분리 기술을 통해 엔터프라이즈 에이전트 반응 속도를 극대화할 수 있습니다.
        </p>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="font-bold text-slate-800">프롬프트 프리픽스 캐싱</span>
            <p className="text-slate-600 mt-1">
              반복되는 시스템 지시문 및 도구 스키마의 KV 텐서를 재사용하여 TTFT 80% 단축.
            </p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="font-bold text-slate-800">투기적 디코딩 (Speculative)</span>
            <p className="text-slate-600 mt-1">
              경량 초고속 모델이 K개 토큰을 제안하고 대상 모델이 1회 순방향 검증(1.5x~2.5x 가속).
            </p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="font-bold text-slate-800">도구 호출 (JSON Tool Schema)</span>
            <p className="text-slate-600 mt-1">
              Ollama 네이티브 도구 정의 API로 정형화된 JSON 파싱 및 외부 함수 실행.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Speculative Decoding Interactive Simulator */}
      <div className="bg-white p-6 rounded-xl border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-600" />
              <span>투기적 디코딩(Speculative Decoding) 가속 시뮬레이터</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Draft 경량 모델(예: Llama 3.2 1B)과 Target 대형 모델(Llama 3.1 70B)의 협동 추론 수학 모델
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-800 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
            가속비: {specResult.speedupRatio}x 배율
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls (6 cols) */}
          <div className="lg:col-span-6 space-y-3.5 text-xs">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-semibold text-slate-700">토큰 수락 확률 (Acceptance Rate: α)</label>
                <span className="font-mono text-emerald-700 font-bold">{Math.round(alpha * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.4"
                max="0.95"
                step="0.05"
                value={alpha}
                onChange={(e) => setAlpha(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500 mt-0.5">
                동일 가문(Llama 1B → Llama 70B) 모델 간 정렬 시 통상 70% ~ 85%의 수락률을 보입니다.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">제안 토큰 수 (K)</label>
                <select
                  value={kTokens}
                  onChange={(e) => setKTokens(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-slate-800 font-mono"
                >
                  <option value={2}>2 토큰</option>
                  <option value={3}>3 토큰</option>
                  <option value={4}>4 토큰 (권장)</option>
                  <option value={5}>5 토큰</option>
                  <option value={6}>6 토큰</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Draft 모델 지연</label>
                <div className="flex items-center">
                  <input
                    type="number"
                    value={draftLatency}
                    onChange={(e) => setDraftLatency(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-slate-800 font-mono"
                  />
                  <span className="ml-1 text-[11px] text-slate-500">ms</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target 모델 지연</label>
                <div className="flex items-center">
                  <input
                    type="number"
                    value={targetLatency}
                    onChange={(e) => setTargetLatency(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-slate-800 font-mono"
                  />
                  <span className="ml-1 text-[11px] text-slate-500">ms</span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg text-slate-600 text-[11px] leading-relaxed">
              <strong>동작 원리</strong>: Draft 모델이 {kTokens}개의 토큰을 초고속({draftLatency * kTokens}ms)으로 연속 생성합니다.
              Target 모델은 단 1회의 병렬 순방향 연산({targetLatency}ms)으로 {kTokens}개 토큰의 Logit을 일괄 검증합니다.
            </div>
          </div>

          {/* Result Telemetry Grid (6 cols) */}
          <div className="lg:col-span-6 bg-slate-900 text-white p-5 rounded-xl flex flex-col justify-between space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
                <span className="text-[11px] text-slate-400">단계당 수락 예상 토큰</span>
                <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                  {specResult.expectedTokens} <span className="text-xs text-slate-300">토큰</span>
                </div>
              </div>

              <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
                <span className="text-[11px] text-slate-400">최종 속도 배율</span>
                <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                  {specResult.speedupRatio}x <span className="text-xs text-slate-300">배 가속</span>
                </div>
              </div>

              <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
                <span className="text-[11px] text-slate-400">단일 대상 모델 단독 속도</span>
                <div className="text-base font-bold font-mono text-slate-300 mt-1">
                  {specResult.standardTokensPerSec} <span className="text-xs text-slate-400">tok/s</span>
                </div>
              </div>

              <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700">
                <span className="text-[11px] text-slate-400">투기적 디코딩 적용 속도</span>
                <div className="text-base font-bold font-mono text-emerald-300 mt-1">
                  {specResult.effectiveTokensPerSec} <span className="text-xs text-slate-400">tok/s</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 text-xs text-slate-300 flex justify-between items-center">
              <span>연산 시간 절감 효과:</span>
              <span className="font-mono font-bold text-emerald-400">{specResult.timeSavedPct}% 시간 단축</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. DeepSeek R1 Thinking Mode Sandbox */}
      <div className="bg-white p-6 rounded-xl border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Code2 className="w-4 h-4 text-emerald-600" />
              <span>DeepSeek R1 Thinking Mode (&lt;think&gt;) 파서 샌드박스</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              사고 모델의 내부 검증 루프와 최종 답변을 프론트엔드/백엔드에서 분리하는 파싱 아키텍처
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedSampleId}
              onChange={(e) => setSelectedSampleId(e.target.value)}
              className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium"
            >
              {THINKING_SAMPLES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
            <button
              onClick={handleSimulate}
              disabled={isSimulating}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>{isSimulating ? '스트리밍 중...' : '시뮬레이션'}</span>
            </button>
          </div>
        </div>

        {/* User Prompt Box */}
        <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
          <span className="font-bold text-slate-700">사용자 질의 (User Prompt):</span>
          <p className="text-slate-800 mt-1 font-medium">{activeSample.prompt}</p>
        </div>

        {/* Live Parsed Output Area */}
        <div className="mt-4 space-y-3">
          {/* Collapsible Thinking Accordion */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setShowThinking(!showThinking)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-100 hover:bg-slate-200/70 text-xs font-semibold text-slate-700 transition-colors"
            >
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <span>내부 사고 과정 (&lt;think&gt; 태그 내부 텐서)</span>
                {isSimulating && <span className="text-[10px] text-indigo-700 animate-pulse">생각하는 중...</span>}
              </span>
              {showThinking ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
            </button>

            {showThinking && (
              <div className="p-4 bg-slate-50 text-slate-700 font-mono text-xs whitespace-pre-wrap leading-relaxed border-t border-slate-200 custom-scrollbar max-h-56 overflow-y-auto">
                {activeSample.thoughtProcess.slice(0, Math.floor((activeSample.thoughtProcess.length * streamProgress) / 100))}
              </div>
            )}
          </div>

          {/* Final Clean Answer */}
          <div className="border border-slate-200 rounded-lg p-4 bg-white space-y-2">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
              <span className="font-bold text-emerald-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                파싱된 최종 사용자 응답 (Final Rendered Response)
              </span>
              <span className="text-slate-400 text-[11px]">마크다운 정규화 완료</span>
            </div>

            <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
              {streamProgress >= 100 ? (
                activeSample.finalAnswer
              ) : (
                <span className="text-slate-400 italic">사고 검증이 완료된 후 최종 응답이 출력됩니다...</span>
              )}
            </div>
          </div>
        </div>

        {/* Integration Code Snippets */}
        <div className="mt-6 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-slate-600" />
              프로덕션 파싱 구현 코드 (TypeScript / Python)
            </span>
            <button
              onClick={() =>
                copyToClipboard(
                  `// TypeScript 스트리밍 토큰 파서
function parseThinkingStream(chunkText: string) {
  const thinkMatch = chunkText.match(/<think>([\\s\\S]*?)(?:<\\/think>|$)/);
  const thought = thinkMatch ? thinkMatch[1] : '';
  const finalResponse = chunkText.replace(/<think>[\\s\\S]*?<\\/think>/g, '').trim();
  return { thought, finalResponse };
}`,
                  'ts-parse'
                )
              }
              className="flex items-center gap-1 text-[11px] text-slate-600 hover:text-slate-900"
            >
              {copiedCode === 'ts-parse' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>코드 복사</span>
            </button>
          </div>

          <pre className="p-3 bg-slate-900 text-slate-200 font-mono text-xs rounded-lg overflow-x-auto leading-relaxed">
{`// 1. TypeScript / Node.js 스트리밍 정규식 파서
export function extractReasoningTokens(fullOutput: string) {
  const thinkRegex = /<think>([\\s\\S]*?)<\\/think>/;
  const match = fullOutput.match(thinkRegex);
  return {
    thinking: match ? match[1].trim() : null,
    cleanAnswer: fullOutput.replace(thinkRegex, '').trim()
  };
}`}
          </pre>
        </div>
      </div>
    </div>
  );
};
