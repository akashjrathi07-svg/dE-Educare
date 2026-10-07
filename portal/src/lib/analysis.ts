// Builds every tab of the result page from one attempt (ANALYSIS_LOGIC.md).
// Pure function: the caller loads answers, question metadata and peer stats.

export type Result = 'ok' | 'bad' | 'skip';
export type Difficulty = 'easy' | 'medium' | 'hard';

export type AnalysedQuestion = {
  n: number;
  questionId: string;
  sectionId: string;
  section: string;
  topic: string;
  topicNode?: string | null;       // catalog node for the topic's tests
  difficulty: Difficulty;
  type: 'MCQ' | 'TITA' | 'MSQ';
  text: string;
  setText?: string | null;
  options: { key: string; text: string }[];
  correct: string;
  answer: string | null;
  result: Result;
  marks: number;
  time: number;                    // seconds you spent
  ideal: number;
  peer: { avg: number; topper: number | null; acc: number } | null;   // null until 50 attempts
  solution: string | null;
  video: string | null;
  topicHistory: number | null;     // your accuracy on this topic over the last 5 attempts that had it
};

export const fmt = (v: number) => {
  const s = Math.max(0, Math.round(v));
  return s >= 60 ? Math.floor(s / 60) + 'm ' + String(s % 60).padStart(2, '0') + 's' : s + 's';
};

/** Reference time: peer average when we have enough attempts, otherwise the ideal time set by faculty. */
const ref = (q: AnalysedQuestion) => (q.peer ? q.peer.avg : q.ideal);
const answerText = (q: AnalysedQuestion, a: string | null) => {
  if (a == null) return 'Skipped';
  if (q.type === 'TITA') return a;
  return a.split('|').map(k => {
    const o = q.options.find(x => x.key === k);
    return o ? `${k}. ${o.text}` : k;
  }).join(', ');
};

