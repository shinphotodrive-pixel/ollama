export interface ModelPreset {
  id: string;
  name: string;
  from: string;
  contextSize: number;
  temperature: number;
  topP: number;
  topK: number;
  repeatPenalty: number;
  stopTokens: string[];
  systemPrompt: string;
  notes: string;
  templateSnippet?: string;
}

export const MODEL_PRESETS: ModelPreset[] = [
  {
    id: 'llama3.2-8b',
    name: 'Llama 3.2 8B Instruct (경량·고속)',
    from: 'llama3.2:8b-instruct-q4_K_M',
    contextSize: 32768,
    temperature: 0.2,
    topP: 0.9,
    topK: 40,
    repeatPenalty: 1.1,
    stopTokens: ['<|eot_id|>', '<|start_header_id|>', '<|end_header_id|>'],
    systemPrompt: '당신은 엔터프라이즈 인프라 및 보안 아키텍처 전문 시니어 엔지니어입니다. 간결하고 실행 가능한 솔루션을 한국어로 제시하세요.',
    notes: '범용 고속 추론, 8GB~12GB VRAM 완벽 수용. 함수 호출 신뢰도 우수.',
    templateSnippet: `TEMPLATE """{{ if .System }}<|start_header_id|>system<|end_header_id|>

{{ .System }}<|eot_id|>{{ end }}{{ if .Prompt }}<|start_header_id|>user<|end_header_id|>

{{ .Prompt }}<|eot_id|>{{ end }}<|start_header_id|>assistant<|end_header_id|>

{{ .Response }}<|eot_id|>"""`,
  },
  {
    id: 'qwen2.5-32b-coder',
    name: 'Qwen 2.5 Coder 32B (코드·수학 최강)',
    from: 'qwen2.5-coder:32b-instruct-q4_K_M',
    contextSize: 32768,
    temperature: 0.1,
    topP: 0.85,
    topK: 30,
    repeatPenalty: 1.05,
    stopTokens: ['<|im_start|>', '<|im_end|>'],
    systemPrompt: '당신은 엄격한 타입 안정성과 클린 코드 원칙을 준수하는 풀스택 소프트웨어 아키텍트입니다. 불필요한 서론을 배제하고 즉시 실행 가능한 고품질 코드를 작성하세요.',
    notes: '코딩 능력에서 GPT-4o급 성능 발휘. 24GB VRAM(RTX 3090/4090) 필수.',
    templateSnippet: `TEMPLATE """{{ if .System }}<|im_start|>system
{{ .System }}<|im_end|>
{{ end }}{{ if .Prompt }}<|im_start|>user
{{ .Prompt }}<|im_end|>
{{ end }}<|im_start|>assistant
{{ .Response }}<|im_end|>"""`,
  },
  {
    id: 'deepseek-r1-14b',
    name: 'DeepSeek R1 14B (추론·사고 특화)',
    from: 'deepseek-r1:14b',
    contextSize: 32768,
    temperature: 0.6,
    topP: 0.95,
    topK: 50,
    repeatPenalty: 1.15,
    stopTokens: ['<｜end of sentence｜>', '<｜User｜>', '<｜Assistant｜>'],
    systemPrompt: 'DeepSeek R1 사고 모델입니다. 문제를 해결하기 위해 <think> 태그 내에서 단계별 검증 과정을 거쳐 최종 결론을 도출합니다.',
    notes: '추론 모델 특성상 temperature를 0.5~0.7로 설정해야 창의적 검증 루프가 정상 동작함 (0.0 설정 시 루프 고착 위험).',
    templateSnippet: `TEMPLATE """<｜User｜>{{ .Prompt }}<｜Assistant｜><think>
{{ .Response }}"""`,
  },
  {
    id: 'mistral-nemo-12b',
    name: 'Mistral Nemo 12B (다국어·균형형)',
    from: 'mistral-nemo:12b-instruct-2407-q4_K_M',
    contextSize: 65536,
    temperature: 0.3,
    topP: 0.9,
    topK: 40,
    repeatPenalty: 1.1,
    stopTokens: ['[INST]', '[/INST]'],
    systemPrompt: '당신은 방대한 컨텍스트 분석에 특화된 엔터프라이즈 AI 보조입니다.',
    notes: '128k 컨텍스트 지원 및 뛰어난 다국어 토크나이저(Tekken). 16GB GPU에 적합.',
  },
  {
    id: 'custom-gguf',
    name: '커스텀 로컬 GGUF 파일 (수동 경로)',
    from: './models/custom-model.gguf',
    contextSize: 8192,
    temperature: 0.2,
    topP: 0.9,
    topK: 40,
    repeatPenalty: 1.1,
    stopTokens: ['<|end|>'],
    systemPrompt: '엔터프라이즈 온프레미스 전용 모델입니다.',
    notes: 'HuggingFace 등에서 다운로드한 커스텀 양자화 GGUF를 Ollama 모델로 직접 빌드.',
  },
];

