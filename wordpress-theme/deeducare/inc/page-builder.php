<?php
/**
 * Builds the site's pages as standard, freely editable WordPress blocks,
 * starting from the content in inc/content.php. Only live parts (portal
 * prices, tests, forms, predictors, reviews) are DE Educare blocks.
 *
 * Pages are created once (Appearance → DE Educare pages). After that the
 * page content belongs to the editor: rebuilding is optional and keeps the
 * previous version in the page's revisions.
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

/** Pages the theme can build: slug => [ title, builder ]. */
function de_buildable_pages() {
	return array(
		'home'           => array( 'Home', 'de_page_home' ),
		'cat'            => array( 'CAT Coaching 2027 and CAT Mock Test Series', 'de_page_cat' ),
		'mba-cet'        => array( 'MBA-CET Coaching 2028 and MAH-CET Mock Tests', 'de_page_cet' ),
		'omet'           => array( 'OMET Mock Tests: SNAP, NMAT, XAT, CMAT', 'de_page_omet' ),
		'free-resources' => array( 'Free CAT, MBA-CET and SNAP tests and resources', 'de_page_free' ),
		'contact'        => array( 'Contact', 'de_page_contact' ),
	);
}

/** Theme image URL. */
function deb_img( $file ) {
	return de_asset_img( $file );
}

/* ------------------------------------------------------------------ Home */

