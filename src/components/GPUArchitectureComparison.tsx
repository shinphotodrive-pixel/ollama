import React, { useState } from 'react';
import { Cpu, Zap, HardDrive, CheckCircle2, AlertTriangle, ArrowRight, ShieldCheck, Flame } from 'lucide-react';

interface GPUPlatformSpec {
  category: 'nvidia' | 'apple';
  name: string;
  memory: string;
  bandwidth: string;
  fp16Perf: string;
  maxRecommendedModel: string;
  tokensPerSec: string;
  pros: string;
  cons: string;
  recommendedUse: string;
}

const GPU_SPECS: GPUPlatformSpec[] = [
  {
    category: 'nvidia',
    name: 'RTX 4060 / 4060 Ti (8GB / 16GB)',
    memory: '8GB / 16GB GDDR6',
    bandwidth: '272 ~ 288 GB/s',
    fp16Perf: '15 ~ 22 TFLOPS',
    maxRecommendedModel: '8B (Q4_K_M ~ Q8_0) / 14B (16GB)',
    tokensPerSec: '45 ~ 65 tok/s (8B)',
    pros: '저전력, 가성비 입문용, TensorRT-LLM 지원',
    cons: '8GB 모델은 32K 이상 컨텍스트 시 VRAM 고갈 위험',
    recommendedUse: '개인 개발자 로컬 단문 챗봇, 임베딩 모델',
  },
  {
    category: 'nvidia',
    name: 'RTX 3060 12GB / RTX 4070 (12GB)',
    memory: '12GB GDDR6 / GDDR6X',
    bandwidth: '360 ~ 504 GB/s',
    fp16Perf: '13 ~ 29 TFLOPS',
    maxRecommendedModel: '8B (Q8_0) / 14B (Q4_K_M 16K Ctx)',
    tokensPerSec: '50 ~ 75 tok/s (8B)',
    pros: '12GB VRAM으로 8B 32K 컨텍스트 및 14B Q4_K_M 완벽 상주',
    cons: '32B 모델 구동 불가능 (100% OOM)',
    recommendedUse: '중소규모 로컬 에이전트, RAG 시스템 구축',
  },
  {
    category: 'nvidia',
    name: 'RTX 3090 / 4090 (24GB) ★골든 스탠다드',
    memory: '24GB GDDR6X',
    bandwidth: '936 ~ 1,008 GB/s',
    fp16Perf: '36 ~ 83 TFLOPS',
    maxRecommendedModel: '32B (Q4_K_M 32K Ctx) / 70B (IQ2/IQ3 초경량)',
    tokensPerSec: '38 ~ 48 tok/s (32B), 110 tok/s (8B)',
    pros: '현존 최고의 단일 로컬 LLM 카드. FlashAttention-2 풀 가속',
    cons: '70B 메이저 모델(Q4_K_M) 단독 구동 시 VRAM 40GB 필요하여 부족',
    recommendedUse: '엔터프라이즈 코딩 에이전트(Qwen 32B), 고성능 로컬 추론',
  },
  {
    category: 'nvidia',
    name: 'Dual RTX 3090 / 4090 (48GB NVLink/PCIe)',
    memory: '48GB GDDR6X',
    bandwidth: '1,872 ~ 2,016 GB/s (개별 버스)',
    fp16Perf: '72 ~ 166 TFLOPS',
    maxRecommendedModel: '70B (Q4_K_M 32K Ctx 완벽 상주)',
    tokensPerSec: '18 ~ 26 tok/s (70B Q4_K_M)',
    pros: '합리적 비용으로 Llama-3.1 70B 100% VRAM 적재',
    cons: 'Ollama 파이프라인 레이어 분할로 1개 카드 대비 단일 지연시간 미개선',
    recommendedUse: '사내 온프레미스 70B 프라이빗 LLM 서버',
  },
  {
    category: 'apple',
    name: 'Apple M3 / M4 (통합 메모리 16GB ~ 24GB)',
    memory: '16GB ~ 24GB LPDDR5X UMA',
    bandwidth: '100 ~ 150 GB/s',
    fp16Perf: '4 ~ 6 TFLOPS',
    maxRecommendedModel: '8B (Q4_K_M ~ Q8_0) / 14B (Q4_K_M)',
    tokensPerSec: '25 ~ 35 tok/s (8B)',
    pros: '배터리 구동, 무소음, CPU/GPU 제로카피 공유 메모리',
    cons: '메모리 대역폭(150GB/s) 한계로 NVIDIA 대비 토큰 속도 50% 수준',
    recommendedUse: '휴대용 맥북 로컬 AI 보조 도구',
  },
  {
    category: 'apple',
    name: 'Apple M3 / M4 Pro (통합 메모리 36GB ~ 48GB)',
    memory: '36GB ~ 48GB LPDDR5X UMA',
    bandwidth: '150 ~ 273 GB/s',
    fp16Perf: '8 ~ 14 TFLOPS',
    maxRecommendedModel: '32B (Q4_K_M ~ Q5_K_M 32K Ctx)',
    tokensPerSec: '18 ~ 25 tok/s (32B)',
    pros: '32B 코딩 모델을 맥북 랩톱에서 발열/소음 없이 장시간 상주 구동',
    cons: '70B 모델은 구동 가능하나 속도 5~8 tok/s로 실서비스엔 느림',
    recommendedUse: '전문 소프트웨어 엔지니어 코딩 에이전트',
  },
  {
    category: 'apple',
    name: 'Apple M2 / M3 / M4 Max (통합 메모리 64GB ~ 128GB)',
    memory: '64GB ~ 128GB LPDDR5X UMA',
    bandwidth: '300 ~ 410 GB/s',
    fp16Perf: '16 ~ 32 TFLOPS',
    maxRecommendedModel: '70B (Q4_K_M 64K Ctx) / 32B (Q8_0 128K)',
    tokensPerSec: '12 ~ 18 tok/s (70B Q4_K_M)',
    pros: '단일 기기에서 70B 모델 및 초대용량 128K 컨텍스트 메모리 확보',
    cons: '기기 단가가 높음, 고부하 시 메모리 대역폭 병목',
    recommendedUse: '장문 문서 분석, 70B 프라이빗 리서치',
  },
  {
    category: 'apple',
    name: 'Apple M2 Ultra (통합 메모리 192GB)',
    memory: '192GB LPDDR5X UMA',
    bandwidth: '800 GB/s',
    fp16Perf: '54 TFLOPS',
    maxRecommendedModel: '70B (FP16 원본) / 236B MoE (DeepSeek-V2)',
    tokensPerSec: '18 ~ 24 tok/s (70B FP16)',
    pros: '소비자용 폼팩터에서 유일하게 192GB 통합 메모리 제공',
    cons: '초기 도입 비용 고가 ($7,000+)',
    recommendedUse: '초거대 모델 연구, 200B+ MoE 오프라인 평가',
  },
];

