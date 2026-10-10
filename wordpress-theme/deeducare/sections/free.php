<?php
/**
 * Free resources: practice questions with solutions, daily test, resources,
 * free tests, percentile predictor and FAQs.
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

$sets  = de_free_questions();
$today = wp_date( 'Ymd' );
$label = wp_date( 'j M' );
$res   = array(
	array( 'PDF', 'Formula sheets and notes', 'Read in the portal · free sign-in', '#notes' ),
	array( '2017–25', 'CAT previous papers', 'Attempt in the exam interface', '#free-tests' ),
	array( 'CET', 'MBA-CET sample paper', '200 Q · 150 min', de_test_url( 'cet-pyq-0' ) ),
	array( 'XAT', 'Decision making sets', 'With explanations', de_page_url( 'omet' ) . '?exam=xat' ),
	array( 'AI', 'Ask Guru', '10 free questions a day', de_signup_url() ),
);
$free_tests = array(
	array( 'CAT Mock 1 · free mock', 'cat-m-1', 68, 120 ),
	array( 'CAT Daily Test · ' . $label, 'cat-d-' . $today, 5, 10 ),
	array( 'MBA-CET Daily Test · ' . $label, 'cet-d-' . $today, 5, 10 ),
	array( 'SNAP Daily Test · ' . $label, 'om-snap-d-' . $today, 5, 10 ),
	array( 'CAT 2024 Slot 1 · previous paper', 'cat-pyq-0', 68, 120 ),
	array( 'MAH-CET 2025 · memory-based paper', 'cet-pyq-0', 200, 150 ),
);
?>
<section class="de-wrap de-free" data-reveal>
	<div class="de-grid de-grid--460 de-grid--end">
		<h1 class="de-free__h">Free, and genuinely useful.</h1>
		<p class="de-lead">Practice questions with worked solutions, a daily test, past papers and tools. Sign in free to save attempts to your dashboard.</p>
	</div>

	<div class="de-free__grid">
		<div class="de-fq de-anchor" id="free-questions" data-fq>
			<div class="de-fq__head">
				<h2 class="de-fq__title">Free questions</h2>
				<div class="de-fq__tabs" role="tablist">
					<?php $first = true; foreach ( $sets as $key => $set ) : ?>
						<button <?php echo de_tab_attrs( 'fq', $key, $first ); // phpcs:ignore ?> class="de-fq__tab"><?php de_e( $set['name'] ); ?></button>
					<?php $first = false; endforeach; ?>
				</div>
			</div>
			<?php $first = true; foreach ( $sets as $key => $set ) : ?>
				<div <?php echo de_panel_attrs( 'fq', $key, $first ); // phpcs:ignore ?> class="de-fq__set" data-fq-set>
					<?php foreach ( $set['qs'] as $i => $q ) : ?>
						<article class="de-fq__q" data-fq-q data-answer="<?php echo (int) $q['a']; ?>"<?php echo 0 === $i ? '' : ' hidden'; ?>>
							<div class="de-fq__meta"><span>Q<?php echo (int) $i + 1; ?> of <?php echo count( $set['qs'] ); ?> · <?php de_e( $q['topic'] ); ?></span><span class="de-blue" data-fq-score>0 / 0 correct</span></div>
							<h3 class="de-fq__text"><?php de_e( $q['q'] ); ?></h3>
							<div class="de-fq__opts">
								<?php foreach ( $q['o'] as $j => $o ) : ?>
									<button type="button" class="de-fq__opt" data-opt="<?php echo (int) $j; ?>"><span class="de-fq__l"><?php echo esc_html( 'ABCD'[ $j ] ); ?></span><span><?php de_e( $o ); ?></span></button>
								<?php endforeach; ?>
							</div>
							<div class="de-fq__sol" data-fq-sol hidden>
								<span class="de-fq__verdict" data-fq-verdict></span>
								<p><span class="screen-reader-text">Solution: </span><?php de_e( $q['sol'] ); ?></p>
							</div>
						</article>
					<?php endforeach; ?>
					<div class="de-fq__nav">
						<button type="button" class="de-btn de-btn--soft" data-fq-prev>← Previous</button>
						<button type="button" class="de-btn de-btn--primary" data-fq-next data-end-toast="Sign in free for 1,000+ more questions">Next →</button>
					</div>
				</div>
			<?php $first = false; endforeach; ?>
		</div>

		<div class="de-stack-10">
			<div class="de-daily-promo">
				<span class="de-eyebrow de-eyebrow--amber de-eyebrow--sm">DAILY FREE TEST</span>
				<span class="de-daily-promo__t">A fresh test every day across VARC, DILR and Quant.</span>
				<span class="de-daily-promo__d">Instant scorecard. CAT-style interface. Keeps your streak.</span>
				<a class="de-btn de-btn--white" href="<?php echo esc_url( de_daily_url( 'cat' ) ); ?>">Start today’s test</a>
			</div>
			<?php foreach ( $res as $r ) : ?>
				<a class="de-res" href="<?php echo esc_url( $r[3] ); ?>">
					<span class="de-res__big"><?php de_e( $r[0] ); ?></span>
					<span class="de-res__txt"><span class="de-res__t"><?php de_e( $r[1] ); ?></span><span class="de-res__d"><?php de_e( $r[2] ); ?></span></span>
					<span class="de-blue" aria-hidden="true">→</span>
				</a>
			<?php endforeach; ?>
		</div>
	</div>

	<div class="de-stack-14 de-anchor" id="free-tests" data-reveal>
		<div class="de-split de-split--end">
			<div class="de-stack-6"><span class="de-eyebrow de-eyebrow--muted">FREE TESTS</span><h2 class="de-h2">Free tests with AI analysis</h2></div>
			<span class="de-note de-note--sm">Free DE Educare ID · no card needed</span>
		</div>
		<div class="de-tests">
			<?php foreach ( $free_tests as $t ) : ?>
				<?php de_test_card( $t[0], $t[1], $t[2], $t[3], true, null ); ?>
			<?php endforeach; ?>
		</div>
	</div>

	<?php de_predictors( 'predictor' ); ?>

	<div class="de-stack-14 de-narrow-left" data-reveal>
		<span class="de-eyebrow de-eyebrow--muted">FAQS</span>
		<h2 class="de-h2">Free resources: common questions</h2>
		<?php de_faq_list( de_free_faqs() ); ?>
	</div>
</section>
