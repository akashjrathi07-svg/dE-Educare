<?php
/**
 * Render helpers for the exam pages (CAT, MBA-CET, OMETs).
 *
 * Tabs work without page reloads: every tab panel is in the HTML (good for
 * search engines) and assets/js/site.js shows one at a time. Groups are
 * linked by name: a button with data-tab-group="g" data-tab="x" shows the
 * panel with data-panel-group="g" data-panel="x".
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

/** Opening tag attributes for a tab button. */
function de_tab_attrs( $group, $key, $active ) {
	return sprintf( 'type="button" role="tab" data-tab-group="%s" data-tab="%s" aria-selected="%s"', esc_attr( $group ), esc_attr( $key ), $active ? 'true' : 'false' );
}

/** Opening tag attributes for a tab panel. */
function de_panel_attrs( $group, $key, $active ) {
	return sprintf( 'role="tabpanel" data-panel-group="%s" data-panel="%s"%s', esc_attr( $group ), esc_attr( $key ), $active ? '' : ' hidden' );
}

/** id="…" for a section anchor, only on the visible OMET panel (JS moves it on switch). */
function de_sec_id( $sec, $with_id ) {
	return 'data-sec="' . esc_attr( $sec ) . '"' . ( $with_id ? ' id="' . esc_attr( $sec ) . '"' : '' );
}

/**
 * One test card. Free tests open the portal's exam window; paid tests go to
 * checkout for the plan that includes them (the portal sends owners
 * straight on to the test).
 */
function de_test_card( $name, $id, $q, $mins, $free, $plan_id ) {
	$plan = $plan_id ? de_plan( $plan_id ) : null;
	?>
	<div class="de-test">
		<div class="de-test__top"><span class="de-test__tag de-test__tag--<?php echo $free ? 'free' : 'locked'; ?>"><?php echo $free ? 'FREE' : 'LOCKED'; ?></span><span class="de-test__meta"><?php echo (int) $q; ?> Q · <?php echo (int) $mins; ?> min</span></div>
		<span class="de-test__name"><?php de_e( $name ); ?></span>
		<span class="de-test__status"><?php echo $free ? 'Free · AI analysis included' : esc_html( 'Included in ' . ( $plan ? $plan['name'] : 'paid plans' ) ); ?></span>
		<?php if ( $free ) : ?>
			<a class="de-test__btn de-test__btn--start" href="<?php echo esc_url( de_test_url( $id ) ); ?>">Start test</a>
		<?php elseif ( $plan && '₹ —' === $plan['price'] ) : ?>
			<a class="de-test__btn" href="#" data-toast="<?php echo esc_attr( 'Pricing for ' . $plan['name'] . ' coming soon' ); ?>">Unlock</a>
		<?php else : ?>
			<a class="de-test__btn" href="<?php echo esc_url( de_checkout_url( $plan_id, $id ) ); ?>">Unlock</a>
		<?php endif; ?>
	</div>
	<?php
}

