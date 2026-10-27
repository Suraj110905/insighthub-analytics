/**
 * lib/analytics.js
 * 
 * Helper functions for processing business data and computing metrics.
 * Designed to be simple, pure JavaScript, and easy to read.
 */

/**
 * Calculates summary metrics from an array of numeric values.
 * @param {Array<number>} numbers
 * @returns {{ sum: number, average: number, min: number, max: number }}
 */
export function calculateSummary(numbers = []) {
  if (!numbers.length) {
    return { sum: 0, average: 0, min: 0, max: 0 };
  }

  const sum = numbers.reduce((acc, curr) => acc + curr, 0);
  const average = sum / numbers.length;
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);

  return {
    sum,
    average: Number(average.toFixed(2)),
    min,
    max,
  };
}

/**
 * Formats a raw number as a standard USD currency string.
 * @param {number} amount
 * @returns {string}
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}
