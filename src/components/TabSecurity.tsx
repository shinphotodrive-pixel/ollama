import React, { useState } from 'react';
import { CVE_DATABASE, CVEDetail } from '../utils/modelfileTemplates';
import { SecurityCheckItem } from '../types';
import { ShieldAlert, CheckCircle2, AlertTriangle, XCircle, Scale, ShieldCheck, Cpu, ExternalLink } from 'lucide-react';

const INITIAL_CHECKLIST: SecurityCheckItem[] = [
  {
    id: 'bind-local',
    title: 'Ollama 바인딩을 127.0.0.1(Localhost)로 격리하였는가?',
    description: '기본 0.0.0.0 바인딩은 외부 공용 인터넷에서 인증 없는 11434 포트 무단 접근을 유발합니다.',
    category: 'network',
    checked: true,
    severity: 'critical',
    remediation: 'OLLAMA_HOST=127.0.0.1:11434 환경 변수 설정 또는 Docker 포트 127.0.0.1:11434:11434 바인딩',
  },
  {
    id: 'version-patch',
    title: 'Ollama 런타임 버전이 v0.1.34 이상(권장: v0.3.x 이상)인가?',
    description: 'v0.1.34 미만 버전은 /api/pull 경로 탐색을 통한 원격 임의 파일 쓰기(RCE) 취약점에 무방비합니다.',
    category: 'model',
    checked: true,
    severity: 'critical',
    remediation: 'curl -fsSL https://ollama.com/install.sh | sh 로 최신 바이너리 업데이트',
  },
  {
    id: 'auth-proxy',
    title: '외부 접근 시 리버스 프록시(Nginx/Caddy) Bearer Token 인증을 적용했는가?',
    description: 'Ollama 자체에는 인증 레이어가 없으므로 인그레스 게이트웨이에서 Authorization 헤더를 검증해야 합니다.',
    category: 'auth',
    checked: true,
    severity: 'critical',
    remediation: 'Nginx auth_request 또는 HTTP Bearer Token 검증 미들웨어 구성',
  },
  {
    id: 'non-root',
    title: 'Docker 컨테이너를 root 비권한 사용자 및 no-new-privileges로 실행 중인가?',
    description: '컨테이너 침해 시 호스트 루트 권한 획득(Container Escape)을 방지합니다.',
    category: 'container',
    checked: true,
    severity: 'high',
    remediation: 'security_opt: ["no-new-privileges:true"] 및 read_only: true 옵션 적용',
  },
  {
    id: 'sha256-verify',
    title: '외부 다운로드 GGUF 파일의 SHA256 체크섬을 검증하는가?',
    description: '변조된 GGUF 메타데이터 헤더로 인한 메모리 오염(CVE-2026-7482)을 원천 차단합니다.',
    category: 'model',
    checked: false,
    severity: 'high',
    remediation: 'HuggingFace 레포지토리의 원본 sha256과 로컬 파일 체크섬 일치 확인 파이프라인 구현',
  },
  {
    id: 'cors-restrict',
    title: 'OLLAMA_ORIGINS를 와일드카드(*)가 아닌 특정 도메인으로 제한했는가?',
    description: '와일드카드 CORS는 악성 웹페이지에서 브라우저를 통해 사내 로컬 Ollama로 무단 크로스오리진 요청을 보낼 수 있습니다.',
    category: 'network',
    checked: false,
    severity: 'high',
    remediation: 'OLLAMA_ORIGINS="https://my-app.internal.domain" 설정',
  },
  {
    id: 'keepalive-limit',
    title: 'OLLAMA_KEEP_ALIVE 및 MAX_LOADED_MODELS 상한을 설정했는가?',
    description: '악의적이거나 부주의한 다중 대형 모델 로드로 인한 VRAM 고갈 DoS를 방지합니다.',
    category: 'container',
    checked: true,
    severity: 'medium',
    remediation: 'OLLAMA_KEEP_ALIVE=5m 및 OLLAMA_MAX_LOADED_MODELS=1 설정',
  },
  {
    id: 'volume-restrict',
    title: '모델 저장 볼륨 권한(/root/.ollama)을 전용 사용자로 격리했는가?',
    description: '호스트 파일시스템 권한 오염 및 임의 모델 가중치 파일 교체를 방지합니다.',
    category: 'container',
    checked: true,
    severity: 'medium',
    remediation: 'chmod 700 및 chown 1000:1000 전용 볼륨 마운트 디렉토리 적용',
  },
];

