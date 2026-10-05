import React, { useState } from 'react';
import { X, Copy, Check, Terminal, Play } from 'lucide-react';

interface QuickCLIModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickCLIModal: React.FC<QuickCLIModalProps> = ({ isOpen, onClose }) => {
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyCommand = (cmd: string, id: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 1800);
  };

  const cliCategories = [
    {
      category: '1. 모델 관리 & 검사',
      items: [
        { id: 'c1', label: '모델 풀링 (Q4_K_M)', cmd: 'ollama pull llama3.2:8b-instruct-q4_K_M' },
        { id: 'c2', label: '현재 VRAM 상주 모델 및 잔여 TTL 확인', cmd: 'ollama ps' },
        { id: 'c3', label: '다운로드된 로컬 모델 목록', cmd: 'ollama list' },
        { id: 'c4', label: '모델 메타데이터 및 템플릿 확인', cmd: 'ollama show --modelfile llama3.2:8b' },
      ],
    },
    {
      category: '2. 데몬 실행 & 원격 바인딩',
      items: [
        { id: 'c5', label: '로컬 전용 바인딩 백그라운드 구동', cmd: 'OLLAMA_HOST=127.0.0.1:11434 ollama serve' },
        { id: 'c6', label: 'KV 캐시 8비트 절감 옵션 적용', cmd: 'OLLAMA_KV_CACHE_TYPE=q8_0 ollama serve' },
        { id: 'c7', label: '다중 GPU 레이어 순차 분할 활성화', cmd: 'OLLAMA_SCHED_SPREAD=1 ollama serve' },
      ],
    },
    {
      category: '3. REST API 상태 점검 (cURL)',
      items: [
        { id: 'c8', label: '엔드포인트 헬스체크', cmd: 'curl -s http://localhost:11434/api/tags | jq .' },
        { id: 'c9', label: '현재 VRAM 할당량 정밀 조회', cmd: 'curl -s http://localhost:11434/api/ps | jq \'.models[] | {name, size_vram}\'' },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Ollama 필수 터미널 CLI &amp; API 치트북</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
          {cliCategories.map((group, idx) => (
            <div key={idx} className="space-y-2">
              <span className="font-bold text-slate-700">{group.category}</span>
              <div className="space-y-1.5">
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-3 font-mono"
                  >
                    <div className="overflow-hidden">
                      <div className="text-[10px] text-slate-500 font-sans mb-0.5">{item.label}</div>
                      <div className="text-slate-800 text-[11px] truncate select-all">{item.cmd}</div>
                    </div>
                    <button
                      onClick={() => copyCommand(item.cmd, item.id)}
                      className="shrink-0 flex items-center gap-1 px-2 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded text-slate-700 text-[11px] transition-colors"
                    >
                      {copiedCmd === item.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-700">완료</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-500" />
                          <span>복사</span>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
