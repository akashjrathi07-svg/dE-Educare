// Reference data for `npm run db:seed`. Exam rules follow EXAM_INTERFACES.md;
// verify every rule against the latest official notice before launch.

export type ExamSeed = {
  code: string; name: string; group: 'mba' | 'upsc' | 'bank' | 'ug'; status: 'live' | 'soon'; date?: string;
  secs: [code: string, name: string, questions: number, minutes: number | null][];
  total?: number; note: string;
  rules: Record<string, unknown>;
  marking: { label: string; skipPenalty?: { after: number; value: number } };
  defaultMarks: [number, number];
};

const R = (o: Partial<Record<'secTimer' | 'lock' | 'chooseOrder' | 'calc' | 'tita' | 'review' | 'lang' | 'omr' | 'split', boolean>>, nav: string, palette: string) => ({
  secTimer: false, lock: false, chooseOrder: false, calc: false, tita: false, review: true, lang: false, omr: false, split: false, ...o, nav, palette,
});

export const EXAMS: ExamSeed[] = [
  { code: 'CAT', name: 'CAT', group: 'mba', status: 'live', date: '2026-11-29', secs: [['VARC', 'VARC', 24, 40], ['DILR', 'DILR', 22, 40], ['QA', 'Quant (QA)', 22, 40]], note: 'Sectional timers with a locked order. Split screen for RC and DILR sets, on-screen calculator and TITA keypad.', rules: R({ secTimer: true, lock: true, calc: true, tita: true, split: true }, 'Within the current section', '5 states'), marking: { label: '+3 / −1 MCQ / 0 TITA' }, defaultMarks: [3, 1] },
  { code: 'MBA-CET', name: 'MBA-CET', group: 'mba', status: 'live', date: '2027-03-14', secs: [['LR', 'Logical Reasoning', 75, null], ['AR', 'Abstract Reasoning', 25, null], ['QA', 'Quantitative Aptitude', 50, null], ['VA', 'Verbal & RC', 50, null]], total: 150, note: 'One common timer, students move freely across all sections. No calculator, no negative marking.', rules: R({}, 'Free across sections', '5 states'), marking: { label: '+1 / 0' }, defaultMarks: [1, 0] },
  { code: 'SNAP', name: 'SNAP', group: 'mba', status: 'live', date: '2026-12-06', secs: [['GE', 'General English', 15, null], ['QA', 'Quant, DI & DS', 15, null], ['LR', 'Analytical & Logical Reasoning', 20, null], ['EV', 'Ethics & Values', 10, null]], total: 60, note: 'Single 60-minute timer and free navigation.', rules: R({}, 'Free across sections', '5 states'), marking: { label: '+1 / −0.25' }, defaultMarks: [1, 0.25] },
  { code: 'NMAT', name: 'NMAT', group: 'mba', status: 'live', date: '2026-11-01', secs: [['LS', 'Language Skills', 36, 28], ['QS', 'Quantitative Skills', 36, 52], ['LR', 'Logical Reasoning', 36, 40]], note: 'Students pick the section order. Each section has its own timer and closes once submitted.', rules: R({ secTimer: true, lock: true, chooseOrder: true }, 'Within the current section', '5 states'), marking: { label: '+3 / 0' }, defaultMarks: [3, 0] },
  { code: 'XAT', name: 'XAT', group: 'mba', status: 'live', date: '2027-01-03', secs: [['VALR', 'Verbal & Logical Ability', 26, null], ['DM', 'Decision Making', 21, null], ['QA', 'Quant & DI', 28, null], ['GK', 'General Knowledge', 20, null]], total: 190, note: 'Main paper on one timer, GK separately. Penalty for wrong answers and for too many skips.', rules: R({ split: true }, 'Free across main sections', '5 states'), marking: { label: '+1 / −0.25 · −0.10 per skip after 8', skipPenalty: { after: 8, value: 0.1 } }, defaultMarks: [1, 0.25] },
  { code: 'CMAT', name: 'CMAT', group: 'mba', status: 'live', date: '2027-01-24', secs: [['QT', 'Quantitative Techniques & DI', 20, null], ['LR', 'Logical Reasoning', 20, null], ['LC', 'Language Comprehension', 20, null], ['GA', 'General Awareness', 20, null], ['IE', 'Innovation & Entrepreneurship', 20, null]], total: 180, note: 'One 180-minute timer with free navigation.', rules: R({}, 'Free across sections', '4 states'), marking: { label: '+4 / −1' }, defaultMarks: [4, 1] },
  { code: 'UPSC-PRE', name: 'UPSC Prelims', group: 'upsc', status: 'soon', date: '2027-05-23', secs: [['GS1', 'GS Paper I', 100, null]], total: 120, note: 'No sections. Question booklet with an OMR answer sheet, like the offline paper. English / Hindi switch.', rules: R({ lang: true, omr: true }, 'Free', 'OMR bubbles'), marking: { label: '+2 / −0.66' }, defaultMarks: [2, 0.66] },
  { code: 'IBPS-PO', name: 'IBPS PO', group: 'bank', status: 'soon', date: '2026-10-25', secs: [['EN', 'English', 30, 20], ['QA', 'Quant', 35, 20], ['RE', 'Reasoning', 35, 20]], note: 'Sectional 20-minute timers in a fixed order. English / Hindi switch for non-English sections.', rules: R({ secTimer: true, lock: true, lang: true }, 'Within the current section', '5 states'), marking: { label: '+1 / −0.25' }, defaultMarks: [1, 0.25] },
  { code: 'IPMAT', name: 'IPMAT', group: 'ug', status: 'soon', date: '2027-05-15', secs: [['QA', 'Quantitative Ability', 60, null], ['VA', 'Verbal Ability', 45, null]], total: 120, note: 'One common timer.', rules: R({ tita: true }, 'Free across sections', '5 states'), marking: { label: '+4 / −1' }, defaultMarks: [4, 1] },
];

