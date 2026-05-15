import { prisma } from "@/lib/prisma";
import type { BenchmarkComparison } from "@/lib/analytics-benchmarks";
import { BENCHMARKS } from "@/lib/analytics-benchmarks";
import type { IndustryBenchmarks, BenchmarkMetric } from "@/lib/analytics-benchmarks";

const MIN_SAMPLES = 5;

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/** Persist anonymised KPI values for a given industry. One row per metric. */
export async function persistBenchmarkSamples(
  industryId: string,
  comparisons: BenchmarkComparison[]
): Promise<void> {
  const rows = comparisons
    .filter((c) => c.companyValue !== null)
    .map((c) => ({
      industry: industryId,
      metricKey: c.label.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
      value: c.companyValue as number,
      unit: c.unit,
    }));

  if (rows.length === 0) return;

  await prisma.benchmarkSample.createMany({ data: rows });
}

/**
 * Overlay real DB percentiles onto hardcoded benchmark data.
 * Falls back to hardcoded values for metrics with fewer than MIN_SAMPLES DB rows.
 */
export async function enrichBenchmarksFromDb(
  hardcoded: IndustryBenchmarks
): Promise<IndustryBenchmarks> {
  const samples = await prisma.benchmarkSample.findMany({
    where: { industry: hardcoded.id },
    select: { metricKey: true, value: true },
  });

  if (samples.length < MIN_SAMPLES) return hardcoded;

  // Group by metricKey
  const byKey: Record<string, number[]> = {};
  for (const s of samples) {
    (byKey[s.metricKey] ??= []).push(s.value);
  }

  const enrichedMetrics: BenchmarkMetric[] = hardcoded.metrics.map((m) => {
    const key = m.label.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    const vals = byKey[key];
    if (!vals || vals.length < MIN_SAMPLES) return m;

    const sorted = [...vals].sort((a, b) => a - b);
    return {
      ...m,
      median: Math.round(percentile(sorted, 50) * 10) / 10,
      p25: Math.round(percentile(sorted, 25) * 10) / 10,
      p75: Math.round(percentile(sorted, 75) * 10) / 10,
    };
  });

  return { ...hardcoded, metrics: enrichedMetrics };
}

/** Count how many samples exist for a given industry. */
export async function getBenchmarkSampleCount(industryId: string): Promise<number> {
  return prisma.benchmarkSample.count({ where: { industry: industryId } });
}

/** Get the enriched benchmark for a specific industry id, or null if unknown. */
export async function getEnrichedIndustryBenchmark(
  industryId: string
): Promise<IndustryBenchmarks | null> {
  const hardcoded = BENCHMARKS.find((b) => b.id === industryId);
  if (!hardcoded) return null;
  return enrichBenchmarksFromDb(hardcoded);
}
