// Plain percentage arithmetic — GST doesn't compound or grow over time, so
// there's no "scenario" concept here at all, just add-on vs. extract-from.

export function addGst(baseAmount: number, gstPct: number): { gstAmount: number; totalAmount: number } {
  const gstAmount = baseAmount * (gstPct / 100);
  return { gstAmount, totalAmount: baseAmount + gstAmount };
}

export function removeGst(inclusiveAmount: number, gstPct: number): { baseAmount: number; gstAmount: number } {
  const baseAmount = inclusiveAmount / (1 + gstPct / 100);
  return { baseAmount, gstAmount: inclusiveAmount - baseAmount };
}
