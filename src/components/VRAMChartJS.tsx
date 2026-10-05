import React, { useEffect, useRef, useState } from 'react';
import { Chart, ChartConfiguration } from 'chart.js/auto';
import { calculateVRAM } from '../utils/calculator';
import { BarChart2, Info, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

interface VRAMChartJSProps {
  currentModelParams: number;
  currentQuantBits: number;
  currentQuantName: string;
  contextWindow: number;
  kvPrecision: number;
  batchSize: number;
}

export const VRAMChartJS: React.FC<VRAMChartJSProps> = ({
  currentModelParams,
  currentQuantBits,
  currentQuantName,
  contextWindow,
  kvPrecision,
  batchSize,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  // View modes:
  // 'selected': Breakdown of the currently selected model/quant vs GPU VRAM thresholds
  // 'by-quant': Current model across all quantization levels with stacked weights vs KV
  // 'by-model': Models 3B ~ 70B compared across key quants
  const [viewMode, setViewMode] = useState<'selected' | 'by-quant' | 'by-model'>('selected');

  // Calculate current selected result for real-time telemetry badge
  const currentResult = calculateVRAM({
    modelParams: currentModelParams,
    quantBits: currentQuantBits,
    quantName: currentQuantName,
    contextWindow,
    kvPrecision,
    batchSize,
  });

  useEffect(() => {
    if (!canvasRef.current) return;

    // Destroy existing chart instance to prevent leaks and canvas overlap
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    let config: ChartConfiguration;

    if (viewMode === 'selected') {
      // MODE 1: Direct visualization of the selected model's components alongside GPU limits
      const labels = [
        '가중치 점유',
        'KV 캐시',
        'CUDA 런타임',
        `★ 총 필요 VRAM (${currentResult.totalVRAM}GB)`,
        'RTX 4060 (8G)',
        'RTX 3060 (12G)',
        'RTX 4080 (16G)',
        'RTX 3090/4090 (24G)',
        'Dual 3090 (48G)',
        'A100 (80G)',
      ];

      const dataValues = [
        currentResult.weightsVRAM,
        currentResult.kvCacheVRAM,
        currentResult.cudaContextVRAM,
        currentResult.totalVRAM,
        8,
        12,
        16,
        24,
        48,
        80,
      ];

      // Color coding: Components in slate/indigo, Total VRAM in emerald (or amber if >24G), GPU limits in muted outline
      const isOver24 = currentResult.totalVRAM > 24;
      const isOver48 = currentResult.totalVRAM > 48;
      const totalColor = isOver48
        ? 'rgba(225, 29, 72, 0.85)' // Rose
        : isOver24
        ? 'rgba(217, 119, 6, 0.85)' // Amber
        : 'rgba(5, 150, 105, 0.9)'; // Emerald

      const bgColors = [
        'rgba(30, 41, 59, 0.8)',   // Weights: Dark slate
        'rgba(99, 102, 241, 0.8)', // KV Cache: Indigo
        'rgba(148, 163, 184, 0.8)',// CUDA: Slate 400
        totalColor,                // Total VRAM
        'rgba(241, 245, 249, 0.9)',// 8G
        'rgba(241, 245, 249, 0.9)',// 12G
        'rgba(241, 245, 249, 0.9)',// 16G
        'rgba(236, 253, 245, 0.9)',// 24G (Golden Standard GPU)
        'rgba(241, 245, 249, 0.9)',// 48G
        'rgba(241, 245, 249, 0.9)',// 80G
      ];

      const borderColors = [
        'rgb(15, 23, 42)',
        'rgb(79, 70, 229)',
        'rgb(100, 116, 139)',
        totalColor.replace('0.9', '1').replace('0.85', '1'),
        'rgb(203, 213, 225)',
        'rgb(203, 213, 225)',
        'rgb(203, 213, 225)',
        'rgb(16, 185, 129)',
        'rgb(203, 213, 225)',
        'rgb(203, 213, 225)',
      ];

      config = {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'VRAM 용량 (GB)',
              data: dataValues,
              backgroundColor: bgColors,
              borderColor: borderColors,
              borderWidth: 1.5,
              borderRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            duration: 400,
          },
          plugins: {
            legend: {
              display: false,
            },
            tooltip: {
              backgroundColor: '#0f172a',
              titleFont: { family: 'Pretendard, system-ui, sans-serif', size: 12, weight: 'bold' },
              bodyFont: { family: 'Pretendard, system-ui, sans-serif', size: 11 },
              padding: 10,
              cornerRadius: 8,
              callbacks: {
                label: (context) => {
                  const val = context.raw as number;
                  const idx = context.dataIndex;
                  if (idx <= 2) return `구성 요소: ${val} GB`;
                  if (idx === 3) return `★ 현재 설정 총합: ${val} GB`;
                  return `하드웨어 한계: ${val} GB VRAM`;
                },
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: {
                font: { family: 'Pretendard, system-ui, sans-serif', size: 11, weight: 600 },
                color: (ctx) => (ctx.index === 3 ? '#047857' : ctx.index === 7 ? '#059669' : '#475569'),
              },
            },
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'VRAM 용량 (GB)',
                font: { size: 11, weight: 'bold' },
                color: '#64748b',
              },
              grid: { color: 'rgba(226, 232, 240, 0.7)' },
              ticks: {
                font: { size: 11 },
                color: '#64748b',
                callback: (val) => `${val} GB`,
              },
            },
          },
        },
      };
    } else if (viewMode === 'by-quant') {
      // MODE 2: Stacked view across all quantization formats for the currently selected model
      const quantList = [
        { name: 'FP16 (16b)', bits: 16.0 },
        { name: 'Q8_0 (8.5b)', bits: 8.5 },
        { name: 'Q6_K (6.5b)', bits: 6.56 },
        { name: 'Q5_K_M (5.5b)', bits: 5.5 },
        { name: 'Q4_K_M (4.8b)', bits: 4.8 },
        { name: 'Q4_0 (4.5b)', bits: 4.5 },
        { name: 'Q3_K_M (3.8b)', bits: 3.8 },
        { name: 'IQ3_M (3.6b)', bits: 3.65 },
        { name: 'IQ2_XXS (2.2b)', bits: 2.2 },
      ];

      // Mark the currently active quant level with [선택됨]
      const labels = quantList.map((q) => {
        const isCurrent = Math.abs(q.bits - currentQuantBits) < 0.15;
        return isCurrent ? `${q.name} [선택됨]` : q.name;
      });

      const weightsData: number[] = [];
      const kvData: number[] = [];
      const cudaData: number[] = [];

      quantList.forEach((q) => {
        const res = calculateVRAM({
          modelParams: currentModelParams,
          quantBits: q.bits,
          quantName: q.name,
          contextWindow,
          kvPrecision,
          batchSize,
        });
        weightsData.push(res.weightsVRAM);
        kvData.push(res.kvCacheVRAM);
        cudaData.push(res.cudaContextVRAM);
      });

      config = {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: '모델 가중치 VRAM (GB)',
              data: weightsData,
              backgroundColor: quantList.map((q) => {
                const isCurrent = Math.abs(q.bits - currentQuantBits) < 0.15;
                if (isCurrent) return 'rgba(5, 150, 105, 0.95)'; // Highlighted current
                if (q.bits === 4.8) return 'rgba(16, 185, 129, 0.6)';
                return 'rgba(51, 65, 85, 0.75)';
              }),
              borderColor: quantList.map((q) => {
                const isCurrent = Math.abs(q.bits - currentQuantBits) < 0.15;
                return isCurrent ? 'rgb(4, 120, 87)' : 'rgb(30, 41, 59)';
              }),
              borderWidth: quantList.map((q) => (Math.abs(q.bits - currentQuantBits) < 0.15 ? 2.5 : 1)),
              borderRadius: 4,
              stack: 'stack0',
            },
            {
              label: 'KV 캐시 점유 (GB)',
              data: kvData,
              backgroundColor: 'rgba(99, 102, 241, 0.8)',
              borderColor: 'rgb(79, 70, 229)',
              borderWidth: 1,
              borderRadius: 4,
              stack: 'stack0',
            },
            {
              label: 'CUDA 런타임 & 버퍼 (GB)',
              data: cudaData,
              backgroundColor: 'rgba(203, 213, 225, 0.85)',
              borderColor: 'rgb(148, 163, 184)',
              borderWidth: 1,
              borderRadius: 4,
              stack: 'stack0',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 400 },
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: {
              position: 'top',
              labels: {
                boxWidth: 12,
                font: { family: 'Pretendard, system-ui, sans-serif', size: 11, weight: 600 },
                color: '#334155',
              },
            },
            tooltip: {
              backgroundColor: '#0f172a',
              titleFont: { family: 'Pretendard, system-ui, sans-serif', size: 12, weight: 'bold' },
              bodyFont: { family: 'Pretendard, system-ui, sans-serif', size: 11 },
              padding: 10,
              cornerRadius: 8,
              callbacks: {
                afterBody: (context) => {
                  const total = context.reduce((acc, curr) => acc + (curr.raw as number), 0);
                  let gpuNote = '24GB GPU 수용 가능';
                  if (total > 48) gpuNote = 'A100 / H100 80GB 필요';
                  else if (total > 24) gpuNote = 'Dual 3090(48GB) 또는 부분 오프로딩';
                  else if (total <= 12) gpuNote = 'RTX 3060/4070 12GB 완벽 구동';
                  else if (total <= 16) gpuNote = 'RTX 4070Ti/4080 16GB 완벽 구동';
                  return `\n총 VRAM 합계: ${total.toFixed(2)} GB (${gpuNote})`;
                },
              },
            },
          },
          scales: {
            x: {
              stacked: true,
              grid: { display: false },
              ticks: {
                font: { family: 'Pretendard, system-ui, sans-serif', size: 11 },
                color: (ctx) => {
                  const label = ctx.chart.data.labels?.[ctx.index] as string;
                  return label && label.includes('[선택됨]') ? '#047857' : '#475569';
                },
              },
            },
            y: {
              stacked: true,
              beginAtZero: true,
              title: {
                display: true,
                text: '총 VRAM 점유량 (GB)',
                font: { size: 11, weight: 'bold' },
                color: '#64748b',
              },
              grid: { color: 'rgba(226, 232, 240, 0.7)' },
              ticks: {
                font: { size: 11 },
                color: '#64748b',
                callback: (val) => `${val} GB`,
              },
            },
          },
        },
      };
    } else {
      // MODE 3: Comparison across model parameter scales (3B, 8B, 14B, 32B, 70B)
      const models = [3, 8, 14, 32, 70];
      const modelLabels = models.map((m) => (m === currentModelParams ? `${m}B [선택]` : `${m}B 모델`));

      const quantsToCompare = [
        { name: 'FP16 (16-bit)', bits: 16.0, color: 'rgba(239, 68, 68, 0.75)', border: 'rgb(220, 38, 38)' },
        { name: 'Q8_0 (8-bit)', bits: 8.5, color: 'rgba(245, 158, 11, 0.75)', border: 'rgb(217, 119, 6)' },
        { name: 'Q4_K_M (4-bit 권장)', bits: 4.8, color: 'rgba(5, 150, 105, 0.85)', border: 'rgb(4, 120, 87)' },
        { name: 'Q3_K_M (3-bit)', bits: 3.8, color: 'rgba(59, 130, 246, 0.75)', border: 'rgb(37, 99, 235)' },
      ];

      const datasets = quantsToCompare.map((qc) => {
        const data = models.map((m) => {
          const res = calculateVRAM({
            modelParams: m,
            quantBits: qc.bits,
            quantName: qc.name,
            contextWindow,
            kvPrecision,
            batchSize,
          });
          return res.totalVRAM;
        });

        return {
          label: qc.name,
          data,
          backgroundColor: qc.color,
          borderColor: qc.border,
          borderWidth: 1.5,
          borderRadius: 4,
        };
      });

      config = {
        type: 'bar',
        data: {
          labels: modelLabels,
          datasets,
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 400 },
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: {
              position: 'top',
              labels: {
                boxWidth: 12,
                font: { family: 'Pretendard, system-ui, sans-serif', size: 11, weight: 600 },
                color: '#334155',
              },
            },
            tooltip: {
              backgroundColor: '#0f172a',
              titleFont: { family: 'Pretendard, system-ui, sans-serif', size: 12, weight: 'bold' },
              bodyFont: { family: 'Pretendard, system-ui, sans-serif', size: 11 },
              padding: 10,
              cornerRadius: 8,
              callbacks: {
                label: (context) => ` ${context.dataset.label}: ${context.raw} GB`,
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: {
                font: { family: 'Pretendard, system-ui, sans-serif', size: 11, weight: 600 },
                color: (ctx) => {
                  const label = ctx.chart.data.labels?.[ctx.index] as string;
                  return label && label.includes('[선택]') ? '#047857' : '#475569';
                },
              },
            },
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: '총 필요 VRAM (GB)',
                font: { size: 11, weight: 'bold' },
                color: '#64748b',
              },
              grid: { color: 'rgba(226, 232, 240, 0.7)' },
              ticks: {
                font: { size: 11 },
                color: '#64748b',
                callback: (val) => `${val} GB`,
              },
            },
          },
        },
      };
    }

    const newChart = new Chart(ctx, config);
    chartInstanceRef.current = newChart;

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [
    viewMode,
    currentModelParams,
    currentQuantBits,
    currentQuantName,
    contextWindow,
    kvPrecision,
    batchSize,
    currentResult.totalVRAM,
    currentResult.weightsVRAM,
    currentResult.kvCacheVRAM,
    currentResult.cudaContextVRAM,
  ]);

  const canRunFullOn24G = currentResult.totalVRAM <= 24;
  const canRunFullOn16G = currentResult.totalVRAM <= 16;
  const canRunFullOn12G = currentResult.totalVRAM <= 12;

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">
              📊 Chart.js 실시간 VRAM 점유 동적 막대 차트
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            선택된 모델(<strong className="text-slate-800">{currentModelParams}B</strong>) 및 양자화(
            <strong className="text-emerald-700">{currentQuantName}</strong>) 설정에 따른 실시간 VRAM 계산 시각화
          </p>
        </div>

        {/* View Mode Buttons */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
          <button
            onClick={() => setViewMode('selected')}
            className={`px-3 py-1 font-semibold rounded transition-colors ${
              viewMode === 'selected'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            선택 구성 상세 vs GPU 한계
          </button>
          <button
            onClick={() => setViewMode('by-quant')}
            className={`px-3 py-1 font-semibold rounded transition-colors ${
              viewMode === 'by-quant'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            양자화별 스택 ({currentModelParams}B)
          </button>
          <button
            onClick={() => setViewMode('by-model')}
            className={`px-3 py-1 font-semibold rounded transition-colors ${
              viewMode === 'by-model'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            모델 크기별 비교 (3B ~ 70B)
          </button>
        </div>
      </div>

      {/* Real-time Status Telemetry Bar */}
      <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">현재 계산 결과:</span>
            <span className="font-mono font-bold text-slate-900 text-sm tabular-nums">
              {currentResult.totalVRAM} GB
            </span>
          </div>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-2 text-[11px] text-slate-600">
            <span>가중치: <strong className="font-mono text-slate-800">{currentResult.weightsVRAM}GB</strong></span>
            <span>·</span>
            <span>KV 캐시: <strong className="font-mono text-indigo-700">{currentResult.kvCacheVRAM}GB</strong></span>
            <span>·</span>
            <span>CUDA: <strong className="font-mono text-slate-500">{currentResult.cudaContextVRAM}GB</strong></span>
          </div>
        </div>

        {/* Real-time Verdict */}
        <div className="flex items-center gap-1.5">
          {canRunFullOn12G ? (
            <span className="flex items-center gap-1 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded font-semibold text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              RTX 3060/4070 (12GB) 적재 가능
            </span>
          ) : canRunFullOn16G ? (
            <span className="flex items-center gap-1 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded font-semibold text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              RTX 4070Ti/4080 (16GB) 적재 가능
            </span>
          ) : canRunFullOn24G ? (
            <span className="flex items-center gap-1 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded font-semibold text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              RTX 3090/4090 (24GB) 100% VRAM 상주
            </span>
          ) : currentResult.totalVRAM <= 48 ? (
            <span className="flex items-center gap-1 px-2.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded font-semibold text-[11px]">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              Dual GPU (48GB) 또는 부분 오프로딩 필요
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2.5 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 rounded font-semibold text-[11px]">
              <XCircle className="w-3.5 h-3.5 text-rose-600" />
              A100/H100 (80GB) 데이터센터 필요
            </span>
          )}
        </div>
      </div>

      {/* Canvas Container */}
      <div className="mt-4 relative w-full h-80 sm:h-96">
        <canvas ref={canvasRef} />
      </div>

      {/* Explanatory Footer */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-2">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>
            컨텍스트: <strong className="font-mono text-slate-700">{contextWindow.toLocaleString()} 토큰</strong>{' '}
            | KV 양자화: <strong className="font-mono text-emerald-700">{kvPrecision === 16 ? 'FP16' : kvPrecision === 8 ? 'q8_0' : 'q4_0'}</strong>
          </span>
        </div>
        <div className="text-[11px] text-emerald-800 font-medium">
          💡 슬라이더 및 셀렉트 조작 시 Chart.js 막대와 하드웨어 적합성이 실시간 재연산됩니다.
        </div>
      </div>
    </div>
  );
};