export interface CVEDetail {
  id: string;
  name: string;
  cvss: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  affectedVersions: string;
  fixedIn: string;
  attackVector: string;
  technicalMechanism: string;
  impact: string;
  mitigationSteps: string[];
}

export const CVE_DATABASE: CVEDetail[] = [
  {
    id: 'CVE-2024-37032',
    name: 'Probllama: 원격 임의 파일 쓰기 및 RCE (Path Traversal)',
    cvss: 9.8,
    severity: 'CRITICAL',
    affectedVersions: 'Ollama < v0.1.34',
    fixedIn: 'Ollama v0.1.34 이상',
    attackVector: 'Network / Unauthenticated API POST /api/pull',
    technicalMechanism:
      '악성 모델 레지스트리에서 모델 레이어를 풀링할 때, 매니페스트 내의 다이제스트(digest) 해시 값에 "../" 와 같은 경로 탐색(Directory Traversal) 문자가 포함되어 있어도 이를 정규화하거나 검증하지 않고 파일 시스템에 직접 기록함. 호스트 내 SSH 키, Cron 탭, 시스템 바이너리를 덮어써 원격 코드 실행(RCE) 가능.',
    impact: '서버 완전 장악, 호스트 시스템 탈취, 민감한 온프레미스 데이터 유출',
    mitigationSteps: [
      'Ollama 바이너리를 즉시 v0.1.34 이상(권장: v0.3.x 이상)으로 업그레이드',
      'OLLAMA_HOST를 0.0.0.0으로 절대 직접 노출하지 않고 127.0.0.1로 바인딩',
      '외부 접근 시 Bearer 토큰 인증 및 경로 화이트리스트가 적용된 Nginx/Caddy 리버스 프록시 경유',
      'Docker 컨테이너 구동 시 non-root 사용자 실행 및 read-only 루트 파일시스템 적용',
    ],
  },
  {
    id: 'CVE-2026-7482',
    name: 'GGUF 메타데이터 텐서 파서 버퍼 오버플로우 (DoS / Memory Corruption)',
    cvss: 8.4,
    severity: 'HIGH',
    affectedVersions: 'llama.cpp 및 통합 Ollama 엔진 일부 빌드',
    fixedIn: 'Ollama 2026 안정 패치 빌드',
    attackVector: 'Local / Remote Model Loading via Untrusted GGUF File',
    technicalMechanism:
      'GGUF 바이너리 헤더의 tensor_name 문자열 길이 필드를 파싱할 때 음수 또는 비정상적으로 큰 uint64 정수 오버플로우를 유발하는 페이로드를 전달할 경우, 내부 스택/힙 버퍼 할당 크기를 초과하여 메모리 오염 및 세그멘테이션 폴트(SIGSEGV)를 발생시킴.',
    impact: '추론 엔진 서비스 불능(DoS) 유발, 악의적 메모리 영역 변조를 통한 코드 인젝션 위험',
    mitigationSteps: [
      '공인되지 않은 허브나 서드파티로부터 다운로드한 출처 불명의 GGUF 파일 실행 금지',
      'GGUF 파일 적재 전 sha256sum 검증 파이프라인 자동화',
      'Docker security_opt: ["no-new-privileges:true"] 옵션 강제',
      '메모리 가드(ASLR, Stack Canary)가 활성화된 최신 컴파일 바이너리 사용',
    ],
  },
  {
    id: 'CVE-2026-42248',
    name: '미인증 API 자원 고갈 및 VRAM DoS 공격 (Resource Exhaustion)',
    cvss: 7.5,
    severity: 'HIGH',
    affectedVersions: '모든 기본 설정 상태의 외부 노출 Ollama 인스턴스',
    fixedIn: '엔터프라이즈 네트워크 분리 및 게이트웨이 인증 도입',
    attackVector: 'Network / Unauthenticated POST /api/generate with keep_alive=-1',
    technicalMechanism:
      'Ollama는 기본적으로 내장 인증 메커니즘이 없음. 공격자가 외부에 노출된 11434 포트로 70B 모델 등을 keep_alive=-1(영구 상주) 옵션과 거대 num_ctx(131072)로 반복 요청할 경우 GPU VRAM이 즉각 고갈되고 시스템 OOM-Killer가 핵심 데몬을 강제 종료함.',
    impact: 'GPU 인스턴스 마비, 프로덕션 추론 중단, 호스트 서버 다운',
    mitigationSteps: [
      '시스템 데몬 환경변수에 OLLAMA_KEEP_ALIVE=5m 설정으로 미사용 모델 자동 언로드',
      'OLLAMA_MAX_LOADED_MODELS=1 로 동시 적재 모델 수 엄격 제한',
      '사설 VPC 서브넷 내부에서만 11434 포트 허용 및 인그레스 방화벽 설정',
      'Rate-limiting(초당 요청 수 제한)이 적용된 API 게이트웨이 전진 배치',
    ],
  },
];
