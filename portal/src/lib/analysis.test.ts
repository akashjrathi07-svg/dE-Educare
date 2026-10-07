import { describe, expect, it } from 'vitest';
import { analyse, type AnalysedQuestion } from './analysis';

const q = (o: Partial<AnalysedQuestion>): AnalysedQuestion => ({
  n: 1, questionId: 'q', sectionId: 's1', section: 'QA', topic: 'Percentages', difficulty: 'easy', type: 'MCQ', text: 't',
  options: [{ key: 'A', text: '1' }, { key: 'B', text: '2' }], correct: 'B', answer: 'B', result: 'ok', marks: 3, time: 50, ideal: 60,
  peer: { avg: 60, topper: 40, acc: 70 }, solution: null, video: null, topicHistory: 80, ...o,
});

describe('analysis', () => {
  const data = analyse([
    q({ n: 1 }),
    q({ n: 2, topic: 'TSD', difficulty: 'hard', answer: 'A', result: 'bad', marks: -1, time: 250, peer: { avg: 150, topper: 90, acc: 41 }, topicHistory: 58 }),
    q({ n: 3, sectionId: 's2', section: 'DILR', topic: 'Tables', difficulty: 'medium', answer: null, result: 'skip', marks: 0, time: 10, peer: { avg: 75, topper: 50, acc: 70 }, topicHistory: 66 }),
  ]);

  it('flags time sinks over 1.4× peer time', () => {
    expect(data.timeRows.find(r => r.n === 2)!.sink).toBe(true);
    expect(data.timeStats[3].v).toBe('1');
  });

  it('sorts topics Weak → Average → Strong', () => {
    expect(data.topics.map(t => t.status)).toEqual(['Weak', 'Average', 'Strong']);
  });

  it('fills SWOT by the documented rules', () => {
    expect(data.swot.strengths.map(x => x.topic)).toEqual(['Percentages']);
    expect(data.swot.weaknesses.map(x => x.topic)).toEqual(['TSD']);
    expect(data.swot.opportunities.map(x => x.topic)).toEqual(['Tables']);
    expect(data.swot.threats.map(x => x.topic)).toEqual(['TSD']);
  });

  it("writes Guru's take from the biggest time loss", () => {
    expect(data.guruTake).toContain('TSD (4m 10s vs peers 2m 30s)');
  });

  it('falls back to ideal time before peers exist', () => {
    const d = analyse([q({ peer: null, time: 100, ideal: 60 })]);
    expect(d.peersReady).toBe(false);
    expect(d.timeRows[0].sink).toBe(true);
    expect(d.timeStats[0].s).toBe('Ideal 1m 00s');
  });
});
