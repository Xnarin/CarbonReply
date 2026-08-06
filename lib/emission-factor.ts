export const ELECTRICITY_FACTOR_SOURCE_URL = "https://tips.energy.or.kr/diagnosis/qna_view.do?no=2365";

type PublishedFactor = { year: number; value: number };

const PUBLISHED_FACTORS: PublishedFactor[] = [
  { year: 2021, value: 0.4781 },
  { year: 2022, value: 0.4747 },
  { year: 2023, value: 0.4173 },
  { year: 2024, value: 0.4541 },
  { year: 2025, value: 0.4173 },
];

export type ElectricityFactor = {
  factorYear: number;
  isFallback: boolean;
  sourceLabel: string;
  targetYear: number;
  unit: "kgCO₂e/kWh";
  value: number;
  version: string;
};

export function getElectricityFactor(targetYear: number): ElectricityFactor {
  const exact = PUBLISHED_FACTORS.find((factor) => factor.year === targetYear);
  const latestBeforeTarget = [...PUBLISHED_FACTORS].reverse().find((factor) => factor.year <= targetYear);
  const selected = exact ?? latestBeforeTarget ?? PUBLISHED_FACTORS[0];
  const isFallback = selected.year !== targetYear;
  return {
    factorYear: selected.year,
    isFallback,
    sourceLabel: "EG-TIPS 연도별 전력배출계수 안내",
    targetYear,
    unit: "kgCO₂e/kWh",
    value: selected.value,
    version: isFallback
      ? `EG-TIPS ${selected.year}년 소비단 기준 · ${targetYear}년 임시 적용`
      : `EG-TIPS ${selected.year}년 소비단 기준`,
  };
}

export function calculateElectricityEmissionsKg(kwh: number, targetYear: number) {
  return kwh * getElectricityFactor(targetYear).value;
}
