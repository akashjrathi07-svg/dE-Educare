<?php
/**
 * Site copy, prices, exam data and FAQs, ported from "De educare Website v4".
 *
 * This is the one file to edit for content changes: prices, dates, FAQs,
 * colleges and cutoffs. Every page and the structured data (JSON-LD) read
 * from here, so a change shows up everywhere at once.
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

define( 'DE_GURU_FALLBACK', 'Start with one full mock to find your baseline, then pick your two weakest topics and take their topic tests daily. Add a sectional every other day. Analyse each mock for twice as long as you took it.' );

/** Topic lists shared by CAT and MBA-CET. */
function de_topics() {
	return array(
		'arith' => array( 'Percentages', 'Profit & Loss', 'SI & CI', 'Ratio & Proportion', 'Time, Speed & Distance', 'Time & Work', 'Mixtures & Alligations', 'Averages' ),
		'alg'   => array( 'Linear Equations', 'Quadratic Equations', 'Inequalities', 'Functions', 'Logarithms', 'Progressions' ),
		'geo'   => array( 'Triangles', 'Circles', 'Polygons', 'Coordinate Geometry', 'Mensuration' ),
		'num'   => array( 'Number System', 'Permutation & Combination', 'Probability', 'Set Theory' ),
		'dilr'  => array( 'Linear & Circular Arrangements', 'Tables & Charts', 'Games & Tournaments', 'Venn Diagrams', 'Routes & Networks', 'Selection & Distribution', 'Cubes', 'Binary Logic' ),
		'varc'  => array( 'Reading Comprehension', 'Para Jumbles', 'Para Summary', 'Odd Sentence Out', 'Sentence Insertion' ),
	);
}

/**
 * Plans per exam. A price of '₹ —' means "pricing coming soon": the button
 * shows a notice instead of going to checkout. Set real prices here.
 */
function de_plans() {
	return de_apply_portal_prices( array(
		'cat'  => array(
			array( 'id' => 'cat-free', 'name' => 'Daily Free Test', 'price' => 'Free', 'amount' => 0, 'desc' => 'A fresh test every day across VARC, DILR and Quant, free forever.', 'feat' => array( 'One new test every day', 'CAT-style interface', 'Instant scorecard' ), 'best' => 'For building a daily habit.', 'cta' => 'Start today’s test', 'free' => true ),
			array( 'id' => 'cat-10', 'name' => '10 CAT Mocks', 'tag' => 'RECOMMENDED', 'price' => '₹1,200', 'amount' => 1200, 'desc' => 'Full-length mocks plus previous year papers as mocks, at real exam difficulty and length.', 'feat' => array( '10 full-length CAT mocks', 'All-India percentile', 'Worked solutions', 'Performance scorecard' ), 'best' => 'For students who know the syllabus and want volume.', 'cta' => 'Buy 10 Mocks' ),
			array( 'id' => 'cat-ts', 'name' => 'CAT Test Series', 'tag' => 'MOST POPULAR', 'price' => '₹2,500', 'amount' => 2500, 'mrp' => 3000, 'desc' => '20 full-length mocks, 10 sectionals per section, 3 topic tests per topic, PYQs as mocks.', 'feat' => array( '20 mocks, 30 sectionals', '3 topic tests per topic', 'Topic-wise analytics', 'Unlimited Guru', 'New tests added through the year' ), 'best' => 'For structured practice at every level.', 'cta' => 'Get the Test Series', 'dark' => true ),
		),
		'cet'  => array(
			array( 'id' => 'cet-free', 'name' => 'Daily Free Test', 'price' => 'Free', 'amount' => 0, 'desc' => 'A fresh CET-pattern test every day across LR, AR, QA and VA.', 'feat' => array( 'New test daily', 'Instant scorecard' ), 'best' => 'For a daily practice habit from day one.', 'cta' => 'Start free', 'free' => true ),
			array( 'id' => 'cet-mock', 'name' => 'CET Mock Series', 'price' => '₹ —', 'desc' => 'Full-length mocks that match the real exam’s speed. CET rewards quick, accurate attempts with no penalty for guessing.', 'feat' => array( 'Full-length CET mocks', 'Speed tracking per section' ), 'best' => 'For high-volume, realistic mock practice.', 'cta' => 'Buy Mock Series' ),
			array( 'id' => 'cet-ts', 'name' => 'CET Test Series', 'tag' => 'MOST POPULAR', 'price' => '₹1,800', 'amount' => 1800, 'mrp' => 2500, 'desc' => '30 full-length mocks, 40 sectionals (10 per section) and 3 topic tests for every topic, with section-wise analysis.', 'feat' => array( '30 mocks, 40 sectionals', '3 topic tests per topic', 'Section-wise speed analysis', 'Unlimited Guru' ), 'best' => 'From foundation to exam-ready.', 'cta' => 'Get the Test Series', 'dark' => true ),
		),
		'omet' => array(
			array( 'id' => 'om-pack', 'name' => 'OMET Combo', 'tag' => 'ALL 4 EXAMS', 'price' => '₹3,000', 'amount' => 3000, 'mrp' => 4500, 'desc' => '15 mocks each for SNAP, NMAT, XAT and CMAT, sectionals for every section and 3 topic tests per topic, each in its own pattern and timing.', 'feat' => array( '15 mocks per exam (60 in all)', 'Sectionals for every section', '3 topic tests per topic', 'Exam-specific interfaces' ), 'best' => 'For students writing more than one OMET.', 'cta' => 'Get the OMET Combo', 'dark' => true ),
			array( 'id' => 'om-single', 'name' => 'Individual OMET', 'price' => '₹1,000', 'amount' => 1000, 'mrp' => 1500, 'desc' => '15 mocks, sectionals and topic tests for one OMET of your choice.', 'feat' => array( '15 full-length mocks', 'Sectional tests', '3 topic tests per topic' ), 'best' => 'For a single target exam.', 'cta' => 'Choose exam' ),
		),
	) );
}

