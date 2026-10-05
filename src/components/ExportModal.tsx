import React, { useState } from 'react';
import { X, Download, Copy, Check, FileCode, CheckCircle2 } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const bundleModelfile = `FROM llama3.2:8b-instruct-q4_K_M

PARAMETER num_ctx 32768
PARAMETER temperature 0.2
PARAMETER top_p 0.9
PARAMETER stop "<|eot_id|>"

SYSTEM """당신은 엔터프라이즈 인프라 및 보안 아키텍처 전문 시니어 엔지니어입니다."""
`;

  const bundleDocker = `version: '3.8'

services:
  ollama:
    image: ollama/ollama:latest
    container_name: ollama-production
    restart: unless-stopped
    environment:
      - OLLAMA_HOST=0.0.0.0:11434
      - OLLAMA_NUM_PARALLEL=4
      - OLLAMA_MAX_LOADED_MODELS=1
      - OLLAMA_KEEP_ALIVE=5m
      - OLLAMA_KV_CACHE_TYPE=q8_0
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
    volumes:
      - ollama_models:/root/.ollama
    security_opt:
      - no-new-privileges:true

  open-webui:
    image: ghcr.io/open-webui/open-webui:main
    container_name: open-webui
    restart: unless-stopped
    environment:
      - OLLAMA_BASE_URL=http://ollama:11434
      - WEBUI_AUTH=true
    ports:
      - "3000:8080"
    depends_on:
      - ollama

volumes:
  ollama_models:
`;

  const bundleNginx = `events { worker_connections 1024; }

http {
  server {
    listen 80;
    server_name localhost;

    location / {
      # Bearer Token 인증 검증 (CVE-2026-42248 방어)
      if ($http_authorization != "Bearer YOUR_SECRET_ENTERPRISE_KEY") {
        return 401 '{"error": "Unauthorized Access"}';
      }
      proxy_pass http://ollama:11434;
      proxy_set_header Host $host;
      proxy_buffering off;
    }
  }
}
`;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleDownloadAll = () => {
    const fullArchiveText = `=== Modelfile ===\n${bundleModelfile}\n\n=== docker-compose.yml ===\n${bundleDocker}\n\n=== nginx.conf ===\n${bundleNginx}`;
    const blob = new Blob([fullArchiveText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ollama-enterprise-bundle.txt';
    link.click();
    URL.revokeObjectURL(url);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">엔터프라이즈 배포 설정 번들 내보내기</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
          <p className="text-slate-600">
            프로덕션 환경 배포에 즉시 사용할 수 있는 Modelfile, Docker Compose 및 Nginx 인증 보안 리버스 프록시 설정 일체입니다.
          </p>

          {/* Modelfile preview */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-3 py-1.5 bg-slate-100 border-b border-slate-200 flex justify-between items-center font-mono">
              <span className="font-bold text-slate-700">1. Modelfile</span>
              <button
                onClick={() => handleCopy(bundleModelfile, 'mfile')}
                className="text-[11px] text-slate-600 hover:text-slate-900 flex items-center gap-1"
              >
                {copiedKey === 'mfile' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === 'mfile' ? '복사됨' : '복사'}</span>
              </button>
            </div>
            <pre className="p-3 bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto max-h-32">
              {bundleModelfile}
            </pre>
          </div>

          {/* docker-compose preview */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-3 py-1.5 bg-slate-100 border-b border-slate-200 flex justify-between items-center font-mono">
              <span className="font-bold text-slate-700">2. docker-compose.yml</span>
              <button
                onClick={() => handleCopy(bundleDocker, 'dcompose')}
                className="text-[11px] text-slate-600 hover:text-slate-900 flex items-center gap-1"
              >
                {copiedKey === 'dcompose' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === 'dcompose' ? '복사됨' : '복사'}</span>
              </button>
            </div>
            <pre className="p-3 bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto max-h-36">
              {bundleDocker}
            </pre>
          </div>

          {/* nginx.conf preview */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-3 py-1.5 bg-slate-100 border-b border-slate-200 flex justify-between items-center font-mono">
              <span className="font-bold text-slate-700">3. nginx.conf (인증 리버스 프록시)</span>
              <button
                onClick={() => handleCopy(bundleNginx, 'nginx')}
                className="text-[11px] text-slate-600 hover:text-slate-900 flex items-center gap-1"
              >
                {copiedKey === 'nginx' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === 'nginx' ? '복사됨' : '복사'}</span>
              </button>
            </div>
            <pre className="p-3 bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto max-h-28">
              {bundleNginx}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            {downloadSuccess && (
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 번들 파일이 다운로드되었습니다.
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
            >
              닫기
            </button>
            <button
              onClick={handleDownloadAll}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>전체 번들 다운로드 (.txt)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
