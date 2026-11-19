import { weekDates } from "./workflow.js";

export function weekWeightSummary(weights = {}, day) {
  function summary(offset) {
    const values = weekDates(day, offset)
      .filter(date => date <= day)
      .map(date => weights[date]).filter(Number.isFinite);
    const count = values.length;
    return { count, mean: count ? values.reduce((a, b) => a + b, 0) / count : null };
  }
  const current = summary(0);
  const previous = summary(-1);
  return { current, previous, difference: current.count >= 3 && previous.count >= 3
    ? Number((current.mean - previous.mean).toFixed(1)) : null };
}
