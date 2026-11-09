<?php
/**
 * Free resources: practice questions with solutions, daily test, resources,
 * free tests, percentile predictor and FAQs.
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

$sets  = de_free_questions();
$res   = de_free_links();
$notes = de_free_resources();
?>
<section class="de-wrap de-free" data-reveal>
	<div class="de-grid de-grid--460 de-grid--end">
		<h1 class="de-free__h">Free CAT mock tests, questions and tools.</h1>
		<p class="de-lead">Free daily tests and mocks, practice questions with worked solutions, notes, and percentile and college predictors. Sign in free to save attempts to your dashboard.</p>
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
							<details class="de-fq__sol" data-fq-sol>
								<summary>Worked solution</summary>
								<span class="de-fq__verdict" data-fq-verdict></span>
								<p><?php de_e( $q['sol'] ); ?></p>
							</details>
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

	<div class="de-split de-split--end">
		<div class="de-stack-6"><span class="de-eyebrow de-eyebrow--muted">FREE TESTS</span><h2 class="de-h2">Free CAT, MBA-CET and SNAP mock tests</h2></div>
		<span class="de-note de-note--sm">Free DE Educare ID · no card needed · AI analysis on every attempt</span>
	</div>
	<?php de_free_tests_tabs(); ?>

	<div class="de-stack-14 de-anchor" id="notes" data-reveal>
		<div class="de-split de-split--end">
			<div class="de-stack-6"><span class="de-eyebrow de-eyebrow--muted">FREE NOTES &amp; PDFS</span><h2 class="de-h2">Formula sheets, notes and question banks</h2></div>
			<span class="de-note de-note--sm">Opens in the student portal after free sign-in · view only</span>
		</div>
		<?php if ( $notes ) : ?>
			<div class="de-grid de-grid--280">
				<?php foreach ( $notes as $n ) : ?>
					<a class="de-res" href="<?php echo esc_url( $n['url'] ); ?>">
						<span class="de-res__big"><?php de_e( strtoupper( $n['exam'] ?? 'PDF' ) ); ?></span>
						<span class="de-res__txt"><span class="de-res__t"><?php de_e( $n['title'] ); ?></span><span class="de-res__d"><?php de_e( trim( ( $n['kind'] ?? 'PDF' ) . ( ! empty( $n['pages'] ) ? ' · ' . $n['pages'] . ' pages' : '' ) . ( ! empty( $n['desc'] ) ? ' · ' . $n['desc'] : '' ) ) ); ?></span></span>
						<span class="de-blue" aria-hidden="true">→</span>
					</a>
				<?php endforeach; ?>
			</div>
		<?php else : ?>
			<a class="de-res" href="<?php echo esc_url( de_portal( 'library' ) ); ?>">
				<span class="de-res__big">PDF</span>
				<span class="de-res__txt"><span class="de-res__t">Open the free library</span><span class="de-res__d">Quant formula sheet, DILR set types, VARC reading list</span></span>
				<span class="de-blue" aria-hidden="true">→</span>
			</a>
		<?php endif; ?>
	</div>

	<?php de_predictors( 'predictor' ); ?>

	<div class="de-stack-14 de-narrow-left" data-reveal>
		<span class="de-eyebrow de-eyebrow--muted">FAQS</span>
		<h2 class="de-h2">Free resources: common questions</h2>
		<?php de_faq_list( de_free_faqs() ); ?>
	</div>
</section>