function de_page_home() {
	$free = de_page_url( 'free-resources' );
	$o    = '';

	// Hero.
	$o .= deb_group(
		deb_group(
			deb_heading( 'CAT 2027 &amp; CET 2028 coaching, <span class="de-blue">with mocks that feel real.</span>', 1, 'de-hero__h' )
			. deb_group(
				deb_p( 'Live classes, recorded sessions, books and one-on-one mentorship, plus full mocks, sectionals and topic tests timed and scored like the real paper. Guru, your AI mentor, reads every attempt and tells you what to fix next.', 'de-lead' )
				. deb_buttons( array( array( 'Enquire for coaching', '#enquire-cat-coaching-2027', 'primary' ), array( 'Take today’s free test', de_daily_url( 'cat' ), 'outline' ) ), 'de-row' )
				. deb_list( array( 'Free daily test, no card', 'AI analysis on every attempt', 'One login on web and app', 'Mumbai-based team' ), 'de-trust' ),
				'de-hero__side'
			),
			'de-hero__top'
		),
		'de-wrap de-hero de-hero--intro',
		'section'
	);
	$o .= deb_live( 'exam-tabs' );
	$o .= deb_group(
		deb_group( deb_heading( 'Test series: pick your exam', 2, 'de-h2' ) . deb_p( 'Prices include GST · UPI, cards and netbanking', 'de-note de-note--sm' ), 'de-split de-split--end' ),
		'de-wrap de-ts-head',
		'div',
		'test-series'
	);
	$o .= deb_live( 'test-series' );
	$o .= deb_live( 'home-marquee' );

	// Quick links.
	$tools = array(
		array( 'icon-target.webp', 'Daily free test', 'CAT, MBA-CET, SNAP', '#free-daily' ),
		array( 'icon-mentor.webp', 'Coaching 2027–28', 'Live classes + mentors', '#coaching' ),
		array( 'icon-percentile.webp', 'Percentile & college predictor', 'Score → percentile → colleges', '#predict' ),
		array( 'icon-solutions.webp', 'Previous papers', 'Attempt as mocks', $free . '#free-tests' ),
		array( 'icon-guru.webp', 'Ask Guru', 'Your AI mentor', '#ask-guru' ),
	);
	$t = '';
	foreach ( $tools as $x ) {
		$t .= deb_group( deb_image( deb_img( $x[0] ), '', 'de-ico-img' ) . deb_group( deb_p( deb_a( $x[1], $x[3] ), 'de-tool__t' ) . deb_p( deb_t( $x[2] ), 'de-tool__d' ), 'de-tool__txt' ), 'de-tool' );
	}
	$o .= deb_group( $t, 'de-wrap de-tools', 'section' );

	$o .= deb_live( 'home-predict' );

	// Free every day.
	$daily = '';
	foreach ( de_free_daily() as $d ) {
		$daily .= deb_group( deb_image( deb_img( $d[3] ), '', 'de-ico-img' ) . deb_group( deb_p( deb_a( 'Today’s ' . $d[1] . ' test', de_daily_url( $d[0] ) ), 'de-daily3__t' ) . deb_p( deb_t( $d[2] ), 'de-daily3__d' ), 'de-daily3__txt' ), 'de-daily3__card' );
	}
	$more = '';
	foreach ( array(
		array( 'PY', 'Previous year papers', 'CAT and CET papers as timed mocks', $free . '#free-tests' ),
		array( 'FQ', 'Free questions', 'Worked solutions for Quant, DILR, VARC', $free . '#free-questions' ),
		array( 'PDF', 'Formula sheets and notes', 'Read in the portal after free sign-in', $free . '#notes' ),
		array( '%', 'Percentile and college predictor', 'Score to percentile to colleges', '#predict' ),
	) as $m ) {
		$more .= deb_group( deb_p( deb_t( $m[0] ), 'de-mono-badge de-mono-badge--lg' ) . deb_group( deb_p( deb_a( $m[1], $m[3] ), 'de-tool__t' ) . deb_p( deb_t( $m[2] ), 'de-tool__d' ), 'de-tool__txt' ), 'de-tool' );
	}
	$o .= deb_group(
		deb_group(
			deb_group(
				deb_eyebrow( 'FREE, EVERY DAY', 'blue' )
				. deb_heading( 'A free daily test for CAT, MBA-CET and SNAP', 2, 'de-h2 de-h2--md' )
				. deb_p( 'A new 15-minute test every morning with an instant scorecard and the same AI analysis as paid tests. Sign in free with your mobile number. No card needed.', 'de-p15' )
				. deb_group( $daily, 'de-daily3' )
				. deb_group( $more, 'de-grid de-grid--230' )
				. deb_p( deb_a( 'All free resources →', $free ), 'de-link-strong' ),
				'de-stack-16'
			)
			. deb_image( deb_img( 'hero-mock-test.webp' ), 'DE Educare CAT mock test screen with question palette, All-India percentile and topic accuracy', 'de-free-home__art' ),
			'de-free-home'
		),
		'de-wrap de-sec-40',
		'section',
		'free-daily'
	);

	// Climb to 99.
	$cat    = de_page_url( 'cat' );
	$ladder = array(
		array( 'Start', 'Daily free test', 'Build the habit with 5 questions a day.', de_daily_url( 'cat' ) ),
		array( '80+', 'Topic tests', 'Three per topic. Fix a gap the day you find it.', $cat . '#tests' ),
		array( '90+', 'Sectionals', '40-minute section lock trains speed and selection.', $cat . '#tests' ),
		array( '95+', 'Full mocks', 'Two hours, All-India percentile, every weekend.', $cat . '#tests' ),
		array( '99', 'Guru plan', 'Every attempt turns into next week’s plan.', $cat ),
	);
	$steps = '';
	foreach ( $ladder as $i => $l ) {
		$steps .= deb_group( deb_p( deb_t( $l[0] ), 'de-ladder__z' ) . deb_group( deb_p( deb_a( $l[1], $l[3] ), 'de-ladder__t' ) . deb_p( deb_t( $l[2] ), 'de-ladder__d' ), 'de-ladder__txt' ), 'de-ladder__step de-ladder__step--' . ( $i + 1 ) );
	}
	$o .= deb_group(
		deb_group(
			deb_group( deb_heading( 'Your climb to 99, one kind of test at a time.', 2, 'de-h2 de-h2--xl' ) . deb_p( 'Each step on DE Educare trains a different skill. Topic tests fix gaps, sectionals build speed, full mocks build stamina, and Guru connects them into one plan.', 'de-ladder__p' ), 'de-split' )
			. deb_group( $steps, 'de-ladder__steps' ),
			'de-wrap de-ladder'
		),
		'de-dark',
		'section'
	);

	// Coaching.
	$o .= de_block_coaching_compare();

	// Guru.
	$o .= deb_group(
		deb_group(
			deb_group(
				deb_eyebrow( 'GURU · AI MENTOR', 'amber' )
				. deb_heading( 'A tutor on call that has read every mock you’ve taken.', 2, 'de-h2 de-h2--lg' )
				. deb_list( array( '<strong>Reads your mocks.</strong> Topic accuracy, time sinks and skipped-set choices.', '<strong>Solves from a photo.</strong> Snap any question from any book.', '<strong>Builds practice sets.</strong> From your weakest topics, with questions you haven’t seen.', '<strong>Teaches by voice.</strong> Explains a concept step by step, like a tutor beside you.' ), 'de-guru__feats' )
				. deb_p( '10 free Guru coins a day · 50 on test series · unlimited on coaching.', 'de-guru__note' )
				. deb_buttons( array( array( 'Ask Guru now', '#ask-guru', 'amber' ), array( 'Create free DE Educare ID', de_signup_url(), 'white' ) ), 'de-row' ),
				'de-guru__copy'
			)
			. deb_group(
				deb_p( 'Hi, I’m Guru. Ask me anything about CAT, CET or OMET prep.', 'de-chat__msg' )
				. deb_p( 'I scored 74 in my last mock. What should I fix first?', 'de-chat__msg de-chat__msg--me' )
				. deb_p( 'DILR cost you the most time. Take two DILR sets a day at 12 minutes each, then a sectional on Saturday. I’ll check your next mock.', 'de-chat__msg' )
				. deb_buttons( array( array( 'Talk to Guru', '#ask-guru', 'soft' ) ) ),
				'de-chat de-chat--demo'
			),
			'de-guru'
		),
		'de-wrap de-sec-40',
		'section',
		'guru'
	);

	// Government exams.
	$soon = '';
	foreach ( array(
		array( 'Bank PO', 'IBPS PO and SBI PO prelims and mains test series.', 'bank-po-test-series-de-educare.webp' ),
		array( 'RBI', 'RBI Grade B Phase 1 and Phase 2 mocks.', 'rbi-grade-b-test-series-de-educare.webp' ),
		array( 'UPSC', 'Prelims GS and CSAT mocks with mains answer evaluation.', 'upsc-prelims-test-series-de-educare.webp' ),
	) as $c ) {
		$soon .= deb_group(
			deb_image( deb_img( $c[2] ), $c[0] . ' test series by DE Educare, coming soon', 'de-soon-card__img' )
			. deb_group( deb_heading( deb_t( $c[0] ), 3, 'de-soon-card__t' ) . deb_p( deb_t( $c[1] ), 'de-soon-card__d' ) . deb_p( deb_a( 'Notify me →', add_query_arg( 'exam', $c[0], de_page_url( 'contact' ) ) ), 'de-link-strong' ), 'de-soon-card__body' ),
			'de-soon-card'
		);
	}
	$o .= deb_group( deb_heading( 'Government exams, launching soon', 2, 'de-h2 de-h2--md' ) . deb_group( $soon, 'de-grid de-grid--300' ), 'de-wrap de-sec-40 de-stack-22', 'section' );

	// One login + community.
	$o .= deb_group(
		deb_group(
			deb_eyebrow( 'ONE DE EDUCARE ID', 'ink' )
			. deb_heading( 'Start a mock on your laptop. Review it on your phone.', 2, 'de-h3-xl' )
			. deb_p( 'The same mobile number logs you into this website, the student portal and the app. Purchases, percentiles, streaks and Guru chats stay in sync.' )
			. deb_buttons( array( array( 'Open web portal', de_portal(), 'ink' ) ), 'de-row de-push' ),
			'de-onelogin'
		)
		. deb_group(
			deb_eyebrow( 'JOIN THE COMMUNITY' )
			. deb_heading( 'Daily questions, exam updates and doubt threads.', 2, 'de-h3-xl' )
			. deb_list(
				array(
					deb_a( 'WhatsApp', de_setting( 'whatsapp_group' ) ? de_setting( 'whatsapp_group' ) : de_whatsapp_url() ) . '<br>Daily questions',
					deb_a( 'Telegram', de_setting( 'telegram' ) ? de_setting( 'telegram' ) : '#' ) . '<br>Exam updates',
					deb_a( 'YouTube', de_setting( 'youtube' ) ? de_setting( 'youtube' ) : '#' ) . '<br>Strategy videos',
					deb_a( 'Instagram', de_setting( 'instagram' ) ? de_setting( 'instagram' ) : '#' ) . '<br>Quick tips',
				),
				'de-community'
			),
			'de-card de-card--pad30 de-stack-14'
		),
		'de-wrap de-sec-40 de-grid de-grid--380',
		'section'
	);

	$o .= deb_live( 'home-voices' );
	$o .= deb_group( deb_heading( 'Common questions', 2, 'de-h2 de-h2--faq' ) . deb_faqs( de_home_faqs(), 'de-faq de-faq--lg' ), 'de-narrow de-faq-sec', 'section', 'faq' );
	return $o;
}