export const GPUArchitectureComparison: React.FC = () => {
  const [platformFilter, setPlatformFilter] = useState<'all' | 'nvidia' | 'apple'>('all');

  const filteredSpecs =
    platformFilter === 'all'
      ? GPU_SPECS
      : GPU_SPECS.filter((item) => item.category === platformFilter);

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">
              GPU 하드웨어 플랫폼 성능 비교 분석 (NVIDIA vs Apple Silicon)
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            전용 VRAM GDDR6X 기반 NVIDIA CUDA와 통합 메모리(UMA) Metal 기반 Apple Silicon의 아키텍처 특성 비교
          </p>
        </div>

        {/* Platform Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs self-start sm:self-auto">
          <button
            onClick={() => setPlatformFilter('all')}
            className={`px-3 py-1 font-semibold rounded-md transition-colors ${
              platformFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            전체 비교 (8종)
          </button>
          <button
            onClick={() => setPlatformFilter('nvidia')}
            className={`px-3 py-1 font-semibold rounded-md transition-colors ${
              platformFilter === 'nvidia'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            NVIDIA CUDA (4종)
          </button>
          <button
            onClick={() => setPlatformFilter('apple')}
            className={`px-3 py-1 font-semibold rounded-md transition-colors ${
              platformFilter === 'apple'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Apple Silicon UMA (4종)
          </button>
        </div>
      </div>

      {/* Key Architectural Contrast Callout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between font-bold text-emerald-950">
            <span className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-emerald-600" />
              NVIDIA CUDA (전용 고대역폭 VRAM 구조)
            </span>
            <span className="text-[11px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
              최대 1,008 GB/s
            </span>
          </div>
          <p className="text-slate-700 leading-relaxed">
            <strong>핵심 장점</strong>: 압도적인 메모리 대역폭(GDDR6X: ~1TB/s)과 전용 텐서 코어, FlashAttention-2
            네이티브 지원으로 <strong>동일 모델 기준 최고 속도(토큰/초)</strong>를 달성합니다.
          </p>
          <p className="text-slate-600 text-[11px] leading-relaxed">
            <strong>주의 제약</strong>: VRAM 용량이 8GB, 12GB, 16GB, 24GB로 물리적 상한이 고정되어 있어,
            초과 시 PCIe 버스 병목(속도 80% 하락)이 발생합니다.
          </p>
        </div>

        <div className="p-4 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between font-bold text-indigo-950">
            <span className="flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-indigo-600" />
              Apple Silicon (통합 메모리 UMA 아키텍처)
            </span>
            <span className="text-[11px] font-mono bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">
              최대 192GB 용량
            </span>
          </div>
          <p className="text-slate-700 leading-relaxed">
            <strong>핵심 장점</strong>: CPU와 GPU가 동일한 LPDDR5X 메모리 풀을 공유(Zero-Copy)하므로,
            소비자용 랩톱/맥 스튜디오에서도 <strong>70B 모델을 단일 기기에서 여유롭게 적재</strong>합니다.
          </p>
          <p className="text-slate-600 text-[11px] leading-relaxed">
            <strong>주의 제약</strong>: 메모리 대역폭(Base 150GB/s ~ Max 400GB/s)이 RTX 4090 대비 낮아
            절대 추론 속도는 약 40~60% 수준입니다.
          </p>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse min-w-[850px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
              <th className="p-3">GPU / SoC 모델</th>
              <th className="p-3">VRAM / 메모리 규격</th>
              <th className="p-3">메모리 대역폭</th>
              <th className="p-3">연산 성능 (FP16)</th>
              <th className="p-3">권장 최대 모델 크기</th>
              <th className="p-3">추론 속도 (Tok/s)</th>
              <th className="p-3">실무 적합 유스케이스</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-600">
            {filteredSpecs.map((spec) => {
              const isNvidia = spec.category === 'nvidia';
              const isHighlight = spec.name.includes('4090') || spec.name.includes('Max');

              return (
                <tr
                  key={spec.name}
                  className={`hover:bg-slate-50/80 transition-colors ${
                    isHighlight ? 'bg-emerald-50/30' : ''
                  }`}
                >
                  <td className="p-3 font-semibold text-slate-900">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isNvidia ? 'bg-emerald-600' : 'bg-indigo-600'
                        }`}
                      />
                      <span>{spec.name}</span>
                    </div>
                  </td>
                  <td className="p-3 font-mono tabular-nums text-slate-800">{spec.memory}</td>
                  <td className="p-3 font-mono tabular-nums text-emerald-800 font-bold">
                    {spec.bandwidth}
                  </td>
                  <td className="p-3 font-mono tabular-nums">{spec.fp16Perf}</td>
                  <td className="p-3 font-medium text-slate-800">{spec.maxRecommendedModel}</td>
                  <td className="p-3 font-mono tabular-nums font-semibold text-emerald-700">
                    {spec.tokensPerSec}
                  </td>
                  <td className="p-3 text-slate-700">{spec.recommendedUse}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