/** Exam page content for CAT and MBA-CET (OMETs are in de_omets()). */
function de_exams() {
	$t = de_topics();
	return array(
		'cat'  => array(
			'name'    => 'CAT',
			'slug'    => 'cat',
			'eyebrow' => 'COMMON ADMISSION TEST · IIMs',
			'title'   => 'CAT mocks that feel like the slot you’ll actually sit.',
			'intro'   => 'Full-length mocks, sectional tests for Quant, DILR and VARC, and topic tests down to each Arithmetic, Algebra and Geometry chapter.',
			'freeCta' => 'Take today’s free CAT test',
			'img'     => 'img_cat',
			'tone'    => '#1F3A8A',
			'stats'   => array( array( '20', 'Full mocks' ), array( '30', 'Sectionals' ), array( '3 / topic', 'Topic tests' ), array( '₹2,500', 'Test Series' ) ),
			'qa'      => array( 'q' => 'What is CAT?', 'a' => 'CAT (Common Admission Test) is the computer-based entrance exam for the IIMs and most top B-schools in India. It has three sections, VARC, DILR and Quant, with about 68 questions in 120 minutes, and is usually held on the last Sunday of November.', 'facts' => array( array( '29 Nov 2026', 'Next exam (indicative)' ), array( '120 min', 'Duration · 40 per section' ), array( '68 Q', 'MCQ + TITA' ), array( '+3 / −1', 'No negative for TITA' ) ) ),
			'ov'      => array(
				'h'        => 'How the CAT Test Series is built',
				'p'        => 'CAT is a test of selection under time pressure. The series moves from topic tests that fix single gaps, to sectionals that train 40-minute section discipline, to full mocks that build two-hour stamina.',
				'tlH'      => 'A suggested CAT timeline',
				'points'   => array( array( '01', 'Topic tests', 'Three tests for every topic, from Percentages to Para Jumbles.' ), array( '02', 'Sectional tests', '10 per section with the section lock and timer of the real exam.' ), array( '03', 'Full mocks', '20 full-length mocks plus PYQs presented as mocks.' ), array( '04', 'Guru analysis', 'Topic accuracy, time per question and a fix list after every attempt.' ) ),
				'timeline' => array( array( 'MONTHS 1–3', 'Concepts and topic tests', 'Clear one topic at a time and take its three topic tests.', '#1F3A8A' ), array( 'MONTHS 4–5', 'Sectionals', 'One sectional every other day to build section speed.', 'oklch(0.55 0.15 150)' ), array( 'MONTH 6', 'Mocks every weekend', 'Analyse each mock for twice as long as you took it.', 'oklch(0.6 0.19 40)' ), array( 'FINAL 3 WEEKS', 'Two mocks a week', 'Fix strategy, not syllabus.', 'oklch(0.5 0.17 300)' ) ),
			),
			'pat'     => array(
				'h'     => 'CAT exam pattern',
				'rows'  => array( array( 'VARC · Verbal Ability & RC', '24', '40 min' ), array( 'DILR · Data Interpretation & LR', '22', '40 min' ), array( 'QA · Quantitative Aptitude', '22', '40 min' ), array( 'Total', '68', '120 min' ) ),
				'marks' => array( array( '+3', 'Correct answer' ), array( '−1', 'Wrong MCQ' ), array( '0', 'Wrong TITA' ), array( '204', 'Maximum marks' ) ),
				'score' => array( array( 133, '99.99' ), array( 111, '99.9' ), array( 93, '99.5' ), array( 85, '99' ), array( 76, '98' ), array( 62, '95' ), array( 52, '90' ), array( 44, '85' ), array( 38, '80' ) ),
			),
			'syl'     => array(
				array( 'm' => 'QA', 'code' => 'QA', 'name' => 'Quantitative Aptitude', 'meta' => 'Arithmetic, Algebra, Geometry, Number System', 'groups' => array( array( 'Arithmetic', $t['arith'] ), array( 'Algebra', $t['alg'] ), array( 'Geometry', $t['geo'] ), array( 'Number System & Modern Maths', $t['num'] ) ) ),
				array( 'm' => 'LR', 'code' => 'DILR', 'name' => 'DILR', 'meta' => 'Data Interpretation and Logical Reasoning', 'groups' => array( array( '', $t['dilr'] ) ) ),
				array( 'm' => 'VA', 'code' => 'VARC', 'name' => 'VARC', 'meta' => 'Verbal Ability and Reading Comprehension', 'groups' => array( array( '', $t['varc'] ) ) ),
			),
			'info'    => array(
				'factsH'    => 'CAT eligibility, fee and key dates',
				'facts'     => array( array( 'Conducting body', 'One of the IIMs, on rotation' ), array( 'Exam mode', 'Computer-based, 3 slots in one day' ), array( 'Usually held', 'Last Sunday of November' ), array( 'Registration', 'August to September' ), array( 'Eligibility', 'Bachelor’s degree with 50% (45% for SC, ST, PwD). Final-year students can apply.' ), array( 'Application fee', 'About ₹2,600 (General), ₹1,300 (reserved)' ), array( 'Attempts', 'No limit' ), array( 'Score validity', 'One admission cycle' ) ),
				'dates'     => array( array( 'Aug 2026', 'Notification and registration open' ), array( 'Sep 2026', 'Registration closes' ), array( 'Nov 2026', 'Admit card' ), array( '29 Nov 2026', 'CAT 2026 exam' ), array( 'Jan 2027', 'Result' ) ),
				'dateNote'  => 'Dates are indicative. Check iimcat.ac.in for the official schedule.',
				'collegesH' => 'Top colleges that accept CAT',
				'cutNote'   => 'Indicative overall percentile ranges from recent cycles for General category. Actual cutoffs vary by category, profile and year.',
				'colleges'  => array( array( 'IIM Ahmedabad', '99+' ), array( 'IIM Bangalore', '99+' ), array( 'IIM Calcutta', '99+' ), array( 'FMS Delhi', '98–99' ), array( 'IIM Lucknow', '97–99' ), array( 'IIM Kozhikode', '97–99' ), array( 'IIM Indore', '97–99' ), array( 'MDI Gurgaon', '95–97' ), array( 'SPJIMR Mumbai', '95+' ), array( 'IIT Bombay SJMSOM', '95+' ), array( 'IIM Shillong', '95–97' ), array( 'Newer IIMs', '92–96' ) ),
				'stratH'    => 'How to prepare for CAT 2026',
				'strategy'  => array(
					array( 'A 6-month CAT plan', 'Spend the first three months on concepts with a topic test after every chapter. Move to sectionals in months four and five, then a full mock every weekend in the final stretch. Analyse each mock for longer than the two hours you spent on it.' ),
					array( 'Quant (QA)', 'Arithmetic carries the most weight. Master Percentages, Ratios, TSD and Time & Work first, then Algebra. In the exam, attempt questions you can solve in under two minutes and leave the rest.' ),
					array( 'DILR', 'Selection decides your DILR score. Spend the first four minutes scanning every set and pick the two you are surest of. Practise one set type a day with topic tests.' ),
					array( 'VARC', 'Read daily: editorials, essays and long-form journalism. RCs make up most of the section, so RC accuracy matters more than para jumbles. TITA para jumbles carry no negative marking.' ),
					array( 'Using mocks well', 'Take mocks at the same time as your slot. After each one, review every question, not just wrong ones, and note why you picked or skipped it. Guru turns these notes into your next week’s plan.' ),
					array( 'Preparing while working', 'Plan two focused hours on weekdays and five to six on weekends. Fifteen-minute topic tests fit into a commute or lunch break.' ),
				),
			),
			'faq'     => array(
				array( 'How many mocks should I take before CAT?', 'Most 99 percentilers take 25 to 40 full mocks. Start with one a week from August and move to two a week in the last month. The CAT Test Series has 20 mocks, and the 10 CAT Mocks pack adds 10 more.' ),
				array( 'How close are DE Educare mocks to the real CAT?', 'They follow the current pattern: three sections with a 40-minute section lock, MCQ and TITA questions, and the same on-screen palette and calculator.' ),
				array( 'What does the AI analysis show after a test?', 'Section scores, accuracy, time per question, topics that cost marks, and a written plan from Guru with the next tests to take.' ),
				array( 'What is the difference between 10 CAT Mocks and the CAT Test Series?', '10 CAT Mocks is full-length practice only. The Test Series adds 20 more mocks, 30 sectionals, three topic tests for every topic and unlimited Guru.' ),
				array( 'Are topic tests available for every chapter?', 'Yes. Every Quant, DILR and VARC topic has three topic tests of 10 questions each, from Percentages to Para Jumbles.' ),
				array( 'Is there negative marking in CAT?', 'Yes. A wrong MCQ costs 1 mark. TITA questions have no negative marking.' ),
				array( 'What score do I need for 99 percentile?', 'In recent years it has been roughly 85 out of 204, though it varies by slot and year. Use the percentile predictor on Free resources for an estimate.' ),
				array( 'Can I take mocks on my phone?', 'Yes. Log in to the DE Educare app with the same mobile number. Attempts, scores and AI analysis sync both ways.' ),
				array( 'Is the daily free test really free?', 'Yes, always. A new test is added every day and includes the same AI analysis as paid tests.' ),
				array( 'Can I prepare for CAT while working?', 'Yes. Two focused hours on weekdays and longer sessions on weekends are enough for most working students. Short topic tests fit around work.' ),
			),
			// Test catalogue shown in the "Tests" section. IDs must match the portal's test IDs.
			'catalog' => array(
				'pfx'        => 'cat',
				'label'      => 'CAT',
				'tabs'       => array( '10 CAT Mocks', 'CAT Test Series' ),
				'mocks'      => array( 'n' => 10, 'prefix' => 'CAT Mock', 'q' => 68, 'mins' => 120 ),
				'mockPlan'   => array( 'cat-10', 'cat-ts' ),
				'sm'         => array( 'n' => 20, 'prefix' => 'Test Series Mock' ),
				'secs'       => array( array( 'QA', 'Quant', 22 ), array( 'DILR', 'DILR', 22 ), array( 'VARC', 'VARC', 24 ) ),
				'secN'       => 10,
				'secMins'    => 40,
				'seriesPlan' => array( 'cat-ts' ),
				'pyq'        => array( array( 'CAT 2024 Slot 1 · previous paper', 68, 120 ), array( 'CAT 2023 Slot 2 · previous paper', 66, 120 ) ),
			),
		),
		'cet'  => array(
			'name'    => 'MBA-CET',
			'slug'    => 'mba-cet',
			'eyebrow' => 'MAH MBA CET · MAHARASHTRA',
			'title'   => 'MBA-CET is a speed test. Train for the speed.',
			'intro'   => '200 questions in 150 minutes with no negative marking. Our mocks and section drills are built to raise your attempts without losing accuracy.',
			'freeCta' => 'Take a free CET test',
			'img'     => 'img_cet',
			'tone'    => '#2C3FA8',
			'stats'   => array( array( '200', 'Questions' ), array( '150 min', 'Duration' ), array( '0', 'Negative marking' ), array( '4', 'Sections' ) ),
			'qa'      => array( 'q' => 'What is MBA-CET?', 'a' => 'MAH MBA CET is the Maharashtra state entrance exam for MBA and MMS admissions, including JBIMS, Sydenham, K J Somaiya and PUMBA. It has 200 questions in 150 minutes across four sections, with no negative marking.', 'facts' => array( array( 'March 2027', 'Next exam (indicative)' ), array( '150 min', 'Common timer' ), array( '200 Q', '4 sections' ), array( '+1 / 0', 'No negative marking' ) ) ),
			'ov'      => array(
				'h'        => 'Why CET needs its own practice',
				'p'        => 'CET is attempted by lakhs of students for JBIMS, Sydenham, PUMBA, Welingkar and other Maharashtra colleges. With no penalty for guessing, the winner is whoever attempts the most correct questions in 45 seconds each.',
				'tlH'      => 'A suggested CET timeline',
				'points'   => array( array( '01', 'Speed drills', 'Short timed sets for LR and AR, the two biggest score levers.' ), array( '02', 'Sectionals', 'Practise each section at real pace.' ), array( '03', 'Full mocks', '200 questions in 150 minutes, as on exam day.' ), array( '04', 'Attempt strategy', 'Guru shows where guessing would have added marks.' ) ),
				'timeline' => array( array( '8 WEEKS OUT', 'Learn the patterns', 'Cover LR and AR question types.', '#1F3A8A' ), array( '6 WEEKS OUT', 'Sectionals', 'Push attempts per section.', 'oklch(0.55 0.15 150)' ), array( '4 WEEKS OUT', 'Two mocks a week', 'Practise the full 150 minutes.', 'oklch(0.6 0.19 40)' ), array( 'FINAL WEEK', 'Light mocks', 'Stay sharp, avoid burnout.', 'oklch(0.5 0.17 300)' ) ),
			),
			'pat'     => array(
				'h'     => 'MBA-CET exam pattern',
				'rows'  => array( array( 'Logical Reasoning', '75', 'Common timer' ), array( 'Abstract Reasoning', '25', 'Common timer' ), array( 'Quantitative Aptitude', '50', 'Common timer' ), array( 'Verbal Ability & RC', '50', 'Common timer' ), array( 'Total', '200', '150 min' ) ),
				'marks' => array( array( '+1', 'Correct answer' ), array( '0', 'Wrong answer' ), array( '45 s', 'Per question' ), array( '200', 'Maximum marks' ) ),
			),
			'syl'     => array(
				array( 'm' => 'LR', 'code' => 'LR', 'name' => 'Logical Reasoning', 'meta' => '75 questions', 'groups' => array( array( '', array( 'Arrangements', 'Puzzles', 'Syllogisms', 'Blood Relations', 'Coding-Decoding', 'Input-Output', 'Critical Reasoning' ) ) ) ),
				array( 'm' => 'AR', 'code' => 'AR', 'name' => 'Abstract Reasoning', 'meta' => '25 questions', 'groups' => array( array( '', array( 'Series', 'Analogies', 'Odd one out', 'Pattern completion' ) ) ) ),
				array( 'm' => 'QA', 'code' => 'QA', 'name' => 'Quantitative Aptitude', 'meta' => '50 questions', 'groups' => array( array( 'Arithmetic', $t['arith'] ), array( 'Data Interpretation', array( 'Tables', 'Bar graphs', 'Pie charts', 'Data sufficiency' ) ) ) ),
				array( 'm' => 'VA', 'code' => 'VA', 'name' => 'Verbal Ability & RC', 'meta' => '50 questions', 'groups' => array( array( '', array( 'Reading Comprehension', 'Grammar', 'Vocabulary', 'Para Jumbles', 'Fill in the blanks' ) ) ) ),
			),
			'info'    => array(
				'factsH'    => 'MBA-CET eligibility, fee and key dates',
				'facts'     => array( array( 'Conducting body', 'State CET Cell, Maharashtra' ), array( 'Exam mode', 'Computer-based, multiple days' ), array( 'Usually held', 'March' ), array( 'Registration', 'December to February' ), array( 'Eligibility', 'Bachelor’s degree with 50% (45% for reserved categories from Maharashtra)' ), array( 'Application fee', 'About ₹1,200 (open), ₹1,000 (reserved, Maharashtra)' ), array( 'Negative marking', 'None' ), array( 'Admission via', 'CAP rounds by DTE Maharashtra' ) ),
				'dates'     => array( array( 'Dec 2026', 'Registration opens' ), array( 'Feb 2027', 'Registration closes' ), array( 'Mar 2027', 'MBA-CET exam' ), array( 'Apr 2027', 'Result' ), array( 'Jun – Aug 2027', 'CAP rounds' ) ),
				'dateNote'  => 'Dates are indicative. Check cetcell.mahacet.org for the official schedule.',
				'collegesH' => 'Top colleges that accept MBA-CET',
				'cutNote'   => 'Indicative percentile ranges for Maharashtra candidates from recent CAP rounds. Actual cutoffs vary by category and year.',
				'colleges'  => array( array( 'JBIMS Mumbai', '99.9+' ), array( 'Sydenham (SIMSREE)', '99.5+' ), array( 'K J Somaiya (SIMSR)', '99+' ), array( 'PUMBA Pune', '98+' ), array( 'Welingkar (WeSchool)', '98+' ), array( 'NL Dalmia', '97+' ), array( 'Chetana’s IMR', '96+' ), array( 'MET Institute', '96+' ) ),
				'stratH'    => 'How to prepare for MBA-CET',
				'strategy'  => array(
					array( 'A 3-month CET plan', 'CET rewards speed. Learn LR and AR patterns in month one, push section attempts with sectionals in month two, and take two full mocks a week in month three.' ),
					array( 'Logical & Abstract Reasoning', 'These make up 100 of 200 questions. Practise arrangements, puzzles and coding until each takes under 45 seconds. Abstract Reasoning is the fastest marks on the paper.' ),
					array( 'Quant & DI', 'Mostly arithmetic and DI at moderate difficulty. Use approximation and option elimination instead of full calculation.' ),
					array( 'Verbal & RC', 'Read the question before the passage. Grammar and vocabulary questions should take about 20 seconds each.' ),
					array( 'Attempt strategy', 'There is no negative marking, so never leave a question blank. Mark all remaining questions in the last five minutes.' ),
					array( 'CAT and CET together', 'Most CAT preparation carries over. Start CET-specific mocks in January, after CAT, and focus on speed in LR and AR.' ),
				),
			),
			'faq'     => array(
				array( 'Is there negative marking in MBA-CET?', 'No. Every question carries one mark and wrong answers cost nothing, so attempt every question.' ),
				array( 'Which sections matter most in CET?', 'Logical Reasoning has 75 of 200 questions and Abstract Reasoning 25, so reasoning speed has the biggest effect on your score.' ),
				array( 'How many CET mocks should I take?', 'Aim for 15 to 20 full mocks, with two a week in the final month. The CET Test Series has 30 full mocks and 40 sectionals for ₹1,800.' ),
				array( 'When is MBA-CET held?', 'Usually in March, over several days. Check the State CET Cell website for the official dates.' ),
				array( 'Can I prepare for CAT and CET together?', 'Yes. Concepts overlap. Add CET-specific mocks after CAT to build speed in LR and AR.' ),
				array( 'Which colleges can I get through CET?', 'JBIMS, Sydenham, K J Somaiya, PUMBA, Welingkar and many more through the CAP rounds.' ),
				array( 'Do CET tests get AI analysis?', 'Yes. Every attempt shows section scores, attempts per minute and a plan from Guru.' ),
				array( 'Can I take CET mocks on the app?', 'Yes, with the same DE Educare login. Your attempts sync across web and app.' ),
			),
			'catalog' => array(
				'pfx'        => 'cet',
				'label'      => 'MBA-CET',
				'tabs'       => array( 'CET Mocks', 'CET Test Series' ),
				'mocks'      => array( 'n' => 10, 'prefix' => 'MBA-CET Mock', 'q' => 200, 'mins' => 150 ),
				'mockPlan'   => array( 'cet-mock', 'cet-ts' ),
				'sm'         => array( 'n' => 30, 'prefix' => 'Test Series Mock' ),
				'secs'       => array( array( 'LR', 'Logical Reasoning', 75 ), array( 'AR', 'Abstract Reasoning', 25 ), array( 'QA', 'Quant', 50 ), array( 'VA', 'Verbal & RC', 50 ) ),
				'secN'       => 10,
				'secMins'    => 30,
				'seriesPlan' => array( 'cet-ts' ),
				'pyq'        => array( array( 'MAH-CET 2025 · memory-based paper', 200, 150 ) ),
			),
		),
		'omet' => array(
			'name'    => 'OMETs',
			'slug'    => 'omet',
			'eyebrow' => 'SNAP · NMAT · XAT · CMAT',
			'title'   => 'One place for every other MBA entrance.',
			'intro'   => 'Each OMET has its own rules: SNAP’s speed, NMAT’s section order, XAT’s decision making, CMAT’s innovation section. Pick an exam to see its pattern and plans.',
			'freeCta' => 'Take a free OMET test',
			'img'     => 'img_omet',
			'tone'    => 'oklch(0.42 0.12 280)',
			'stats'   => array( array( '4', 'Exams' ), array( 'SNAP', 'Symbiosis' ), array( 'NMAT', 'NMIMS' ), array( 'XAT', 'XLRI' ) ),
		),
	);
}