/** Coaching programmes: cards and comparison table (prices are plain text you can edit). */
function de_block_coaching_compare() {
	$cards = '';
	foreach ( de_coaching() as $i => $p ) {
		$feat   = array_map( 'esc_html', $p['feat'] );
		$cards .= deb_group(
			deb_group( deb_heading( deb_t( $p['name'] ), 3, 'de-plan__name' ) . ( ! empty( $p['tag'] ) ? deb_p( deb_t( $p['tag'] ), 'de-tag' ) : '' ), 'de-plan__top' )
			. deb_p( deb_t( de_rupees( $p['fee'] ) ), 'de-plan__price' )
			. deb_p( deb_t( $p['for'] ), 'de-plan__desc' )
			. deb_list( $feat, 'de-plan__feat' )
			. deb_buttons( array( array( 'Enquire now', '#enquire-' . $p['id'], ! empty( $p['dark'] ) ? 'amber' : 'primary' ) ), 'de-plan__cta' ),
			'de-plan' . ( ! empty( $p['dark'] ) ? ' is-dark' : '' )
		);
	}
	$rows = array();
	foreach ( de_coaching_rows() as $r ) {
		$rows[] = array_map( 'esc_html', $r );
	}
	$head = array( 'What you get' );
	foreach ( de_coaching() as $p ) {
		$head[] = esc_html( $p['name'] . ' · ' . de_rupees( $p['fee'] ) );
	}
	return deb_group(
		deb_group( deb_group( deb_eyebrow( 'COACHING · NEW BATCHES', 'blue' ) . deb_heading( 'Compare coaching programmes', 2, 'de-h2 de-h2--lg' ), 'de-stack-10' ), 'de-split de-split--end' )
		. deb_group( $cards, 'de-coach-grid' )
		. deb_table( $head, $rows, 'de-compare-table' )
		. deb_p( 'Programme fees per student. EMI available on all coaching programmes. Send an enquiry for batch start dates, timings and payment options.', 'de-note de-note--sm' ),
		'de-wrap de-compare',
		'section',
		'coaching'
	);
}

