export type TabId = 'arch' | 'gguf' | 'opt' | 'rag' | 'sec';

export interface ModelfileConfig {
  baseModel: string;
  contextSize: number;
  temperature: number;
  topP: number;
  topK: number;
  repeatPenalty: number;
  systemPrompt: string;
  adapter: string;
  stopTokens: string[];
  templateType: 'chatml' | 'llama3' | 'custom' | 'default';
  customTemplate?: string;
}

export interface VRAMCalcInputs {
  modelParams: number; // in Billions (e.g. 8, 14, 32, 70)
  quantBits: number;   // bits per weight (e.g. 4.8 for Q4_K_M, 16 for FP16)
  quantName: string;
  contextWindow: number; // tokens (e.g. 4096, 32768, 131072)
  kvPrecision: number;   // 16 (FP16), 8 (q8_0), 4 (q4_0)
  batchSize: number;     // 1 for local inference
}

export interface VRAMCalcResult {
  weightsVRAM: number;    // GB
  kvCacheVRAM: number;    // GB
  cudaContextVRAM: number;// GB (CUDA runtime + compute graph)
  totalVRAM: number;      // GB
  recommendedRAM: number; // Recommended system RAM if partial offload
  hardwareStatus: {
    name: string;
    vram: number;
    canRun: 'full' | 'partial' | 'oom';
    reason: string;
  }[];
}

export interface QuantMatrixItem {
  level: string;
  name: string;
  bpw: number;
  vramSavingPct: number;
  speedMultiplier: number;
  accuracyRetention: number; // %
  perplexityDelta: string;
  recommendedUse: string;
  tradeoffNote: string;
}

export interface SecurityCheckItem {
  id: string;
  title: string;
  description: string;
  category: 'network' | 'container' | 'model' | 'auth';
  checked: boolean;
  severity: 'critical' | 'high' | 'medium';
  remediation: string;
}

export interface VRAMScenario {
  id: string;
  name: string;
  createdAt: string;
  inputs: VRAMCalcInputs;
  result: VRAMCalcResult;
  notes?: string;
}