export const TOPICS: Record<string, Record<string, string[]>> = {
  CAT: {
    QA: ['Percentages', 'Profit & Loss', 'SI & CI', 'Ratio & Proportion', 'Time, Speed & Distance', 'Time & Work', 'Mixtures & Alligations', 'Averages', 'Linear Equations', 'Quadratic Equations', 'Inequalities', 'Functions', 'Logarithms', 'Progressions', 'Algebra', 'Triangles', 'Circles', 'Polygons', 'Coordinate Geometry', 'Mensuration', 'Number System', 'Permutation & Combination', 'Probability', 'Set Theory'],
    DILR: ['Linear & Circular Arrangements', 'Tables & Charts', 'Games & Tournaments', 'Venn Diagrams', 'Routes & Networks', 'Selection & Distribution', 'Cubes', 'Binary Logic'],
    VARC: ['Reading Comprehension', 'Para Jumbles', 'Para Summary', 'Odd Sentence Out', 'Sentence Insertion', 'Vocabulary', 'Grammar'],
  },
  'MBA-CET': {
    LR: ['Arrangements', 'Puzzles', 'Syllogisms', 'Blood Relations', 'Coding-Decoding', 'Input-Output', 'Critical Reasoning'],
    AR: ['Series', 'Analogies', 'Odd one out', 'Pattern completion'],
    QA: ['Percentages', 'Profit & Loss', 'Ratio & Proportion', 'Time & Work', 'Data Interpretation'],
    VA: ['Reading Comprehension', 'Grammar', 'Vocabulary', 'Para Jumbles', 'Fill in the blanks'],
  },
};

/** CAT score/204 → percentile (2025, approx.), used as the estimate curve until a test has 200 attempts. */
export const CAT_CURVE: [number, number][] = [[133, 99.99], [111, 99.9], [93, 99.5], [85, 99], [76, 98], [62, 95], [52, 90], [44, 85], [38, 80], [26, 60], [0, 20]]
  .map(([s, p]) => [+(s / 204).toFixed(4), p] as [number, number]);
export const GENERIC_CURVE: [number, number][] = [[0.75, 99.5], [0.6, 98], [0.5, 95], [0.4, 90], [0.3, 80], [0.2, 65], [0.1, 45], [0, 20]];