/** The four OMETs on the OMET page. */
function de_omets() {
	return array(
		'snap' => array(
			'name'     => 'SNAP',
			'ov'       => 'For Symbiosis institutes including SIBM Pune, SCMHRD and SIIB. Up to three attempts; the best score counts.',
			'stats'    => array( array( '60', 'Questions' ), array( '60 min', 'Duration' ), array( '3', 'Attempts' ), array( '−0.25', 'Per wrong' ) ),
			'q'        => 60,
			'mins'     => 60,
			'rows'     => array( array( 'General English', '15', 'Common timer' ), array( 'Quant, DI & DS', '15', 'Common timer' ), array( 'Analytical & Logical Reasoning', '20', 'Common timer' ), array( 'Ethics, Morality & Values', '10', 'Common timer' ) ),
			'marks'    => array( array( '+1', 'Correct' ), array( '−0.25', 'Wrong' ), array( '60', 'Questions' ), array( '60 min', 'Total time' ) ),
			'syl'      => array( array( 'English', array( 'RC', 'Para Jumbles', 'Grammar', 'Vocabulary' ) ), array( 'Quant & DI', array( 'Arithmetic', 'Algebra', 'Geometry', 'DI sets' ) ), array( 'Reasoning', array( 'Arrangements', 'Puzzles', 'Syllogisms', 'Coding' ) ) ),
			'facts'    => array( array( 'Conducted by', 'Symbiosis International University' ), array( 'Usually held', 'December, on three test dates' ), array( 'Attempts', 'Up to 3, best score counts' ), array( 'Mode', 'Computer-based' ), array( 'Eligibility', 'Bachelor’s degree with 50% (45% for SC/ST)' ) ),
			'dates'    => array( array( 'Aug – Nov', 'Registration' ), array( 'December', 'Three test dates' ), array( 'January', 'Result' ) ),
			'colleges' => array( 'SIBM Pune', 'SCMHRD Pune', 'SIIB Pune', 'SIBM Bangalore', 'SIMS Pune', 'SITM Pune' ),
			'tip'      => 'SNAP is the fastest OMET: 60 questions in 60 minutes. Skip anything that needs more than a minute and come back to it.',
		),
		'nmat' => array(
			'name'     => 'NMAT',
			'ov'       => 'For NMIMS and partner schools. You choose the order of sections, and up to three attempts are allowed.',
			'stats'    => array( array( '108', 'Questions' ), array( '120 min', 'Duration' ), array( '3', 'Attempts' ), array( '0', 'Negative' ) ),
			'q'        => 108,
			'mins'     => 120,
			'rows'     => array( array( 'Language Skills', '36', '28 min' ), array( 'Quantitative Skills', '36', '52 min' ), array( 'Logical Reasoning', '36', '40 min' ) ),
			'marks'    => array( array( '+3', 'Correct' ), array( '0', 'Wrong' ), array( '108', 'Questions' ), array( '360', 'Max marks' ) ),
			'syl'      => array( array( 'Language', array( 'RC', 'Grammar', 'Vocabulary', 'Para Jumbles' ) ), array( 'Quant', array( 'Arithmetic', 'Algebra', 'DI', 'Data Sufficiency' ) ), array( 'Reasoning', array( 'Arrangements', 'Critical Reasoning', 'Syllogisms' ) ) ),
			'facts'    => array( array( 'Conducted by', 'GMAC' ), array( 'Usually held', 'October to December testing window' ), array( 'Attempts', 'Up to 3, best score counts' ), array( 'Mode', 'Test centre or online' ), array( 'Eligibility', 'Bachelor’s degree with 50%' ) ),
			'dates'    => array( array( 'Aug – Oct', 'Registration' ), array( 'Oct – Dec', 'Testing window' ), array( 'Within days', 'Score report' ) ),
			'colleges' => array( 'NMIMS Mumbai', 'NMIMS Bangalore', 'NMIMS Hyderabad', 'SOIL Gurgaon', 'VIT Business School', 'Alliance University' ),
			'tip'      => 'You choose the section order and each section has its own timer. Start with your strongest section to bank marks early.',
		),
		'xat'  => array(
			'name'     => 'XAT',
			'ov'       => 'For XLRI and 150+ schools. Decision Making is unique to XAT and the GK section is scored separately.',
			'stats'    => array( array( '~100', 'Questions' ), array( '210 min', 'Duration' ), array( '−0.25', 'Per wrong' ), array( 'DM', 'Unique section' ) ),
			'q'        => 100,
			'mins'     => 210,
			'rows'     => array( array( 'Verbal & Logical Ability', '26', 'Sectional' ), array( 'Decision Making', '21', 'Sectional' ), array( 'Quant & DI', '28', 'Sectional' ), array( 'General Knowledge', '20', '10 min' ) ),
			'marks'    => array( array( '+1', 'Correct' ), array( '−0.25', 'Wrong' ), array( '−0.10', 'After 8 skips' ), array( 'GK', 'Not in percentile' ) ),
			'syl'      => array( array( 'Verbal', array( 'RC', 'Critical Reasoning', 'Grammar', 'Para Jumbles' ) ), array( 'Decision Making', array( 'Caselets', 'Ethical dilemmas', 'Data arrangement' ) ), array( 'Quant & DI', array( 'Arithmetic', 'Algebra', 'Geometry', 'DI' ) ) ),
			'facts'    => array( array( 'Conducted by', 'XLRI Jamshedpur' ), array( 'Usually held', 'First Sunday of January' ), array( 'Attempts', 'Once a year' ), array( 'Mode', 'Computer-based' ), array( 'Eligibility', 'Bachelor’s degree of 3 years or more' ) ),
			'dates'    => array( array( 'Jul – Nov', 'Registration' ), array( 'January', 'XAT exam' ), array( 'January', 'Result' ) ),
			'colleges' => array( 'XLRI Jamshedpur', 'XIM Bhubaneswar', 'IMT Ghaziabad', 'Great Lakes Chennai', 'TAPMI Manipal', 'SPJIMR Mumbai' ),
			'tip'      => 'Decision Making rewards careful reading of each caselet. Practise two DM sets a day and read the options before the passage.',
		),
		'cmat' => array(
			'name'     => 'CMAT',
			'ov'       => 'Conducted by NTA for AICTE-approved institutes. Includes an Innovation & Entrepreneurship section.',
			'stats'    => array( array( '100', 'Questions' ), array( '180 min', 'Duration' ), array( '−1', 'Per wrong' ), array( '5', 'Sections' ) ),
			'q'        => 100,
			'mins'     => 180,
			'rows'     => array( array( 'Quantitative Techniques & DI', '20', 'Common timer' ), array( 'Logical Reasoning', '20', 'Common timer' ), array( 'Language Comprehension', '20', 'Common timer' ), array( 'General Awareness', '20', 'Common timer' ), array( 'Innovation & Entrepreneurship', '20', 'Common timer' ) ),
			'marks'    => array( array( '+4', 'Correct' ), array( '−1', 'Wrong' ), array( '100', 'Questions' ), array( '400', 'Max marks' ) ),
			'syl'      => array( array( 'Quant & DI', array( 'Arithmetic', 'Algebra', 'DI' ) ), array( 'Reasoning', array( 'Arrangements', 'Series', 'Coding' ) ), array( 'Awareness', array( 'Current affairs', 'Static GK', 'Business' ) ) ),
			'facts'    => array( array( 'Conducted by', 'National Testing Agency (NTA)' ), array( 'Usually held', 'Early in the year' ), array( 'Attempts', 'Once a year' ), array( 'Mode', 'Computer-based' ), array( 'Eligibility', 'Bachelor’s degree; final-year students can apply' ) ),
			'dates'    => array( array( 'Nov – Dec', 'Registration' ), array( 'Early year', 'CMAT exam' ), array( 'Weeks later', 'Result' ) ),
			'colleges' => array( 'JBIMS Mumbai (via CAP)', 'K J Somaiya (SIMSR)', 'Goa Institute of Management', 'Great Lakes Chennai', 'PUMBA Pune', 'Welingkar' ),
			'tip'      => 'Innovation & Entrepreneurship and General Awareness are quick marks. Read business news daily for the last two months.',
		),
	);
}

