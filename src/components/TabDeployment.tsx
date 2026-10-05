import React, { useState } from 'react';
import { Container, Terminal, Copy, Check, Download, Server, Network, Database, Sparkles, Sliders } from 'lucide-react';

interface RAGStep {
  id: string;
  stepNum: number;
  title: string;
  role: string;
  recommendedTools: string;
  codeSnippet: string;
  description: string;
  paramTips: string[];
}

const RAG_STEPS: RAGStep[] = [
  {
    id: 'chunking',
    stepNum: 1,
    title: '문서 수집 및 청킹 (Ingestion & Chunking)',
    role: '장문 PDF, Markdown, 소스코드 분할',
    recommendedTools: 'LangChain RecursiveCharacterTextSplitter, Unstructured',
    description: '문서의 계층적 의미 단위를 보존하기 위해 문단(\\n\\n), 문장(\\n), 마침표 단위로 재귀 분할합니다. 청크 크기가 너무 작으면 맥락이 손실되고, 너무 크면 검색 정밀도가 떨어집니다.',
    paramTips: [
      '일반 기술 문서: Chunk Size 800 tokens, Overlap 150 tokens',
      'API 명세 및 소스코드: AST 기반 구조 청킹 (Language.PYTHON, Language.JS)',
      '의미 손실 방지를 위한 메타데이터(문서 제목, 페이지 번호) 헤더 삽입',
    ],
    codeSnippet: `from langchain_text_splitters import RecursiveCharacterTextSplitter

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=800,
    chunk_overlap=150,
    separators=["\\n\\n", "\\n", " ", ""]
)
chunks = text_splitter.split_documents(docs)`,
  },
  {
    id: 'embedding',
    stepNum: 2,
    title: '로컬 고성능 임베딩 (Local Embeddings)',
    role: '텍스트를 고차원 밀집 벡터(Dense Vector)로 변환',
    recommendedTools: 'nomic-embed-text (8k ctx, MRL), bge-m3 (다국어/희소 벡터)',
    description: 'Ollama는 언어 모델뿐 아니라 임베딩 모델도 네이티브 호스팅합니다. nomic-embed-text는 최대 8,192 토큰 컨텍스트를 지원하며 차원 축소(Matryoshka Representation)를 지원합니다.',
    paramTips: [
      '한국어/다국어 혼합 환경: bge-m3 모델 권장 (Ollama pull bge-m3)',
      '긴 기술 문서/코드: nomic-embed-text (8,192 토큰 컨텍스트)',
      'VRAM 소모량: 약 0.8GB ~ 1.5GB로 매우 적음',
    ],
    codeSnippet: `import requests

def get_ollama_embedding(text: str, model="nomic-embed-text") -> list[float]:
    response = requests.post(
        "http://localhost:11434/api/embeddings",
        json={"model": model, "prompt": text}
    )
    return response.json()["embedding"]`,
  },
  {
    id: 'vectordb',
    stepNum: 3,
    title: '벡터 데이터베이스 저장 및 인덱싱',
    role: '수백만 개 벡터의 초고속 유사도 검색(ANN)',
    recommendedTools: 'Qdrant (Rust 기반 고성능), Chroma (경량), pgvector (PostgreSQL 통합)',
    description: 'HNSW(Hierarchical Navigable Small World) 인덱스를 생성하여 밀리초 단위로 유사 청크를 조회합니다. 온프레미스 단일 서버에서는 Qdrant 또는 pgvector가 엔터프라이즈 신뢰도를 제공합니다.',
    paramTips: [
      '유사도 척도: Cosine Similarity 또는 Dot Product',
      'HNSW 매개변수: m=16, ef_construct=100 권장',
      '페이로드 필터링(부서별 권한, 문서 날짜) 연동',
    ],
    codeSnippet: `from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams

client = QdrantClient(host="localhost", port=6333)
client.create_collection(
    collection_name="enterprise_docs",
    vectors_config=VectorParams(size=768, distance=Distance.COSINE),
)`,
  },
  {
    id: 'retrieval',
    stepNum: 4,
    title: '하이브리드 검색 & 리랭커 (Hybrid + Reranker)',
    role: '정확한 키워드 매칭과 문맥 유사도 통합',
    recommendedTools: 'BM25 + Dense Hybrid Search + BGE-Reranker-Large',
    description: '전문 용어나 영문 코드 식별자는 밀집 벡터가 놓치기 쉽습니다. BM25 키워드 점수와 벡터 코사인 유사도를 RRF(Reciprocal Rank Fusion)로 결합한 후, 상위 20개 문서를 Cross-Encoder Reranker로 재정렬하여 최종 상위 5개를 추출합니다.',
    paramTips: [
      'RRF(Reciprocal Rank Fusion) 가중치 k=60',
      'Reranker 도입 시 검색 적중률(Recall@5) 25% 이상 향상',
      '로컬 Reranker: bge-reranker-large (약 1.2GB VRAM)',
    ],
    codeSnippet: `# 하이브리드 검색 후 Cross-Encoder 리랭킹 파이프라인
from sentence_transformers import CrossEncoder

reranker = CrossEncoder("BAAI/bge-reranker-large")
scores = reranker.predict([(query, chunk.text) for chunk in candidate_chunks])
top_chunks = [chunk for _, chunk in sorted(zip(scores, candidate_chunks), reverse=True)[:5]]`,
  },
  {
    id: 'generation',
    stepNum: 5,
    title: 'Ollama 엄격 근거 추론 (Grounded Generation)',
    role: '검색 청크 기반 환각 없는 최종 답변 생성',
    recommendedTools: 'Qwen 2.5 32B Instruct / Llama 3.2 8B Instruct',
    description: '검색된 청크를 프롬프트의 컨텍스트 블록에 주입하고, 시스템 지시문으로 "주어진 컨텍스트에 명시되지 않은 사실은 절대 답변하지 말 것"을 명시하여 환각(Hallucination)을 차단합니다.',
    paramTips: [
      'Temperature 0.1~0.2 설정 (환각 최소화)',
      '인용 출처 표기([출처 1], [출처 2]) 규칙 프롬프트 주입',
      '스트리밍(Streaming) 응답으로 체감 지연 최소화',
    ],
    codeSnippet: `prompt = f"""[검색된 컨텍스트]
{context_text}

[사용자 질문]
{user_query}

지침: 컨텍스트에 명시된 사실만을 바탕으로 신뢰할 수 있는 답변을 작성하세요."""`,
  },
];