// Tests tree (Tests screen). [id, parent, name, sub, examCode?, free?]
export const TREE: [string, string | null, string, string, string?, boolean?][] = [
  ['mba', null, 'MBA', 'CAT, MBA-CET and OMETs'],
  ['cat', 'mba', 'CAT', 'IIMs and top B-schools', 'CAT'],
  ['cat-series', 'cat', 'CAT Test Series', 'Mocks, sectional tests and topic tests', 'CAT'],
  ['ts-mocks', 'cat-series', 'CAT Mocks', 'Full length · 68 Q · 120 min', 'CAT'],
  ['ts-sec', 'cat-series', 'Sectional Tests', 'Quant, DILR and Verbal', 'CAT'],
  ['sec-qa', 'ts-sec', 'Quant', '22 Q · 40 min', 'CAT'],
  ['sec-dilr', 'ts-sec', 'DILR', '22 Q · 40 min', 'CAT'],
  ['sec-varc', 'ts-sec', 'Verbal (VARC)', '24 Q · 40 min', 'CAT'],
  ['ts-topic', 'cat-series', 'Topic Tests', 'Practice one topic at a time', 'CAT'],
  ['tp-qa', 'ts-topic', 'Quant', 'Arithmetic, Algebra, Geometry, Number System', 'CAT'],
  ['tp-dilr', 'ts-topic', 'DILR', 'By set type', 'CAT'],
  ['tp-varc', 'ts-topic', 'Verbal', 'By question type', 'CAT'],
  ['cat-mocks', 'cat', '10 CAT Mocks', 'Standalone full-length mocks', 'CAT'],
  ['cat-daily', 'cat', 'CAT Daily Free Test', 'New 5-question test every day', 'CAT', true],
  ['cat-pyq', 'cat', 'Previous Year Papers', 'Attempt as mocks', 'CAT', true],
  ['cet', 'mba', 'MBA-CET', 'MBA CET Maharashtra', 'MBA-CET'],
  ['cet-mocks', 'cet', 'CET Mocks', '200 Q · 150 min', 'MBA-CET'],
  ['cet-series', 'cet', 'CET Test Series', 'Mocks, sectionals and topic tests', 'MBA-CET'],
  ['cet-sm', 'cet-series', 'Test Series Mocks', '200 Q · 150 min', 'MBA-CET'],
  ['cet-sec', 'cet-series', 'Sectional Tests', 'LR, AR, QA and VA', 'MBA-CET'],
  ['cet-topic', 'cet-series', 'Topic Tests', 'One topic at a time', 'MBA-CET'],
  ['cet-daily', 'cet', 'CET Daily Free Test', 'New 5-question test every day', 'MBA-CET', true],
  ['omet', 'mba', 'OMETs', 'XAT, SNAP, NMAT, CMAT'],
  ['xat', 'omet', 'XAT', 'XLRI and XAT-accepting schools', 'XAT'],
  ['snap', 'omet', 'SNAP', 'Symbiosis institutes', 'SNAP'],
  ['nmat', 'omet', 'NMAT', 'NMIMS and partner schools', 'NMAT'],
  ['cmat', 'omet', 'CMAT', 'AICTE-approved institutes', 'CMAT'],
  ['upsc', null, 'UPSC', 'Civil Services Examination · launching soon', 'UPSC-PRE'],
  ['bank', null, 'Bank PO', 'IBPS, SBI, RBI and clerk exams · launching soon', 'IBPS-PO'],
  ['ug', null, 'Undergrad', 'IPMAT, CUET and law entrances · launching soon', 'IPMAT'],
];

