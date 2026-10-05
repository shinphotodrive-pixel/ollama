import React, { useState, useMemo } from 'react';
import {
  AlertOctagon,
  Terminal,
  Bug,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  RotateCcw,
  Search,
  ExternalLink,
  Wrench,
  Cpu,
  Layers,
  Sparkles,
  HelpCircle,
  FileCode,
} from 'lucide-react';

export interface FailureScenario {
  id: string;
  errorCode: string;
  name: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  subsystem: 'CUDA Runtime' | 'GGUF Parser' | 'Host Driver' | 'KV Cache / Context' | 'Network / CORS' | 'Apple Metal';
  summary: string;
  simulatedLogs: string[];
  rootCause: string;
  technicalMechanism: string;
  primaryFixDesc: string;
  primaryFixCommand: string;
  secondaryFixDesc?: string;
  secondaryFixCommand?: string;
}

const FAILURE_SCENARIOS: FailureScenario[] = [
  {
    id: 'cuda-oom',
    errorCode: 'CUDA_ERROR_OUT_OF_MEMORY (Code 2)',
    name: 'CUDA VRAM 메모리 고갈 및 텐서 할당 실패 (OOM)',
    severity: 'CRITICAL',
    subsystem: 'CUDA Runtime',
    summary: '모델 가중치와 KV 캐시 합계가 GPU 물리 VRAM(24GB/12GB)을 초과하여 CUDA 커널 실행 중 중단됨.',
    simulatedLogs: [
      'time=2026-10-05T10:14:02.112Z level=INFO source=server.go:588 msg="llama runner started in 1.42s"',
      'time=2026-10-05T10:14:03.204Z level=INFO source=sched.go:340 msg="allocating memory for model: qwen2.5-coder:32b-instruct-fp16"',
      'time=2026-10-05T10:14:04.015Z level=INFO source=gpu.go:195 msg="detected 1 CUDA devices, VRAM free: 23.4 GB / total: 24.0 GB"',
      'ggml_cuda_init: GGML_CUDA_FORCE_MMQ: no',
      'ggml_cuda_init: CUDA_DOCKER_CONTAINER: false',
      'ggml_cuda_op_mul_mat: failed to allocate 3874928640 bytes on device 0 (free: 184549376 bytes, total: 25757220864 bytes)',
      'CUDA error: out of memory at /llama.cpp/ggml-cuda.cu:1244',
      'current device: 0, total_vram: 24576 MB, free_vram: 176 MB',
      'llama_new_context_with_model: failed to create context (CUDA error 2)',
      'time=2026-10-05T10:14:04.890Z level=ERROR source=runner.go:412 msg="failed to load model" error="CUDA error: out of memory"',
    ],
    rootCause: 'FP16 가중치(64GB) 또는 32K 이상의 거대 컨텍스트가 24GB 단일 GPU VRAM 허용치를 초과함.',
    technicalMechanism:
      'llama.cpp의 ggml-cuda 백엔드가 레이어 어텐션 행렬(mul_mat) 가중치와 KV 캐시 텐서를 GPU 디바이스 메모리에 연속 할당(cudaMalloc)하려 했으나, 잔여 VRAM(176MB)이 부족하여 CUDA 드라이버 수준에서 실패를 반환함.',
    primaryFixDesc: '1단계: Q4_K_M 양자화 모델로 교체하고 KV 캐시 양자화(q8_0) 활성화',
    primaryFixCommand: `export OLLAMA_KV_CACHE_TYPE=q8_0
ollama run qwen2.5-coder:32b-instruct-q4_K_M`,
    secondaryFixDesc: '2단계: Modelfile에서 num_ctx 상한을 8192 또는 16384로 제한',
    secondaryFixCommand: `PARAMETER num_ctx 8192
# 또는 실행 시 컨텍스트 윈도우 명시
ollama run qwen2.5-coder:32b-instruct-q4_K_M --ctx 8192`,
  },
  {
    id: 'gguf-magic-mismatch',
    errorCode: 'ERR_INVALID_GGUF_MAGIC (Code 4001)',
    name: 'GGUF 매직 헤더 불일치 / Hugging Face Git-LFS 미다운로드 오류',
    severity: 'HIGH',
    subsystem: 'GGUF Parser',
    summary: '모델 파일의 바이너리 헤더가 GGUF 식별자(GGUF)가 아닌 Git-LFS 텍스트 포인터 또는 압축 헤더임.',
    simulatedLogs: [
      'time=2026-10-05T10:18:22.004Z level=INFO source=modelfile.go:88 msg="reading model file ./custom-model.gguf"',
      'error loading model: llama_model_loader: invalid magic characters \'PK\\x03\\x04\' in \'./custom-model.gguf\'',
      'llama_model_load: error loading model: unsupported model format (expected magic 0x46554747 \'GGUF\', got 0x04034b50)',
      'time=2026-10-05T10:18:22.045Z level=ERROR source=server.go:210 msg="create model failed" error="invalid model format"',
    ],
    rootCause: 'Hugging Face에서 바이너리 대신 Git LFS 텍스트 포인터 파일(130바이트)을 다운로드했거나 Zip 압축을 해제하지 않음.',
    technicalMechanism:
      'GGUF 사양(Specification)에 따라 파일의 첫 4바이트는 0x46554747(ASCII \'GGUF\')이어야 함. 파일 헤더가 \'PK..\'(Zip 압축) 또는 \'version https://git-lfs...\'(텍스트)로 감지되어 파서가 즉시 중단됨.',
    primaryFixDesc: '1단계: git-lfs를 설치하고 실제 가중치 바이너리를 정식 다운로드',
    primaryFixCommand: `sudo apt-get install git-lfs && git lfs install
# 또는 HuggingFace CLI로 원본 GGUF 직접 다운로드
huggingface-cli download <repo_id> <filename.gguf> --local-dir .`,
    secondaryFixDesc: '2단계: 파일의 매직 헤더 및 실제 용량 확인',
    secondaryFixCommand: `head -c 4 ./custom-model.gguf | xxd
# 정상 출력 예시: 00000000: 4747 5546  GGUF
ls -lh ./custom-model.gguf # 용량이 수 GB 단위인지 확인`,
  },
  {
    id: 'cuda-driver-mismatch',
    errorCode: 'CUDA_INSUFFICIENT_DRIVER (Code 35)',
    name: 'NVIDIA 드라이버 버전 미달 및 CPU 강제 폴백 (Fallback to CPU)',
    severity: 'HIGH',
    subsystem: 'Host Driver',
    summary: '호스트에 설치된 NVIDIA 드라이버가 Ollama CUDA 12 런타임 최소 요구 버전(535+)보다 낮아 GPU 인식 실패.',
    simulatedLogs: [
      'time=2026-10-05T10:22:15.801Z level=INFO source=gpu.go:94 msg="detecting GPU devices via NVML"',
      'time=2026-10-05T10:22:15.850Z level=WARN source=gpu_cuda.go:120 msg="could not load dynamic library libcublas.so.12: cannot open shared object file"',
      'time=2026-10-05T10:22:15.882Z level=WARN source=gpu.go:142 msg="CUDA driver version 525.85 is insufficient for CUDA 12.4 (minimum 535.54 required)"',
      'time=2026-10-05T10:22:15.890Z level=INFO source=gpu.go:210 msg="falling back to CPU inference, no compatible NVIDIA GPU detected"',
      'time=2026-10-05T10:22:16.102Z level=INFO source=runner.go:189 msg="system AVX2 CPU runner initialized (speed severely limited)"',
    ],
    rootCause: 'Ubuntu/CentOS 호스트의 NVIDIA 디스플레이 드라이버가 구버전(525.xx)이어서 최신 CUDA 12 라이브러리를 로드하지 못함.',
    technicalMechanism:
      'Ollama 바이너리에 번들된 llama.cpp는 CUDA 12.4 드라이버 ABI(libcuda.so.1)를 호출함. 호스트 커널 모듈 버전이 낮으면 드라이버 진입점 심볼 바인딩이 거부되어 GPU 연산 유닛이 무시되고 CPU 모드로 강제 강등됨.',
    primaryFixDesc: '1단계: 최신 NVIDIA 프로덕션 드라이버(550+) 설치 및 시스템 재부팅',
    primaryFixCommand: `sudo apt-get update && sudo apt-get install -y nvidia-driver-550
sudo reboot`,
    secondaryFixDesc: '2단계: 드라이버 및 CUDA 인식 상태 검증',
    secondaryFixCommand: `nvidia-smi
# 상단 출력에서 Driver Version >= 535 및 CUDA Version >= 12.2 확인`,
  },
  {
    id: 'context-overflow',
    errorCode: 'CONTEXT_WINDOW_EXCEEDED (Code 413)',
    name: '컨텍스트 윈도우(num_ctx) 한도 초과 및 입력 프롬프트 절단',
    severity: 'MEDIUM',
    subsystem: 'KV Cache / Context',
    summary: 'RAG 문서 청크나 긴 대화 기록이 모델의 num_ctx(기본 2048 또는 8192)를 초과하여 오류 발생.',
    simulatedLogs: [
      'time=2026-10-05T10:26:40.012Z level=INFO source=routes.go:42 msg="generate request received: 34,850 tokens"',
      'llama_context: input prompt of 34,850 tokens exceeds configured context window size of 32,768 tokens (num_ctx)',
      'llama_tokenize: failed to fit input sequence into attention slot',
      'time=2026-10-05T10:26:40.150Z level=ERROR source=server.go:812 msg="prompt is too long: context window exceeded, truncating or rejecting generation" code=413',
    ],
    rootCause: 'Modelfile의 PARAMETER num_ctx 설정값(예: 32768)보다 큰 프롬프트가 단일 요청으로 전달됨.',
    technicalMechanism:
      'llama.cpp의 정적 KV 캐시 링 버퍼는 num_ctx 크기로 사전 할당됨. 프롬프트 토큰 시퀀스 길이가 할당된 어텐션 윈도우 슬롯 인덱스를 초과할 경우 버퍼 오버플로우 방지를 위해 HTTP 413 에러를 반환함.',
    primaryFixDesc: '1단계: Modelfile에서 num_ctx 상한을 확장하거나 CLI 실행 시 파라미터 전달',
    primaryFixCommand: `PARAMETER num_ctx 65536
# Modelfile 재빌드: ollama create my-model -f ./Modelfile`,
    secondaryFixDesc: '2단계: 사내 RAG 파이프라인 청킹(Chunking) 사이즈를 1,000~2,000 토큰 단위로 제한',
    secondaryFixCommand: `# LangChain / LlamaIndex 설정:
text_splitter = RecursiveCharacterTextSplitter(chunk_size=1500, chunk_overlap=150)`,
  },
  {
    id: 'cors-forbidden',
    errorCode: 'HTTP_403_CORS_BLOCKED / REFUSED',
    name: '웹 브라우저 크로스오리진(CORS) 차단 및 127.0.0.1 연결 거부',
    severity: 'MEDIUM',
    subsystem: 'Network / CORS',
    summary: '웹 브라우저 프론트엔드에서 Ollama API 호출 시 OLLAMA_ORIGINS 미허용으로 차단됨.',
    simulatedLogs: [
      'time=2026-10-05T10:31:05.109Z level=INFO source=routes.go:110 msg="incoming HTTP OPTIONS /api/generate from 192.168.1.50"',
      'time=2026-10-05T10:31:05.112Z level=WARN source=routes.go:128 msg="cross-origin request blocked: origin https://my-frontend.company.internal not allowed by OLLAMA_ORIGINS"',
      'time=2026-10-05T10:31:05.115Z level=ERROR source=server.go:490 msg="HTTP 403 Forbidden: Origin not allowed"',
    ],
    rootCause: 'Ollama의 기본 OLLAMA_ORIGINS는 로컬호스트만 허용하며, 외부 웹 UI 도메인이 화이트리스트에 누락됨.',
    technicalMechanism:
      '브라우저의 Preflight(OPTIONS) 요청에 대해 Ollama 데몬이 Access-Control-Allow-Origin 응답 헤더를 누락하거나 매칭 실패하여 브라우저 CORS 정책에 의해 API 통신이 강제 차단됨.',
    primaryFixDesc: '1단계: systemd 또는 환경변수에 프론트엔드 도메인 화이트리스트 등록',
    primaryFixCommand: `export OLLAMA_ORIGINS="https://my-frontend.company.internal,http://localhost:3000"
# 백그라운드 서비스 재시작
sudo systemctl restart ollama`,
    secondaryFixDesc: '2단계: Nginx 리버스 프록시를 통해 동일 도메인(/api/ollama)으로 라우팅',
    secondaryFixCommand: `location /api/ollama/ {
    proxy_pass http://127.0.0.1:11434/;
    proxy_set_header Host $host;
}`,
  },
  {
    id: 'apple-metal-panic',
    errorCode: 'METAL_BUFFER_ALLOC_FAIL (Code 502)',
    name: 'Apple Silicon Metal 통합 메모리 상한(wired_mem_limit) 초과',
    severity: 'HIGH',
    subsystem: 'Apple Metal',
    summary: 'macOS 기본 시스템 제한(RAM 75%)으로 인해 70B 모델 로드 중 Metal 버퍼 할당 실패.',
    simulatedLogs: [
      'time=2026-10-05T10:35:12.301Z level=INFO source=server.go:342 msg="Ollama running on macOS Darwin 24.0.0 (Apple Silicon M3 Max)"',
      'ggml_metal_init: allocating Metal buffer of 46,248,800,000 bytes failed: [MTLDevice newBufferWithLength:options:]: buffer allocation failed',
      'fatal error: unable to allocate unified memory over wired_mem_limit (wired_mem_limit: 49,152 MB, requested: 51,200 MB)',
      'time=2026-10-05T10:35:12.980Z level=ERROR source=runner.go:501 msg="failed to initialize Metal accelerator" error="Metal buffer allocation failed"',
    ],
    rootCause: 'macOS가 시스템 안정성을 위해 단일 GPU 프로세스에 시스템 RAM의 최대 75%만 할당하도록 제한함.',
    technicalMechanism:
      'Metal API의 MTLDevice newBufferWithLength 호출 시 커널의 IOGPU wired_mem_limit 상한선에 도달하여 OS가 버퍼 포인터 반환을 거부(NULL)함.',
    primaryFixDesc: '1단계: sysctl 명령어로 GPU 할당 한도를 전체 RAM의 88%~90%로 증액',
    primaryFixCommand: `# 64GB Mac 기준 (56GB 할당)
sudo sysctl iogpu.wired_mem_limit=57344

# 128GB Mac 기준 (110GB 할당)
sudo sysctl iogpu.wired_mem_limit=112640`,
    secondaryFixDesc: '2단계: 영구 적용을 위해 /etc/sysctl.conf 파일에 설정 추가',
    secondaryFixCommand: `echo "iogpu.wired_mem_limit=57344" | sudo tee -a /etc/sysctl.conf`,
  },
];