export const TabSecurity: React.FC = () => {
  const [checklist, setChecklist] = useState<SecurityCheckItem[]>(INITIAL_CHECKLIST);
  const [selectedCVE, setSelectedCVE] = useState<CVEDetail>(CVE_DATABASE[0]);

  const toggleCheck = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  // Calculate Security Score
  const totalWeight = checklist.reduce((sum, item) => {
    return sum + (item.severity === 'critical' ? 3 : item.severity === 'high' ? 2 : 1);
  }, 0);

  const checkedWeight = checklist.reduce((sum, item) => {
    if (!item.checked) return sum;
    return sum + (item.severity === 'critical' ? 3 : item.severity === 'high' ? 2 : 1);
  }, 0);

  const securityScore = Math.round((checkedWeight / totalWeight) * 100);

  let grade = 'A+';
  let gradeColor = 'text-emerald-700 bg-emerald-50 border-emerald-300';
  let gradeDesc = '엔터프라이즈 프로덕션 환경에 배포 가능한 최고 수준의 보안 격리 상태입니다.';

  if (securityScore < 50) {
    grade = 'F';
    gradeColor = 'text-rose-700 bg-rose-50 border-rose-300';
    gradeDesc = '심각한 RCE 및 VRAM 자원 고갈 침해 위험에 노출되어 있습니다. 즉시 필수 조치를 수행하십시오.';
  } else if (securityScore < 75) {
    grade = 'C';
    gradeColor = 'text-amber-700 bg-amber-50 border-amber-300';
    gradeDesc = '사설 내부망 제한 환경에서만 구동 가능하며, 외부 트래픽 수용 시 침해 위험이 큽니다.';
  } else if (securityScore < 90) {
    grade = 'B+';
    gradeColor = 'text-indigo-700 bg-indigo-50 border-indigo-300';
    gradeDesc = '양호한 보안 체계이나, 체크되지 않은 고위험군 항목에 대한 추가 보완이 권장됩니다.';
  }

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          5. 엔터프라이즈 보안(CVE) 취약점 &amp; 오픈소스 라이선스 진단
        </h2>
        <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-4xl">
          로컬 LLM 호스팅 환경에서 발생 가능한 <strong>원격 코드 실행(RCE)</strong> 및 <strong>VRAM 고갈 DoS</strong> 공격
          메커니즘을 상세 분석하고, <strong>Ollama vs vLLM</strong> 아키텍처 비교 및 <strong>Meta Llama 3.1 7억 MAU</strong> 라이선스
          준수 기준을 제시합니다.
        </p>
      </div>

      {/* 2. Interactive Hardening Checklist & Scorecard */}
      <div className="bg-white p-6 rounded-xl border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>엔터프라이즈 하드닝 점검표 (Live Security Audit)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              항목을 클릭하여 귀사의 인프라 보안 등급과 위험 노출도를 실시간 측정하세요.
            </p>
          </div>

          {/* Grade Badge */}
          <div className={`px-4 py-2 rounded-xl border flex items-center gap-3 ${gradeColor}`}>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider">보안 등급</div>
              <div className="text-xl font-black font-mono leading-none mt-0.5">{grade}</div>
            </div>
            <div className="pl-3 border-l border-current/20 text-right">
              <div className="text-xs font-bold font-mono">{securityScore} / 100 점</div>
              <div className="text-[10px]">
                {checklist.filter((c) => c.checked).length} / {checklist.length} 항목 준수
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-600 mt-3">{gradeDesc}</p>

        {/* Checklist Grid */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {checklist.map((item) => (
            <div
              key={item.id}
              onClick={() => toggleCheck(item.id)}
              className={`p-3.5 rounded-lg border cursor-pointer transition-all flex items-start gap-3 select-none ${
                item.checked
                  ? 'bg-slate-50 border-slate-300'
                  : 'bg-rose-50/40 border-rose-200 hover:border-rose-300'
              }`}
            >
              <div className="pt-0.5 shrink-0">
                {item.checked ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-500" />
                )}
              </div>
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className={`font-semibold ${item.checked ? 'text-slate-800' : 'text-rose-900'}`}>
                    {item.title}
                  </span>
                  <span
                    className={`text-[10px] font-mono uppercase px-1.5 py-0.2 rounded font-bold shrink-0 ${
                      item.severity === 'critical'
                        ? 'bg-rose-100 text-rose-800'
                        : item.severity === 'high'
                        ? 'bg-amber-100 text-amber-900'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {item.severity}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">{item.description}</p>
                {!item.checked && (
                  <div className="mt-1 text-[11px] text-rose-700 font-medium">
                    ↳ 조치: {item.remediation}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. CVE Vulnerability Deep Dive Matrix */}
      <div className="bg-white p-6 rounded-xl border border-slate-200">
        <div className="pb-3 border-b border-slate-200">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <span>핵심 보안 취약점(CVE) 상세 기술 분석 매트릭스</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Ollama 및 llama.cpp 기반 엔진에서 보고된 주요 공격 벡터와 차단 방안
          </p>
        </div>

        {/* CVE Selector Tabs */}
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 text-xs">
          {CVE_DATABASE.map((cve) => {
            const isSelected = selectedCVE.id === cve.id;
            return (
              <button
                key={cve.id}
                onClick={() => setSelectedCVE(cve)}
                className={`px-3 py-2 rounded-lg border font-mono whitespace-nowrap transition-colors flex items-center gap-2 ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>{cve.id}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                    cve.severity === 'CRITICAL' ? 'bg-rose-500 text-white' : 'bg-amber-500 text-slate-900'
                  }`}
                >
                  CVSS {cve.cvss}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected CVE Detail Card */}
        <div className="mt-4 p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-3.5 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-200">
            <div>
              <span className="font-mono text-xs font-bold text-rose-700">{selectedCVE.id}</span>
              <h4 className="text-sm font-bold text-slate-900 mt-0.5">{selectedCVE.name}</h4>
            </div>
            <div className="text-slate-500 text-[11px] font-mono">
              영향 버전: <strong className="text-slate-800">{selectedCVE.affectedVersions}</strong> (패치: {selectedCVE.fixedIn})
            </div>
          </div>

          <div className="space-y-1">
            <span className="font-bold text-slate-700">공격 메커니즘 (Technical Mechanism):</span>
            <p className="text-slate-600 leading-relaxed">{selectedCVE.technicalMechanism}</p>
          </div>

          <div className="space-y-1">
            <span className="font-bold text-slate-700">침해 영향도 (Impact):</span>
            <p className="text-slate-600 leading-relaxed">{selectedCVE.impact}</p>
          </div>

          <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1.5">
            <span className="font-bold text-slate-800">방어 및 완화 절차 (Mitigation):</span>
            <ul className="list-disc list-inside space-y-1 text-slate-600 text-[11px]">
              {selectedCVE.mitigationSteps.map((step, idx) => (
                <li key={idx}>{step}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* 4. Architecture Matrix: Ollama vs vLLM vs TGI vs llama.cpp */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 overflow-x-auto">
        <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-emerald-600" />
          <span>추론 엔진 종합 비교: Ollama vs vLLM vs TGI vs llama.cpp</span>
        </h3>
        <table className="w-full text-xs text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
              <th className="p-2.5 font-bold">비교 항목</th>
              <th className="p-2.5 font-bold text-emerald-800">Ollama</th>
              <th className="p-2.5 font-bold">vLLM</th>
              <th className="p-2.5 font-bold">TGI (HuggingFace)</th>
              <th className="p-2.5 font-bold">llama.cpp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-600">
            <tr>
              <td className="p-2.5 font-bold text-slate-800">핵심 기반 엔진</td>
              <td className="p-2.5 font-mono text-emerald-800 font-semibold">llama.cpp C++ 엔진</td>
              <td className="p-2.5 font-mono">PyTorch / PagedAttention</td>
              <td className="p-2.5 font-mono">Rust / FlashAttention</td>
              <td className="p-2.5 font-mono">순수 C/C++ 순방향 연산</td>
            </tr>
            <tr>
              <td className="p-2.5 font-bold text-slate-800">PagedAttention 지원</td>
              <td className="p-2.5 text-slate-500">부분 지원 (KV Cache 슬라이싱)</td>
              <td className="p-2.5 text-emerald-700 font-bold">완벽 지원 (메모리 낭비 0%)</td>
              <td className="p-2.5 text-emerald-700 font-bold">지원</td>
              <td className="p-2.5 text-slate-500">정적 슬롯 할당</td>
            </tr>
            <tr>
              <td className="p-2.5 font-bold text-slate-800">다중 GPU 텐서 병렬화 (TP)</td>
              <td className="p-2.5 text-amber-700">미지원 (레이어 순차 분할만)</td>
              <td className="p-2.5 text-emerald-700 font-bold">완벽 지원 (NVLink 속도 2~4x)</td>
              <td className="p-2.5 text-emerald-700 font-bold">완벽 지원</td>
              <td className="p-2.5 text-amber-700">미지원 (RPC/Layer split)</td>
            </tr>
            <tr>
              <td className="p-2.5 font-bold text-slate-800">동시 다중 사용자 처리량</td>
              <td className="p-2.5 text-slate-700">중소규모 (NUM_PARALLEL=4)</td>
              <td className="p-2.5 text-emerald-700 font-bold">초고속 Continuous Batching</td>
              <td className="p-2.5 text-emerald-700 font-bold">초고속 Dynamic Batching</td>
              <td className="p-2.5 text-slate-700">단일 세션 최적화</td>
            </tr>
            <tr>
              <td className="p-2.5 font-bold text-slate-800">설치 및 모델 운영 편의성</td>
              <td className="p-2.5 text-emerald-700 font-bold">최상 (단 1개 명령어 실행)</td>
              <td className="p-2.5 text-slate-700">중간 (CUDA 환경 의존성 복잡)</td>
              <td className="p-2.5 text-slate-700">중간 (Docker 전용)</td>
              <td className="p-2.5 text-slate-700">고급 (직접 컴파일 권장)</td>
            </tr>
            <tr>
              <td className="p-2.5 font-bold text-slate-800">최적 프로덕션 영역</td>
              <td className="p-2.5 font-semibold text-emerald-800">온프레미스 사내 RAG, 개발자 로컬</td>
              <td className="p-2.5 font-semibold text-slate-800">수천 명 동시 접속 B2C SaaS</td>
              <td className="p-2.5 font-semibold text-slate-800">쿠버네티스 대규모 클러스터</td>
              <td className="p-2.5 font-semibold text-slate-800">임베디드, 엣지 디바이스</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 5. Enterprise Model License Compliance Guide */}
      <div className="bg-white p-6 rounded-xl border border-slate-200">
        <div className="pb-3 border-b border-slate-200">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Scale className="w-4 h-4 text-indigo-600" />
            <span>오픈소스 LLM 상업적 라이선스 규정 진단기</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            기업 사내 배포 및 상용 SaaS 제품 탑재 시 반드시 검토해야 하는 핵심 법적 의무 사항
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Llama 3.1 Card */}
          <div className="p-4 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-2.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-950 text-sm">Meta Llama 3.1 / 3.2</span>
                <span className="text-[10px] font-mono bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-bold">
                  Community License
                </span>
              </div>
              <ul className="mt-3 space-y-2 text-indigo-950/80 leading-relaxed">
                <li>
                  <strong>월간 7억 MAU 제한</strong>: 서비스 출시 전월 기준 월간 활성 사용자(MAU)가 7억 명을 초과하는 대기업은 Meta로부터 명시적 상업 라이선스를 승인받아야 함.
                </li>
                <li>
                  <strong>타 모델 훈련 금지</strong>: Llama의 출력을 다른 언어 모델(경쟁 오픈소스 모델 등)의 지식 증류(Distillation)나 파인튜닝에 사용하는 행위 엄격 제한.
                </li>
                <li>
                  <strong>Llama 표기 의무</strong>: 제품 소개 시 "Built with Llama" 브랜딩 공시 필수.
                </li>
              </ul>
            </div>
            <div className="pt-2 border-t border-indigo-200/60 text-[11px] text-indigo-900 font-medium">
              적용 대상: 대규모 글로벌 포털, SNS 플랫폼
            </div>
          </div>

          {/* DeepSeek Card */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">DeepSeek-V3 / R1</span>
                <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                  Open License
                </span>
              </div>
              <ul className="mt-3 space-y-2 text-slate-600 leading-relaxed">
                <li>
                  <strong>상업적 사용 완전 허용</strong>: 영리 목적의 상용 서비스 탑재 및 온프레미스 구축 제한 없음.
                </li>
                <li>
                  <strong>지식 증류 허용</strong>: Llama와 달리 자사 모델 개선 및 타 모델 훈련을 위한 출력 데이터 활용을 허용하여 에코시스템 확장 촉진.
                </li>
                <li>
                  <strong>수정 및 재배포 허용</strong>: 원저작권자 저작권 고지만 유지하면 파생 모델 자유 배포 가능.
                </li>
              </ul>
            </div>
            <div className="pt-2 border-t border-slate-200 text-[11px] text-emerald-800 font-medium">
              기업 친화도: 매우 우수 (상업적 리스크 최소)
            </div>
          </div>

          {/* Apache 2.0 / MIT Card */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">Qwen 2.5 / Mistral</span>
                <span className="text-[10px] font-mono bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded font-bold">
                  Apache 2.0 / MIT
                </span>
              </div>
              <ul className="mt-3 space-y-2 text-slate-600 leading-relaxed">
                <li>
                  <strong>글로벌 표준 오픈소스</strong>: 특허 보복 조항을 포함하며 소스코드 및 가중치의 자유로운 상업적 이용 보장.
                </li>
                <li>
                  <strong>폐쇄형 사내 서비스 가능</strong>: 내부 수정본을 외부에 공개할 의무가 전혀 없음 (GPL과 차별화).
                </li>
                <li>
                  <strong>사내 거버넌스 승인 용이</strong>: 대기업 법무팀 검토 시 가장 빠르게 통과하는 표준 규약.
                </li>
              </ul>
            </div>
            <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-700 font-medium">
              권장 유스케이스: 금융, 공공, 규제 민감 산업
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