// Plans. Slugs match the website's plan ids. Prices in rupees; 0 + draft = coming soon.
export const COURSES = [
  { slug: 'cat-10', name: '10 CAT Mocks', exam: 'CAT', price: 1200, mrp: 1999, badge: 'Recommended', desc: 'Full-length mocks plus previous year papers as mocks.', features: ['10 full-length CAT mocks', 'All-India percentile', 'Worked solutions', '10 Guru questions a day'], includes: ['Full mocks', 'Previous papers'], guru: '10/day', status: 'live' },
  { slug: 'cat-ts', name: 'CAT Test Series', exam: 'CAT', price: 2500, mrp: 4999, badge: 'Most popular', desc: '20 mocks · 30 sectionals · 3 topic tests per topic', features: ['20 full-length CAT mocks', '30 sectionals + topic tests', 'Detailed analysis', 'Unlimited Guru'], includes: ['Full mocks', 'Sectionals', 'Topic tests', 'Previous papers'], guru: 'unlimited', status: 'live' },
  { slug: 'cet-mock', name: 'CET Mock Series', exam: 'MBA-CET', price: 0, mrp: 0, desc: 'Full-length CET mocks at real exam speed.', features: ['Full-length CET mocks', 'Speed tracking per section'], includes: ['Full mocks'], guru: '10/day', status: 'draft' },
  { slug: 'cet-ts', name: 'CET Test Series', exam: 'MBA-CET', price: 0, mrp: 0, desc: 'Mocks, sectionals and topic tests across all four sections.', features: ['Mocks + sectionals + topic tests', 'Section-wise analysis', 'Unlimited Guru'], includes: ['Full mocks', 'Sectionals', 'Topic tests'], guru: 'unlimited', status: 'draft' },
  { slug: 'cet-crash', name: 'CET Crash Course', exam: 'MBA-CET', price: 0, mrp: 0, desc: 'Weekly lectures with the full Test Series.', features: ['Weekly lectures', 'Full Test Series included'], includes: ['Live classes', 'Recordings', 'Full mocks', 'Sectionals'], guru: 'unlimited', status: 'draft' },
  { slug: 'om-pack', name: 'OMET Mock Pack', exam: 'SNAP', price: 0, mrp: 0, desc: 'Mocks for SNAP, NMAT, XAT and CMAT.', features: ['SNAP, NMAT, XAT, CMAT mocks', 'Exam-specific interfaces', 'XAT essay scored by Guru'], includes: ['Full mocks', 'Sectionals'], guru: '10/day', status: 'draft' },
  { slug: 'om-single', name: 'Single-exam OMET pack', exam: 'SNAP', price: 0, mrp: 0, desc: 'Mocks and sectionals for one OMET.', features: ['Full-length mocks', 'Sectional tests'], includes: ['Full mocks', 'Sectionals'], guru: '10/day', status: 'draft' },
];

export const REWARDS: [string, string, number, Record<string, unknown>][] = [
  ['free-sectional', 'Free sectional test', 800, { test_credit: 'sectional' }],
  ['extra-mock', 'Extra full-length mock', 1000, { test_credit: 'mock' }],
  ['series-200', '₹200 off any test series', 1500, { coupon_flat: 20000 }],
  ['priority-doubts', 'Priority doubt solving, 30 days', 2000, { guru_credits: 200 }],
  ['all-20', '20% off any plan', 3500, { coupon_percent: 20 }],
];

// ---------------------------------------------------------------------------
// DEMO CONTENT (npm run db:seed -- --demo). Sample questions and activity so
// every screen can be tried. Do not load into the production database.
// ---------------------------------------------------------------------------

type Q = { exam: string; sec: string; topic: string; sub?: string; type: 'MCQ' | 'TITA' | 'MSQ'; diff: 'easy' | 'medium' | 'hard'; ideal: number; text: string; o: string[]; a: string; sol: string; set?: string; stats?: [attempts: number, avgTime: number, topper: number, peerAcc: number] };