/** The "Tests" section: mocks, test series (full mocks / sectionals / topic tests) and free tests. */
function de_render_tests( $view, $exam, $scope ) {
	$c        = $view['catalog'];
	$g_portal = $scope . '-portal';
	$g_series = $scope . '-series';
	$g_ssec   = $scope . '-ssec';
	$g_tsec   = $scope . '-tsec';
	$series   = $c['sm'] ? 'mocks' : 'sectional';
	$last     = function ( $ids ) { return $ids[ count( $ids ) - 1 ]; };
	?>
	<div class="de-split de-split--end">
		<div class="de-stack-6">
			<span class="de-eyebrow de-eyebrow--muted">TEST SERIES</span>
			<h2 class="de-h2"><?php de_e( $c['label'] . ' mocks, sectionals and topic tests' ); ?></h2>
			<p class="de-p15">Every test opens in an exam-style window. Submit and Guru analyses your attempt in seconds: section scores, accuracy, time, weak topics and the next tests to take.</p>
		</div>
		<a class="de-sync" href="<?php echo esc_url( de_login_url() ); ?>">Sign in to save attempts</a>
	</div>

	<div class="de-seg" role="tablist" aria-label="<?php esc_attr_e( 'Test types', 'deeducare' ); ?>">
		<button <?php echo de_tab_attrs( $g_portal, 'mocks', true ); // phpcs:ignore ?>><?php de_e( $c['tabs'][0] ); ?></button>
		<button <?php echo de_tab_attrs( $g_portal, 'series', false ); // phpcs:ignore ?>><?php de_e( $c['tabs'][1] ); ?></button>
	</div>

	<div <?php echo de_panel_attrs( $g_portal, 'mocks', true ); // phpcs:ignore ?> class="de-stack-16">
		<div class="de-tests">
			<?php for ( $i = 1; $i <= $c['mocks']['n']; $i++ ) : ?>
				<?php de_test_card( $c['mocks']['prefix'] . ' ' . $i, $c['pfx'] . '-m-' . $i, $c['mocks']['q'], $c['mocks']['mins'], 1 === $i, $last( $c['mockPlan'] ) ); ?>
			<?php endfor; ?>
		</div>
		<p class="de-note de-note--sm"><?php de_e( $c['mocks']['prefix'] . ' 1 is free. Unlock the rest with a plan below.' ); ?></p>
	</div>

	<div <?php echo de_panel_attrs( $g_portal, 'series', false ); // phpcs:ignore ?> class="de-stack-16">
		<div class="de-chips" role="tablist">
			<?php if ( $c['sm'] ) : ?>
				<button class="de-chip" <?php echo de_tab_attrs( $g_series, 'mocks', true ); // phpcs:ignore ?>><?php de_e( 'Full mocks · ' . $c['sm']['n'] ); ?></button>
			<?php endif; ?>
			<button class="de-chip" <?php echo de_tab_attrs( $g_series, 'sectional', 'sectional' === $series ); // phpcs:ignore ?>><?php de_e( 'Sectionals · ' . count( $c['secs'] ) * $c['secN'] ); ?></button>
			<button class="de-chip" <?php echo de_tab_attrs( $g_series, 'topic', false ); // phpcs:ignore ?>>Topic tests · 3 per topic</button>
		</div>

		<?php if ( $c['sm'] ) : ?>
			<div <?php echo de_panel_attrs( $g_series, 'mocks', true ); // phpcs:ignore ?>>
				<div class="de-tests">
					<?php for ( $i = 1; $i <= $c['sm']['n']; $i++ ) : ?>
						<?php de_test_card( $c['sm']['prefix'] . ' ' . $i, $c['pfx'] . '-sm-' . $i, $c['mocks']['q'], $c['mocks']['mins'], false, $last( $c['seriesPlan'] ) ); ?>
					<?php endfor; ?>
				</div>
			</div>
		<?php endif; ?>

		<div <?php echo de_panel_attrs( $g_series, 'sectional', 'sectional' === $series ); // phpcs:ignore ?> class="de-stack-16">
			<div class="de-stack-6">
				<span class="de-chips__label">Section</span>
				<div class="de-chips" role="tablist">
					<?php foreach ( $c['secs'] as $k => $s ) : ?>
						<button class="de-chip" <?php echo de_tab_attrs( $g_ssec, (string) $k, 0 === $k ); // phpcs:ignore ?>><?php de_e( $s[1] ); ?></button>
					<?php endforeach; ?>
				</div>
			</div>
			<?php foreach ( $c['secs'] as $k => $s ) : ?>
				<div <?php echo de_panel_attrs( $g_ssec, (string) $k, 0 === $k ); // phpcs:ignore ?>>
					<div class="de-tests">
						<?php for ( $i = 1; $i <= $c['secN']; $i++ ) : ?>
							<?php de_test_card( $s[1] . ' Sectional ' . $i, $c['pfx'] . '-ss-' . $k . '-' . $i, $s[2], $c['secMins'], 1 === $i, $last( $c['seriesPlan'] ) ); ?>
						<?php endfor; ?>
					</div>
				</div>
			<?php endforeach; ?>
		</div>

		<div <?php echo de_panel_attrs( $g_series, 'topic', false ); // phpcs:ignore ?> class="de-stack-16">
			<div class="de-stack-6">
				<span class="de-chips__label">Section</span>
				<div class="de-chips" role="tablist">
					<?php foreach ( $view['syl'] as $k => $cu ) : ?>
						<button class="de-chip" <?php echo de_tab_attrs( $g_tsec, (string) $k, 0 === $k ); // phpcs:ignore ?>><?php de_e( $cu['name'] ); ?></button>
					<?php endforeach; ?>
				</div>
			</div>
			<?php foreach ( $view['syl'] as $k => $cu ) : ?>
				<div <?php echo de_panel_attrs( $g_tsec, (string) $k, 0 === $k ); // phpcs:ignore ?> class="de-stack-16">
					<?php foreach ( $cu['groups'] as $grp ) : ?>
						<div class="de-stack-8">
							<?php if ( $grp[0] ) : ?><h3 class="de-topic-h"><?php de_e( $grp[0] ); ?></h3><?php endif; ?>
							<ul class="de-topics">
								<?php foreach ( $grp[1] as $tp ) : ?>
									<li class="de-topics__row">
										<div class="de-topics__name"><span class="de-topics__t"><?php de_e( $tp ); ?></span><span class="de-topics__m">3 tests · 10 Q · 15 min each</span></div>
										<div class="de-topics__pills">
											<?php for ( $n = 1; $n <= 3; $n++ ) : ?>
												<?php
												$tid  = $c['pfx'] . '-tp-' . de_slugify( $tp ) . '-' . $n;
												$plan = de_plan( $last( $c['seriesPlan'] ) );
												if ( 1 === $n ) {
													printf( '<a class="de-pill de-pill--free" href="%s">Test 1 · free</a>', esc_url( de_test_url( $tid ) ) );
												} elseif ( $plan && '₹ —' === $plan['price'] ) {
													printf( '<a class="de-pill" href="#" data-toast="%s">Test %d · locked</a>', esc_attr( 'Pricing for ' . $plan['name'] . ' coming soon' ), (int) $n );
												} else {
													printf( '<a class="de-pill" href="%s">Test %d · locked</a>', esc_url( de_checkout_url( $plan['id'], $tid ) ), (int) $n );
												}
												?>
											<?php endfor; ?>
										</div>
									</li>
								<?php endforeach; ?>
							</ul>
						</div>
					<?php endforeach; ?>
				</div>
			<?php endforeach; ?>
		</div>
		<p class="de-note de-note--sm">Test 1 of every sectional and topic is free. Attempts sync to the app with the same login.</p>
	</div>

	<?php
}