/**
 * Builds the OMET view in the same shape as a CAT/CET exam (overview,
 * pattern, syllabus, info, FAQs, catalogue), as the design does.
 */
function de_omet_view( $key ) {
	$o    = de_omets()[ $key ];
	$name = $o['name'];
	$sec  = function ( $n ) {
		if ( preg_match( '/English|Language|Verbal|VA/i', $n ) ) {
			return 'VARC';
		}
		return preg_match( '/Quant|QA|Numer/i', $n ) ? 'QA' : 'DILR';
	};
	$attempts = '';
	foreach ( $o['facts'] as $f ) {
		if ( 'Attempts' === $f[0] ) {
			$attempts = $f[1];
		}
	}
	$syl = array();
	foreach ( $o['syl'] as $s ) {
		$syl[] = array( 'm' => strtoupper( substr( $s[0], 0, 2 ) ), 'code' => $sec( $s[0] ), 'name' => $s[0], 'meta' => count( $s[1] ) . ' topics', 'groups' => array( array( '', $s[1] ) ) );
	}
	$secs = array();
	foreach ( $o['rows'] as $r ) {
		$secs[] = array( $sec( $r[0] ), $r[0], (int) $r[1] ? (int) $r[1] : 20 );
	}
	return array(
		'name'    => $name,
		'stats'   => $o['stats'],
		'qa'      => array( 'q' => 'What is ' . $name . '?', 'a' => $o['ov'], 'facts' => $o['stats'] ),
		'ov'      => array(
			'h'        => $name . ' at a glance',
			'p'        => $o['ov'],
			'tlH'      => 'How to use the OMET pack',
			'points'   => array( array( '01', 'Exam-specific mocks', 'Each mock follows its own exam’s timing and marking.' ), array( '02', 'Sectionals', 'Focused practice on each section.' ), array( '03', 'AI analysis', 'Guru reviews every attempt and plans your next test.' ) ),
			'timeline' => array( array( 'AFTER CAT', 'Switch formats', 'Take one mock of each OMET to learn the differences.', '#1F3A8A' ), array( 'DEC – JAN', 'Exam by exam', 'Two mocks before each exam date.', 'oklch(0.6 0.19 40)' ) ),
		),
		'pat'     => array( 'h' => $name . ' exam pattern', 'rows' => $o['rows'], 'marks' => $o['marks'] ),
		'syl'     => $syl,
		'info'    => array(
			'factsH'    => $name . ' eligibility and key dates',
			'facts'     => $o['facts'],
			'dates'     => $o['dates'],
			'dateNote'  => 'Dates are indicative. Check the official ' . $name . ' website.',
			'collegesH' => 'Colleges that accept ' . $name,
			'cutNote'   => 'A selection of colleges that accept ' . $name . ' scores.',
			'colleges'  => array_map( function ( $c ) { return array( $c, '' ); }, $o['colleges'] ),
			'stratH'    => 'How to prepare for ' . $name,
			'strategy'  => array(
				array( 'Start from your CAT base', 'Most of the ' . $name . ' syllabus overlaps with CAT. After CAT, spend a week learning its format, timing and marking with one mock.' ),
				array( $name . ' specifics', $o['tip'] ),
				array( 'Mocks before the exam', 'Take at least three ' . $name . ' mocks in the two weeks before your test date and review every wrong answer with Guru.' ),
			),
		),
		'faq'     => array(
			array( 'How many attempts does ' . $name . ' allow?', $attempts . '.' ),
			array( 'How is ' . $name . ' different from CAT?', $o['ov'] ),
			array( 'Which colleges accept ' . $name . '?', implode( ', ', $o['colleges'] ) . ', and more.' ),
			array( 'Do I need separate packs for each OMET?', 'No. The OMET Combo (₹3,000) covers SNAP, NMAT, XAT and CMAT with 15 mocks each. An individual OMET pack is ₹1,000.' ),
			array( 'Can I use CAT mocks to prepare for OMETs?', 'Yes for concepts, but each OMET has its own timing and marking. Take at least three exam-specific mocks before your test.' ),
			array( 'Do ' . $name . ' tests get AI analysis?', 'Yes. Every attempt gets section scores, time per question and a written plan from Guru.' ),
		),
		'catalog' => array(
			'pfx'        => 'om-' . $key,
			'label'      => $name,
			'tabs'       => array( $name . ' Mocks', $name . ' Sectionals & topics' ),
			'mocks'      => array( 'n' => 15, 'prefix' => $name . ' Mock', 'q' => $o['q'], 'mins' => $o['mins'] ),
			'mockPlan'   => array( 'om-single', 'om-pack' ),
			'sm'         => null,
			'secs'       => $secs,
			'secN'       => 4,
			'secMins'    => 20,
			'seriesPlan' => array( 'om-single', 'om-pack' ),
			'pyq'        => array( array( $name . ' sample paper', $o['q'], $o['mins'] ) ),
		),
	);
}