export const DEMO_QUESTIONS: Q[] = [
  { exam: 'CAT', sec: 'QA', topic: 'Profit & Loss', sub: 'Successive discounts', type: 'MCQ', diff: 'easy', ideal: 60, text: 'A shopkeeper marks an item 40% above cost price and then gives a 20% discount. What is his profit percentage?', o: ['10%', '12%', '16%', '20%'], a: 'B', sol: 'Let cost price = 100. Marked price = 140.\nAfter a 20% discount, selling price = 140 × 0.8 = 112.\nProfit = 12 on 100, so 12%.\nShortcut: successive change = 40 − 20 − (40 × 20)/100 = 12%.', stats: [1820, 80, 55, 72] },
  { exam: 'CAT', sec: 'QA', topic: 'Time, Speed & Distance', sub: 'Trains', type: 'MCQ', diff: 'hard', ideal: 75, text: 'Two trains, 120 m and 180 m long, run in opposite directions at 54 km/h and 36 km/h. How long do they take to cross each other?', o: ['10 s', '12 s', '15 s', '18 s'], a: 'B', sol: 'Opposite directions, so add speeds: 54 + 36 = 90 km/h.\nConvert: 90 × 5/18 = 25 m/s.\nDistance to cover = 120 + 180 = 300 m.\nTime = 300 / 25 = 12 s.', stats: [1544, 150, 90, 41] },
  { exam: 'CAT', sec: 'QA', topic: 'Algebra', sub: 'Identities', type: 'TITA', diff: 'easy', ideal: 45, text: 'If x + 1/x = 4, what is the value of x² + 1/x²?', o: [], a: '14', sol: 'Square both sides of x + 1/x = 4.\nx² + 2 + 1/x² = 16.\nSo x² + 1/x² = 14.\nCommon slip: forgetting the middle term 2.', stats: [2210, 70, 40, 78] },
  { exam: 'CAT', sec: 'QA', topic: 'Percentages', type: 'MCQ', diff: 'easy', ideal: 45, text: 'A price rises by 20% and then falls by 20%. What is the net change?', o: ['No change', '4% decrease', '4% increase', '2% decrease'], a: 'B', sol: 'Net change = a + b + ab/100 = 20 − 20 − 400/100 = −4%. So a 4% decrease.', stats: [2410, 50, 30, 74] },
  { exam: 'CAT', sec: 'QA', topic: 'Ratio & Proportion', type: 'MCQ', diff: 'easy', ideal: 45, text: 'A and B share ₹1,200 in the ratio 5 : 7. How much does B get?', o: ['₹500', '₹600', '₹700', '₹750'], a: 'C', sol: 'B gets 7/12 of 1,200 = ₹700.', stats: [1980, 42, 25, 88] },
  { exam: 'CAT', sec: 'QA', topic: 'Time & Work', type: 'MCQ', diff: 'medium', ideal: 60, text: 'A can finish a job in 10 days and B in 15 days. Working together, how many days will they take?', o: ['5', '6', '7.5', '8'], a: 'B', sol: 'Combined rate = 1/10 + 1/15 = 1/6 of the job per day, so 6 days.', stats: [1760, 66, 40, 69] },
  { exam: 'CAT', sec: 'DILR', topic: 'Linear & Circular Arrangements', sub: 'Linear', type: 'MCQ', diff: 'hard', ideal: 120, set: 'DILR-SET-07', text: 'A, B, C, D and E sit in a row facing north. C is in the middle. A is to the immediate left of C and D to the immediate right of C. E sits at one end but not next to B. Who sits at the other end?', o: ['A', 'B', 'D', 'E'], a: 'B', sol: 'Seats 1 to 5. C is in seat 3, so A is in 2 and D is in 4.\nSeats 1 and 5 remain for B and E.\nWhichever end E takes, B takes the other. Answer: B.', stats: [1310, 200, 140, 33] },
  { exam: 'CAT', sec: 'DILR', topic: 'Games & Tournaments', sub: 'Round robin', type: 'TITA', diff: 'easy', ideal: 40, text: 'In a tournament, each of 8 teams plays every other team exactly once. How many matches are played?', o: [], a: '28', sol: 'Each pair of teams plays once, so count pairs: 8C2 = (8 × 7) / 2 = 28.', stats: [1988, 65, 40, 81] },
  { exam: 'CAT', sec: 'DILR', topic: 'Tables & Charts', type: 'MCQ', diff: 'medium', ideal: 50, text: "A company's sales grew from ₹240 crore to ₹300 crore in one year. What was the growth rate?", o: ['20%', '25%', '30%', '60%'], a: 'B', sol: 'Growth = (300 − 240) / 240 = 60 / 240 = 25%.\nTip: always divide by the starting value.', stats: [1650, 75, 50, 70] },
  { exam: 'CAT', sec: 'VARC', topic: 'Vocabulary', type: 'MCQ', diff: 'easy', ideal: 20, text: "Choose the word closest in meaning to 'ubiquitous'.", o: ['Rare', 'Found everywhere', 'Ancient', 'Unclear'], a: 'B', sol: "'Ubiquitous' means present or found everywhere.", stats: [2600, 35, 20, 88] },
  { exam: 'CAT', sec: 'VARC', topic: 'Odd Sentence Out', type: 'TITA', diff: 'medium', ideal: 80, text: 'Find the odd sentence out and type its number. (1) The monsoon arrived early this year. (2) Farmers began sowing in the first week of June. (3) Reservoir levels rose above the seasonal average. (4) Stock markets closed higher on Friday.', o: [], a: '4', sol: 'Sentences 1, 2 and 3 describe the monsoon and its effect on farming.\nSentence 4 is about stock markets and breaks the theme. Answer: 4.', stats: [1402, 110, 75, 52] },
  { exam: 'CAT', sec: 'VARC', topic: 'Grammar', type: 'MCQ', diff: 'medium', ideal: 40, text: 'Choose the correctly punctuated sentence.', o: ["Its a long road, but we'll get there.", "It's a long road but, we'll get there.", "It's a long road, but we'll get there.", "Its' a long road, but we'll get there."], a: 'C', sol: "It's = it is. A comma comes before 'but' when it joins two independent clauses.\nSo: It's a long road, but we'll get there.", stats: [1880, 60, 35, 64] },
  { exam: 'CAT', sec: 'VARC', topic: 'Reading Comprehension', type: 'MCQ', diff: 'medium', ideal: 90, set: 'RC-SET-01', text: 'According to the passage, why do cities with dense public transport see lower per-capita emissions?', o: ['People earn less', 'Fewer short car trips are needed', 'Buildings are smaller', 'Fuel is more expensive'], a: 'B', sol: 'The passage links dense transit networks to fewer short car trips, which drives down per-capita emissions.', stats: [1200, 95, 70, 66] },
  { exam: 'MBA-CET', sec: 'LR', topic: 'Coding-Decoding', type: 'MCQ', diff: 'easy', ideal: 30, text: 'If CAT is coded as DBU, how is DOG coded?', o: ['EPH', 'EPG', 'DPH', 'FQI'], a: 'A', sol: 'Each letter moves one step forward: D→E, O→P, G→H. So EPH.', stats: [960, 32, 20, 84] },
  { exam: 'MBA-CET', sec: 'LR', topic: 'Syllogisms', type: 'MCQ', diff: 'medium', ideal: 40, text: 'All pens are books. Some books are bags. Which conclusion definitely follows?', o: ['All bags are pens', 'Some pens are bags', 'Some books are pens', 'No bag is a pen'], a: 'C', sol: 'All pens are books, so some books are pens. The other conclusions are not certain.', stats: [880, 45, 28, 61] },
  { exam: 'MBA-CET', sec: 'AR', topic: 'Series', type: 'MCQ', diff: 'medium', ideal: 35, text: 'Find the next number: 2, 6, 12, 20, 30, ?', o: ['40', '42', '44', '36'], a: 'B', sol: 'Differences are 4, 6, 8, 10, so the next is 12. 30 + 12 = 42.', stats: [870, 38, 22, 69] },
  { exam: 'MBA-CET', sec: 'QA', topic: 'Percentages', type: 'MCQ', diff: 'easy', ideal: 35, text: 'What is 15% of 240?', o: ['32', '36', '38', '40'], a: 'B', sol: '10% is 24 and 5% is 12, so 15% = 36.', stats: [940, 30, 18, 90] },
  { exam: 'MBA-CET', sec: 'VA', topic: 'Grammar', type: 'MCQ', diff: 'easy', ideal: 25, text: 'Choose the correct sentence.', o: ['Neither of them are coming.', 'Neither of them is coming.', 'Neither of them were coming.', 'Neither of them have come.'], a: 'B', sol: "'Neither' is singular, so it takes 'is'.", stats: [910, 28, 15, 76] },
];