/** First half of an exam page body: quick answer, tests, overview, pattern, syllabus. */
function de_render_exam_a( $view, $exam, $scope, $with_ids ) {
	?>
	<div class="de-card de-qa" data-reveal>
		<div class="de-stack-10">
			<span class="de-eyebrow de-eyebrow--blue">QUICK ANSWER</span>
			<h2 class="de-qa__q"><?php de_e( $view['qa']['q'] ); ?></h2>
			<p class="de-qa__a"><?php de_e( $view['qa']['a'] ); ?></p>
			<span class="de-qa__upd">Updated <?php echo esc_html( get_the_modified_date( 'j M Y' ) ?: wp_date( 'j M Y' ) ); ?> · Reviewed by the DE Educare academic team</span>
		</div>
		<dl class="de-qa__facts">
			<?php foreach ( $view['qa']['facts'] as $f ) : ?>
				<div><dt><?php de_e( $f[1] ); ?></dt><dd><?php de_e( $f[0] ); ?></dd></div>
			<?php endforeach; ?>
		</dl>
	</div>

	<?php de_render_free_tests( $view, $exam, $with_ids ); ?>

	<div class="de-stack-16 de-anchor" <?php echo de_sec_id( 'tests', $with_ids ); // phpcs:ignore ?> data-reveal>
		<?php de_render_tests( $view, $exam, $scope ); ?>
	</div>

	<div class="de-stack-20 de-anchor" <?php echo de_sec_id( 'overview', $with_ids ); // phpcs:ignore ?> data-reveal>
		<div class="de-stack-8"><span class="de-eyebrow de-eyebrow--muted">OVERVIEW</span><h2 class="de-h2"><?php de_e( $view['ov']['h'] ); ?></h2><p class="de-p16"><?php de_e( $view['ov']['p'] ); ?></p></div>
		<div class="de-grid de-grid--230">
			<?php foreach ( $view['ov']['points'] as $p ) : ?>
				<div class="de-card de-point"><span class="de-point__n"><?php de_e( $p[0] ); ?></span><h3 class="de-point__t"><?php de_e( $p[1] ); ?></h3><span class="de-point__d"><?php de_e( $p[2] ); ?></span></div>
			<?php endforeach; ?>
		</div>
		<div class="de-stack-12">
			<h3 class="de-h3"><?php de_e( $view['ov']['tlH'] ); ?></h3>
			<ol class="de-timeline">
				<?php foreach ( $view['ov']['timeline'] as $tl ) : ?>
					<li style="--c:<?php echo esc_attr( $tl[3] ); ?>"><span class="de-timeline__w"><?php de_e( $tl[0] ); ?></span><span class="de-timeline__t"><?php de_e( $tl[1] ); ?></span><span class="de-timeline__d"><?php de_e( $tl[2] ); ?></span></li>
				<?php endforeach; ?>
			</ol>
		</div>
	</div>

	<div class="de-stack-16 de-anchor" <?php echo de_sec_id( 'pattern', $with_ids ); // phpcs:ignore ?> data-reveal>
		<div class="de-stack-8"><span class="de-eyebrow de-eyebrow--muted">EXAM PATTERN</span><h2 class="de-h2"><?php de_e( $view['pat']['h'] ); ?></h2></div>
		<table class="de-pattern">
			<thead><tr><th scope="col">Section</th><th scope="col">Questions</th><th scope="col">Time</th></tr></thead>
			<tbody>
				<?php foreach ( $view['pat']['rows'] as $r ) : ?>
					<tr><th scope="row"><?php de_e( $r[0] ); ?></th><td><?php de_e( $r[1] ); ?></td><td><?php de_e( $r[2] ); ?></td></tr>
				<?php endforeach; ?>
			</tbody>
		</table>
		<div class="de-grid de-grid--180">
			<?php foreach ( $view['pat']['marks'] as $i => $m ) : ?>
				<div class="de-mark de-mark--<?php echo 0 === $i ? 'pos' : ( 1 === $i ? 'neg' : 'neutral' ); ?>"><span class="de-mark__v"><?php de_e( $m[0] ); ?></span><span class="de-mark__k"><?php de_e( $m[1] ); ?></span></div>
			<?php endforeach; ?>
		</div>
		<?php if ( ! empty( $view['pat']['score'] ) ) : ?>
			<h3 class="de-h3 de-mt8">Score vs percentile (CAT 2025, approx.)</h3>
			<div class="de-chart" role="img" aria-label="<?php echo esc_attr( implode( ', ', array_map( function ( $s ) { return $s[0] . ' marks ≈ ' . $s[1] . ' percentile'; }, $view['pat']['score'] ) ) ); ?>">
				<?php foreach ( $view['pat']['score'] as $i => $s ) : ?>
					<div class="de-chart__col"><span class="de-chart__m"><?php echo (int) $s[0]; ?></span><div class="de-chart__bar" style="height:<?php echo (int) round( $s[0] / 140 * 100 ); ?>%;background:<?php echo $i < 4 ? '#1F3A8A' : '#6D8CFF'; ?>"></div><span class="de-chart__p"><?php de_e( $s[1] ); ?></span></div>
				<?php endforeach; ?>
			</div>
			<span class="de-note de-note--xs">Top number is raw score out of 204, bottom is percentile.</span>
		<?php endif; ?>
	</div>

	<div class="de-stack-14 de-anchor" <?php echo de_sec_id( 'syllabus', $with_ids ); // phpcs:ignore ?> data-reveal>
		<div class="de-split de-split--end"><div class="de-stack-8"><span class="de-eyebrow de-eyebrow--muted">SYLLABUS</span><h2 class="de-h2"><?php de_e( $view['name'] . ' syllabus and topic tests' ); ?></h2></div><span class="de-note de-note--sm">Tap a topic to open its topic tests</span></div>
		<div class="de-acc">
			<?php foreach ( $view['syl'] as $i => $cu ) : ?>
				<details class="de-acc__item"<?php echo 0 === $i ? ' open' : ''; ?>>
					<summary>
						<span class="de-acc__m"><?php de_e( $cu['m'] ); ?></span>
						<span class="de-acc__txt"><span class="de-acc__t" role="heading" aria-level="3"><?php de_e( $cu['name'] ); ?></span><span class="de-acc__meta"><?php de_e( $cu['meta'] ); ?></span></span>
						<span class="de-acc__icon" aria-hidden="true"></span>
					</summary>
					<div class="de-acc__body">
						<?php foreach ( $cu['groups'] as $g ) : ?>
							<div class="de-stack-8">
								<?php if ( $g[0] ) : ?><span class="de-acc__g"><?php de_e( $g[0] ); ?></span><?php endif; ?>
								<div class="de-acc__items">
									<?php foreach ( $g[1] as $t ) : ?>
										<a class="de-acc__topic" href="#tests" data-activate="<?php echo esc_attr( $scope . '-portal:series ' . $scope . '-series:topic ' . $scope . '-tsec:' . $i ); ?>"><?php de_e( $t ); ?></a>
									<?php endforeach; ?>
								</div>
							</div>
						<?php endforeach; ?>
					</div>
				</details>
			<?php endforeach; ?>
		</div>
	</div>
	<?php
}

