import React, { useState } from 'react';
import {
  CheckSquare,
  Square,
  AlertTriangle,
  ShieldCheck,
  Zap,
  RotateCcw,
  Copy,
  Check,
  Terminal,
  ExternalLink,
  Sliders,
} from 'lucide-react';

interface ChecklistItem {
  id: string;
  category: 'critical' | 'recommended' | 'apple' | 'system';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  title: string;
  problem: string;
  solution: string;
  commandSnippet: string;
  commandDesc: string;
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: 'chk-1',
    category: 'critical',
    severity: 'CRITICAL',
    title: '컨텍스트 윈도우 길이(num_ctx) 사전 상한 고정',
    problem:
      '불필요하게 128K(131,072) 컨텍스트를 지정하면 토큰을 입력하지 않아도 어텐션 KV 캐시 버퍼만으로 10GB~14GB VRAM이 즉각 증발하여 OOM이 발생합니다.',
    solution:
      '실제 사내 RAG 문서 분량 및 대화 길이에 맞추어 4K(4,096), 8K(8,192), 또는 최대 32K(32,768)로 상한을 명시적으로 제한합니다.',
    commandSnippet: `PARAMETER num_ctx 32768
# Modelfile 내 설정 또는 CLI 파라미터로 명시
ollama run qwen2.5-coder:32b --ctx 32768`,
    commandDesc: 'Modelfile 또는 실행 CLI에 num_ctx 상한 지정',
  },
  {
    id: 'chk-2',
    category: 'critical',
    severity: 'CRITICAL',
    title: 'KV 캐시 양자화 활성화 (OLLAMA_KV_CACHE_TYPE=q8_0)',
    problem:
      'Ollama는 기본적으로 KV 캐시를 FP16(2바이트/토큰)으로 할당합니다. 문맥이 길어질수록 모델 가중치보다 KV 캐시가 더 많은 VRAM을 차지합니다.',
    solution:
      '환경변수 OLLAMA_KV_CACHE_TYPE=q8_0을 활성화하면 정확도 손실 없이 KV 캐시 메모리 점유율을 50% 즉각 절감(q4_0은 75% 절감)합니다.',
    commandSnippet: `export OLLAMA_KV_CACHE_TYPE=q8_0
# 시스템 서비스(systemd) 사용 시:
sudo systemctl edit ollama
# [Service] 섹션에 Environment="OLLAMA_KV_CACHE_TYPE=q8_0" 추가 후 재시작`,
    commandDesc: 'Ollama KV 캐시 양자화 환경변수 등록',
  },
  {
    id: 'chk-3',
    category: 'critical',
    severity: 'CRITICAL',
    title: '동시 병렬 세션 수 제약 (OLLAMA_NUM_PARALLEL=1)',
    problem:
      '병렬 세션 수(OLLAMA_NUM_PARALLEL)를 2 또는 4로 늘릴 경우, 모델 가중치는 공유되지만 KV 캐시 메모리가 세션 개수만큼 N배로 복제되어 GPU 메모리가 순식간에 고갈됩니다.',
    solution:
      '단일 GPU 환경에서는 OLLAMA_NUM_PARALLEL=1로 고정하여 단일 요청의 VRAM 안정성을 최우선으로 확보합니다.',
    commandSnippet: `export OLLAMA_NUM_PARALLEL=1
# 복수 사용자 서빙 시에는 단일 인스턴스 병렬화 대신 독립 GPU 로드밸런싱 권장`,
    commandDesc: '동시 추론 세션 수 단일화',
  },
  {
    id: 'chk-4',
    category: 'recommended',
    severity: 'HIGH',
    title: '골든 스탠다드 K-Quant(Q4_K_M) 양자화 가중치 채택',
    problem:
      'FP16(원본)이나 Q8_0 모델은 32B 기준 30GB~64GB를 요구하여 24GB 단일 GPU에 적재되지 못하고 시스템 RAM으로 밀려납니다.',
    solution:
      'Q4_K_M(4.8 bpw)을 선택하면 Attention 핵심 레이어는 6비트로 보존하면서 전체 가중치를 ~19GB로 압축하여 24GB GPU(RTX 3090/4090)에 100% 적재할 수 있습니다.',
    commandSnippet: `ollama run qwen2.5-coder:32b-instruct-q4_K_M
# FP16 대비 VRAM 70% 절감, 함수 호출 정확도 97.9% 보존`,
    commandDesc: 'Q4_K_M 골든 스탠다드 모델 선택',
  },
  {
    id: 'chk-5',
    category: 'recommended',
    severity: 'HIGH',
    title: '100% Full GPU 레이어 오프로딩 검증 (CPU 누수 차단)',
    problem:
      '가중치 전체 64개 레이어 중 단 2~4개 레이어만 VRAM 부족으로 CPU 시스템 RAM에 오프로딩되어도, 토큰당 PCIe 왕복 전송으로 인해 속도가 80% 이상 폭락합니다.',
    solution:
      '모델 실행 직후 ollama ps 명령어와 로그를 확인하여 모든 레이어가 100% GPU VRAM에 완전히 상주하는지 확인합니다.',
    commandSnippet: `ollama ps
# 출력 예시:
# NAME                      ID      SIZE     PROCESSOR
# qwen2.5-coder:32b-q4_K_M  ...     19 GB    100% GPU (CPU 0% 확인)`,
    commandDesc: '100% GPU 레이어 할당 상태 점검',
  },
  {
    id: 'chk-6',
    category: 'apple',
    severity: 'HIGH',
    title: 'Apple Silicon UMA 통합 메모리 할당 한도 증액 (macOS)',
    problem:
      'macOS는 기본적으로 시스템 안정성을 위해 통합 메모리(RAM)의 약 75%까지만 단일 GPU 프로세스에 할당하도록 제한(wired_mem_limit)합니다. 64GB 맥에서도 48GB 이상 모델 구동 시 강제 OOM이 발생합니다.',
    solution:
      'sysctl 명령어로 iogpu.wired_mem_limit를 전체 RAM의 88%~90% 수준으로 증액하여 70B 모델 적재 공간을 확보합니다.',
    commandSnippet: `# 64GB Mac 기준 56GB(57344MB)까지 GPU 할당 허용
sudo sysctl iogpu.wired_mem_limit=57344

# 128GB Mac 기준 110GB(112640MB)까지 GPU 할당 허용
sudo sysctl iogpu.wired_mem_limit=112640`,
    commandDesc: 'Apple Silicon GPU 가용 메모리 상한 해제',
  },
  {
    id: 'chk-7',
    category: 'system',
    severity: 'MEDIUM',
    title: '백그라운드 디스플레이 & 브라우저 VRAM 점유 프로세스 정리',
    problem:
      '크롬 브라우저 하드웨어 가속, 4K 모니터 다중 출력, 3D/게임 프로세스가 사전에 1.5GB~3GB의 VRAM을 이미 선점하고 있으면 한계선 직전에서 OOM이 유발됩니다.',
    solution:
      '로컬 LLM 대규모 배치 또는 32K 장문 추론 전에 nvidia-smi로 사전 가용 VRAM 여유분을 22GB 이상 확보합니다.',
    commandSnippet: `# NVIDIA GPU 현재 VRAM 점유 프로세스 확인
nvidia-smi --query-compute-apps=pid,process_name,used_memory --format=csv

# 리눅스/WSL 백그라운드 불필요 프로세스 정리
watch -n 1 nvidia-smi`,
    commandDesc: '사전 VRAM 여유 공간 진단',
  },
];

