import { describe, it, expect } from 'vitest';

// Re-export the private function via a test helper shim
// Since parseGoalAmount is not exported, we test via getGoalTracking indirectly.
// Instead, we inline-test the same logic by copying the function here.

function parseViNum(str) {
  const s = str.trim();
  const dots = (s.match(/\./g) || []).length;
  const commas = (s.match(/,/g) || []).length;
  if (dots > 1 || commas > 1) return parseInt(s.replace(/[.,]/g, ''), 10);
  if (dots === 1 || commas === 1) {
    const parts = s.split(/[.,]/);
    if (parts[1]?.length === 3) return parseInt(s.replace(/[.,]/g, ''), 10);
    return parseFloat(s.replace(',', '.'));
  }
  return parseFloat(s);
}

function parseGoalAmount(text) {
  if (!text?.trim()) return 0;
  const s = text.toLowerCase();

  const rưỡiMatch = s.match(/(\d[\d.,]*)\s*(?:tỷ|ty)\s+rưỡi/);
  if (rưỡiMatch) return parseViNum(rưỡiMatch[1]) * 1_000_000_000 + 500_000_000;
  if (/\btỷ rưỡi\b|\bty rưỡi\b/.test(s)) return 1_500_000_000;

  const UNITS = [
    { re: /(\d[\d.,]*)\s*(?:tỷ|ty|billion|b)(?=[^a-z]|$)/i, mult: 1_000_000_000 },
    { re: /(\d[\d.,]*)\s*(?:triệu|trieu|tr|million)(?=[^a-z]|$)/i, mult: 1_000_000 },
    { re: /(\d[\d.,]*)\s*(?:nghìn|nghin|k)(?=[^a-z\d]|$)/i, mult: 1_000 },
  ];
  for (const { re, mult } of UNITS) {
    const m = s.match(re);
    if (m) {
      const n = parseViNum(m[1]);
      if (n > 0) return n * mult;
    }
  }

  const rawMatch = s.match(/(\d{1,3}(?:[.,]\d{3}){2,})/);
  if (rawMatch) {
    const n = parseInt(rawMatch[1].replace(/[.,]/g, ''), 10);
    if (n > 0) return n;
  }

  const usdMatch = s.match(/\$\s*(\d[\d.,]*)|(\d[\d.,]*)\s*(?:usd|\$)/);
  if (usdMatch) {
    const n = parseViNum(usdMatch[1] || usdMatch[2]);
    if (n > 0) return n;
  }

  const bareMatch = s.match(/(\d{6,})/);
  if (bareMatch) return parseInt(bareMatch[1], 10);

  return 0;
}

describe('parseGoalAmount', () => {
  it('handles basic units', () => {
    expect(parseGoalAmount('500 triệu')).toBe(500_000_000);
    expect(parseGoalAmount('1 tỷ')).toBe(1_000_000_000);
    expect(parseGoalAmount('200tr')).toBe(200_000_000);
    expect(parseGoalAmount('50k')).toBe(50_000);
  });

  it('handles decimal separators', () => {
    expect(parseGoalAmount('1.5 tỷ')).toBe(1_500_000_000);
    expect(parseGoalAmount('1,5 tỷ')).toBe(1_500_000_000);
    expect(parseGoalAmount('2.5 triệu')).toBe(2_500_000);
  });

  it('handles tỷ rưỡi', () => {
    expect(parseGoalAmount('tỷ rưỡi')).toBe(1_500_000_000);
    expect(parseGoalAmount('2 tỷ rưỡi')).toBe(2_500_000_000);
  });

  it('extracts from natural language', () => {
    expect(parseGoalAmount('tích lũy được 500 triệu')).toBe(500_000_000);
    expect(parseGoalAmount('mục tiêu cuối năm: 1 tỷ')).toBe(1_000_000_000);
    expect(parseGoalAmount('tôi muốn tiết kiệm 300tr năm nay')).toBe(300_000_000);
  });

  it('handles thousand-separated raw numbers', () => {
    expect(parseGoalAmount('500.000.000')).toBe(500_000_000);
    expect(parseGoalAmount('500,000,000')).toBe(500_000_000);
    expect(parseGoalAmount('1.000.000.000')).toBe(1_000_000_000);
  });

  it('handles large bare integers', () => {
    expect(parseGoalAmount('500000000')).toBe(500_000_000);
  });

  it('handles EN units', () => {
    expect(parseGoalAmount('1 billion')).toBe(1_000_000_000);
    expect(parseGoalAmount('500 million')).toBe(500_000_000);
  });

  it('returns 0 for empty/unrecognized input', () => {
    expect(parseGoalAmount('')).toBe(0);
    expect(parseGoalAmount('tự do tài chính')).toBe(0);
  });
});
