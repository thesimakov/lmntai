-- CreateTable
CREATE TABLE "BenchmarkSample" (
    "id" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "metricKey" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BenchmarkSample_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BenchmarkSample_industry_metricKey_idx" ON "BenchmarkSample"("industry", "metricKey");