/* ------------------------------------------------------------------ Exam pages */

function de_page_cat() {
	return de_page_exam( 'cat' );
}

function de_page_cet() {
	return de_page_exam( 'cet' );
}

/** Hero, section nav and the two-column body for CAT or MBA-CET. */
function de_page_exam( $exam ) {
	$E     = de_exams()[ $exam ];
	$daily = de_daily_url( $exam );
	$coach = 'cat' === $exam ? 'cat-coaching-2027' : 'cet-coaching-2028';
	$o     = '';

	$stats = '';
	foreach ( $E['stats'] as $s ) {
		$stats .= deb_group( deb_p( deb_t( $s[0] ), 'de-stat__v' ) . deb_p( deb_t( $s[1] ), 'de-stat__k' ), 'de-stat' );
	}
	$o .= deb_group(
		deb_p( deb_a( 'Home', home_url( '/' ) ) . ' / MBA entrance / ' . deb_t( $E['name'] ), 'de-crumbs-p' )
		. deb_group(
			deb_group(
				deb_p( deb_t( $E['eyebrow'] ), 'de-pill-label' )
				. deb_heading( deb_t( $E['title'] ), 1, 'de-exam-hero__h' )
				. deb_p( deb_t( $E['intro'] ), 'de-lead' )
				. deb_buttons( array( array( 'Enquire for coaching', '#enquire-' . $coach, 'primary' ), array( $E['freeCta'], $daily, 'outline' ) ), 'de-row' ),
				'de-exam-hero__copy'
			)
			. deb_image( de_setting( $E['img'] ), $E['name'] . ' coaching and mock tests by DE Educare', 'de-exam-hero__img' ),
			'de-grid de-grid--460 de-grid--stretch'
		)
		. deb_group( $stats, 'de-stats' ),
		'de-wrap de-exam-hero',
		'section'
	);
	$o .= de_block_secnav( array( array( 'coaching', 'Coaching' ), array( 'free', 'Free tests' ), array( 'tests', 'Test series' ), array( 'overview', 'Overview' ), array( 'pattern', 'Exam pattern' ), array( 'syllabus', 'Syllabus' ), array( 'plans', 'Plans' ), array( 'facts', 'Eligibility & dates' ), array( 'colleges', 'Colleges' ), array( 'strategy', 'Preparation' ), array( 'faq', 'FAQs' ) ) );

	$main  = de_block_exam_coaching( $exam );
	$main .= de_block_exam_qa( $E );
	$main .= deb_group( deb_eyebrow( 'FREE TESTS' ) . deb_heading( deb_t( 'Free ' . $E['catalog']['label'] . ' mock test and daily test' ), 2, 'de-h2' ) . deb_p( 'Free with a DE Educare ID, no card needed. Every attempt gets the same AI analysis as paid tests.', 'de-p15' ) . deb_live( 'exam-free-tests', $exam ), 'de-stack-14', 'div', 'free' );
	$main .= deb_live( 'exam-tests', $exam );
	$main .= de_block_exam_info( $E, $exam, deb_live( 'exam-plans', $exam ) );
	$main .= de_block_related( $exam );

	$o .= deb_group( deb_group( $main, 'de-exam-main' ) . deb_live( 'exam-aside', $exam ), 'de-wrap de-exam-body', 'section' );
	return $o;
}

/** Sticky "on this page" links. */
function de_block_secnav( $items ) {
	$links = array();
	foreach ( $items as $i ) {
		$links[] = deb_a( $i[1], '#' . $i[0] );
	}
	return deb_group( deb_p( implode( ' ', $links ), 'de-secnav__in de-wrap' ), 'de-secnav', 'nav' );
}