function de_home_faqs() {
	return array(
		array( 'Is the same login used on the app and the website?', 'Yes. Your DE Educare ID is your mobile number. Log in on the website, the student portal or the app to see the same purchases, scores and Guru history.' ),
		array( 'Which exams does DE Educare cover?', 'CAT, MBA-CET and OMETs (SNAP, NMAT, XAT, CMAT) today. Bank PO, RBI and UPSC test series are launching soon.' ),
		array( 'What is the difference between 10 CAT Mocks and the CAT Test Series?', '10 Mocks is full-length practice. The Test Series adds sectionals, topic tests, analytics and unlimited Guru.' ),
		array( 'Do you offer coaching classes?', 'Yes. CAT Coaching 2027 (₹40,000), CET Coaching 2028 (₹30,000) and MBA+ for CAT, CET and OMETs together (₹60,000) include live lectures, recorded sessions, mocks, books, one-on-one mentorship and admission guidance. Send an enquiry for batch dates.' ),
		array( 'What is Guru?', 'Guru is the AI mentor built into the portal. It analyses every attempt, solves doubts from a photo, builds custom tests and talks you through a plan by chat or voice.' ),
		array( 'Is the daily free test really free?', 'Yes, always. A new test is added every day with an instant scorecard and AI analysis.' ),
		array( 'Do I need to pay to use the portal?', 'No. A free account gets the daily test, previous papers, free questions and 10 Guru questions a day.' ),
		array( 'How do I pay?', 'UPI, cards, netbanking and EMI through a secure payment gateway. Your plan unlocks instantly on web and app.' ),
		array( 'When do Bank PO, RBI and UPSC launch?', 'Government exam test series are launching soon. Tap Notify me to hear first.' ),
	);
}