/** Second half: eligibility and dates, colleges, preparation strategy, FAQs. */
function de_render_exam_b( $view, $with_ids ) {
	$info = $view['info'];
	?>
	<div class="de-stack-16 de-anchor" <?php echo de_sec_id( 'facts', $with_ids ); // phpcs:ignore ?> data-reveal>
		<div class="de-stack-8"><span class="de-eyebrow de-eyebrow--muted">ELIGIBILITY &amp; DATES</span><h2 class="de-h2"><?php de_e( $info['factsH'] ); ?></h2></div>
		<div class="de-grid de-grid--320 de-grid--start">
			<dl class="de-facts">
				<?php foreach ( $info['facts'] as $f ) : ?>
					<div><dt><?php de_e( $f[0] ); ?></dt><dd><?php de_e( $f[1] ); ?></dd></div>
				<?php endforeach; ?>
			</dl>
			<div class="de-dates">
				<h3 class="de-dates__h">Important dates</h3>
				<?php foreach ( $info['dates'] as $d ) : ?>
					<div class="de-dates__row"><span class="de-dates__d"><?php de_e( $d[0] ); ?></span><span class="de-dates__t"><?php de_e( $d[1] ); ?></span></div>
				<?php endforeach; ?>
				<span class="de-dates__note"><?php de_e( $info['dateNote'] ); ?></span>
			</div>
		</div>
	</div>

	<div class="de-stack-16 de-anchor" <?php echo de_sec_id( 'colleges', $with_ids ); // phpcs:ignore ?> data-reveal>
		<div class="de-stack-8"><span class="de-eyebrow de-eyebrow--muted">COLLEGES &amp; CUTOFFS</span><h2 class="de-h2"><?php de_e( $info['collegesH'] ); ?></h2><p class="de-p14"><?php de_e( $info['cutNote'] ); ?></p></div>
		<ul class="de-colleges">
			<?php foreach ( $info['colleges'] as $cl ) : ?>
				<li class="de-college">
					<span class="de-college__logo" aria-hidden="true"><?php echo esc_html( preg_replace( '/[^A-Z]/', '', $cl[0] ) ? mb_substr( preg_replace( '/[^A-Z]/', '', $cl[0] ), 0, 3 ) : mb_substr( $cl[0], 0, 2 ) ); ?></span>
					<span class="de-college__n"><?php de_e( $cl[0] ); ?></span>
					<?php if ( $cl[1] ) : ?><span class="de-college__cut"><?php de_e( $cl[1] . ' %ile' ); ?></span><?php endif; ?>
				</li>
			<?php endforeach; ?>
		</ul>
	</div>

	<div class="de-stack-16 de-anchor" <?php echo de_sec_id( 'strategy', $with_ids ); // phpcs:ignore ?> data-reveal>
		<div class="de-stack-8"><span class="de-eyebrow de-eyebrow--muted">PREPARATION STRATEGY</span><h2 class="de-h2"><?php de_e( $info['stratH'] ); ?></h2></div>
		<div class="de-grid de-grid--300">
			<?php foreach ( $info['strategy'] as $s ) : ?>
				<article class="de-card de-strat"><h3 class="de-strat__h"><?php de_e( $s[0] ); ?></h3><p class="de-strat__p"><?php de_e( $s[1] ); ?></p></article>
			<?php endforeach; ?>
		</div>
	</div>

	<div class="de-stack-14 de-anchor" <?php echo de_sec_id( 'faq', $with_ids ); // phpcs:ignore ?> data-reveal>
		<div class="de-stack-8"><span class="de-eyebrow de-eyebrow--muted">FAQS</span><h2 class="de-h2"><?php de_e( $view['name'] . ' FAQs' ); ?></h2></div>
		<?php de_faq_list( $view['faq'] ); ?>
	</div>
	<?php
}

