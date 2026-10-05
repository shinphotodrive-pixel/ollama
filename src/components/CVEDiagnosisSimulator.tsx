import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  Terminal,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  Filter,
  Layers,
  Wrench,
  Download,
} from 'lucide-react';

export interface CVEDiagnosisItem {
  cveId: string;
  name: string;
  cvss: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  category: 'RCE' | 'DoS' | 'Bypass' | 'CORS' | 'Memory';
  affectedVersions: string;
  fixedIn: string;
  isVulnerable: boolean;
  attackVector: string;
  mechanism: string;
  impact: string;
  remediationCommand: string;
  remediationDesc: string;
}

export const CVEDiagnosisSimulator: React.FC = () => {
  // Target environment configuration inputs
  const [targetVersion, setTargetVersion] = useState<string>('v0.1.32');
  const [bindAddress, setBindAddress] = useState<'0.0.0.0' | '127.0.0.1' | 'proxy'>('0.0.0.0');
  const [corsSetting, setCorsSetting] = useState<'wildcard' | 'restricted'>('wildcard');
  const [containerUser, setContainerUser] = useState<'root' | 'non-root'>('root');
  const [ggufVerify, setGgufVerify] = useState<boolean>(false);

  // Scanning animation state
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanProgress, setScanProgress] = useState<number>(100);
  const [scanLogs, setScanLogs] = useState<string[]>([
    '[INIT] Ollama CVE 취약점 모의 진단기 준비 완료.',
    '[INFO] 타겟 환경 파라미터를 설정한 후 "모의 진단 시작" 버튼을 클릭하세요.',
  ]);

  // Patch simulation overrides (allows user to test fixing vulnerabilities)
  const [patchedCves, setPatchedCves] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<'all' | 'vulnerable' | 'secured' | 'critical'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedReport, setCopiedReport] = useState<boolean>(false);

  // Parse version number to compare with fixed versions
  // v0.1.32 -> 0.1.32, v0.3.12 -> 0.3.12
  const isVersionBelow = (current: string, targetFixed: string) => {
    const curParts = current.replace('v', '').split('.').map(Number);
    const targetParts = targetFixed.replace('v', '').split('.').map(Number);
    for (let i = 0; i < Math.max(curParts.length, targetParts.length); i++) {
      const c = curParts[i] || 0;
      const t = targetParts[i] || 0;
      if (c < t) return true;
      if (c > t) return false;
    }
    return false;
  };

  // Compute live vulnerabilities based on current configuration and patches
  const diagnosticResults: CVEDiagnosisItem[] = useMemo(() => {
    const isV0134Below = isVersionBelow(targetVersion, '0.1.34');
    const isV030Below = isVersionBelow(targetVersion, '0.3.0');
    const isV040Below = isVersionBelow(targetVersion, '0.4.0');

    const baseItems: CVEDiagnosisItem[] = [
      {
        cveId: 'CVE-2024-37032',
        name: 'Probllama: 원격 임의 파일 쓰기 및 RCE (Path Traversal)',
        cvss: 9.8,
        severity: 'CRITICAL',
        category: 'RCE',
        affectedVersions: 'Ollama < v0.1.34',
        fixedIn: 'Ollama v0.1.34+',
        // Vulnerable if version < 0.1.34 AND externally accessible (or not proxied/patched)
        isVulnerable: isV0134Below && !patchedCves.has('CVE-2024-37032'),
        attackVector: 'Network / Unauthenticated API POST /api/pull',
        mechanism:
          '악성 레지스트리에서 모델 레이어를 풀링할 때 digest 해시의 "../" 경로 탐색 문자를 검증하지 않고 파일시스템에 그대로 기록함. 호스트 내 SSH 키, crontab, 시스템 바이너리를 덮어써 RCE 달성.',
        impact: '원격 공격자의 호스트 시스템 루트 권한 탈취 및 데이터 파괴',
        remediationCommand: `curl -fsSL https://ollama.com/install.sh | sh
# 또는 최신 도커 이미지로 교체
docker pull ollama/ollama:latest`,
        remediationDesc: 'Ollama 런타임을 v0.1.34 이상(권장: v0.3.x 이상)으로 업그레이드',
      },
      {
        cveId: 'CVE-2024-39722',
        name: '비정상 모델 파일 풀링 시 메모리 누수 및 Crash (DoS)',
        cvss: 7.5,
        severity: 'HIGH',
        category: 'DoS',
        affectedVersions: 'Ollama < v0.2.8',
        fixedIn: 'Ollama v0.2.8+',
        isVulnerable: isV030Below && !patchedCves.has('CVE-2024-39722'),
        attackVector: 'Network / POST /api/create or /api/pull with Malformed Manifest',
        mechanism:
          '손상되었거나 크기가 비정상적으로 조작된 모델 매니페스트 블록을 파싱하는 과정에서 패닉 핸들러 부재로 인한 Ollama 데몬 즉각 비정상 종료(SIGSEGV).',
        impact: '로컬 추론 서비스 다운 및 지속적 서비스 거부(DoS)',
        remediationCommand: `export OLLAMA_KEEP_ALIVE=5m
export OLLAMA_MAX_LOADED_MODELS=1
# systemd 자동 재시작 정책 설정: Restart=always`,
        remediationDesc: '런타임 v0.3.0+ 업그레이드 및 데몬 자동 복구 정책 수립',
      },
      {
        cveId: 'CVE-2024-41128',
        name: '미인증 API 0.0.0.0 바인딩 및 VRAM 고갈 DoS 공격 (CWE-284)',
        cvss: 8.6,
        severity: 'HIGH',
        category: 'Bypass',
        affectedVersions: '모든 버전 (기본 설정 상태로 공용 인터넷 노출 시)',
        fixedIn: 'OLLAMA_HOST=127.0.0.1 격리 또는 Reverse Proxy Bearer Auth',
        // Vulnerable if bound to 0.0.0.0 without a reverse proxy
        isVulnerable: bindAddress === '0.0.0.0' && !patchedCves.has('CVE-2024-41128'),
        attackVector: 'Network / Public IP Port 11434 Direct Access',
        mechanism:
          'Ollama 자체에는 API 인증 메커니즘이 전혀 없음. 0.0.0.0으로 노출 시 외부 공격자가 대형 70B 모델을 keep_alive=-1 옵션으로 무단 호출하여 GPU VRAM을 영구 점유하고 시스템 OOM 유발.',
        impact: '미인증 사용자의 GPU 자원 무단 도용, 사내 전산망 침해, VRAM 고갈',
        remediationCommand: `export OLLAMA_HOST=127.0.0.1:11434
# Docker 구동 시 호스트 바인딩 포트 제한:
docker run -p 127.0.0.1:11434:11434 -d ollama/ollama`,
        remediationDesc: 'OLLAMA_HOST를 127.0.0.1로 바인딩하거나 Nginx Bearer 인증 프록시 경유',
      },
      {
        cveId: 'CVE-2024-7482',
        name: 'GGUF 메타데이터 텐서 파서 정수 오버플로우 (Memory Corruption)',
        cvss: 8.4,
        severity: 'HIGH',
        category: 'Memory',
        affectedVersions: 'llama.cpp 구버전 빌드 통합 인스턴스',
        fixedIn: 'Ollama v0.3.12+ (GGUF V3 정적 길이 검증 패치)',
        isVulnerable: (!ggufVerify || isV040Below) && !patchedCves.has('CVE-2024-7482'),
        attackVector: 'Local / Loading Untrusted GGUF File with Corrupted Header',
        mechanism:
          'GGUF 바이너리의 tensor_name 길이 파싱 중 부호 없는 64비트 정수 오버플로우 발생으로 힙 버퍼를 벗어나 메모리를 덮어씀. 코드 실행 또는 즉각적인 프로세스 충돌 야기.',
        impact: '추론 엔진 세그멘테이션 폴트 및 프로세스 메모리 조작 위험',
        remediationCommand: `# GGUF 다운로드 파이프라인에 SHA256 체크섬 강제 검증:
sha256sum ./model.gguf | grep "<HuggingFace_Official_SHA256>"
# 비신뢰 출처의 가중치 파일 로드 차단`,
        remediationDesc: '최신 Ollama 엔진 사용 및 다운로드 가중치 파일 SHA256 체크섬 사전 검증',
      },
      {
        cveId: 'CWE-942',
        name: '와일드카드 CORS로 인한 웹 브라우저 경유 사내 Ollama 탈취 (CSRF/SSRF)',
        cvss: 7.2,
        severity: 'MEDIUM',
        category: 'CORS',
        affectedVersions: 'OLLAMA_ORIGINS="*" 설정된 모든 환경',
        fixedIn: 'OLLAMA_ORIGINS="https://trusted.internal.domain" 화이트리스트',
        isVulnerable: corsSetting === 'wildcard' && !patchedCves.has('CWE-942'),
        attackVector: 'Client Browser / Malicious Website Fetching http://127.0.0.1:11434',
        mechanism:
          '사내 개발자가 악성 스크립트가 심어진 웹페이지를 방문하면, 브라우저가 사용자 권한으로 127.0.0.1:11434에 POST /api/generate 요청을 보내 내부 LLM을 프롬프트 인젝션하거나 사내 모델 출력을 외부로 유출.',
        impact: '사내 민감 문서 요약 데이터 탈취 및 브라우저 기반 로컬 인스턴스 조종',
        remediationCommand: `export OLLAMA_ORIGINS="https://llm.corp.internal,https://localhost:3000"
# 와일드카드(*)를 절대로 사용하지 마십시오.`,
        remediationDesc: 'OLLAMA_ORIGINS를 사내 공인 웹 서비스 도메인으로 엄격히 제한',
      },
      {
        cveId: 'CWE-250',
        name: 'Docker Root 권한 실행으로 인한 컨테이너 이스케이프 (Privilege Escalation)',
        cvss: 7.8,
        severity: 'HIGH',
        category: 'Bypass',
        affectedVersions: 'root 사용자로 실행 중인 컨테이너 환경',
        fixedIn: 'docker-compose non-root user (UID 1000) 및 no-new-privileges',
        isVulnerable: containerUser === 'root' && !patchedCves.has('CWE-250'),
        attackVector: 'Container Runtime / Root execution with mounted host volumes',
        mechanism:
          '컨테이너 내부에서 RCE 취약점이나 커널 결함이 발현될 때, root 권한으로 실행 중이면 /var/run/docker.sock 또는 마운트된 호스트 디렉토리를 통해 호스트 운영체제로 권한 상승 탈출(Escape)이 가능함.',
        impact: '호스트 OS 완전 탈취 및 물리 인프라 침해',
        remediationCommand: `# docker-compose.yml 보안 옵션 추가:
security_opt:
  - no-new-privileges:true
user: "1000:1000"
read_only: true`,
        remediationDesc: 'root 비권한 사용자 및 no-new-privileges 옵션 강제 적용',
      },
    ];

    return baseItems;
  }, [targetVersion, bindAddress, corsSetting, containerUser, ggufVerify, patchedCves]);

  // Vulnerability statistics
  const vulnerableCount = diagnosticResults.filter((i) => i.isVulnerable).length;
  const criticalCount = diagnosticResults.filter((i) => i.isVulnerable && i.severity === 'CRITICAL').length;
  const highCount = diagnosticResults.filter((i) => i.isVulnerable && i.severity === 'HIGH').length;
  const securedCount = diagnosticResults.filter((i) => !i.isVulnerable).length;

  // Run the simulated scanning process
  const handleRunScan = () => {
    setIsScanning(true);
    setScanProgress(0);
    setScanLogs([`[AUDIT START] 로컬 Ollama 환경 정밀 취약점 모의 진단 시작 (대상: ${targetVersion})...`]);

    const steps = [
      {
        pct: 25,
        log: `[PORT 11434] 바인딩 상태 확인: ${bindAddress === '0.0.0.0' ? '⚠️ 0.0.0.0 전역 노출 감지 (고위험)' : '✅ 로컬 또는 프록시 격리 확인'}`,
      },
      {
        pct: 50,
        log: `[VERSION] 런타임 버전 검사 (${targetVersion}): ${
          isVersionBelow(targetVersion, '0.1.34')
            ? '🚨 CVE-2024-37032 (Probllama RCE) 취약 버전 확인!'
            : '✅ Probllama 패치 확인'
        }`,
      },
      {
        pct: 75,
        log: `[CORS / GGUF] OLLAMA_ORIGINS=${corsSetting === 'wildcard' ? '⚠️ 와일드카드(*) 감지' : '도메인 제한됨'}, GGUF 체크섬: ${
          ggufVerify ? '✅ SHA256 활성화' : '⚠️ 미검증 상태'
        }`,
      },
      {
        pct: 100,
        log: `[COMPLETE] 모의 진단 완료: 취약점 ${vulnerableCount}건 발견 (Critical: ${criticalCount}, High: ${highCount})`,
      },
    ];

    steps.forEach((step, idx) => {
      setTimeout(() => {
        setScanProgress(step.pct);
        setScanLogs((prev) => [...prev, step.log]);
        if (idx === steps.length - 1) {
          setIsScanning(false);
        }
      }, (idx + 1) * 350);
    });
  };

  // Toggle patch on a specific CVE
  const handleTogglePatch = (cveId: string) => {
    setPatchedCves((prev) => {
      const next = new Set(prev);
      if (next.has(cveId)) next.delete(cveId);
      else next.add(cveId);
      return next;
    });
  };

  // Reset all patches
  const handleResetPatches = () => {
    setPatchedCves(new Set());
  };

  // Copy remediation command
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Copy full diagnosis report
  const handleCopyReport = () => {
    const report = `# 로컬 Ollama 환경 CVE 취약점 모의 진단 리포트
- 생성 일시: ${new Date().toISOString()}
- 타겟 버전: ${targetVersion}
- 호스트 바인딩: ${bindAddress}
- 종합 결과: 총 ${diagnosticResults.length}개 점검 중 취약 ${vulnerableCount}건, 방어 완료 ${securedCount}건 (Critical: ${criticalCount}건)

## 상세 취약점 점검 리스트
${diagnosticResults
  .map(
    (item) => `### [${item.isVulnerable ? 'VULNERABLE 🚨' : 'SECURED ✅'}] ${item.cveId} - ${item.name}
- 심각도: ${item.severity} (CVSS ${item.cvss}) | 분류: ${item.category}
- 공격 경로: ${item.attackVector}
- 조치 방안: ${item.remediationDesc}
\`\`\`bash
${item.remediationCommand}
\`\`\`
`
  )
  .join('\n')}
