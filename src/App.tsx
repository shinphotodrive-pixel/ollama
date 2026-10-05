import React, { useState } from 'react';
import { TabId } from './types';
import { Navbar } from './components/Navbar';
import { QuickBanner } from './components/QuickBanner';
import { TabArchitecture } from './components/TabArchitecture';
import { TabQuantization } from './components/TabQuantization';
import { TabOptimization } from './components/TabOptimization';
import { TabDeployment } from './components/TabDeployment';
import { TabSecurity } from './components/TabSecurity';
import { QuickCLIModal } from './components/QuickCLIModal';
import { ExportModal } from './components/ExportModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('arch');
  const [isCLIModalOpen, setIsCLIModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-[#faf8f5] text-slate-800 flex flex-col font-sans antialiased selection:bg-emerald-100 selection:text-emerald-900">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenQuickCLI={() => setIsCLIModalOpen(true)}
        onExportConfig={() => setIsExportModalOpen(true)}
      />

      {/* Operational Highlights Notice Bar */}
      <QuickBanner onSelectTab={setActiveTab} />

      {/* Main Content Viewport */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {activeTab === 'arch' && <TabArchitecture />}
        {activeTab === 'gguf' && <TabQuantization />}
        {activeTab === 'opt' && <TabOptimization />}
        {activeTab === 'rag' && <TabDeployment />}
        {activeTab === 'sec' && <TabSecurity />}
      </main>

      {/* Clean Uncluttered Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Ollama Ops &amp; Architecture Dashboard</span>
            <span aria-hidden="true">·</span>
            <span>엔터프라이즈 로컬 LLM 엔지니어링 가이드</span>
          </div>

          <div className="flex items-center gap-4 text-slate-500">
            <span>엔진: llama.cpp</span>
            <span aria-hidden="true">·</span>
            <span>GGUF v3 Specification</span>
            <span aria-hidden="true">·</span>
            <span>CUDA / Metal / ROCm 가속</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <QuickCLIModal isOpen={isCLIModalOpen} onClose={() => setIsCLIModalOpen(false)} />
      <ExportModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} />
    </div>
  );
}