function de_free_faqs() {
	return array(
		array( 'Are the free tests really free?', 'Yes. The daily test, previous papers and the first CAT mock are free with a DE Educare ID. No card is needed.' ),
		array( 'Do free tests include AI analysis?', 'Yes. Every attempt, free or paid, gets section scores, time analysis and a written plan from Guru.' ),
		array( 'Do I need to sign in?', 'You can practise free questions without signing in. Sign in free to take tests and save your attempts.' ),
		array( 'How often are new free questions added?', 'A new daily test is added every morning across VARC, DILR and Quant.' ),
		array( 'How accurate is the percentile predictor?', 'It is a rough estimate from recent score vs percentile trends. Real percentiles vary by slot and year.' ),
		array( 'Can I download the formula sheets?', 'Formula sheets and notes open inside the student portal after you sign in free. They are view-only, so you always read the latest version.' ),
		array( 'Is there a free SNAP or MBA-CET test?', 'Yes. There is a free daily test for CAT, MBA-CET and SNAP. Each takes about 15 minutes and includes AI analysis.' ),
	);
}

/** Free practice questions with worked solutions (Free resources page). */
function de_free_questions() {
	return array(
		'qa'   => array(
			'name' => 'Quant',
			'qs'   => array(
				array( 'topic' => 'Percentages', 'q' => 'A price rises by 20% and then falls by 20%. What is the net change?', 'o' => array( 'No change', '4% decrease', '4% increase', '2% decrease' ), 'a' => 1, 'sol' => 'Net change = a + b + ab/100 = 20 − 20 − 400/100 = −4%. So a 4% decrease.' ),
				array( 'topic' => 'Time, Speed & Distance', 'q' => 'Two trains 120 m and 180 m long run in opposite directions at 54 km/h and 36 km/h. How long do they take to cross each other?', 'o' => array( '10 s', '12 s', '15 s', '18 s' ), 'a' => 1, 'sol' => 'Relative speed = 90 km/h = 25 m/s. Distance = 300 m. Time = 300/25 = 12 s.' ),
				array( 'topic' => 'Algebra', 'q' => 'If x + 1/x = 4, find x² + 1/x².', 'o' => array( '12', '14', '16', '18' ), 'a' => 1, 'sol' => 'Square both sides: x² + 2 + 1/x² = 16, so x² + 1/x² = 14.' ),
			),
		),
		'dilr' => array(
			'name' => 'DILR',
			'qs'   => array(
				array( 'topic' => 'Arrangements', 'q' => 'Five friends sit in a row. C is in the middle, A is immediately left of C, D immediately right. E is at an end but not next to B. Who is at the other end?', 'o' => array( 'A', 'B', 'D', 'E' ), 'a' => 1, 'sol' => 'Positions: _ A C D _. E takes one end; the other end must be B. Since E is not next to B, the arrangement works with B at the far end.' ),
				array( 'topic' => 'Games & Tournaments', 'q' => '8 teams each play every other team once. How many matches?', 'o' => array( '24', '28', '32', '56' ), 'a' => 1, 'sol' => '8C2 = 8 × 7 / 2 = 28 matches.' ),
			),
		),
		'varc' => array(
			'name' => 'VARC',
			'qs'   => array(
				array( 'topic' => 'Vocabulary', 'q' => 'Choose the word closest in meaning to ‘ubiquitous’.', 'o' => array( 'Rare', 'Found everywhere', 'Ancient', 'Unclear' ), 'a' => 1, 'sol' => '‘Ubiquitous’ means present or found everywhere.' ),
				array( 'topic' => 'Odd Sentence Out', 'q' => 'Pick the odd sentence: (1) The monsoon arrived early. (2) Farmers began sowing in June. (3) Reservoir levels rose. (4) Stock markets closed higher.', 'o' => array( '1', '2', '3', '4' ), 'a' => 3, 'sol' => 'Sentences 1–3 are about the monsoon and farming. Sentence 4 is unrelated.' ),
			),
		),
	);
}