export const VRAMBottleneckChecklist: React.FC = () => {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(
    new Set(['chk-1', 'chk-2', 'chk-4']) // pre-check recommended basics
  );
  const [filterCategory, setFilterCategory] = useState<'all' | 'critical' | 'recommended' | 'apple'>(
    'all'
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    setCheckedIds(new Set(CHECKLIST_ITEMS.map((item) => item.id)));
  };

  const handleReset = () => {
    setCheckedIds(new Set());
  };

  const handleCopyCommand = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredItems =
    filterCategory === 'all'
      ? CHECKLIST_ITEMS
      : CHECKLIST_ITEMS.filter((item) => item.category === filterCategory);

  const totalCount = CHECKLIST_ITEMS.length;
  const completedCount = checkedIds.size;
  const progressPct = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-5">
      {/* Header with Progress Tracker */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">
              로컬 LLM 추론 시 VRAM 병목 &amp; OOM 방지 점검 체크리스트
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            PCIe 버스 스왑 저하(속도 80% 하락) 및 CUDA Out-Of-Memory를 원천 차단하기 위한 필수 엔지니어링 체크리스트
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleSelectAll}
            className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg border border-emerald-200 transition-colors"
          >
            전체 선택
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>초기화</span>
          </button>
        </div>
      </div>

      {/* Progress Bar & Status Pill */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">엔지니어링 보안도:</span>
            <span className="font-mono font-bold text-emerald-700">
              {completedCount} / {totalCount} 완료 ({progressPct}%)
            </span>
          </div>
          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded font-mono ${
              progressPct >= 80
                ? 'bg-emerald-100 text-emerald-800'
                : progressPct >= 50
                ? 'bg-amber-100 text-amber-900'
                : 'bg-rose-100 text-rose-800'
            }`}
          >
            {progressPct >= 80
              ? '안전 적재 보장 (100% VRAM)'
              : progressPct >= 50
              ? '부분 위험 (KV 캐시 폭주 주의)'
              : '고위험 (OOM 가능성 높음)'}
          </span>
        </div>

        <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              progressPct >= 80
                ? 'bg-emerald-600'
                : progressPct >= 50
                ? 'bg-amber-500'
                : 'bg-rose-500'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1">
        <button
          onClick={() => setFilterCategory('all')}
          className={`px-3 py-1 font-semibold rounded-lg transition-colors whitespace-nowrap ${
            filterCategory === 'all'
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          전체 보기 ({CHECKLIST_ITEMS.length})
        </button>
        <button
          onClick={() => setFilterCategory('critical')}
          className={`px-3 py-1 font-semibold rounded-lg transition-colors whitespace-nowrap ${
            filterCategory === 'critical'
              ? 'bg-rose-600 text-white'
              : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
          }`}
        >
          필수 방어책 (3종)
        </button>
        <button
          onClick={() => setFilterCategory('recommended')}
          className={`px-3 py-1 font-semibold rounded-lg transition-colors whitespace-nowrap ${
            filterCategory === 'recommended'
              ? 'bg-emerald-700 text-white'
              : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
          }`}
        >
          성능 최적화 (2종)
        </button>
        <button
          onClick={() => setFilterCategory('apple')}
          className={`px-3 py-1 font-semibold rounded-lg transition-colors whitespace-nowrap ${
            filterCategory === 'apple'
              ? 'bg-indigo-600 text-white'
              : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
          }`}
        >
          Apple Silicon Mac 전용 (1종)
        </button>
      </div>

      {/* Checklist Cards List */}
      <div className="space-y-3">
        {filteredItems.map((item) => {
          const isChecked = checkedIds.has(item.id);

          return (
            <div
              key={item.id}
              className={`p-4 rounded-xl border transition-all ${
                isChecked
                  ? 'bg-emerald-50/20 border-emerald-300/80 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                {/* Left Checkbox & Title */}
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleCheck(item.id)}
                    className="mt-0.5 text-slate-400 hover:text-emerald-600 transition-colors shrink-0"
                    aria-label={isChecked ? '체크 해제' : '체크 완료'}
                  >
                    {isChecked ? (
                      <CheckSquare className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4
                        className={`text-sm font-bold cursor-pointer ${
                          isChecked ? 'text-emerald-950 line-through/30' : 'text-slate-900'
                        }`}
                        onClick={() => toggleCheck(item.id)}
                      >
                        {item.title}
                      </h4>

                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          item.severity === 'CRITICAL'
                            ? 'bg-rose-100 text-rose-800'
                            : item.severity === 'HIGH'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {item.severity}
                      </span>

                      {item.category === 'apple' && (
                        <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.2 rounded">
                          Apple Silicon
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-rose-900/80 bg-rose-50/40 p-2 rounded border border-rose-100/70">
                      <strong>병목 메커니즘</strong>: {item.problem}
                    </p>

                    <p className="text-xs text-slate-700 pt-1">
                      <strong>권장 조치</strong>: {item.solution}
                    </p>
                  </div>
                </div>

                {/* Right Status */}
                <div className="shrink-0 hidden sm:block">
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                      isChecked ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {isChecked ? '적용 완료' : '미적용'}
                  </span>
                </div>
              </div>

              {/* Command Code Snippet Box */}
              <div className="mt-3 pl-8">
                <div className="bg-slate-900 text-slate-200 p-2.5 rounded-lg font-mono text-[11px] flex items-center justify-between gap-2 overflow-x-auto">
                  <span className="text-emerald-400 break-all">{item.commandSnippet}</span>
                  <button
                    onClick={() => handleCopyCommand(item.commandSnippet, item.id)}
                    className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[10px] shrink-0 transition-colors"
                    title="명령어 클립보드 복사"
                  >
                    {copiedId === item.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>복사됨</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>복사</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