/** Coaching cards for one exam, with the enquiry form beside them. */
function de_block_exam_coaching( $exam ) {
	$ids  = array( 'cat' => array( 'cat-coaching-2027', 'mba-plus' ), 'cet' => array( 'cet-coaching-2028', 'mba-plus' ), 'omet' => array( 'mba-plus', 'cat-coaching-2027' ) )[ $exam ];
	$by   = array();
	foreach ( de_coaching() as $c ) {
		$by[ $c['id'] ] = $c;
	}
	$label = array( 'cat' => 'CAT 2027 coaching with live classes and mentors', 'cet' => 'MBA-CET 2028 coaching with live classes and mentors', 'omet' => 'Coaching that covers every OMET' )[ $exam ];
	$cards = '';
	foreach ( $ids as $i => $id ) {
		$p      = $by[ $id ];
		$cards .= deb_group(
			deb_group( deb_heading( deb_t( $p['name'] ), 3, 'de-plan__name' ) . ( ! empty( $p['tag'] ) ? deb_p( deb_t( $p['tag'] ), 'de-tag' ) : '' ), 'de-plan__top' )
			. deb_p( deb_t( de_rupees( $p['fee'] ) ), 'de-plan__price' )
			. deb_p( deb_t( $p['for'] ), 'de-plan__desc' )
			. ( 0 === $i ? deb_list( array_map( 'esc_html', $p['feat'] ), 'de-plan__feat' ) : '' )
			. deb_buttons( array( array( 'Enquire about ' . $p['name'], '#enquire-' . $p['id'], 0 === $i ? 'amber' : 'primary' ) ), 'de-plan__cta' ),
			'de-plan' . ( 0 === $i ? ' is-dark' : '' )
		);
	}
	return deb_group(
		deb_eyebrow( 'COACHING · NEW BATCHES', 'blue' )
		. deb_heading( deb_t( $label ), 2, 'de-h2' )
		. deb_p( 'Live lectures, a recording of every class, books, the full test series and one-on-one mentorship, online or in our Mumbai classroom. Send an enquiry for batch start dates.', 'de-p15' )
		. deb_group( deb_group( $cards, 'de-coach__plans' ) . deb_live( 'enquiry-form', $exam ), 'de-coach' ),
		'de-stack-16',
		'div',
		'coaching'
	);
}

/** "What is …?" quick answer with key facts. */
function de_block_exam_qa( $v ) {
	$facts = '';
	foreach ( $v['qa']['facts'] as $f ) {
		$facts .= deb_group( deb_p( deb_t( $f[0] ), 'de-fact__v' ) . deb_p( deb_t( $f[1] ), 'de-fact__k' ), 'de-fact' );
	}
	return deb_group(
		deb_group( deb_eyebrow( 'QUICK ANSWER', 'blue' ) . deb_heading( deb_t( $v['qa']['q'] ), 2, 'de-qa__q' ) . deb_p( deb_t( $v['qa']['a'] ), 'de-qa__a' ) . deb_p( 'Last updated ' . esc_html( wp_date( 'j M Y' ) ) . ' · Reviewed by the DE Educare academic team', 'de-qa__upd' ), 'de-stack-10' )
		. deb_group( $facts, 'de-qa__facts' ),
		'de-card de-qa'
	);
}