`;
    navigator.clipboard.writeText(report);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  // Filter items
  const filteredList = diagnosticResults.filter((item) => {
    if (activeFilter === 'vulnerable') return item.isVulnerable;
    if (activeFilter === 'secured') return !item.isVulnerable;
    if (activeFilter === 'critical') return item.severity === 'CRITICAL';
    return true;
  });

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
            <h3 className="text-base font-bold text-slate-900">
              로컬 Ollama 환경 CVE 취약점 모의 진단 시뮬레이터
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            지정한 Ollama 런타임 버전 및 네트워크 설정에 기반하여 원격 코드 실행(RCE), DoS, 경로 탐색 등 실제 CVE 취약점을 모의 스캔하고 완화 조치를 테스트합니다.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRunScan}
            disabled={isScanning}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? '진단 스캔 중...' : '모의 진단 실행'}</span>
          </button>
          <button
            onClick={handleCopyReport}
            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
            title="진단 리포트 클립보드 복사"
          >
            {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>리포트 복사</span>
          </button>
        </div>
      </div>

      {/* 2. Target Environment Controls Card */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3.5 text-xs">
        <div className="flex items-center justify-between font-bold text-slate-900">
          <span className="flex items-center gap-1.5">
            <Terminal className="w-4 h-4 text-slate-600" />
            <span>진단 대상 로컬 환경 파라미터 (Simulation Target Setup)</span>
          </span>
          {patchedCves.size > 0 && (
            <button
              onClick={handleResetPatches}
              className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>모의 패치 초기화 ({patchedCves.size}건)</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Target Version */}
          <div>
            <label className="block text-slate-600 font-medium mb-1">Ollama 런타임 버전</label>
            <select
              value={targetVersion}
              onChange={(e) => setTargetVersion(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-rose-500"
            >
              <option value="v0.1.32">v0.1.32 (초기 취약 - Probllama RCE 노출)</option>
              <option value="v0.1.33">v0.1.33 (패치 미흡 - 경로 탐색 취약)</option>
              <option value="v0.2.7">v0.2.7 (중기 - DoS 및 CORS 취약)</option>
              <option value="v0.3.14">v0.3.14 (안정화 빌드 - 메이저 패치)</option>
              <option value="v0.5.4">v0.5.4 (최신 릴리스 - 보안 강화)</option>
            </select>
          </div>

          {/* Host Binding */}
          <div>
            <label className="block text-slate-600 font-medium mb-1">호스트 네트워크 바인딩</label>
            <select
              value={bindAddress}
              onChange={(e) => setBindAddress(e.target.value as any)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-rose-500"
            >
              <option value="0.0.0.0">0.0.0.0:11434 (외부 공용 인터넷 노출)</option>
              <option value="127.0.0.1">127.0.0.1:11434 (로컬호스트 단독 격리)</option>
              <option value="proxy">Reverse Proxy + Bearer Auth 인증</option>
            </select>
          </div>

          {/* CORS Setting */}
          <div>
            <label className="block text-slate-600 font-medium mb-1">CORS 정책 (OLLAMA_ORIGINS)</label>
            <select
              value={corsSetting}
              onChange={(e) => setCorsSetting(e.target.value as any)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-rose-500"
            >
              <option value="wildcard">* (와일드카드 전체 허용 - 위험)</option>
              <option value="restricted">사내 특정 도메인 화이트리스트</option>
            </select>
          </div>

          {/* Container User */}
          <div>
            <label className="block text-slate-600 font-medium mb-1">컨테이너 실행 사용자 권한</label>
            <select
              value={containerUser}
              onChange={(e) => setContainerUser(e.target.value as any)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-slate-900 font-semibold focus:outline-none focus:ring-1 focus:ring-rose-500"
            >
              <option value="root">root (특권 계정 - Escape 위험)</option>
              <option value="non-root">non-root (UID 1000 격리)</option>
            </select>
          </div>

          {/* GGUF Checksum */}
          <div>
            <label className="block text-slate-600 font-medium mb-1">GGUF 다운로드 SHA256 검증</label>
            <button
              type="button"
              onClick={() => setGgufVerify(!ggufVerify)}
              className={`w-full py-1.5 px-2.5 rounded-lg border font-semibold text-center transition-colors ${
                ggufVerify
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {ggufVerify ? '✓ SHA256 검증 활성화' : '미검증 상태 (비활성)'}
            </button>
          </div>
        </div>
      </div>

      {/* 3. Live Terminal Audit Output (during scan) */}
      <div className="bg-slate-950 text-slate-200 p-3.5 rounded-xl font-mono text-xs border border-slate-800 space-y-1">
        <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1.5 border-b border-slate-800">
          <span className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isScanning ? 'bg-amber-400 animate-ping' : vulnerableCount > 0 ? 'bg-rose-500' : 'bg-emerald-500'
              }`}
            />
            <span>실시간 취약점 진단 콘솔</span>
          </span>
          <span>진행도: {scanProgress}%</span>
        </div>
        <div className="space-y-1 max-h-24 overflow-y-auto custom-scrollbar pt-1 text-[11.5px]">
          {scanLogs.map((log, i) => (
            <div
              key={i}
              className={
                log.includes('🚨') || log.includes('고위험')
                  ? 'text-rose-400'
                  : log.includes('⚠️')
                  ? 'text-amber-300'
                  : log.includes('✅')
                  ? 'text-emerald-400'
                  : 'text-slate-300'
              }
            >
              {log}
            </div>
          ))}
        </div>
      </div>

      {/* 4. Score Summary & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Verdict Badge */}
        <div className="flex items-center gap-2.5">
          <div
            className={`px-3 py-1.5 rounded-lg border font-bold text-xs flex items-center gap-2 ${
              criticalCount > 0
                ? 'bg-rose-100 border-rose-300 text-rose-900'
                : vulnerableCount > 0
                ? 'bg-amber-100 border-amber-300 text-amber-900'
                : 'bg-emerald-100 border-emerald-300 text-emerald-900'
            }`}
          >
            {criticalCount > 0 ? (
              <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : vulnerableCount > 0 ? (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span>
              {criticalCount > 0
                ? `CRITICAL RISK: 심각한 침해 취약점 ${criticalCount}건 노출!`
                : vulnerableCount > 0
                ? `WARNING: 부분 보안 취약점 ${vulnerableCount}건 발견`
                : 'HARDENED: 모든 CVE 취약점 안전하게 방어됨'}
            </span>
          </div>

          <span className="text-xs text-slate-500 font-mono">
            (취약 {vulnerableCount}건 / 조치 완료 {securedCount}건)
          </span>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs overflow-x-auto">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-2.5 py-1 font-semibold rounded transition-colors whitespace-nowrap ${
              activeFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            전체 ({diagnosticResults.length})
          </button>
          <button
            onClick={() => setActiveFilter('vulnerable')}
            className={`px-2.5 py-1 font-semibold rounded transition-colors whitespace-nowrap ${
              activeFilter === 'vulnerable'
                ? 'bg-rose-600 text-white'
                : 'text-rose-700 hover:bg-rose-50'
            }`}
          >
            취약 노출 ({vulnerableCount})
          </button>
          <button
            onClick={() => setActiveFilter('secured')}
            className={`px-2.5 py-1 font-semibold rounded transition-colors whitespace-nowrap ${
              activeFilter === 'secured'
                ? 'bg-emerald-700 text-white'
                : 'text-emerald-800 hover:bg-emerald-50'
            }`}
          >
            방어됨 ({securedCount})
          </button>
          <button
            onClick={() => setActiveFilter('critical')}
            className={`px-2.5 py-1 font-semibold rounded transition-colors whitespace-nowrap ${
              activeFilter === 'critical'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Critical 전용 ({diagnosticResults.filter((i) => i.severity === 'CRITICAL').length})
          </button>
        </div>
      </div>

      {/* 5. Vulnerability Cards List */}
      <div className="space-y-3">
        {filteredList.map((item) => {
          const isPatchedByUser = patchedCves.has(item.cveId);

          return (
            <div
              key={item.cveId}
              className={`p-4 rounded-xl border transition-all space-y-3 ${
                item.isVulnerable
                  ? item.severity === 'CRITICAL'
                    ? 'bg-rose-50/50 border-rose-300'
                    : 'bg-amber-50/40 border-amber-300'
                  : 'bg-slate-50/70 border-slate-200'
              }`}
            >
              {/* Top Row: CVE ID, Badges, Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-900 text-white">
                    {item.cveId}
                  </span>
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      item.severity === 'CRITICAL'
                        ? 'bg-rose-600 text-white'
                        : item.severity === 'HIGH'
                        ? 'bg-amber-500 text-slate-900'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    CVSS {item.cvss} ({item.severity})
                  </span>
                  <span className="text-[10px] font-semibold bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded font-mono">
                    {item.category}
                  </span>
                  <h4 className="text-xs font-bold text-slate-900">{item.name}</h4>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <span
                    className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded inline-flex items-center gap-1 ${
                      item.isVulnerable
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    {item.isVulnerable ? (
                      <>
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>VULNERABLE (취약)</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>SECURED (방어됨)</span>
                      </>
                    )}
                  </span>

                  {/* One-Click Mock Patch Button */}
                  <button
                    onClick={() => handleTogglePatch(item.cveId)}
                    className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded border transition-colors ${
                      isPatchedByUser
                        ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                        : 'bg-emerald-700 hover:bg-emerald-800 text-white border-transparent'
                    }`}
                    title="이 취약점의 완화 패치를 모의 적용하거나 해제"
                  >
                    <Wrench className="w-3 h-3" />
                    <span>{isPatchedByUser ? '모의 패치 취소' : '모의 패치 적용'}</span>
                  </button>
                </div>
              </div>

              {/* Technical Description & Exploit Mechanism */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white/90 border border-slate-200 rounded-lg space-y-1">
                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                    <span>공격 경로 및 메커니즘:</span>
                  </span>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-mono">
                    {item.attackVector}
                  </p>
                  <p className="text-[11px] text-slate-600 leading-relaxed pt-0.5">
                    {item.mechanism}
                  </p>
                </div>

                <div className="p-3 bg-white/90 border border-slate-200 rounded-lg space-y-1 flex flex-col justify-between">
                  <div>
                    <span className="font-semibold text-rose-800 flex items-center gap-1">
                      <span>침해 영향도 (Impact):</span>
                    </span>
                    <p className="text-[11px] text-slate-700 leading-relaxed">{item.impact}</p>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono pt-2 border-t border-slate-100 flex justify-between">
                    <span>영향 버전: {item.affectedVersions}</span>
                    <span className="text-emerald-700 font-bold">수정: {item.fixedIn}</span>
                  </div>
                </div>
              </div>

              {/* Remediation Snippet */}
              <div className="bg-slate-900 text-slate-100 p-2.5 rounded-lg font-mono text-[11px] flex items-center justify-between gap-2 overflow-x-auto border border-slate-800">
                <div className="space-y-0.5 overflow-hidden">
                  <div className="text-[10px] text-slate-400 font-sans">
                    💡 완화 조치: {item.remediationDesc}
                  </div>
                  <pre className="text-emerald-400 whitespace-pre-wrap">{item.remediationCommand}</pre>
                </div>
                <button
                  onClick={() => handleCopy(item.remediationCommand, item.cveId)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-[11px] shrink-0 transition-colors"
                  title="완화 명령어 복사"
                >
                  {copiedId === item.cveId ? (
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
          );
        })}
      </div>
    </div>
  );
};
