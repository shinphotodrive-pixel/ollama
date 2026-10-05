import React from 'react';
import { TabId } from '../types';
import { Cpu, Layers, Zap, Container, ShieldAlert, Download, Terminal } from 'lucide-react';

interface NavbarProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  onOpenQuickCLI: () => void;
  onExportConfig: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  onOpenQuickCLI,
  onExportConfig,
}) => {
  const tabs = [
    { id: 'arch' as TabId, label: '코어 아키텍처 & Modelfile', icon: Cpu },
    { id: 'gguf' as TabId, label: 'GGUF 양자화 & VRAM 계산기', icon: Layers },
    { id: 'opt' as TabId, label: '추론 최적화 & 에이전트', icon: Zap },
    { id: 'rag' as TabId, label: 'RAG & Docker 배포', icon: Container },
    { id: 'sec' as TabId, label: '보안(CVE) & 라이선스 진단', icon: ShieldAlert },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Bar Zone Contract: Zone 1 (Wordmark) - Zone 2 (Nav links/tabs) - Zone 3 (Actions) */}
        <div className="flex items-center justify-between h-16">
          {/* Zone 1: Single text wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 ring-4 ring-emerald-100" />
            <span className="text-lg font-bold text-slate-900 tracking-tight">
              Ollama 아키텍처 &amp; LLM 운영 대시보드
            </span>
          </div>

          {/* Zone 2: Navigation Links / Tabs */}
          <nav className="hidden lg:flex items-center gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectTab(tab.id)}
                  className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-slate-100 text-emerald-800'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenQuickCLI}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
              title="Ollama 핵심 CLI 및 REST API 빠른 확인"
            >
              <Terminal className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">빠른 CLI</span>
            </button>
            <button
              onClick={onExportConfig}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap"
              title="현재 설정 번들(Modelfile + Docker Compose) 내보내기"
            >
              <Download className="w-3.5 h-3.5" />
              <span>설정 내보내기</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex lg:hidden overflow-x-auto py-2 border-t border-slate-100 gap-1 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-800 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-700' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