/** Overview, pattern, syllabus, eligibility and dates, colleges, preparation and FAQs. */
function de_block_exam_info( $v, $exam, $after_syllabus = '' ) {
	$o = '';

	$points = '';
	foreach ( $v['ov']['points'] as $p ) {
		$points .= deb_group( deb_p( deb_t( $p[0] ), 'de-point__n' ) . deb_heading( deb_t( $p[1] ), 3, 'de-point__t' ) . deb_p( deb_t( $p[2] ), 'de-point__d' ), 'de-card de-point' );
	}
	$tl = array();
	foreach ( $v['ov']['timeline'] as $t ) {
		$tl[] = '<strong>' . esc_html( $t[0] ) . ' · ' . esc_html( $t[1] ) . '</strong><br>' . esc_html( $t[2] );
	}
	$o .= deb_group(
		deb_eyebrow( 'OVERVIEW' ) . deb_heading( deb_t( $v['ov']['h'] ), 2, 'de-h2' ) . deb_p( deb_t( $v['ov']['p'] ), 'de-p16' )
		. deb_group( $points, 'de-grid de-grid--230' )
		. deb_heading( deb_t( $v['ov']['tlH'] ), 3, 'de-h3' )
		. deb_list( $tl, 'de-timeline' ),
		'de-stack-20',
		'div',
		'overview'
	);

	$rows = array();
	foreach ( $v['pat']['rows'] as $r ) {
		$rows[] = array_map( 'esc_html', $r );
	}
	$marks = '';
	foreach ( $v['pat']['marks'] as $m ) {
		$marks .= deb_group( deb_p( deb_t( $m[0] ), 'de-mark__v' ) . deb_p( deb_t( $m[1] ), 'de-mark__k' ), 'de-mark' );
	}
	$score = '';
	if ( ! empty( $v['pat']['score'] ) ) {
		$sr = array();
		foreach ( $v['pat']['score'] as $s ) {
			$sr[] = array( esc_html( (string) $s[0] . ' / 204' ), esc_html( $s[1] ) );
		}
		$score = deb_heading( 'CAT score vs percentile (approx.)', 3, 'de-h3' ) . deb_table( array( 'Score', 'Percentile' ), $sr, 'de-table' );
	}
	$o .= deb_group(
		deb_eyebrow( 'EXAM PATTERN' ) . deb_heading( deb_t( $v['pat']['h'] ), 2, 'de-h2' )
		. deb_table( array( 'Section', 'Questions', 'Time' ), $rows, 'de-table' )
		. deb_group( $marks, 'de-grid de-grid--180' )
		. $score,
		'de-stack-16',
		'div',
		'pattern'
	);

	$syl = '';
	foreach ( $v['syl'] as $s ) {
		$inner = '';
		foreach ( $s['groups'] as $g ) {
			$inner .= ( $g[0] ? deb_p( '<strong>' . esc_html( $g[0] ) . '</strong>', 'de-acc__g' ) : '' ) . deb_p( esc_html( implode( ' · ', $g[1] ) ), 'de-acc__items' );
		}
		$syl .= deb( 'details', array( 'className' => 'de-acc__item' ), '<details class="wp-block-details de-acc__item"><summary>' . esc_html( $s['name'] . ' · ' . $s['meta'] ) . '</summary>' . $inner . '</details>' );
	}
	$o .= deb_group( deb_eyebrow( 'SYLLABUS' ) . deb_heading( deb_t( $v['name'] . ' syllabus and topic tests' ), 2, 'de-h2' ) . deb_group( $syl, 'de-acc' ), 'de-stack-14', 'div', 'syllabus' );
	$o .= $after_syllabus;

	$info  = $v['info'];
	$facts = array();
	foreach ( $info['facts'] as $f ) {
		$facts[] = array( '<strong>' . esc_html( $f[0] ) . '</strong>', esc_html( $f[1] ) );
	}
	$dates = array();
	foreach ( $info['dates'] as $d ) {
		$dates[] = '<strong>' . esc_html( $d[0] ) . '</strong> · ' . esc_html( $d[1] );
	}
	$o .= deb_group(
		deb_eyebrow( 'ELIGIBILITY & DATES' ) . deb_heading( deb_t( $info['factsH'] ), 2, 'de-h2' )
		. deb_group(
			deb_table( array( 'Item', 'Details' ), $facts, 'de-table de-table--facts' )
			. deb_group( deb_heading( 'Important dates', 3, 'de-dates__h' ) . deb_list( $dates, 'de-dates__list' ) . deb_p( deb_t( $info['dateNote'] ), 'de-dates__note' ), 'de-dates' ),
			'de-grid de-grid--320 de-grid--start'
		),
		'de-stack-16',
		'div',
		'facts'
	);

	$cols = array();
	foreach ( $info['colleges'] as $c ) {
		$cols[] = array( esc_html( $c[0] ), $c[1] ? esc_html( $c[1] . ' %ile' ) : '—' );
	}
	$o .= deb_group(
		deb_eyebrow( 'COLLEGES & CUTOFFS' ) . deb_heading( deb_t( $info['collegesH'] ), 2, 'de-h2' ) . deb_p( deb_t( $info['cutNote'] ), 'de-p14' )
		. deb_table( array( 'College', 'Typical percentile' ), $cols, 'de-table' ),
		'de-stack-16',
		'div',
		'colleges'
	);

	$st = '';
	foreach ( $info['strategy'] as $s ) {
		$st .= deb_group( deb_heading( deb_t( $s[0] ), 3, 'de-strat__h' ) . deb_p( deb_t( $s[1] ), 'de-strat__p' ), 'de-card de-strat' );
	}
	$o .= deb_group( deb_eyebrow( 'PREPARATION STRATEGY' ) . deb_heading( deb_t( $info['stratH'] ), 2, 'de-h2' ) . deb_group( $st, 'de-grid de-grid--300' ), 'de-stack-16', 'div', 'strategy' );

	$o .= deb_group( deb_eyebrow( 'FAQS' ) . deb_heading( deb_t( $v['name'] . ' FAQs' ), 2, 'de-h2' ) . deb_faqs( $v['faq'] ), 'de-stack-14', 'div', 'faq' );
	return $o;
}

/** "Explore more" links at the end of an exam page. */
function de_block_related( $exam ) {
	$btn = array();
	foreach ( array( 'cat' => 'CAT', 'cet' => 'MBA-CET', 'omet' => 'OMETs' ) as $id => $label ) {
		if ( $id !== $exam ) {
			$btn[] = array( $label . ' →', de_page_url( de_exams()[ $id ]['slug'] ), 'outline' );
		}
	}
	$btn[] = array( 'Free resources →', de_page_url( 'free-resources' ), 'outline' );
	$btn[] = array( 'Talk to a counsellor →', de_page_url( 'contact' ), 'outline' );
	return deb_group( deb_eyebrow( 'EXPLORE MORE' ) . deb_buttons( $btn, 'de-row' ), 'de-stack-12' );
}

/* ------------------------------------------------------------------ OMET page */