/** Colleges in the home page marquee. */
function de_marquee_colleges() {
	return array( 'IIM Ahmedabad', 'IIM Bangalore', 'IIM Calcutta', 'FMS Delhi', 'JBIMS Mumbai', 'XLRI Jamshedpur', 'SPJIMR', 'MDI Gurgaon', 'IIM Lucknow', 'SIBM Pune', 'NMIMS Mumbai', 'IIM Kozhikode', 'Sydenham', 'PUMBA', 'IIM Indore', 'SCMHRD' );
}

/** Score → percentile table used by the predictor (CAT, approx.). */
function de_percentile_table() {
	return array( array( 133, 99.99 ), array( 111, 99.9 ), array( 93, 99.5 ), array( 85, 99 ), array( 76, 98 ), array( 62, 95 ), array( 52, 90 ), array( 44, 85 ), array( 38, 80 ), array( 26, 60 ), array( 0, 20 ) );
}

/**
 * Coaching programmes. "Enquire" opens the lead form; leads go to the CRM
 * (n8n webhook in Customize → DE Educare → Portal and contact) and by email.
 */
function de_coaching() {
	return array(
		array(
			'id'    => 'cat-coaching-2027',
			'name'  => 'CAT Coaching 2027',
			'for'   => 'For CAT 2027 · IIMs and top B-schools',
			'fee'   => 40000,
			'tag'   => 'MOST POPULAR',
			'dark'  => true,
			'feat'  => array( 'Live lectures for Quant, DILR and VARC', 'Recorded session of every class', 'CAT Test Series: mocks, sectionals, topic tests', 'Books and study material', 'One-on-one mentorship', 'GD, PI and WAT preparation', 'Admission guidance', 'Unlimited Guru, the AI mentor' ),
		),
		array(
			'id'    => 'cet-coaching-2028',
			'name'  => 'CET Coaching 2028',
			'for'   => 'For MAH MBA-CET 2028 · JBIMS, Sydenham, PUMBA',
			'fee'   => 30000,
			'feat'  => array( 'Live lectures for LR, AR, QA and VA', 'Recorded session of every class', 'CET Test Series: 30 mocks, 40 sectionals', 'Books and study material', 'One-on-one mentorship', 'CAP round admission guidance', 'Unlimited Guru, the AI mentor' ),
		),
		array(
			'id'    => 'mba-plus',
			'name'  => 'MBA+ (CAT + CET + OMET)',
			'for'   => 'One programme for every MBA entrance',
			'fee'   => 60000,
			'tag'   => 'BEST VALUE',
			'feat'  => array( 'Everything in CAT and CET Coaching', 'OMET Combo: SNAP, NMAT, XAT, CMAT', 'GD, PI and WAT preparation', 'Admission guidance across all exams', 'Unlimited Guru, the AI mentor' ),
		),
	);
}

