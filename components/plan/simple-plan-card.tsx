/** Conservative/optimistic band shown on the chart, derived from one number so a single expected-return input can still project a range. */
export function deriveReturnBand(expected: number) {
  return {
    conservative: Math.max(1, expected - 4),
    optimistic: expected + 3,
  };
}
