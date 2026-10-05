import { VRAMCalcInputs, VRAMCalcResult, QuantMatrixItem } from '../types';

export function calculateVRAM(inputs: VRAMCalcInputs): VRAMCalcResult {
  const { modelParams, quantBits, contextWindow, kvPrecision, batchSize } = inputs;

  // 1. Model Weights Memory with 3% GGUF tensor overhead
  const rawWeightsGB = (modelParams * 1e9 * quantBits) / (8 * 1024 * 1024 * 1024);
  const weightsVRAM = Number((rawWeightsGB * 1.03).toFixed(2));

  // 2. Transformer architecture parameters based on parameter size
  let layers = 32;
  let kvHeads = 8;
  const headDim = 128;

  if (modelParams <= 3) {
    layers = 24;
    kvHeads = 4;
  } else if (modelParams <= 8) {
    layers = 32;
    kvHeads = 8;
  } else if (modelParams <= 14) {
    layers = 48;
    kvHeads = 8;
  } else if (modelParams <= 32) {
    layers = 64;
    kvHeads = 8;
  } else if (modelParams <= 72) {
    layers = 80;
    kvHeads = 8;
  } else {
    // 405B
    layers = 126;
    kvHeads = 8;
  }

  // KV bytes per element: 16-bit = 2 bytes, 8-bit = 1 byte, 4-bit = 0.5 bytes
  const bytesPerKvElem = kvPrecision / 8;
  
  // KV Cache VRAM Formula: 2 * layers * kv_heads * head_dim * context * bytes_per_element * batch / 1024^3
  const rawKvBytes = 2 * layers * kvHeads * headDim * contextWindow * bytesPerKvElem * batchSize;
  const kvCacheVRAM = Number((rawKvBytes / (1024 * 1024 * 1024)).toFixed(2));

  // 3. CUDA context & activations buffer overhead
  const cudaContextVRAM = Number((0.6 + (modelParams > 30 ? 0.6 : 0.2)).toFixed(2));

  const totalVRAM = Number((weightsVRAM + kvCacheVRAM + cudaContextVRAM).toFixed(2));
  const recommendedRAM = Number((totalVRAM * 1.25).toFixed(1));

  // Hardware evaluation
  const hardwareProfiles = [
    { name: 'NVIDIA RTX 4060 / 3060', vram: 8 },
    { name: 'NVIDIA RTX 3060 (12G) / 4070 (12G)', vram: 12 },
    { name: 'NVIDIA RTX 4070 Ti / 4080', vram: 16 },
    { name: 'NVIDIA RTX 3090 / 4090', vram: 24 },
    { name: 'Dual RTX 3090 / 4090 (2-Way)', vram: 48 },
    { name: 'Apple M3/M4 Max (Unified)', vram: 64 },
    { name: 'NVIDIA A100 / H100 SXM', vram: 80 },
  ];

  const hardwareStatus = hardwareProfiles.map((gpu) => {
    if (gpu.vram >= totalVRAM) {
      return {
        name: gpu.name,
        vram: gpu.vram,
        canRun: 'full' as const,
        reason: `전체 VRAM 적재 완료 (${totalVRAM}GB / ${gpu.vram}GB). 최고 속도(Tokens/s) 보장.`,
      };
    } else if (gpu.vram >= weightsVRAM * 0.45) {
      const offloadedLayersPct = Math.round((gpu.vram / totalVRAM) * 100);
      return {
        name: gpu.name,
        vram: gpu.vram,
        canRun: 'partial' as const,
        reason: `부분 오프로딩 (${offloadedLayersPct}% GPU, 잔여 RAM). PCIe 대역폭 병목으로 생성 속도 70~90% 하락.`,
      };
    } else {
      return {
        name: gpu.name,
        vram: gpu.vram,
        canRun: 'oom' as const,
        reason: `VRAM 부족 (필요: ${totalVRAM}GB, 보유: ${gpu.vram}GB). 로드 실패 또는 극단적 OOM 크래시.`,
      };
    }
  });

  return {
    weightsVRAM,
    kvCacheVRAM,
    cudaContextVRAM,
    totalVRAM,
    recommendedRAM,
    hardwareStatus,
  };
}