/** Rows of the coaching comparison on the home page: label, then CAT, CET, MBA+. */
function de_coaching_rows() {
	return array(
		array( 'Exam year', 'CAT 2027', 'MBA-CET 2028', 'CAT 2027 + CET 2028 + OMETs' ),
		array( 'Live lectures', 'Quant, DILR, VARC', 'LR, AR, QA, VA', 'All CAT and CET sections' ),
		array( 'Recorded sessions', '✓', '✓', '✓' ),
		array( 'Mocks and test series', 'CAT Test Series', 'CET Test Series', 'CAT + CET + OMET Combo' ),
		array( 'Books and study material', '✓', '✓', '✓' ),
		array( 'One-on-one mentorship', '✓', '✓', '✓' ),
		array( 'GD, PI and WAT preparation', '✓', '—', '✓' ),
		array( 'Admission guidance', 'IIMs and top B-schools', 'CAP rounds', 'All exams' ),
		array( 'Guru AI mentor', 'Unlimited', 'Unlimited', 'Unlimited' ),
	);
}

/**
 * Test series cards in the home hero. Prices come from de_plans(), so the
 * portal's live price (Admin → Courses & plans) shows here too.
 */
function de_test_series() {
	return array(
		array( 'plan' => 'cat-ts', 'exam' => 'cat', 'name' => 'CAT Test Series', 'counts' => array( array( '20', 'Mocks' ), array( '30', 'Sectionals' ), array( '3', 'Topic tests each' ) ), 'url' => de_page_url( 'cat' ) . '#plans' ),
		array( 'plan' => 'cet-ts', 'exam' => 'cet', 'name' => 'CET Test Series', 'counts' => array( array( '30', 'Mocks' ), array( '40', 'Sectionals' ), array( '3', 'Topic tests each' ) ), 'url' => de_page_url( 'mba-cet' ) . '#plans' ),
		array( 'plan' => 'om-pack', 'exam' => 'omet', 'name' => 'OMET Combo', 'counts' => array( array( '15', 'Mocks per exam' ), array( 'All', 'Sectionals' ), array( '3', 'Topic tests each' ) ), 'url' => de_page_url( 'omet' ) . '#plans' ),
		array( 'plan' => 'om-single', 'exam' => 'omet', 'name' => 'Individual OMET', 'counts' => array( array( '15', 'Mocks' ), array( '✓', 'Sectionals' ), array( '3', 'Topic tests each' ) ), 'url' => de_page_url( 'omet' ) . '#plans' ),
	);
}

/** Free daily tests (portal /daily/{exam}). */
function de_free_daily() {
	return array(
		array( 'cat', 'CAT', 'VARC, DILR and Quant mix', 'icon-target.webp' ),
		array( 'cet', 'MBA-CET', 'LR, AR, QA and VA at CET speed', 'icon-checklist.webp' ),
		array( 'snap', 'SNAP', '60-question speed format', 'icon-interface.webp' ),
	);
}

/**
 * College predictor data. Cutoffs are indicative overall percentiles for the
 * General category from recent cycles; 'p' marks colleges that weigh
 * academics and work experience heavily. Edit here as new cutoffs come out.
 */
function de_college_data() {
	return array(
		'cat' => array(
			array( 'IIM Ahmedabad', 99.5, 1 ), array( 'IIM Bangalore', 99.4, 1 ), array( 'IIM Calcutta', 99.3, 1 ),
			array( 'FMS Delhi', 98.8, 0 ), array( 'IIM Lucknow', 98, 1 ), array( 'IIM Kozhikode', 97.5, 1 ),
			array( 'IIM Indore', 97.5, 1 ), array( 'IIM Mumbai (NITIE)', 97, 1 ), array( 'SPJIMR Mumbai', 96, 1 ),
			array( 'MDI Gurgaon', 96, 1 ), array( 'IIT Bombay SJMSOM', 96, 1 ), array( 'IIFT Delhi', 95, 0 ),
			array( 'IIM Shillong', 95, 1 ), array( 'IIM Udaipur / Trichy / Ranchi', 94, 1 ), array( 'Newer IIMs', 92, 1 ),
			array( 'IMT Ghaziabad', 90, 0 ), array( 'IMI New Delhi', 88, 0 ), array( 'K J Somaiya (SIMSR)', 85, 0 ),
			array( 'Great Lakes Chennai', 85, 0 ), array( 'TAPMI Manipal', 82, 0 ),
		),
		'cet' => array(
			array( 'JBIMS Mumbai', 99.9, 0 ), array( 'Sydenham (SIMSREE)', 99.5, 0 ), array( 'PUMBA Pune', 98.5, 0 ),
			array( 'K J Somaiya (SIMSR)', 98.5, 0 ), array( 'Welingkar (WeSchool)', 98, 0 ), array( 'NL Dalmia', 97, 0 ),
			array( 'Chetana’s IMR', 96, 0 ), array( 'MET Institute', 96, 0 ), array( 'IES MCRC', 94, 0 ),
			array( 'Lala Lajpat Rai Institute', 93, 0 ), array( 'VESIM Mumbai', 92, 0 ), array( 'Pillai Institute', 88, 0 ),
		),
		// Percentile points a category's cutoff is lower by, roughly.
		'relax' => array( 'general' => 0, 'ews' => 3, 'obc' => 6, 'sc' => 15, 'st' => 25 ),
	);
}