/** Plan cards for an exam. */
function de_render_plans( $exam ) {
	$daily = 'omet' === $exam ? 'omet' : $exam;
	?>
	<div class="de-stack-16 de-anchor" data-sec="plans" id="plans" data-reveal>
		<div class="de-stack-8"><span class="de-eyebrow de-eyebrow--muted">TEST SERIES PRICING</span><h2 class="de-h2">Choose your test series</h2><span class="de-note">Prices include GST · UPI, cards, netbanking and EMI · unlocks instantly on web and app · Test 1 of every set is free to try</span></div>
		<div class="de-grid de-grid--230 de-grid--stretch">
			<?php foreach ( de_plans()[ $exam ] as $p ) : ?>
				<?php $dark = ! empty( $p['dark'] ); ?>
				<div class="de-plan<?php echo $dark ? ' is-dark' : ''; ?>">
					<div class="de-plan__top"><h3 class="de-plan__name"><?php de_e( $p['name'] ); ?></h3><?php if ( ! empty( $p['tag'] ) ) : ?><span class="de-tag"><?php de_e( $p['tag'] ); ?></span><?php endif; ?></div>
					<span class="de-plan__price"><?php de_e( $p['price'] ); ?><?php if ( ! empty( $p['mrp'] ) && ! empty( $p['amount'] ) && $p['mrp'] > $p['amount'] ) : ?> <s class="de-plan__was"><span class="screen-reader-text">was </span><?php de_e( de_rupees( $p['mrp'] ) ); ?></s><?php endif; ?></span>
					<p class="de-plan__desc"><?php de_e( $p['desc'] ); ?></p>
					<ul class="de-plan__feat">
						<?php foreach ( $p['feat'] as $f ) : ?>
							<li><span class="de-plan__check" aria-hidden="true">✓</span><?php de_e( $f ); ?></li>
						<?php endforeach; ?>
					</ul>
					<span class="de-plan__best"><?php de_e( $p['best'] ); ?></span>
					<a class="de-btn de-btn--block <?php echo $dark ? 'de-btn--amber' : ( ! empty( $p['free'] ) ? 'de-btn--soft' : 'de-btn--primary' ); ?>" <?php echo de_plan_action( $p, $daily ); // phpcs:ignore ?>><?php de_e( $p['cta'] ); ?></a>
				</div>
			<?php endforeach; ?>
		</div>
	</div>
	<?php
}

