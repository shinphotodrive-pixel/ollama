import React, { useEffect, useRef, useState } from 'react';
import { Chart, ChartConfiguration } from 'chart.js/auto';
import { calculateVRAM } from '../utils/calculator';
import { VRAMCalcResult } from '../types';
import { BarChart3, CheckCircle2, AlertTriangle, XCircle, Info, Sparkles } from 'lucide-react';

interface VRAMLiveChartProps {
  modelParams: number;
  quantBits: number;
  quantName: string;
  contextWindow: number;
  kvPrecision: number;
  batchSize: number;
  vramResult: VRAMCalcResult;
}

export const VRAMLiveChart: React.FC<VRAMLiveChartProps> = ({
  modelParams,
  quantBits,
  quantName,
  contextWindow,
  kvPrecision,
  batchSize,
  vramResult,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  // Chart view modes
  // 'breakdown': Component breakdown (Weights, KV, CUDA, Total) vs GPU VRAM Limits
  // 'gpu-occupancy': VRAM occupancy % across 6 major GPUs (with Over-capacity alert)
  // 'all-quants': All 9 quantization levels for current model
  const [chartMode, setChartMode] = useState<'breakdown' | 'gpu-occupancy' | 'all-quants'>('breakdown');

  useEffect(() => {
    if (!canvasRef.current) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    let config: ChartConfiguration;

    if (chartMode === 'breakdown') {
      // Breakdown & GPU comparison
      const labels = [
        '가중치 점유',
        'KV 캐시',
        'CUDA 버퍼',
        `★ 총 필요 VRAM (${vramResult.totalVRAM}G)`,
        'RTX 4060 (8G)',
        'RTX 3060 (12G)',
        'RTX 4080 (16G)',
        'RTX 4090 (24G)',
        'Dual 3090 (48G)',
        'A100 (80G)',
      ];

      const data = [
        vramResult.weightsVRAM,
        vramResult.kvCacheVRAM,
        vramResult.cudaContextVRAM,
        vramResult.totalVRAM,
        8,
        12,
        16,
        24,
        48,
        80,
      ];

      const isOver24 = vramResult.totalVRAM > 24;
      const isOver48 = vramResult.totalVRAM > 48;
      const totalColor = isOver48
        ? 'rgba(225, 29, 72, 0.9)'
        : isOver24
        ? 'rgba(217, 119, 6, 0.9)'
        : 'rgba(5, 150, 105, 0.95)';

      const bgColors = [
        'rgba(30, 41, 59, 0.85)',
        'rgba(79, 70, 229, 0.85)',
        'rgba(148, 163, 184, 0.85)',
        totalColor,
        'rgba(241, 245, 249, 0.85)',
        'rgba(241, 245, 249, 0.85)',
        'rgba(241, 245, 249, 0.85)',
        'rgba(236, 253, 245, 0.9)',
        'rgba(241, 245, 249, 0.85)',
        'rgba(241, 245, 249, 0.85)',
      ];

      const borderColors = [
        'rgb(15, 23, 42)',
        'rgb(67, 56, 202)',
        'rgb(100, 116, 139)',
        totalColor.replace('0.95', '1').replace('0.9', '1'),
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
              data,
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
          animation: { duration: 350 },
          plugins: {
            legend: { display: false },
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
                  if (idx === 3) return `★ 현재 설정 총합: ${val} GB VRAM`;
                  return `GPU 스펙: ${val} GB VRAM`;
                },
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: {
                font: { family: 'Pretendard, system-ui, sans-serif', size: 10.5, weight: 600 },
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
                font: { size: 10.5 },
                color: '#64748b',
                callback: (val) => `${val} GB`,
              },
            },
          },
        },
      };
    } else if (chartMode === 'gpu-occupancy') {
      // GPU Occupancy % Mode
      const gpuList = [
        { name: 'RTX 4060 (8G)', vram: 8 },
        { name: 'RTX 3060 (12G)', vram: 12 },
        { name: 'RTX 4080 (16G)', vram: 16 },
        { name: 'RTX 3090/4090 (24G)', vram: 24 },
        { name: 'Dual 3090 (48G)', vram: 48 },
        { name: 'A100 (80G)', vram: 80 },
      ];

      const labels = gpuList.map((g) => g.name);
      const occupancyData = gpuList.map((g) => {
        const pct = Math.round((vramResult.totalVRAM / g.vram) * 100);
        return pct;
      });

      const bgColors = occupancyData.map((pct) => {
        if (pct <= 85) return 'rgba(5, 150, 105, 0.85)'; // Safe green
        if (pct <= 100) return 'rgba(217, 119, 6, 0.85)'; // Tight amber
        return 'rgba(225, 29, 72, 0.85)'; // OOM Red
      });

      const borderColors = occupancyData.map((pct) => {
        if (pct <= 85) return 'rgb(4, 120, 87)';
        if (pct <= 100) return 'rgb(180, 83, 9)';
        return 'rgb(190, 18, 60)';
      });

      config = {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'VRAM 점유율 (%)',
              data: occupancyData,
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
          animation: { duration: 350 },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#0f172a',
              titleFont: { family: 'Pretendard, system-ui, sans-serif', size: 12, weight: 'bold' },
              bodyFont: { family: 'Pretendard, system-ui, sans-serif', size: 11 },
              padding: 10,
              cornerRadius: 8,
              callbacks: {
                label: (context) => {
                  const pct = context.raw as number;
                  const gpu = gpuList[context.dataIndex];
                  let status = '100% Full VRAM 적재 완료';
                  if (pct > 100) status = `초과 (${vramResult.totalVRAM}GB > ${gpu.vram}GB) - OOM 발생`;
                  else if (pct >= 85) status = '여유 메모리 부족 (주의)';
                  return `점유율: ${pct}% [${status}]`;
                },
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: {
                font: { family: 'Pretendard, system-ui, sans-serif', size: 10.5, weight: 600 },
                color: '#475569',
              },
            },
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'VRAM 점유율 (100% 초과 시 OOM)',
                font: { size: 11, weight: 'bold' },
                color: '#64748b',
              },
              grid: { color: 'rgba(226, 232, 240, 0.7)' },
              ticks: {
                font: { size: 10.5 },
                color: '#64748b',
                callback: (val) => `${val}%`,
              },
            },
          },
        },
      };
    } else {
      // All 9 quants stacked for current model
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

      const labels = quantList.map((q) => {
        const isCurrent = Math.abs(q.bits - quantBits) < 0.15;
        return isCurrent ? `${q.name} [선택]` : q.name;
      });

      const weightsData: number[] = [];
      const kvData: number[] = [];
      const cudaData: number[] = [];

      quantList.forEach((q) => {
        const res = calculateVRAM({
          modelParams,
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
              label: '가중치 VRAM (GB)',
              data: weightsData,
              backgroundColor: quantList.map((q) => {
                const isCurrent = Math.abs(q.bits - quantBits) < 0.15;
                if (isCurrent) return 'rgba(5, 150, 105, 0.95)';
                if (q.bits === 4.8) return 'rgba(16, 185, 129, 0.6)';
                return 'rgba(51, 65, 85, 0.75)';
              }),
              borderColor: quantList.map((q) => {
                const isCurrent = Math.abs(q.bits - quantBits) < 0.15;
                return isCurrent ? 'rgb(4, 120, 87)' : 'rgb(30, 41, 59)';
              }),
              borderWidth: quantList.map((q) => (Math.abs(q.bits - quantBits) < 0.15 ? 2.5 : 1)),
              borderRadius: 4,
              stack: 'stack0',
            },
            {
              label: 'KV 캐시 (GB)',
              data: kvData,
              backgroundColor: 'rgba(99, 102, 241, 0.8)',
              borderColor: 'rgb(79, 70, 229)',
              borderWidth: 1,
              borderRadius: 4,
              stack: 'stack0',
            },
            {
              label: 'CUDA 버퍼 (GB)',
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
          animation: { duration: 350 },
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
                font: { family: 'Pretendard, system-ui, sans-serif', size: 10.5 },
                color: (ctx) => {
                  const label = ctx.chart.data.labels?.[ctx.index] as string;
                  return label && label.includes('[선택]') ? '#047857' : '#475569';
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
                font: { size: 10.5 },
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
    chartMode,
    modelParams,
    quantBits,
    quantName,
    contextWindow,
    kvPrecision,
    batchSize,
    vramResult.totalVRAM,
    vramResult.weightsVRAM,
    vramResult.kvCacheVRAM,
    vramResult.cudaContextVRAM,
  ]);

  const canRunFullOn24G = vramResult.totalVRAM <= 24;
  const canRunFullOn16G = vramResult.totalVRAM <= 16;
  const canRunFullOn12G = vramResult.totalVRAM <= 12;

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between h-full">
      <div>
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              <h3 className="text-base font-bold text-slate-900">
                실시간 VRAM 점유 막대 차트 (Chart.js)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              선택: <strong className="text-slate-800 font-mono">{modelParams}B</strong> ·{' '}
              <strong className="text-emerald-700 font-mono">{quantName}</strong> ({quantBits} bpw)
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
            <button
              onClick={() => setChartMode('breakdown')}
              className={`px-2.5 py-1 font-semibold rounded transition-colors whitespace-nowrap ${
                chartMode === 'breakdown'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              VRAM 용량 &amp; GPU 한계
            </button>
            <button
              onClick={() => setChartMode('gpu-occupancy')}
              className={`px-2.5 py-1 font-semibold rounded transition-colors whitespace-nowrap ${
                chartMode === 'gpu-occupancy'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              GPU별 점유율 (%)
            </button>
            <button
              onClick={() => setChartMode('all-quants')}
              className={`px-2.5 py-1 font-semibold rounded transition-colors whitespace-nowrap ${
                chartMode === 'all-quants'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              양자화별 스택
            </button>
          </div>
        </div>

        {/* Real-time Telemetry Pill */}
        <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">계산된 VRAM:</span>
            <span className="font-mono font-bold text-slate-900 text-sm tabular-nums">
              {vramResult.totalVRAM} GB
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-[11px] text-slate-500">
              가중치 {vramResult.weightsVRAM}G · KV {vramResult.kvCacheVRAM}G · CUDA {vramResult.cudaContextVRAM}G
            </span>
          </div>

          <div className="flex items-center gap-1">
            {canRunFullOn12G ? (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold text-[11px]">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                12GB GPU 완벽 적재
              </span>
            ) : canRunFullOn16G ? (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold text-[11px]">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                16GB GPU 완벽 적재
              </span>
            ) : canRunFullOn24G ? (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold text-[11px]">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                24GB GPU (3090/4090) 적재
              </span>
            ) : vramResult.totalVRAM <= 48 ? (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-900 rounded font-semibold text-[11px]">
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                Dual 3090 (48G) 권장
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-semibold text-[11px]">
                <XCircle className="w-3 h-3 text-rose-600" />
                A100 (80GB) 필요
              </span>
            )}
          </div>
        </div>

        {/* Canvas Chart Area */}
        <div className="mt-3 relative w-full h-64 sm:h-72">
          <canvas ref={canvasRef} />
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span>
          컨텍스트: <strong className="font-mono text-slate-700">{contextWindow.toLocaleString()} 토큰</strong>{' '}
          (KV 캐시 {kvPrecision === 16 ? 'FP16' : kvPrecision === 8 ? 'q8_0' : 'q4_0'})
        </span>
        <span className="text-emerald-700 font-medium hidden sm:inline">
          💡 왼쪽 계산기 파라미터 조작 시 차트가 실시간 재렌더링됩니다
        </span>
      </div>
    </div>
  );
};
