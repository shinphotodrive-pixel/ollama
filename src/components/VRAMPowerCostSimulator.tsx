import React, { useState, useMemo } from 'react';
import {
  Zap,
  DollarSign,
  TrendingDown,
  Clock,
  Sliders,
  Leaf,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  HardDrive,
  Cpu,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface VRAMPowerCostSimulatorProps {
  modelParams: number;
  quantBits: number;
  quantName: string;
  contextWindow: number;
  totalVRAM: number;
  weightsVRAM: number;
}

export const VRAMPowerCostSimulator: React.FC<VRAMPowerCostSimulatorProps> = ({
  modelParams,
  quantBits,
  quantName,
  contextWindow,
  totalVRAM,
  weightsVRAM,
}) => {
  // Interactive Simulation Controls
  const [dailyHours, setDailyHours] = useState<number>(16); // 8h, 16h, 24h
  const [dutyCycle, setDutyCycle] = useState<number>(40); // 10% to 90% active inference load
  const [tariffPreset, setTariffPreset] = useState<'industrial' | 'commercial' | 'residential' | 'custom'>('commercial');
  const [kwhRateKRW, setKwhRateKRW] = useState<number>(180); // KRW per kWh (기본 상업/일반용 180원)
  const [monthlyTokensMillion, setMonthlyTokensMillion] = useState<number>(30); // 3,000만 토큰/월
  const [cloudComparisonTier, setCloudComparisonTier] = useState<'mini' | 'mid' | 'flagship'>('mid');

  // Determine hardware profile based on required VRAM
  const hwProfile = useMemo(() => {
    if (totalVRAM <= 8) {
      return {
        gpuName: 'NVIDIA RTX 4060 (8GB)',
        peakGpuWatts: 115,
        idleWatts: 15,
        capexKRW: 430000, // ~43만원
        capexUSD: 320,
        type: '단일 보급형 GPU',
      };
    } else if (totalVRAM <= 12) {
      return {
        gpuName: 'NVIDIA RTX 3060 12GB / RTX 4070',
        peakGpuWatts: 190,
        idleWatts: 20,
        capexKRW: 750000, // ~75만원
        capexUSD: 560,
        type: '단일 중급형 GPU',
      };
    } else if (totalVRAM <= 16) {
      return {
        gpuName: 'NVIDIA RTX 4080 (16GB)',
        peakGpuWatts: 300,
        idleWatts: 25,
        capexKRW: 1550000, // ~155만원
        capexUSD: 1150,
        type: '단일 고급형 GPU',
      };
    } else if (totalVRAM <= 24) {
      return {
        gpuName: 'NVIDIA RTX 3090 / 4090 (24GB)',
        peakGpuWatts: 420,
        idleWatts: 35,
        capexKRW: 2450000, // ~245만원
        capexUSD: 1800,
        type: '엔터프라이즈 골든 스탠다드 GPU',
      };
    } else if (totalVRAM <= 48) {
      return {
        gpuName: 'Dual NVIDIA RTX 3090 / 4090 (48GB)',
        peakGpuWatts: 780,
        idleWatts: 60,
        capexKRW: 4600000, // ~460만원
        capexUSD: 3400,
        type: '듀얼 병렬 GPU 워크스테이션',
      };
    } else {
      return {
        gpuName: 'Enterprise Datacenter A100/H100 (80GB)',
        peakGpuWatts: 700,
        idleWatts: 85,
        capexKRW: 16500000, // ~1650만원
        capexUSD: 12200,
        type: '데이터센터 서버 랙',
      };
    }
  }, [totalVRAM]);

  // Quantization power reduction factor:
  // Memory bus transfer is the #1 energy consumer in LLM token generation.
  // FP16 = 1.0 (base), Q8 = 0.82, Q4_K_M = 0.66, IQ2 = 0.55
  const quantPowerFactor = useMemo(() => {
    if (quantBits >= 16) return 1.0;
    if (quantBits >= 8) return 0.82;
    if (quantBits >= 5) return 0.72;
    if (quantBits >= 4) return 0.65; // Q4_K_M ~35% energy reduction vs FP16
    return 0.58;
  }, [quantBits]);

  // Tariff presets
  const handleTariffPresetChange = (preset: 'industrial' | 'commercial' | 'residential' | 'custom') => {
    setTariffPreset(preset);
    if (preset === 'industrial') setKwhRateKRW(150); // 산업용 을(고압)
    else if (preset === 'commercial') setKwhRateKRW(185); // 일반용(상업)
    else if (preset === 'residential') setKwhRateKRW(280); // 주택용(누진3단계)
  };

  // Calculations
  const systemBaseWatts = 60; // CPU, Motherboard, Fans, SSD baseline
  const activeGpuWatts = hwProfile.peakGpuWatts * quantPowerFactor;
  const avgWatts =
    activeGpuWatts * (dutyCycle / 100) + hwProfile.idleWatts * (1 - dutyCycle / 100) + systemBaseWatts;

  const monthlyHours = dailyHours * 30.5;
  const monthlyKwh = (avgWatts * monthlyHours) / 1000;
  const annualKwh = monthlyKwh * 12;

  const monthlyElectricCostKRW = Math.round(monthlyKwh * kwhRateKRW);
  const annualElectricCostKRW = monthlyElectricCostKRW * 12;

  // 3-Year TCO (Hardware CAPEX + 3yr Power OPEX + 10% Maintenance & Cooling)
  const threeYearMaintenance = Math.round(hwProfile.capexKRW * 0.1);
  const threeYearTcoKRW = hwProfile.capexKRW + annualElectricCostKRW * 3 + threeYearMaintenance;
  const monthlyAmortizedTcoKRW = Math.round(threeYearTcoKRW / 36);

  // Cloud API Alternative Comparison
  // mini: GPT-4o-mini / Claude Haiku (~₩400 / 1M tokens)
  // mid: GPT-4o / Claude Sonnet (~₩4,500 / 1M tokens)
  // flagship: GPT-4o heavy / Opus (~₩8,500 / 1M tokens)
  const cloudCostPerMillionTokensKRW =
    cloudComparisonTier === 'mini' ? 400 : cloudComparisonTier === 'mid' ? 4500 : 8500;

  const monthlyCloudCostKRW = monthlyTokensMillion * cloudCostPerMillionTokensKRW;
  const monthlyNetSavingsKRW = monthlyCloudCostKRW - monthlyAmortizedTcoKRW;
  const breakEvenMonths =
    monthlyNetSavingsKRW > 0
      ? Number((hwProfile.capexKRW / (monthlyCloudCostKRW - monthlyElectricCostKRW)).toFixed(1))
      : 0;

  // Carbon footprint: 1 kWh in Korea generates ~0.459 kg CO2e
  const annualCarbonKg = Math.round(annualKwh * 0.459);
  const treesEquivalent = Math.round(annualCarbonKg / 6.6); // 1 pine tree absorbs ~6.6kg CO2/year

  // Energy saved compared to unquantized FP16
  const powerSavedPct = Math.round((1 - quantPowerFactor) * 100);

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold text-slate-900">
              배포 전력 소모량 &amp; 장기 하드웨어 유지비용(TCO) 시뮬레이터
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            선택된 {modelParams}B 모델 및 {quantName}({quantBits} bpw) 양자화에 따른 전력 소모량, 전기세, 3년 TCO 및 상용 클라우드 API 대체 손익분기점
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg font-mono">
            {hwProfile.gpuName}
          </span>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        {/* KPI 1: Avg Operating Power */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
          <div className="text-slate-500 flex items-center justify-between">
            <span>평균 소비 전력</span>
            <Zap className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 tabular-nums">
            {Math.round(avgWatts)} W
          </div>
          <div className="text-[11px] text-emerald-700 flex items-center gap-1 font-medium">
            <span>FP16 대비 -{powerSavedPct}% 절감</span>
          </div>
        </div>

        {/* KPI 2: Monthly Electricity */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
          <div className="text-slate-500 flex items-center justify-between">
            <span>월간 예상 전기요금</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 tabular-nums">
            ₩{monthlyElectricCostKRW.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            월 {Math.round(monthlyKwh)} kWh 사용
          </div>
        </div>

        {/* KPI 3: 3-Year TCO */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
          <div className="text-slate-500 flex items-center justify-between">
            <span>3년 총소유비용 (TCO)</span>
            <TrendingDown className="w-3.5 h-3.5 text-indigo-600" />
          </div>
          <div className="text-xl font-bold font-mono text-indigo-950 tabular-nums">
            ₩{(threeYearTcoKRW / 10000).toFixed(0)}만
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            월 환산 ₩{(monthlyAmortizedTcoKRW / 10000).toFixed(1)}만원
          </div>
        </div>

        {/* KPI 4: ROI Break-Even */}
        <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-1">
          <div className="text-emerald-900 flex items-center justify-between font-semibold">
            <span>클라우드 API 대비 회수</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-800 tabular-nums">
            {breakEvenMonths > 0 ? `${breakEvenMonths}개월` : '즉시 이득'}
          </div>
          <div className="text-[11px] text-emerald-700 font-medium">
            하드웨어 원금 회수 후 순수익
          </div>
        </div>
      </div>

      {/* 3. Interactive Simulation Parameters Form */}
      <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-xl space-y-4 text-xs">
        <div className="flex items-center justify-between font-bold text-slate-900">
          <div className="flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-slate-600" />
            <span>시뮬레이션 운영 조건 하이퍼파라미터</span>
          </div>
          <span className="text-[11px] text-slate-500 font-normal">
            운영 시간 및 전기 요금 단가 조정 시 실시간 재산출
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Daily Operating Hours */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-slate-700 font-medium">
              <label className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>일일 운영 시간</span>
              </label>
              <span className="font-mono font-bold text-slate-900">{dailyHours}시간/일</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: '8시간 (주간)', val: 8 },
                { label: '16시간 (확장)', val: 16 },
                { label: '24시간 (무중단)', val: 24 },
              ].map((opt) => (
                <button
                  key={opt.val}
                  onClick={() => setDailyHours(opt.val)}
                  className={`py-1.5 text-xs font-semibold rounded transition-colors ${
                    dailyHours === opt.val
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Inference Duty Cycle (Load %) */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-slate-700 font-medium">
              <label>평균 GPU 추론 부하율 (Duty Cycle)</label>
              <span className="font-mono font-bold text-emerald-700">{dutyCycle}% 활성</span>
            </div>
            <input
              type="range"
              min="10"
              max="90"
              step="5"
              value={dutyCycle}
              onChange={(e) => setDutyCycle(Number(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer mt-1"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>10% (간헐적 챗봇)</span>
              <span>50% (일반 사내 RAG)</span>
              <span>90% (고빈도 에이전트)</span>
            </div>
          </div>

          {/* Electricity Tariff Preset */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-slate-700 font-medium">
              <label>전기 요금 단가 (kWh당)</label>
              <span className="font-mono font-bold text-slate-900">₩{kwhRateKRW} / kWh</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => handleTariffPresetChange('industrial')}
                className={`py-1.5 text-[11px] font-semibold rounded transition-colors ${
                  tariffPreset === 'industrial'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                산업용 (150원)
              </button>
              <button
                onClick={() => handleTariffPresetChange('commercial')}
                className={`py-1.5 text-[11px] font-semibold rounded transition-colors ${
                  tariffPreset === 'commercial'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                일반용 (185원)
              </button>
              <button
                onClick={() => handleTariffPresetChange('residential')}
                className={`py-1.5 text-[11px] font-semibold rounded transition-colors ${
                  tariffPreset === 'residential'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                주택용 (280원)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Deep Cost Breakdown: Local Hardware TCO vs Cloud API */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 3-Year TCO Breakdown (6 cols) */}
        <div className="lg:col-span-6 bg-slate-900 text-white p-5 rounded-xl space-y-3 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-emerald-400" />
              <span>3년 하드웨어 총소유비용 (TCO) 상세 명세</span>
            </span>
            <span className="font-mono text-emerald-400 font-bold">
              총 ₩{(threeYearTcoKRW / 10000).toFixed(0)}만원
            </span>
          </div>

          <div className="space-y-2 font-mono">
            <div className="flex justify-between items-center text-slate-300">
              <span className="font-sans">1. 하드웨어 초기 구매비 (CAPEX):</span>
              <span className="text-white font-bold">₩{hwProfile.capexKRW.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between items-center text-slate-400 text-[11px]">
              <span className="font-sans pl-3 text-slate-500">└ 기준 장비: {hwProfile.gpuName}</span>
              <span>(${hwProfile.capexUSD})</span>
            </div>

            <div className="flex justify-between items-center text-slate-300 pt-1">
              <span className="font-sans">2. 3개년 누적 전력 요금 (OPEX):</span>
              <span className="text-white font-bold">
                ₩{(annualElectricCostKRW * 3).toLocaleString()}원
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-400 text-[11px]">
              <span className="font-sans pl-3 text-slate-500">
                └ 연간 전력량: {Math.round(annualKwh).toLocaleString()} kWh
              </span>
              <span>(연간 ₩{annualElectricCostKRW.toLocaleString()}원)</span>
            </div>

            <div className="flex justify-between items-center text-slate-300 pt-1">
              <span className="font-sans">3. 3년 냉방 &amp; 유지보수 예비비 (10%):</span>
              <span className="text-white font-bold">
                ₩{threeYearMaintenance.toLocaleString()}원
              </span>
            </div>

            <div className="pt-3 border-t border-slate-700 flex justify-between items-center text-sm font-sans font-bold">
              <span className="text-emerald-400">월 환산 균등 비용:</span>
              <span className="text-emerald-300 font-mono text-base">
                ₩{monthlyAmortizedTcoKRW.toLocaleString()}원 / 월
              </span>
            </div>
          </div>

          {/* Environmental Carbon Metric */}
          <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Leaf className="w-3.5 h-3.5" />
              <span>연간 탄소 배출량 추정:</span>
            </span>
            <span className="font-mono text-slate-200">
              {annualCarbonKg.toLocaleString()} kg CO₂e (소나무 ~{treesEquivalent}그루 상당)
            </span>
          </div>
        </div>

        {/* Right: Cloud Commercial API Comparison (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-slate-200 p-5 rounded-xl space-y-3.5 text-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4 text-indigo-600" />
                <span>상용 클라우드 API 호출 비용 대체 비교</span>
              </span>
              <span className="text-[11px] font-semibold text-slate-500">월간 절감액 산출</span>
            </div>

            <div className="mt-3 space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-semibold text-slate-700">월간 예상 토큰 처리량</label>
                  <span className="font-mono font-bold text-indigo-700">
                    {monthlyTokensMillion.toLocaleString()}M 토큰/월
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[10, 30, 60, 100].map((t) => (
                    <button
                      key={t}
                      onClick={() => setMonthlyTokensMillion(t)}
                      className={`py-1 text-xs font-semibold rounded transition-colors ${
                        monthlyTokensMillion === t
                          ? 'bg-indigo-900 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {t}M (백만)
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">비교 대상 상용 API 등급</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'mini', name: 'GPT-4o-mini급', price: '₩400/M' },
                    { id: 'mid', name: 'Claude Sonnet급', price: '₩4,500/M' },
                    { id: 'flagship', name: 'GPT-4o Flagship', price: '₩8,500/M' },
                  ].map((tier) => (
                    <button
                      key={tier.id}
                      onClick={() => setCloudComparisonTier(tier.id as any)}
                      className={`p-2 rounded-lg border text-left transition-colors ${
                        cloudComparisonTier === tier.id
                          ? 'bg-indigo-50 border-indigo-400 text-indigo-900'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="font-bold text-[11px]">{tier.name}</div>
                      <div className="font-mono text-[10px] text-slate-500">{tier.price}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between text-slate-600 font-sans">
                  <span>동일 토큰 클라우드 API 청구액:</span>
                  <span className="font-bold text-slate-900 font-mono">
                    ₩{monthlyCloudCostKRW.toLocaleString()}원 / 월
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 font-sans">
                  <span>로컬 인프라 월 균등 TCO:</span>
                  <span className="font-bold text-slate-800 font-mono">
                    - ₩{monthlyAmortizedTcoKRW.toLocaleString()}원 / 월
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between font-sans text-xs font-bold">
                  <span className="text-emerald-700">월간 순 절감액:</span>
                  <span
                    className={`font-mono ${
                      monthlyNetSavingsKRW > 0 ? 'text-emerald-700' : 'text-slate-700'
                    }`}
                  >
                    {monthlyNetSavingsKRW > 0
                      ? `+ ₩${monthlyNetSavingsKRW.toLocaleString()}원 / 월`
                      : '손익분기점 도달 전'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-950 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>시뮬레이션 결론</strong>: 사내에서 월 {monthlyTokensMillion}M 토큰 이상 처리 시,
              {hwProfile.gpuName} 도입 후 약 <strong>{breakEvenMonths}개월</strong> 만에 하드웨어 투자비를
              전액 회수하며 이후 매월 <strong>₩{monthlyNetSavingsKRW.toLocaleString()}원</strong>의 비용 절감 효과가 발생합니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