/** Coaching programmes for this exam, with the enquiry form beside them. */
function de_render_coaching( $exam ) {
	$ids   = array( 'cat' => array( 'cat-coaching-2027', 'mba-plus' ), 'cet' => array( 'cet-coaching-2028', 'mba-plus' ), 'omet' => array( 'mba-plus', 'cat-coaching-2027' ) )[ $exam ];
	$plans = array_values( array_filter( de_coaching(), function ( $c ) use ( $ids ) { return in_array( $c['id'], $ids, true ); } ) );
	usort( $plans, function ( $a, $b ) use ( $ids ) { return array_search( $a['id'], $ids, true ) - array_search( $b['id'], $ids, true ); } );
	$label = array( 'cat' => 'CAT 2027', 'cet' => 'MBA-CET 2028', 'omet' => 'OMETs' )[ $exam ];
	$icons = array( array( 'icon-mentor.webp', 'Live classes' ), array( 'icon-books.webp', 'Books' ), array( 'icon-checklist.webp', 'Mocks' ), array( 'icon-support.webp', 'Mentorship' ) );
	?>
	<div class="de-stack-16 de-anchor" id="coaching" data-reveal>
		<div class="de-stack-8">
			<span class="de-eyebrow de-eyebrow--blue">COACHING · NEW BATCHES</span>
			<h2 class="de-h2"><?php de_e( 'omet' === $exam ? 'Coaching that covers every OMET' : $label . ' coaching with live classes and mentors' ); ?></h2>
			<p class="de-p15">Live lectures, a recording of every class, books, the full test series and one-on-one mentorship, online or in our Mumbai classroom. Send an enquiry for batch start dates.</p>
			<ul class="de-feats" aria-label="Included">
				<?php foreach ( $icons as $ic ) : ?>
					<li><?php de_icon_img( $ic[0], '', 36 ); ?><span><?php de_e( $ic[1] ); ?></span></li>
				<?php endforeach; ?>
			</ul>
		</div>
		<div class="de-coach">
			<div class="de-coach__plans">
				<?php foreach ( $plans as $i => $p ) : ?>
					<article class="de-plan<?php echo 0 === $i ? ' is-dark' : ''; ?>">
						<div class="de-plan__top">
							<h3 class="de-plan__name"><?php de_e( $p['name'] ); ?></h3>
							<?php if ( ! empty( $p['tag'] ) ) : ?><span class="de-tag"><?php de_e( $p['tag'] ); ?></span><?php endif; ?>
						</div>
						<span class="de-plan__price"><?php de_e( de_rupees( $p['fee'] ) ); ?></span>
						<p class="de-plan__desc"><?php de_e( $p['for'] ); ?></p>
						<?php if ( 0 === $i ) : ?>
							<ul class="de-plan__feat">
								<?php foreach ( $p['feat'] as $f ) : ?>
									<li><span class="de-plan__check" aria-hidden="true">✓</span><?php de_e( $f ); ?></li>
								<?php endforeach; ?>
							</ul>
						<?php endif; ?>
						<?php de_lead_button( $p['id'], 'Enquire about ' . $p['name'], 'de-btn de-btn--block ' . ( 0 === $i ? 'de-btn--amber' : 'de-btn--primary' ) ); ?>
					</article>
				<?php endforeach; ?>
			</div>
			<div class="de-card de-coach__form">
				<?php de_lead_form( $plans[0]['id'], true ); ?>
			</div>
		</div>
	</div>
	<?php
}