/** One page with a section per OMET (SNAP, NMAT, XAT, CMAT), each fully editable. */
function de_page_omet() {
	$E = de_exams()['omet'];
	$o = '';
	$jump = array();
	foreach ( de_omets() as $k => $om ) {
		$jump[] = array( $om['name'], '#' . $k, 'outline' );
	}
	$stats = '';
	foreach ( $E['stats'] as $s ) {
		$stats .= deb_group( deb_p( deb_t( $s[0] ), 'de-stat__v' ) . deb_p( deb_t( $s[1] ), 'de-stat__k' ), 'de-stat' );
	}
	$o .= deb_group(
		deb_p( deb_a( 'Home', home_url( '/' ) ) . ' / MBA entrance / OMETs', 'de-crumbs-p' )
		. deb_group(
			deb_group(
				deb_p( deb_t( $E['eyebrow'] ), 'de-pill-label' )
				. deb_heading( deb_t( $E['title'] ), 1, 'de-exam-hero__h' )
				. deb_p( deb_t( $E['intro'] ), 'de-lead' )
				. deb_buttons( array( array( 'Enquire about MBA+', '#enquire-mba-plus', 'primary' ), array( 'Take a free SNAP test', de_daily_url( 'snap' ), 'outline' ) ), 'de-row' )
				. deb_buttons( $jump, 'de-row de-omet-jump' ),
				'de-exam-hero__copy'
			)
			. deb_image( de_setting( 'img_omet' ), 'OMET mock tests by DE Educare: SNAP, NMAT, XAT and CMAT', 'de-exam-hero__img' ),
			'de-grid de-grid--460 de-grid--stretch'
		)
		. deb_group( $stats, 'de-stats' ),
		'de-wrap de-exam-hero',
		'section'
	);
	$nav = array( array( 'coaching', 'Coaching' ) );
	foreach ( de_omets() as $k => $om ) {
		$nav[] = array( $k, $om['name'] );
	}
	$nav[] = array( 'plans', 'Plans' );
	$o    .= de_block_secnav( $nav );

	$main = de_block_exam_coaching( 'omet' );
	foreach ( array_keys( de_omets() ) as $k ) {
		$v     = de_omet_view( $k );
		// Overview, pattern… repeat for each OMET, so their anchors get the exam prefix (#snap-pattern).
		$info  = preg_replace( '/("anchor":"|id=")(overview|pattern|syllabus|facts|colleges|strategy|faq)"/', '$1' . $k . '-$2"', de_block_exam_info( $v, 'omet' ) );
		$main .= deb_group(
			deb_heading( deb_t( $v['name'] . ' mock test ' . ( 'xat' === $k ? '2027' : '2026' ) . ' – online practice' ), 2, 'de-h2 de-h2--lg' )
			. de_block_exam_qa( $v )
			. deb_heading( deb_t( 'Free ' . $v['name'] . ' tests' ), 3, 'de-h3' )
			. deb_live( 'exam-free-tests', $k )
			. deb_live( 'exam-tests', $k )
			. $info,
			'de-exam-stack de-omet-sec',
			'section',
			$k
		);
	}
	$main .= deb_live( 'exam-plans', 'omet' );
	$main .= de_block_related( 'omet' );
	$o    .= deb_group( deb_group( $main, 'de-exam-main' ) . deb_live( 'exam-aside', 'omet' ), 'de-wrap de-exam-body', 'section' );
	return $o;
}

/* ------------------------------------------------------------------ Free resources */

function de_page_free() {
	$o   = '';
	$res = array(
		array( 'PDF', 'Formula sheets and notes', 'Read in the portal · free sign-in', '#notes' ),
		array( '2017–25', 'CAT previous papers', 'Attempt in the exam interface', '#free-tests' ),
		array( 'CET', 'MBA-CET sample paper', '200 Q · 150 min', de_test_url( 'cet-pyq-0' ) ),
		array( 'XAT', 'Decision making sets', 'With explanations', de_page_url( 'omet' ) . '#xat' ),
		array( 'AI', 'Ask Guru', '10 free coins a day', '#ask-guru' ),
	);
	$side = deb_group(
		deb_eyebrow( 'DAILY FREE TEST', 'amber' )
		. deb_p( 'A fresh test every day across VARC, DILR and Quant.', 'de-daily-promo__t' )
		. deb_p( 'Instant scorecard. CAT-style interface. Keeps your streak.', 'de-daily-promo__d' )
		. deb_buttons( array( array( 'Start today’s test', de_daily_url( 'cat' ), 'white' ) ) ),
		'de-daily-promo'
	);
	foreach ( $res as $r ) {
		$side .= deb_group( deb_p( deb_t( $r[0] ), 'de-res__big' ) . deb_group( deb_p( deb_a( $r[1], $r[3] ), 'de-res__t' ) . deb_p( deb_t( $r[2] ), 'de-res__d' ), 'de-res__txt' ), 'de-res' );
	}
	$o .= deb_group(
		deb_group( deb_heading( 'Free CAT mock tests, questions and tools.', 1, 'de-free__h' ) . deb_p( 'Free daily tests for CAT, MBA-CET and SNAP, practice questions with worked solutions, previous papers as mocks, notes, and percentile and college predictors. Sign in free to save attempts to your dashboard.', 'de-lead' ), 'de-grid de-grid--460 de-grid--end' )
		. deb_group( deb_group( deb_heading( 'Free questions', 2, 'de-h3' ) . deb_live( 'free-questions' ), 'de-stack-10' ) . deb_group( $side, 'de-stack-10' ), 'de-free__grid' )
		. deb_group( deb_eyebrow( 'FREE TESTS' ) . deb_heading( 'Free CAT, MBA-CET and SNAP mock tests', 2, 'de-h2' ) . deb_p( 'Free DE Educare ID · no card needed · AI analysis on every attempt', 'de-note de-note--sm' ) . deb_live( 'free-tests-all' ), 'de-stack-14', 'div', 'free-tests' )
		. deb_group( deb_eyebrow( 'FREE NOTES & PDFS' ) . deb_heading( 'Formula sheets, notes and question banks', 2, 'de-h2' ) . deb_p( 'Opens in the student portal after free sign-in · view only', 'de-note de-note--sm' ) . deb_live( 'free-notes' ), 'de-stack-14', 'div', 'notes' )
		. deb_group( deb_live( 'home-predict' ), 'de-stack-14', 'div', 'predictor' )
		. deb_group( deb_eyebrow( 'FAQS' ) . deb_heading( 'Free resources: common questions', 2, 'de-h2' ) . deb_faqs( de_free_faqs() ), 'de-stack-14 de-narrow-left', 'div', 'faq' ),
		'de-wrap de-free',
		'section'
	);
	return $o;
}

