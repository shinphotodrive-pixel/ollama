import React from 'react';
import { TabId } from '../types';
import { ShieldAlert, Zap, Scale, ChevronRight } from 'lucide-react';

interface QuickBannerProps {
  onSelectTab: (tab: TabId) => void;
}

export const QuickBanner: React.FC<QuickBannerProps> = ({ onSelectTab }) => {
  return (
    <div className="bg-slate-50 border-b border-slate-200 py-2.5 px-4 sm:px-6 lg:px-8 text-xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
        <div className="flex items-center gap-2 text-slate-500 font-medium shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
          <span>운영 핵심 가이드라인</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs">
          <button
            onClick={() => onSelectTab('sec')}
            className="group flex items-center gap-1.5 text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded transition-colors"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
            <span>CVE-2026-7482 GGUF 메타데이터 검증</span>
            <ChevronRight className="w-3 h-3 text-amber-500 group-hover:translate-x-0.5 transition-transform" />
          </button>

          <button
            onClick={() => onSelectTab('gguf')}
            className="group flex items-center gap-1.5 text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded transition-colors"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-700" />
            <span>추천 PTQ: Q4_K_M (어텐션 6bit 혼합)</span>
            <ChevronRight className="w-3 h-3 text-emerald-500 group-hover:translate-x-0.5 transition-transform" />
          </button>

          <button
            onClick={() => onSelectTab('sec')}
            className="group flex items-center gap-1.5 text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1 rounded transition-colors"
          >
            <Scale className="w-3.5 h-3.5 text-indigo-700" />
            <span>Llama 3.1: 7억 MAU &amp; 지식 증류 조항</span>
            <ChevronRight className="w-3 h-3 text-indigo-500 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};