export const DEMO_SETS: Record<string, string> = {
  'DILR-SET-07': 'Five friends A, B, C, D and E sit in a row of five seats facing north. C sits in the middle seat. A sits to the immediate left of C, and D to the immediate right of C. E sits at one of the ends but not next to B.',
  'RC-SET-01': 'Cities with dense public transport networks consistently report lower per-capita emissions than sprawling ones. The reason is less about cleaner vehicles than about distance: when shops, schools and offices sit within a short ride, residents make fewer short car trips. Planners who chase electric cars without fixing distance, the passage argues, solve the smaller half of the problem.',
};

export const DEMO_STUDENTS: [name: string, phone: string, xp: number, city: string][] = [
  ['Aditya R', '+919920155821', 9840, 'Mumbai'], ['Meera K', '+919004412873', 9410, 'Pune'], ['Sahil P', '+919833077412', 9105, 'Thane'],
  ['Ananya D', '+919769033190', 8870, 'Navi Mumbai'], ['Rohan V', '+919167290021', 8620, 'Nagpur'], ['Priya S', '+919811122233', 6200, 'Mumbai'],
  ['Aman K', '+919811122234', 5100, 'Nashik'], ['Neha I', '+919811122235', 4700, 'Pune'],
];

export const DEMO_LIBRARY: ['video' | 'pdf', string, string, number][] = [
  ['video', 'TSD shortcuts for CAT', 'Arjun Mehta · 1h 12m', 240], ['video', 'Para Jumbles: the anchor method', 'Neha Iyer · 58m', 190],
  ['video', 'Mock 4 live analysis', 'Arjun Mehta · 1h 35m', 310], ['video', 'Games & Tournaments sets', 'Rohit Sen · 1h 04m', 210],
  ['video', 'Geometry in 60 minutes', 'Arjun Mehta · 1h 01m', 205], ['pdf', 'Arithmetic formula sheet', '12 pages', 2.4],
  ['pdf', 'DILR set types handbook', '36 pages', 6.1], ['pdf', 'VARC vocabulary list', '20 pages', 1.8], ['pdf', 'CAT 2025 paper with solutions', '64 pages', 9.3],
];