/* ------------------------------------------------------------------ Contact */

function de_page_contact() {
	$rows = array(
		array( '<strong>Where</strong>', esc_html( de_setting( 'city' ) ) ),
		array( '<strong>Email</strong>', deb_a( de_setting( 'email' ), 'mailto:' . de_setting( 'email' ) ) ),
		array( '<strong>Phone</strong>', deb_a( de_setting( 'phone' ), 'tel:' . preg_replace( '/[^\d+]/', '', de_setting( 'phone' ) ) ) ),
		array( '<strong>Hours</strong>', esc_html( de_setting( 'hours' ) ) ),
	);
	return deb_group(
		deb_group(
			deb_heading( 'Talk to the DE Educare team', 1, 'de-contact__h' )
			. deb_p( 'A Mumbai-based team for CAT and MBA-CET coaching and online mock tests for competitive exams, available anywhere in India.', 'de-lead' )
			. deb_table( array( 'Contact', 'Details' ), $rows, 'de-table de-table--contact' )
			. deb_buttons( array( array( 'WhatsApp us', de_whatsapp_url(), 'primary' ), array( 'Enquire about coaching', '#enquire', 'outline' ) ), 'de-row' ),
			'de-stack-16'
		)
		. deb_live( 'contact-form' ),
		'de-contact',
		'section'
	);
}

/* ------------------------------------------------------------------ Setup */

/** The page for a slug; for "home", the page already set as the front page wins. */
function de_site_page( $slug ) {
	if ( 'home' === $slug && 'page' === get_option( 'show_on_front' ) && get_option( 'page_on_front' ) ) {
		$front = get_post( (int) get_option( 'page_on_front' ) );
		if ( $front && 'trash' !== $front->post_status ) {
			return $front;
		}
	}
	return get_page_by_path( $slug, OBJECT, 'page' );
}

/**
 * Creates or fills the pages. Pages this theme has built are kept as edited
 * unless $force is true. Content saved before version 2.1 was never shown (the
 * old templates ignored it), so those pages are built too. Replacing content
 * keeps the previous version in the page's revisions.
 * Returns a list of [ title, action ] for the admin screen.
 */
function de_build_pages( $force = false, $only = array() ) {
	$done = array();
	foreach ( de_buildable_pages() as $slug => list( $title, $builder ) ) {
		if ( $only && ! in_array( $slug, $only, true ) ) {
			continue;
		}
		$page = de_site_page( $slug );
		if ( ! $page ) {
			$id     = wp_insert_post( array( 'post_type' => 'page', 'post_status' => 'publish', 'post_name' => $slug, 'post_title' => $title, 'post_content' => wp_slash( call_user_func( $builder ) ), 'page_template' => 'page-sections', 'meta_input' => array( '_de_built' => DE_THEME_VERSION ) ) );
			$done[] = array( $title, 'created' );
		} else {
			$id  = $page->ID;
			$old = trim( $page->post_content );
			if ( ! $force && '' !== $old && get_post_meta( $id, '_de_built', true ) ) {
				$done[] = array( $page->post_title, 'kept (your edits are safe)' );
				continue;
			}
			// wp_slash: saving strips one level of backslashes, which would break escapes like \u002d in block settings.
			wp_update_post( array( 'ID' => $id, 'post_content' => wp_slash( call_user_func( $builder ) ), 'page_template' => 'page-sections' ) );
			update_post_meta( $id, '_de_built', DE_THEME_VERSION );
			$done[] = array( $page->post_title, $old ? 'rebuilt (old version saved in revisions)' : 'filled' );
		}
		if ( 'home' === $slug && $id ) {
			update_option( 'show_on_front', 'page' );
			update_option( 'page_on_front', $id );
		}
	}
	return $done;
}