export function analyse(qs: AnalysedQuestion[]) {
  const peersReady = qs.some(q => q.peer);
  const totT = sum(qs.map(q => q.time));
  const totRef = sum(qs.map(ref));
  const wrongT = sum(qs.filter(q => q.result === 'bad').map(q => q.time));
  const sinks = qs.filter(q => q.time > ref(q) * 1.4);

  const timeStats = [
    { k: 'Total time', v: fmt(totT), s: (peersReady ? 'Peers ' : 'Ideal ') + fmt(totRef) },
    { k: 'Avg per question', v: fmt(qs.length ? totT / qs.length : 0), s: (peersReady ? 'Peers ' : 'Ideal ') + fmt(qs.length ? totRef / qs.length : 0) },
    { k: 'Time on wrong answers', v: fmt(wrongT), s: Math.round((wrongT / Math.max(1, totT)) * 100) + '% of your time' },
    { k: 'Time sinks', v: String(sinks.length), s: 'Over 1.4× ' + (peersReady ? 'peer' : 'ideal') + ' time' },
  ];

  const tMax = Math.max(1, ...qs.map(q => Math.max(q.time, ref(q))));
  const timeRows = qs.map(q => ({
    n: q.n, questionId: q.questionId, section: q.section, topic: q.topic, difficulty: q.difficulty,
    you: q.time, peer: q.peer?.avg ?? null, topper: q.peer?.topper ?? null, ideal: q.ideal,
    youPct: Math.max(2, Math.round((q.time / tMax) * 100)), refPct: Math.max(2, Math.round((ref(q) / tMax) * 100)),
    sink: q.time > ref(q) * 1.4,
    slow: q.time > ref(q) * 1.15,
    delta: q.time - ref(q),
    result: q.result, marks: q.marks,
    peerAcc: q.peer?.acc ?? null,
    text: q.text, setText: q.setText ?? null, yours: answerText(q, q.answer), right: answerText(q, q.correct),
    solution: q.solution, video: q.video,
  }));

  const agg = (list: AnalysedQuestion[]) => {
    const c = list.filter(q => q.result === 'ok').length, w = list.filter(q => q.result === 'bad').length, n = list.length;
    const withPeer = list.filter(q => q.peer);
    return {
      n, c, w, skip: n - c - w,
      acc: c + w ? Math.round((c / (c + w)) * 100) : 0,
      peerAcc: withPeer.length ? Math.round(sum(withPeer.map(q => q.peer!.acc)) / withPeer.length) : null,
      you: sum(list.map(q => q.time)), ref: sum(list.map(ref)),
      score: round2(sum(list.map(q => q.marks))),
    };
  };

  const sectionOrder = [...new Map(qs.map(q => [q.sectionId, q.section])).entries()];
  const sections = sectionOrder.map(([id, name]) => ({ sectionId: id, name, ...agg(qs.filter(q => q.sectionId === id)) }));

  type Status = 'Weak' | 'Average' | 'Strong';
  const byTopic = [...new Map(qs.map(q => [q.topic, q])).keys()].map(topic => {
    const list = qs.filter(q => q.topic === topic);
    const g = agg(list);
    const hist = list.find(q => q.topicHistory != null)?.topicHistory ?? null;
    const wrongHere = g.w > 0;
    const status: Status = wrongHere || (hist != null && hist < 55) ? 'Weak' : g.c === g.n && (hist == null || hist >= 75) ? 'Strong' : 'Average';
    return {
      topic, section: list[0].section, node: list[0].topicNode ?? null,
      verdict: g.c === g.n ? 'Correct' : g.w ? (g.w === g.n ? 'Wrong' : `${g.c}/${g.n} correct`) : g.c ? `${g.c}/${g.n} correct` : 'Skipped',
      result: g.w ? 'bad' : g.c === g.n ? 'ok' : 'skip' as Result,
      you: g.you, ref: g.ref, slow: g.you > g.ref * 1.15, hist, peerAcc: g.peerAcc, status,
    };
  });
  const rankOf = { Weak: 0, Average: 1, Strong: 2 };
  const topics = byTopic.sort((a, b) => rankOf[a.status] - rankOf[b.status]);

  const levels: Difficulty[] = ['easy', 'medium', 'hard'];
  const difficulty = levels.map(d => {
    const g = agg(qs.filter(q => q.difficulty === d));
    const missed = g.n - g.c;
    const note = d === 'easy'
      ? missed > 0 ? `You dropped ${missed} easy question${missed > 1 ? 's' : ''}. These are the cheapest marks to win back.` : g.n ? 'Every easy question converted. Keep it that way.' : 'No easy questions in this test.'
      : d === 'medium'
        ? g.peerAcc != null ? `Medium questions decide percentiles. Peers converted ${g.peerAcc}% of these.` : 'Medium questions decide percentiles. Aim to convert at least 70%.'
        : g.you > g.ref ? `You spent ${fmt(g.you - g.ref)} more than ${peersReady ? 'peers' : 'the ideal time'} on hard questions. Skip them on the first pass.` : g.n ? 'Good restraint on hard questions.' : 'No hard questions in this test.';
    return { d, ...g, avgYou: g.n ? g.you / g.n : 0, avgRef: g.n ? g.ref / g.n : 0, slow: g.you > g.ref * 1.15, note };
  });
  const timeSplit = levels.map(d => {
    const t = sum(qs.filter(q => q.difficulty === d).map(q => q.time));
    return { d, t, pct: Math.round((t / Math.max(1, totT)) * 100) };
  });

  const item = (q: AnalysedQuestion, d: string) => ({ topic: q.topic, detail: d, node: q.topicNode ?? null });
  const swot = {
    strengths: qs.filter(q => q.result === 'ok' && q.time <= ref(q) * 1.2).map(q => item(q, `Correct in ${fmt(q.time)} · ${peersReady ? 'peers' : 'ideal'} ${fmt(ref(q))}`)),
    weaknesses: qs.filter(q => q.result === 'bad' || (q.topicHistory != null && q.topicHistory < 55)).map(q => item(q, (q.result === 'bad' ? 'Wrong here' : '') + (q.topicHistory != null ? (q.result === 'bad' ? ' · ' : '') + `${q.topicHistory}% over last 5 attempts` : ''))),
    opportunities: qs.filter(q => q.result !== 'ok' && q.difficulty !== 'hard').map(q => item(q, q.peer ? `${q.peer.acc}% of peers got this ${q.difficulty} question` : `${cap(q.difficulty)} question ${q.result === 'skip' ? 'skipped' : 'missed'}`)),
    threats: qs.filter(q => q.time > ref(q) * 1.4 || (q.result === 'bad' && q.difficulty === 'hard')).map(q => item(q, `${fmt(q.time)} vs ${peersReady ? 'peers' : 'ideal'} ${fmt(ref(q))}` + (q.result === 'bad' && q.marks < 0 ? ` · ${q.marks} mark${q.marks === -1 ? '' : 's'}` : ''))),
  };
  dedupe(swot);

  const worst = qs.slice().sort((a, b) => (b.time - ref(b)) - (a.time - ref(a)))[0];
  const easyMiss = qs.filter(q => q.result !== 'ok' && q.difficulty !== 'hard').map(q => q.topic);
  const who = peersReady ? 'peers' : 'ideal';
  const timePart = worst && worst.time > ref(worst)
    ? `You lost the most time on ${worst.topic} (${fmt(worst.time)} vs ${who} ${fmt(ref(worst))}). `
    : worst ? `You stayed within ${peersReady ? "peer" : "ideal"} time on every question. ` : '';
  const missPart = easyMiss.length
    ? `${easyMiss.length} easy or medium question${easyMiss.length > 1 ? 's' : ''} ${peersReady ? 'most peers got right' : 'within reach'} slipped in ${[...new Set(easyMiss)].slice(0, 3).join(', ')}. Fix those before your next full mock.`
    : worst ? 'Every easy and medium question converted. Push your attempt count next time.' : '';
  const guruTake = (timePart + missPart).trim();

  return { peersReady, timeStats, timeRows, sections, topics, difficulty, timeSplit, swot, guruTake };
}

function dedupe(swot: Record<string, { topic: string }[]>) {
  for (const k of Object.keys(swot)) {
    const seen = new Set<string>();
    swot[k] = swot[k].filter(x => (seen.has(x.topic) ? false : (seen.add(x.topic), true)));
  }
}
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const round2 = (n: number) => Math.round(n * 100) / 100;
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export type Analysis = ReturnType<typeof analyse>;