export const DEMO_POSTS: [channel: string, by: number, title: string, body: string, votes: number][] = [
  ['CAT Quant', 5, 'Fastest way to solve successive percentage change?', 'I keep writing out the full multiplication. Is there a one-line method for CAT?', 42],
  ['DILR', 6, 'Mock 4 set 3 (circular arrangement) felt impossible', 'Took 14 minutes and still got it wrong. How did people approach it?', 31],
  ['VARC', 7, 'Para jumbles: anchor-first works for me', 'Find the opening sentence by elimination, then follow pronoun links. Went from 1/4 to 3/4.', 58],
  ['MBA-CET', 1, 'How many LR questions do you attempt in CET?', 'I am stuck at 55 of 75 in the time I give LR. What is a realistic target?', 19],
];

/** CAT Quant topic groups for the Tests tree (matches the website's syllabus). */
export const CAT_QA_GROUPS: [id: string, name: string, sub: string, topics: string[]][] = [
  ['tp-ar', 'Arithmetic', 'Percentages to Averages', ['Percentages', 'Profit & Loss', 'SI & CI', 'Ratio & Proportion', 'Time, Speed & Distance', 'Time & Work', 'Mixtures & Alligations', 'Averages']],
  ['tp-al', 'Algebra', 'Equations to Progressions', ['Linear Equations', 'Quadratic Equations', 'Inequalities', 'Functions', 'Logarithms', 'Progressions']],
  ['tp-ge', 'Geometry', 'Triangles to Mensuration', ['Triangles', 'Circles', 'Polygons', 'Coordinate Geometry', 'Mensuration']],
  ['tp-nm', 'Number System & Modern Maths', 'Numbers, P&C, Probability', ['Number System', 'Permutation & Combination', 'Probability', 'Set Theory']],
];

/** OMET topic lists, as on the website (section index → topics). */
export const OMET_TOPICS: Record<string, [secIndex: number, topics: string[]][]> = {
  SNAP: [[0, ['RC', 'Para Jumbles', 'Grammar', 'Vocabulary']], [1, ['Arithmetic', 'Algebra', 'Geometry', 'DI sets']], [2, ['Arrangements', 'Puzzles', 'Syllogisms', 'Coding']]],
  NMAT: [[0, ['RC', 'Grammar', 'Vocabulary', 'Para Jumbles']], [1, ['Arithmetic', 'Algebra', 'DI', 'Data Sufficiency']], [2, ['Arrangements', 'Critical Reasoning', 'Syllogisms']]],
  XAT: [[0, ['RC', 'Critical Reasoning', 'Grammar', 'Para Jumbles']], [1, ['Caselets', 'Ethical dilemmas', 'Data arrangement']], [2, ['Arithmetic', 'Algebra', 'Geometry', 'DI']]],
  CMAT: [[0, ['Arithmetic', 'Algebra', 'DI']], [1, ['Arrangements', 'Series', 'Coding']], [3, ['Current affairs', 'Static GK', 'Business']]],
};