/** Free tests for this exam: today's daily test, the free mock and previous papers. */
function de_render_free_tests( $view, $exam, $with_ids ) {
	$c     = $view['catalog'];
	$daily = 'omet' === $exam ? strtolower( $view['name'] ) : $exam;
	$label = wp_date( 'j M' );
	?>
	<div class="de-stack-14 de-anchor" <?php echo de_sec_id( 'free', $with_ids ); // phpcs:ignore ?> data-reveal>
		<div class="de-split de-split--end">
			<div class="de-stack-6">
				<span class="de-eyebrow de-eyebrow--muted">FREE TESTS</span>
				<h2 class="de-h2"><?php de_e( 'Free ' . $c['label'] . ' mock test and daily test' ); ?></h2>
				<p class="de-p15">Free with a DE Educare ID, no card needed. Every attempt gets the same AI analysis as paid tests.</p>
			</div>
			<a class="de-sync" href="<?php echo esc_url( de_page_url( 'free-resources' ) ); ?>">More free resources →</a>
		</div>
		<div class="de-tests">
			<div class="de-test de-test--daily">
				<div class="de-test__top"><span class="de-test__tag de-test__tag--free">FREE · DAILY</span><span class="de-test__meta">15 min</span></div>
				<span class="de-test__name"><?php de_e( 'Today’s ' . $c['label'] . ' test · ' . $label ); ?></span>
				<span class="de-test__status">New every morning · keeps your streak</span>
				<a class="de-test__btn de-test__btn--start" href="<?php echo esc_url( de_daily_url( $daily ) ); ?>">Start today’s test</a>
			</div>
			<?php de_test_card( $c['mocks']['prefix'] . ' 1 · full-length', $c['pfx'] . '-m-1', $c['mocks']['q'], $c['mocks']['mins'], true, null ); ?>
			<?php foreach ( $c['pyq'] as $k => $p ) : ?>
				<?php de_test_card( $p[0], $c['pfx'] . '-pyq-' . $k, $p[1], $p[2], true, null ); ?>
			<?php endforeach; ?>
			<?php if ( ! empty( $c['secs'][0] ) ) : ?>
				<?php de_test_card( $c['secs'][0][1] . ' Sectional 1', $c['pfx'] . '-ss-0-1', $c['secs'][0][2], $c['secMins'], true, null ); ?>
			<?php endif; ?>
		</div>
	</div>
	<?php
}
