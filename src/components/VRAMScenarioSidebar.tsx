import React, { useState } from 'react';
import { VRAMScenario, VRAMCalcInputs, VRAMCalcResult } from '../types';
import {
  Download,
  Upload,
  Plus,
  Trash2,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Copy,
  Check,
  FileJson,
  Layers,
  ArrowRight,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

interface VRAMScenarioSidebarProps {
  scenarios: VRAMScenario[];
  currentInputs: VRAMCalcInputs;
  currentResult: VRAMCalcResult;
  onSaveScenario: (name: string, notes?: string) => void;
  onDeleteScenario: (id: string) => void;
  onLoadScenario: (scenario: VRAMScenario) => void;
  onClearAllScenarios: () => void;
  onImportScenarios: (imported: VRAMScenario[]) => void;
}

export const VRAMScenarioSidebar: React.FC<VRAMScenarioSidebarProps> = ({
  scenarios,
  currentInputs,
  currentResult,
  onSaveScenario,
  onDeleteScenario,
  onLoadScenario,
  onClearAllScenarios,
  onImportScenarios,
}) => {
  const [newScenarioName, setNewScenarioName] = useState<string>('');
  const [newScenarioNotes, setNewScenarioNotes] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  // Auto-generate suggested scenario name based on current settings
  const suggestedName = `${currentInputs.modelParams}B @ ${currentInputs.quantName} (${(
    currentInputs.contextWindow / 1024
  ).toFixed(0)}K Ctx)`;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = newScenarioName.trim() || suggestedName;
    onSaveScenario(finalName, newScenarioNotes.trim());
    setNewScenarioName('');
    setNewScenarioNotes('');
    setShowAddForm(false);
  };

  // Export scenarios as JSON file download
  const handleDownloadJSON = () => {
    const exportData = {
      app: 'Ollama Architecture & Local LLM Ops Dashboard',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      scenarioCount: scenarios.length,
      scenarios: scenarios,
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    link.download = `ollama-vram-scenarios-${dateStr}.json`;
    link.click();
    URL.revokeObjectURL(url);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2500);
  };

  // Copy JSON to clipboard
  const handleCopyJSON = () => {
    const exportData = {
      app: 'Ollama Architecture & Local LLM Ops Dashboard',
      exportedAt: new Date().toISOString(),
      scenarioCount: scenarios.length,
      scenarios: scenarios,
    };
    navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  // Import JSON file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed.scenarios)) {
          onImportScenarios(parsed.scenarios);
        } else if (Array.isArray(parsed)) {
          onImportScenarios(parsed);
        }
      } catch (err) {
        console.error('JSON 파싱 실패:', err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/60 rounded-t-xl">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-900">
            저장된 VRAM 시나리오 비교 ({scenarios.length}개)
          </h3>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition-colors whitespace-nowrap"
            title="현재 계산기 설정을 시나리오로 추가"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>현재 설정 저장</span>
          </button>

          <button
            onClick={handleDownloadJSON}
            disabled={scenarios.length === 0}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg transition-colors whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
            title="저장된 시나리오를 JSON 파일로 다운로드"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>JSON 다운로드</span>
          </button>

          <label
            className="flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            title="JSON 파일에서 시나리오 불러오기"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-600" />
            <span>불러오기</span>
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Download Alert Toast */}
      {downloadSuccess && (
        <div className="mx-4 mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>시나리오 데이터가 JSON 파일로 다운로드되었습니다.</span>
          </span>
          <button
            onClick={handleCopyJSON}
            className="text-[11px] underline text-emerald-700 hover:text-emerald-900"
          >
            {copiedJson ? '복사 완료' : '클립보드 복사'}
          </button>
        </div>
      )}

      {/* Inline Add Scenario Form */}
      {showAddForm && (
        <form
          onSubmit={handleSave}
          className="m-4 p-3.5 bg-slate-50 border border-slate-300 rounded-lg space-y-2.5 text-xs animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between font-semibold text-slate-800">
            <span>새 시나리오 저장</span>
            <span className="font-mono text-emerald-700">현재 계산: {currentResult.totalVRAM} GB</span>
          </div>

          <div>
            <label className="block text-[11px] text-slate-600 mb-0.5">시나리오 이름</label>
            <input
              type="text"
              value={newScenarioName}
              placeholder={suggestedName}
              onChange={(e) => setNewScenarioName(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-900 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-600 text-xs"
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-600 mb-0.5">운영 메모 (선택사항)</label>
            <input
              type="text"
              value={newScenarioNotes}
              placeholder="예: 24GB VRAM 타겟 RAG 챗봇 모델"
              onChange={(e) => setNewScenarioNotes(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-600 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 text-slate-600 rounded text-xs"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded text-xs"
            >
              저장 완료
            </button>
          </div>
        </form>
      )}

      {/* Scenario List */}
      <div className="p-4 space-y-3 flex-1 overflow-y-auto custom-scrollbar max-h-[480px]">
        {scenarios.length === 0 ? (
          <div className="text-center py-8 text-slate-400 space-y-2">
            <FileJson className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-xs">저장된 VRAM 시나리오가 없습니다.</p>
            <p className="text-[11px] text-slate-400">
              상단의 <strong>'현재 설정 저장'</strong> 버튼을 눌러 다양한 모델 및 양자화 구성을 저장하고
              비교해 보세요.
            </p>
          </div>
        ) : (
          scenarios.map((sc) => {
            const isFull24 = sc.result.totalVRAM <= 24;
            const isFull16 = sc.result.totalVRAM <= 16;
            const isFull12 = sc.result.totalVRAM <= 12;
            const isOOM24 = sc.result.totalVRAM > 24;

            // Delta from current active calculation
            const delta = Number((sc.result.totalVRAM - currentResult.totalVRAM).toFixed(2));

            return (
              <div
                key={sc.id}
                className="p-3 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-lg space-y-2 transition-all text-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs leading-snug">{sc.name}</h4>
                    <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-1.5 font-mono">
                      <span>{sc.inputs.modelParams}B</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-emerald-700 font-semibold">{sc.inputs.quantName}</span>
                      <span aria-hidden="true">·</span>
                      <span>{(sc.inputs.contextWindow / 1024).toFixed(0)}K Ctx</span>
                      <span aria-hidden="true">·</span>
                      <span>KV {sc.inputs.kvPrecision === 16 ? 'FP16' : `q${sc.inputs.kvPrecision}_0`}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onLoadScenario(sc)}
                      className="flex items-center gap-1 px-2 py-0.5 bg-white hover:bg-emerald-50 border border-slate-300 hover:border-emerald-400 rounded text-slate-700 hover:text-emerald-800 text-[11px] font-medium transition-colors"
                      title="이 시나리오를 계산기에 즉시 적용"
                    >
                      <RotateCcw className="w-3 h-3 text-emerald-600" />
                      <span>적용</span>
                    </button>
                    <button
                      onClick={() => onDeleteScenario(sc.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                      title="시나리오 삭제"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {sc.notes && (
                  <p className="text-[11px] text-slate-600 bg-white/80 px-2 py-1 rounded border border-slate-100">
                    {sc.notes}
                  </p>
                )}

                {/* VRAM Telemetry & Hardware Fit */}
                <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 text-sm tabular-nums">
                      {sc.result.totalVRAM} GB
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      (가중치 {sc.result.weightsVRAM}G · KV {sc.result.kvCacheVRAM}G)
                    </span>
                    {delta !== 0 && (
                      <span
                        className={`text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded ${
                          delta > 0
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {delta > 0 ? `+${delta} GB` : `${delta} GB`}
                      </span>
                    )}
                  </div>

                  <div>
                    {isFull12 ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        12GB 적재
                      </span>
                    ) : isFull16 ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        16GB 적재
                      </span>
                    ) : isFull24 ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        24GB (3090/4090) 적재
                      </span>
                    ) : sc.result.totalVRAM <= 48 ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        Dual 3090 (48G)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-800 bg-rose-100 px-2 py-0.5 rounded">
                        <XCircle className="w-3 h-3 text-rose-600" />
                        A100 (80G) 필요
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Summary / Clear All */}
      {scenarios.length > 0 && (
        <div className="p-3 border-t border-slate-200 bg-slate-50/60 rounded-b-xl flex items-center justify-between text-[11px] text-slate-500">
          <span>총 {scenarios.length}개 시나리오 보관 중</span>
          <button
            onClick={onClearAllScenarios}
            className="text-rose-600 hover:text-rose-800 hover:underline"
          >
            모두 비우기
          </button>
        </div>
      )}
    </div>
  );
};