export const QUANT_DATA: QuantMatrixItem[] = [
  {
    level: 'FP16',
    name: '16-bit Float (원형)',
    bpw: 16.0,
    vramSavingPct: 0,
    speedMultiplier: 1.0,
    accuracyRetention: 100.0,
    perplexityDelta: '±0.00 (기준)',
    recommendedUse: '연구, 파인튜닝, 기준선 벤치마크',
    tradeoffNote: 'VRAM 점유 극대화, 일반 소비자용 GPU 구동 불가',
  },
  {
    level: 'Q8_0',
    name: '8-bit Symmetric',
    bpw: 8.5,
    vramSavingPct: 47,
    speedMultiplier: 1.25,
    accuracyRetention: 99.8,
    perplexityDelta: '+0.004 (무시 가능)',
    recommendedUse: '품질 최우선 프로덕션, 코딩/수학 추론',
    tradeoffNote: '손실 실질적 제로, 여전히 높은 VRAM 소모',
  },
  {
    level: 'Q6_K',
    name: '6-bit K-Quant',
    bpw: 6.56,
    vramSavingPct: 59,
    speedMultiplier: 1.38,
    accuracyRetention: 99.3,
    perplexityDelta: '+0.015',
    recommendedUse: '고정밀 RAG, 법률/의료 문서 질의',
    tradeoffNote: 'Q4 대비 VRAM 15~20% 더 소모하나 완벽에 가까운 일관성',
  },
  {
    level: 'Q5_K_M',
    name: '5-bit Medium K-Quant',
    bpw: 5.5,
    vramSavingPct: 65,
    speedMultiplier: 1.42,
    accuracyRetention: 98.7,
    perplexityDelta: '+0.035',
    recommendedUse: '하이엔드 에이전트, 복잡한 JSON 스키마 생성',
    tradeoffNote: 'Q4와 Q8 사이의 우수한 타협점',
  },
  {
    level: 'Q4_K_M',
    name: '4-bit Medium K-Quant (골든 스탠다드)',
    bpw: 4.8,
    vramSavingPct: 70,
    speedMultiplier: 1.55,
    accuracyRetention: 97.9,
    perplexityDelta: '+0.078',
    recommendedUse: '실무 프로덕션 표준, 에이전트 도구 호출, 일상 대화',
    tradeoffNote: '혼합 정밀도로 어텐션 보존, 가성비 및 속도 최고점',
  },
  {
    level: 'Q4_0',
    name: '4-bit Legacy Basic',
    bpw: 4.5,
    vramSavingPct: 72,
    speedMultiplier: 1.58,
    accuracyRetention: 94.2,
    perplexityDelta: '+0.185',
    recommendedUse: '구형 하드웨어 호환성 필요 시',
    tradeoffNote: 'K_M 대비 도구 호출 및 복잡 구문 오류율 2배 이상 높음',
  },
  {
    level: 'Q3_K_M',
    name: '3-bit Medium K-Quant',
    bpw: 3.8,
    vramSavingPct: 76,
    speedMultiplier: 1.62,
    accuracyRetention: 91.5,
    perplexityDelta: '+0.340',
    recommendedUse: '16GB VRAM에서 32B 모델 강제 구동 시',
    tradeoffNote: '문맥 이해 유지되나 정밀 JSON 문법 파괴 빈도 상승',
  },
  {
    level: 'IQ3_M',
    name: '3-bit Importance Matrix',
    bpw: 3.65,
    vramSavingPct: 77,
    speedMultiplier: 1.60,
    accuracyRetention: 93.8,
    perplexityDelta: '+0.210',
    recommendedUse: 'imatrix 보정 데이터가 있는 고난도 경량화',
    tradeoffNote: '일반 Q3보다 우수하나 캘리브레이션 데이터 편향 위험',
  },
  {
    level: 'IQ2_XXS',
    name: '2-bit Extreme Quant',
    bpw: 2.2,
    vramSavingPct: 86,
    speedMultiplier: 1.70,
    accuracyRetention: 78.4,
    perplexityDelta: '+1.250 (급증)',
    recommendedUse: '라즈베리파이/모바일 기기 단순 요약',
    tradeoffNote: '환각(Hallucination) 빈도 높음, 도구 호출/코드 작성 불가',
  },
];

export function calculateSpeculativeSpeedup(
  acceptRate: number, // alpha 0.0 - 1.0
  kTokens: number,    // draft count 1 - 8
  draftLatencyMs: number, // e.g. 8ms
  targetLatencyMs: number // e.g. 45ms
) {
  // Expected accepted tokens: Sum_{i=0}^K alpha^i = (1 - alpha^(K+1)) / (1 - alpha)
  let expectedTokens = 0;
  for (let i = 0; i <= kTokens; i++) {
    expectedTokens += Math.pow(acceptRate, i);
  }

  // Cost per speculative step: K * draftLatency + targetLatency (target verifies all K in 1 forward pass)
  const timePerStep = kTokens * draftLatencyMs + targetLatencyMs;
  
  // Standard generation time for the same amount of tokens
  const standardTime = expectedTokens * targetLatencyMs;

  const speedupRatio = standardTime / timePerStep;
  const effectiveTokensPerSec = (expectedTokens / (timePerStep / 1000));
  const standardTokensPerSec = (1 / (targetLatencyMs / 1000));

  return {
    expectedTokens: Number(expectedTokens.toFixed(2)),
    speedupRatio: Number(speedupRatio.toFixed(2)),
    effectiveTokensPerSec: Number(effectiveTokensPerSec.toFixed(1)),
    standardTokensPerSec: Number(standardTokensPerSec.toFixed(1)),
    timeSavedPct: Number(Math.max(0, (1 - 1 / speedupRatio) * 100).toFixed(1)),
  };
}