export const InferenceTroubleshootingLogs: React.FC = () => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('cuda-oom');
  const [copiedFixId, setCopiedFixId] = useState<string | null>(null);
  const [copiedLog, setCopiedLog] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Custom User Log Diagnostic Input
  const [userCustomLog, setUserCustomLog] = useState<string>('');
  const [customDiagnosticResult, setCustomDiagnosticResult] = useState<string | null>(null);

  const currentScenario = useMemo(() => {
    return FAILURE_SCENARIOS.find((s) => s.id === selectedScenarioId) || FAILURE_SCENARIOS[0];
  }, [selectedScenarioId]);

  // Copy remediation code
  const handleCopyCommand = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFixId(id);
    setTimeout(() => setCopiedFixId(null), 2000);
  };

  // Copy simulated terminal logs
  const handleCopyLogs = () => {
    navigator.clipboard.writeText(currentScenario.simulatedLogs.join('\n'));
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2000);
  };

  // Re-run simulation animation
  const handleReSimulate = () => {
    setIsSimulating(true);
    setTimeout(() => {
      setIsSimulating(false);
    }, 600);
  };

  // Analyze Custom Log Input
  const handleAnalyzeCustomLog = () => {
    if (!userCustomLog.trim()) {
      setCustomDiagnosticResult('분석할 로그 텍스트를 먼저 입력해주세요.');
      return;
    }

    const logLower = userCustomLog.toLowerCase();
    if (logLower.includes('out of memory') || logLower.includes('cuda error 2') || logLower.includes('cuda_error_out_of_memory')) {
      setSelectedScenarioId('cuda-oom');
      setCustomDiagnosticResult('🚨 [진단 결과]: CUDA VRAM Out of Memory (OOM) 감지됨. Q4_K_M 양자화 및 num_ctx 축소가 필요합니다.');
    } else if (logLower.includes('invalid magic') || logLower.includes('git-lfs') || logLower.includes('pk\x03\x04') || logLower.includes('0x46554747')) {
      setSelectedScenarioId('gguf-magic-mismatch');
      setCustomDiagnosticResult('🚨 [진단 결과]: GGUF Magic Header 불일치 감지됨. Git-LFS 미다운로드 또는 손상된 파일입니다.');
    } else if (logLower.includes('insufficient driver') || logLower.includes('libcublas.so') || logLower.includes('falling back to cpu')) {
      setSelectedScenarioId('cuda-driver-mismatch');
      setCustomDiagnosticResult('🚨 [진단 결과]: NVIDIA 드라이버 버전 미달 감지됨. 드라이버 550+ 버전으로 업그레이드가 필요합니다.');
    } else if (logLower.includes('context window exceeded') || logLower.includes('num_ctx') || logLower.includes('too long')) {
      setSelectedScenarioId('context-overflow');
      setCustomDiagnosticResult('⚠️ [진단 결과]: 컨텍스트 윈도우 초과(Context Window Exceeded) 감지됨. num_ctx 확대 또는 청크 분할이 필요합니다.');
    } else if (logLower.includes('cross-origin') || logLower.includes('cors') || logLower.includes('403 forbidden')) {
      setSelectedScenarioId('cors-forbidden');
      setCustomDiagnosticResult('⚠️ [진단 결과]: CORS 오리진 차단 감지됨. OLLAMA_ORIGINS 설정 변경이 필요합니다.');
    } else if (logLower.includes('wired_mem_limit') || logLower.includes('metal buffer') || logLower.includes('darwin')) {
      setSelectedScenarioId('apple-metal-panic');
      setCustomDiagnosticResult('🚨 [진단 결과]: macOS Metal 통합 메모리 상한 초과 감지됨. sysctl wired_mem_limit 증액이 필요합니다.');
    } else {
      setCustomDiagnosticResult('ℹ️ [진단 결과]: 표준 에러 시그니처와 완전 일치하지 않습니다. CUDA OOM 또는 런타임 버전 호환성을 우선 점검하세요.');
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Bug className="w-5 h-5 text-rose-600" />
            <h3 className="text-base font-bold text-slate-900">
              로컬 LLM 추론 실패 로그 시뮬레이션 &amp; 트러블슈팅 분석기
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            CUDA OOM, GGUF 매직 헤더 불일치, 드라이버 호환성, 컨텍스트 초과 등 실제 운영 장애 로그를 시뮬레이션하고 에러 코드를 분석하여 대응 가이드를 제시합니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold px-2.5 py-1 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg">
            {currentScenario.errorCode.split(' ')[0]}
          </span>
        </div>
      </div>

      {/* 2. Failure Scenario Selector Tabs */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-slate-700">
          모의 재현할 장애 시나리오 선택 (Failure Scenarios)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
          {FAILURE_SCENARIOS.map((sc) => {
            const isSelected = sc.id === selectedScenarioId;
            return (
              <button
                key={sc.id}
                onClick={() => {
                  setSelectedScenarioId(sc.id);
                  setCustomDiagnosticResult(null);
                }}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span
                    className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                      sc.severity === 'CRITICAL'
                        ? 'bg-rose-500 text-white'
                        : sc.severity === 'HIGH'
                        ? 'bg-amber-500 text-slate-900'
                        : 'bg-slate-200 text-slate-800'
                    }`}
                  >
                    {sc.severity}
                  </span>
                  <span className="text-[10px] opacity-75 font-mono truncate">{sc.subsystem}</span>
                </div>
                <div className="font-bold text-[11px] truncate leading-tight">{sc.name.split('/')[0]}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Simulated Terminal Log Viewer */}
      <div className="bg-slate-950 text-slate-100 rounded-xl font-mono text-xs border border-slate-800 overflow-hidden shadow-inner">
        {/* Terminal Header Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span className="text-slate-300 font-semibold pl-2">
              ollama-server.log — {currentScenario.errorCode}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReSimulate}
              className="flex items-center gap-1 px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] transition-colors"
              title="로그 재출력 시뮬레이션"
            >
              <RotateCcw className={`w-3 h-3 ${isSimulating ? 'animate-spin' : ''}`} />
              <span>재실행</span>
            </button>
            <button
              onClick={handleCopyLogs}
              className="flex items-center gap-1 px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] transition-colors"
              title="터미널 로그 복사"
            >
              {copiedLog ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedLog ? '복사됨' : '로그 복사'}</span>
            </button>
          </div>
        </div>

        {/* Terminal Log Lines */}
        <div className="p-4 space-y-1 max-h-56 overflow-y-auto custom-scrollbar text-[11.5px] leading-relaxed">
          {currentScenario.simulatedLogs.map((line, idx) => {
            const isError = line.includes('level=ERROR') || line.includes('CUDA error') || line.includes('failed') || line.includes('fatal error');
            const isWarn = line.includes('level=WARN') || line.includes('exceeds');
            const isMeta = line.includes('level=INFO');

            return (
              <div key={idx} className="flex items-start gap-2">
                <span className="text-slate-600 select-none text-[10px] w-5 text-right font-mono shrink-0">
                  {idx + 1}
                </span>
                <span
                  className={`${
                    isError
                      ? 'text-rose-400 font-bold bg-rose-950/30 px-1 rounded'
                      : isWarn
                      ? 'text-amber-300'
                      : isMeta
                      ? 'text-slate-300'
                      : 'text-slate-400'
                  }`}
                >
                  {line}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Root Cause Analysis & Actionable Troubleshooting Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-xs">
        {/* Left Column: Root Cause & Technical Mechanism (5 cols) */}
        <div className="lg:col-span-5 bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3 flex flex-col justify-between">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4 text-rose-600" />
                <span>장애 원인 심층 분석 (Root Cause)</span>
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 font-bold">
                {currentScenario.subsystem}
              </span>
            </div>

            <p className="text-slate-800 font-semibold leading-snug">
              {currentScenario.summary}
            </p>

            <div className="p-2.5 bg-white border border-slate-200 rounded-lg space-y-1">
              <span className="font-bold text-slate-700 text-[11px]">하부 C++ 아키텍처 동작 메커니즘:</span>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                {currentScenario.technicalMechanism}
              </p>
            </div>
          </div>

          <div className="p-2 bg-rose-50 border border-rose-200 rounded text-[11px] text-rose-900 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>장애 영향: 추론 프로세스 즉시 중단(Abort) 및 OOM-Killer 강제 종료</span>
          </div>
        </div>

        {/* Right Column: Step-by-Step Remediation Commands (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 p-4 rounded-xl space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-emerald-600" />
                <span>표준 조치 및 엔지니어링 대응 가이드</span>
              </span>
              <span className="text-[11px] text-emerald-700 font-semibold">검증된 해결 절차</span>
            </div>

            <div className="mt-3 space-y-3">
              {/* Primary Fix */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{currentScenario.primaryFixDesc}</span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                    최우선 권장
                  </span>
                </div>

                <div className="bg-slate-900 text-slate-100 p-2.5 rounded-lg font-mono text-[11px] flex items-center justify-between gap-2 overflow-x-auto">
                  <pre className="text-emerald-400 whitespace-pre-wrap">{currentScenario.primaryFixCommand}</pre>
                  <button
                    onClick={() => handleCopyCommand(currentScenario.primaryFixCommand, `${currentScenario.id}-primary`)}
                    className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[10px] shrink-0 transition-colors"
                    title="명령어 복사"
                  >
                    {copiedFixId === `${currentScenario.id}-primary` ? (
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

              {/* Secondary Fix (if available) */}
              {currentScenario.secondaryFixDesc && currentScenario.secondaryFixCommand && (
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <span className="font-semibold text-slate-800 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{currentScenario.secondaryFixDesc}</span>
                  </span>

                  <div className="bg-slate-900 text-slate-100 p-2.5 rounded-lg font-mono text-[11px] flex items-center justify-between gap-2 overflow-x-auto">
                    <pre className="text-slate-300 whitespace-pre-wrap">{currentScenario.secondaryFixCommand}</pre>
                    <button
                      onClick={() =>
                        handleCopyCommand(currentScenario.secondaryFixCommand!, `${currentScenario.id}-secondary`)
                      }
                      className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[10px] shrink-0 transition-colors"
                      title="명령어 복사"
                    >
                      {copiedFixId === `${currentScenario.id}-secondary` ? (
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
              )}
            </div>
          </div>

          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 flex items-center justify-between mt-2">
            <span>실무 팁: 조치 명령어 실행 후 <code>ollama ps</code>로 VRAM 100% 정상 적재를 재확인하세요.</span>
            <span className="font-mono text-emerald-700 font-bold">100% GPU</span>
          </div>
        </div>
      </div>

      {/* 5. Custom Log Pattern Diagnostic Tool */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-indigo-600" />
            <h4 className="font-bold text-slate-900">사용자 로그 에러 시그니처 자동 분석기</h4>
          </div>
          <span className="text-[11px] text-slate-500">
            호스트 터미널에서 발생한 Ollama 에러 로그를 붙여넣어 진단하세요.
          </span>
        </div>

        <div className="space-y-2">
          <textarea
            rows={2}
            value={userCustomLog}
            onChange={(e) => setUserCustomLog(e.target.value)}
            placeholder="예: CUDA error: out of memory at /llama.cpp/ggml-cuda.cu 또는 invalid magic characters..."
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />

          <div className="flex items-center justify-between">
            <div className="text-[11px] text-slate-600">
              {customDiagnosticResult && (
                <span className="font-semibold text-indigo-900 animate-in fade-in duration-200">
                  {customDiagnosticResult}
                </span>
              )}
            </div>
            <button
              onClick={handleAnalyzeCustomLog}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors shadow-xs"
            >
              내 로그 진단하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