export const TabDeployment: React.FC = () => {
  // RAG Interactive Step
  const [selectedStepId, setSelectedStepId] = useState<string>('chunking');
  const activeRAGStep = RAG_STEPS.find((s) => s.id === selectedStepId) || RAG_STEPS[0];

  // Docker Compose Generator Options
  const [gpuType, setGpuType] = useState<'nvidia' | 'cpu'>('nvidia');
  const [includeWebUI, setIncludeWebUI] = useState<boolean>(true);
  const [includeReverseProxy, setIncludeReverseProxy] = useState<boolean>(true);
  const [numParallel, setNumParallel] = useState<number>(4);
  const [maxLoadedModels, setMaxLoadedModels] = useState<number>(1);
  const [keepAlive, setKeepAlive] = useState<string>('5m');
  const [activeConfigTab, setActiveConfigTab] = useState<'docker' | 'systemd' | 'cli'>('docker');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Generate Docker Compose YAML
  const generateDockerCompose = (): string => {
    let yaml = `version: '3.8'\n\nservices:\n`;

    // Ollama Service
    yaml += `  ollama:\n`;
    yaml += `    image: ollama/ollama:latest\n`;
    yaml += `    container_name: ollama-production\n`;
    yaml += `    restart: unless-stopped\n`;
    yaml += `    environment:\n`;
    yaml += `      - OLLAMA_HOST=0.0.0.0:11434\n`;
    yaml += `      - OLLAMA_NUM_PARALLEL=${numParallel}\n`;
    yaml += `      - OLLAMA_MAX_LOADED_MODELS=${maxLoadedModels}\n`;
    yaml += `      - OLLAMA_KEEP_ALIVE=${keepAlive}\n`;
    yaml += `      - OLLAMA_KV_CACHE_TYPE=q8_0\n`;
    yaml += `      - OLLAMA_ORIGINS=*\n`;

    if (gpuType === 'nvidia') {
      yaml += `    deploy:\n`;
      yaml += `      resources:\n`;
      yaml += `        reservations:\n`;
      yaml += `          devices:\n`;
      yaml += `            - driver: nvidia\n`;
      yaml += `              count: all\n`;
      yaml += `              capabilities: [gpu]\n`;
    }

    yaml += `    volumes:\n`;
    yaml += `      - ollama_models:/root/.ollama\n`;
    yaml += `    security_opt:\n`;
    yaml += `      - no-new-privileges:true\n`;
    yaml += `    healthcheck:\n`;
    yaml += `      test: ["CMD-SHELL", "curl -f http://localhost:11434/api/tags || exit 1"]\n`;
    yaml += `      interval: 15s\n`;
    yaml += `      timeout: 5s\n`;
    yaml += `      retries: 3\n`;

    if (!includeReverseProxy) {
      yaml += `    ports:\n`;
      yaml += `      - "127.0.0.1:11434:11434"\n`;
    }

    // Open WebUI Service
    if (includeWebUI) {
      yaml += `\n  open-webui:\n`;
      yaml += `    image: ghcr.io/open-webui/open-webui:main\n`;
      yaml += `    container_name: open-webui\n`;
      yaml += `    restart: unless-stopped\n`;
      yaml += `    environment:\n`;
      yaml += `      - OLLAMA_BASE_URL=http://ollama:11434\n`;
      yaml += `      - WEBUI_AUTH=true\n`;
      yaml += `    volumes:\n`;
      yaml += `      - openwebui_data:/app/backend/data\n`;
      yaml += `    depends_on:\n`;
      yaml += `      ollama:\n`;
      yaml += `        condition: service_healthy\n`;

      if (!includeReverseProxy) {
        yaml += `    ports:\n`;
        yaml += `      - "3000:8080"\n`;
      }
    }

    // Reverse Proxy Service
    if (includeReverseProxy) {
      yaml += `\n  reverse-proxy:\n`;
      yaml += `    image: nginx:alpine\n`;
      yaml += `    container_name: ollama-proxy\n`;
      yaml += `    restart: unless-stopped\n`;
      yaml += `    ports:\n`;
      yaml += `      - "80:80"\n`;
      yaml += `      - "443:443"\n`;
      yaml += `    volumes:\n`;
      yaml += `      - ./nginx.conf:/etc/nginx/nginx.conf:ro\n`;
      yaml += `    depends_on:\n`;
      yaml += `      - ollama\n`;
      if (includeWebUI) yaml += `      - open-webui\n`;
    }

    yaml += `\nvolumes:\n`;
    yaml += `  ollama_models:\n`;
    if (includeWebUI) yaml += `  openwebui_data:\n`;

    return yaml;
  };

  // Generate Systemd Override
  const generateSystemd = (): string => {
    return `# /etc/systemd/system/ollama.service.d/override.conf
[Service]
# 네트워크 바인딩 (로컬 격리 권장)
Environment="OLLAMA_HOST=127.0.0.1:11434"

# 동시 처리 세션 수 (배치 스케줄링)
Environment="OLLAMA_NUM_PARALLEL=${numParallel}"

# 메모리 상주 모델 최대 개수
Environment="OLLAMA_MAX_LOADED_MODELS=${maxLoadedModels}"

# 유휴 모델 VRAM 해제 대기시간
Environment="OLLAMA_KEEP_ALIVE=${keepAlive}"

# 긴 문맥 KV 캐시 메모리 절감
Environment="OLLAMA_KV_CACHE_TYPE=q8_0"

# 다중 GPU 레이어 분산 활성화
Environment="OLLAMA_SCHED_SPREAD=1"

# 모델 디렉토리 지정 (NVMe 마운트)
Environment="OLLAMA_MODELS=/mnt/nvme/ollama/models"
`;
  };

  const copyContent = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const downloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const dockerYaml = generateDockerCompose();
  const systemdConf = generateSystemd();

  return (
    <div className="space-y-6">
      {/* 1. Header & RAG Architecture */}
      <div className="bg-white p-6 rounded-xl border border-slate-200">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          4. 엔터프라이즈 RAG 파이프라인 &amp; Docker 프로덕션 배포
        </h2>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-4xl">
          기업 사내 데이터를 기반으로 환각 없이 질의응답을 수행하는 <strong>로컬 RAG(Retrieval-Augmented Generation)</strong>
          파이프라인 단계별 구현 가이드와 <strong>NVIDIA Container Toolkit</strong> 기반 고성능 Docker Compose 배포 스택을 제공합니다.
        </p>
      </div>

      {/* 2. Interactive 5-Step RAG Flow */}
      <div className="bg-white p-6 rounded-xl border border-slate-200">
        <div className="pb-4 border-b border-slate-200">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-600" />
            <span>엔드투엔드 로컬 RAG 파이프라인 아키텍처</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            단계별 노드를 클릭하여 엔터프라이즈 파라미터 튜닝 지침과 구현 코드를 확인하세요.
          </p>
        </div>

        {/* Step Nodes Bar */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-5 gap-2">
          {RAG_STEPS.map((s) => {
            const isSelected = s.id === selectedStepId;
            return (
              <button
                key={s.id}
                onClick={() => setSelectedStepId(s.id)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  isSelected
                    ? 'bg-emerald-50/70 border-emerald-500 shadow-sm'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                      isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {s.stepNum}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Step {s.stepNum}</span>
                </div>
                <div className={`mt-2 text-xs font-bold leading-snug ${isSelected ? 'text-emerald-900' : 'text-slate-800'}`}>
                  {s.title.split('(')[0]}
                </div>
                <div className="text-[10px] text-slate-500 mt-1 truncate">{s.role}</div>
              </button>
            );
          })}
        </div>

        {/* Active Step Detail Card */}
        <div className="mt-4 p-5 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-6 space-y-3 text-xs">
            <div>
              <div className="text-xs font-bold text-slate-500">단계 {activeRAGStep.stepNum} 분석</div>
              <h4 className="text-base font-bold text-slate-900 mt-0.5">{activeRAGStep.title}</h4>
              <p className="text-slate-700 mt-2 leading-relaxed">{activeRAGStep.description}</p>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1.5">
              <span className="font-bold text-slate-800">실무 튜닝 권장 지침:</span>
              <ul className="list-disc list-inside space-y-1 text-slate-600 text-[11px]">
                {activeRAGStep.paramTips.map((tip, idx) => (
                  <li key={idx}>{tip}</li>
                ))}
              </ul>
            </div>

            <div className="text-[11px] text-slate-500">
              추천 도구/스택: <strong className="text-slate-700">{activeRAGStep.recommendedTools}</strong>
            </div>
          </div>

          <div className="lg:col-span-6 flex flex-col justify-between">
            <div className="flex items-center justify-between bg-slate-900 text-slate-300 px-3 py-1.5 rounded-t-lg text-xs font-mono">
              <span>Python 파이프라인 구현 스니펫</span>
              <button
                onClick={() => copyContent(activeRAGStep.codeSnippet, `rag-${activeRAGStep.id}`)}
                className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white"
              >
                {copiedKey === `rag-${activeRAGStep.id}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === `rag-${activeRAGStep.id}` ? '복사됨' : '복사'}</span>
              </button>
            </div>
            <pre className="p-3.5 bg-slate-950 text-slate-100 font-mono text-xs rounded-b-lg overflow-x-auto leading-relaxed h-52 custom-scrollbar">
              {activeRAGStep.codeSnippet}
            </pre>
          </div>
        </div>
      </div>

      {/* 3. Production Docker Compose & Systemd Generator */}
      <div className="bg-white p-6 rounded-xl border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Container className="w-4 h-4 text-emerald-600" />
              <span>프로덕션 배포 설정 생성기 (Docker &amp; Systemd)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              NVIDIA GPU 가속, Open WebUI 통합 및 동시성 파라미터가 최적화된 배포 스크립트
            </p>
          </div>

          {/* Config Tab Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
            <button
              onClick={() => setActiveConfigTab('docker')}
              className={`px-3 py-1 font-semibold rounded transition-colors ${
                activeConfigTab === 'docker' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              docker-compose.yml
            </button>
            <button
              onClick={() => setActiveConfigTab('systemd')}
              className={`px-3 py-1 font-semibold rounded transition-colors ${
                activeConfigTab === 'systemd' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              systemd override.conf
            </button>
            <button
              onClick={() => setActiveConfigTab('cli')}
              className={`px-3 py-1 font-semibold rounded transition-colors ${
                activeConfigTab === 'cli' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              필수 CLI 치트시트
            </button>
          </div>
        </div>

        {/* Options Toggles */}
        {activeConfigTab !== 'cli' && (
          <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">하드웨어 가속 드라이버</label>
              <select
                value={gpuType}
                onChange={(e) => setGpuType(e.target.value as any)}
                className="w-full p-1.5 border border-slate-300 rounded bg-white text-slate-800"
              >
                <option value="nvidia">NVIDIA GPU (CUDA Toolkit)</option>
                <option value="cpu">CPU 전용 (AVX-512)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">동시 세션 (NUM_PARALLEL)</label>
              <select
                value={numParallel}
                onChange={(e) => setNumParallel(Number(e.target.value))}
                className="w-full p-1.5 border border-slate-300 rounded bg-white text-slate-800"
              >
                <option value={1}>1 (단일 사용자)</option>
                <option value={2}>2 (소규모)</option>
                <option value={4}>4 (엔터프라이즈 권장)</option>
                <option value={8}>8 (고대역 VRAM)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">모델 유지시간 (KEEP_ALIVE)</label>
              <select
                value={keepAlive}
                onChange={(e) => setKeepAlive(e.target.value)}
                className="w-full p-1.5 border border-slate-300 rounded bg-white text-slate-800"
              >
                <option value="5m">5분 (자원 절약)</option>
                <option value="15m">15분 (표준)</option>
                <option value="1h">1시간 (연속 업무)</option>
                <option value="-1">영구 상주 (-1)</option>
              </select>
            </div>

            <div className="space-y-1 self-end">
              <label className="flex items-center gap-1.5 text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeWebUI}
                  onChange={(e) => setIncludeWebUI(e.target.checked)}
                  className="accent-emerald-600 rounded"
                />
                <span>Open WebUI 컨테이너 포함</span>
              </label>
              <label className="flex items-center gap-1.5 text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeReverseProxy}
                  onChange={(e) => setIncludeReverseProxy(e.target.checked)}
                  className="accent-emerald-600 rounded"
                />
                <span>Nginx 리버스 프록시 연동</span>
              </label>
            </div>
          </div>
        )}

        {/* Code Content Box */}
        <div className="mt-4">
          <div className="flex items-center justify-between bg-slate-900 text-slate-300 px-4 py-2.5 rounded-t-lg text-xs font-mono">
            <span>
              {activeConfigTab === 'docker'
                ? 'docker-compose.yml'
                : activeConfigTab === 'systemd'
                ? 'override.conf'
                : 'Ollama CLI & REST API Commands'}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  copyContent(
                    activeConfigTab === 'docker'
                      ? dockerYaml
                      : activeConfigTab === 'systemd'
                      ? systemdConf
                      : `# 핵심 Ollama CLI\nollama run qwen2.5:32b\nollama ps\nollama rm <model>`,
                    'deploy-code'
                  )
                }
                className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded transition-colors"
              >
                {copiedKey === 'deploy-code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'deploy-code' ? '복사됨' : '복사'}</span>
              </button>
              {activeConfigTab !== 'cli' && (
                <button
                  onClick={() =>
                    downloadFile(
                      activeConfigTab === 'docker' ? 'docker-compose.yml' : 'override.conf',
                      activeConfigTab === 'docker' ? dockerYaml : systemdConf
                    )
                  }
                  className="flex items-center gap-1 bg-emerald-700 hover:bg-emerald-600 text-white px-2.5 py-1 rounded transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>다운로드</span>
                </button>
              )}
            </div>
          </div>

          <pre className="p-4 bg-slate-950 text-slate-100 font-mono text-xs rounded-b-lg overflow-x-auto leading-relaxed h-[340px] custom-scrollbar select-all">
            {activeConfigTab === 'docker' ? dockerYaml : activeConfigTab === 'systemd' ? systemdConf : `
# ========================================================
# Ollama 핵심 운영 CLI & REST API 종합 치트시트
# ========================================================

# 1. 모델 라이프사이클 관리
ollama pull llama3.2:8b-instruct-q4_K_M       # 모델 가중치 백그라운드 다운로드
ollama list                                  # 로컬 다운로드된 모델 목록 조회
ollama ps                                    # 현재 GPU VRAM에 로드된 모델 및 잔여 TTL 확인
ollama rm <model_name>                       # 디스크 및 VRAM에서 모델 즉각 영구 삭제

# 2. 실시간 VRAM 상주 및 상태 진단
curl -s http://localhost:11434/api/ps | jq   # 현재 로드된 모델의 VRAM 점유 바이트(size_vram) 확인

# 3. REST API를 통한 비동기 스트리밍 호출 (POST /api/chat)
curl http://localhost:11434/api/chat -d '{
  "model": "qwen2.5-coder:32b",
  "messages": [
    { "role": "system", "content": "엄격한 JSON 형식으로만 응답하라." },
    { "role": "user", "content": "RTX 4090 메모리 대역폭을 반환하라." }
  ],
  "stream": false,
  "options": {
    "temperature": 0.1,
    "num_ctx": 16384
  }
}'

# 4. 임베딩 벡터 생성 API (POST /api/embeddings)
curl http://localhost:11434/api/embeddings -d '{
  "model": "nomic-embed-text",
  "prompt": "인공지능 로컬 인프라 아키텍처"
}'
`}
          </pre>
        </div>
      </div>
    </div>
  );
};
