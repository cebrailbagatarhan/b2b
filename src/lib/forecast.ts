export type MonthlySales = {
  month: string; // e.g., "2024-01"
  amount: number;
};

export type ForecastResult = {
  month: string;
  actual: number | null;
  predicted: number | null;
};

/**
 * Calculates a simple linear regression and projects future values.
 * Uses a basic seasonal index if more than 12 months of data is provided.
 */
export function generateForecast(
  historicalData: MonthlySales[],
  monthsToForecast: number = 3
): ForecastResult[] {
  if (!historicalData || historicalData.length === 0) {
    return [];
  }

  // If only 1 data point, we can't do regression. Just return flat prediction.
  if (historicalData.length === 1) {
    const results: ForecastResult[] = [
      { month: historicalData[0].month, actual: historicalData[0].amount, predicted: null }
    ];
    const lastDate = new Date(historicalData[0].month + "-01");
    for (let i = 1; i <= monthsToForecast; i++) {
      lastDate.setMonth(lastDate.getMonth() + 1);
      const nextMonth = `${lastDate.getFullYear()}-${String(lastDate.getMonth() + 1).padStart(2, '0')}`;
      results.push({
        month: nextMonth,
        actual: null,
        predicted: historicalData[0].amount
      });
    }
    return results;
  }

  // 1. Simple Linear Regression: y = mx + b
  const n = historicalData.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  historicalData.forEach((d, i) => {
    sumX += i;
    sumY += d.amount;
    sumXY += i * d.amount;
    sumXX += i * i;
  });

  const m = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const b = (sumY - m * sumX) / n;

  // 2. Seasonality (Optional, very naive implementation)
  // We'll calculate a seasonal index if we have > 12 data points.
  const seasonalIndices: { [key: number]: number } = {};
  for (let i = 0; i < 12; i++) seasonalIndices[i] = 1; // Default to 1

  if (n >= 12) {
    const monthSums: { [key: number]: number } = {};
    const monthCounts: { [key: number]: number } = {};
    
    historicalData.forEach((d, i) => {
      const date = new Date(d.month + "-01");
      const mIdx = date.getMonth();
      // Compare actual against linear trend to get ratio
      const trendVal = m * i + b;
      const ratio = trendVal !== 0 ? d.amount / trendVal : 1;
      
      monthSums[mIdx] = (monthSums[mIdx] || 0) + ratio;
      monthCounts[mIdx] = (monthCounts[mIdx] || 0) + 1;
    });

    for (let i = 0; i < 12; i++) {
      if (monthCounts[i] > 0) {
        seasonalIndices[i] = monthSums[i] / monthCounts[i];
      }
    }
  }

  // 3. Build Result Array
  const results: ForecastResult[] = historicalData.map((d) => ({
    month: d.month,
    actual: d.amount,
    predicted: null // We don't predict the past in this visualization, though we could
  }));

  // 4. Project into future
  const lastDateStr = historicalData[historicalData.length - 1].month;
  const currentDate = new Date(lastDateStr + "-01");

  for (let i = 1; i <= monthsToForecast; i++) {
    currentDate.setMonth(currentDate.getMonth() + 1);
    const mIdx = currentDate.getMonth();
    const nextMonthStr = `${currentDate.getFullYear()}-${String(mIdx + 1).padStart(2, '0')}`;
    
    const x = n - 1 + i;
    const basePrediction = Math.max(0, m * x + b); // Don't predict negative sales
    const seasonalPrediction = basePrediction * seasonalIndices[mIdx];

    results.push({
      month: nextMonthStr,
      actual: null,
      predicted: Math.round(seasonalPrediction * 100) / 100
    });
  }

  return results;
}
