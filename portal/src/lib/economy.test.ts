import { describe, expect, it } from 'vitest';
import { analysisCost, levelOf, practiceCost, reportCost, xpForResult } from './economy';

describe('Guru coin costs', () => {
  it('prices analysis by test type', () => {
    expect(analysisCost('topic')).toBe(1);
    expect(analysisCost('daily')).toBe(1);
    expect(analysisCost('sectional')).toBe(2);
    expect(analysisCost('full_mock')).toBe(3);
    expect(analysisCost('pyq')).toBe(3);
  });
  it('charges 1 coin per 10 practice questions', () => {
    expect(practiceCost(10)).toBe(1);
    expect(practiceCost(20)).toBe(2);
    expect(practiceCost(30)).toBe(3);
  });
  it('charges 5 or 10 for a progress report', () => {
    expect(reportCost(4)).toBe(5);
    expect(reportCost(10)).toBe(5);
    expect(reportCost(11)).toBe(10);
  });
});

describe('XP for a result', () => {
  it('uses the base XP by test type', () => {
    expect(xpForResult('topic', 50, null)).toBe(2);
    expect(xpForResult('sectional', 50, null)).toBe(20);
    expect(xpForResult('full_mock', 50, 60)).toBe(100);
  });
  it('multiplies for accuracy', () => {
    expect(xpForResult('sectional', 96, null)).toBe(60);
    expect(xpForResult('sectional', 88, null)).toBe(40);
    expect(xpForResult('sectional', 72, null)).toBe(30);
  });
  it('adds a percentile bonus on mocks only', () => {
    expect(xpForResult('full_mock', 50, 96)).toBe(200);
    expect(xpForResult('full_mock', 50, 99.2)).toBe(300);
    expect(xpForResult('sectional', 50, 99.2)).toBe(20);
  });
});

describe('levels', () => {
  it('names the level and the next one', () => {
    expect(levelOf(0).name).toBe('Bronze');
    expect(levelOf(2500)).toMatchObject({ name: 'Gold', next: { name: 'Platinum', at: 6000 } });
    expect(levelOf(50000).next).toBeNull();
  });
});
