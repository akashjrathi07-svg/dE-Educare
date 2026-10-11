<?php
/**
 * Free practice questions with worked solutions (solutions are in the HTML for search engines).
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
	array( 'AI', 'Ask Guru', '10 free coins a day', de_signup_url() ),
);
$free_by_exam = array(
	'cat'  => array( 'CAT', 'cat', array(
		array( 'CAT Daily Test · ' . $label, 'cat-d-' . $today, 5, 15 ),
		array( 'CAT Mock 1 · full-length', 'cat-m-1', 68, 120 ),
		array( 'CAT 2024 Slot 1 · previous paper', 'cat-pyq-0', 68, 120 ),
		array( 'CAT 2023 Slot 2 · previous paper', 'cat-pyq-1', 66, 120 ),
		array( 'Quant Sectional 1', 'cat-ss-0-1', 22, 40 ),
		array( 'DILR Sectional 1', 'cat-ss-1-1', 22, 40 ),
		array( 'VARC Sectional 1', 'cat-ss-2-1', 24, 40 ),
	) ),
	'cet'  => array( 'MBA-CET', 'cet', array(
		array( 'MBA-CET Daily Test · ' . $label, 'cet-d-' . $today, 5, 15 ),
		array( 'MBA-CET Mock 1 · full-length', 'cet-m-1', 200, 150 ),
		array( 'MAH-CET 2025 · memory-based paper', 'cet-pyq-0', 200, 150 ),
		array( 'Logical Reasoning Sectional 1', 'cet-ss-0-1', 75, 30 ),
		array( 'Abstract Reasoning Sectional 1', 'cet-ss-1-1', 25, 30 ),
	) ),
	'snap' => array( 'SNAP', 'snap', array(
		array( 'SNAP Daily Test · ' . $label, 'om-snap-d-' . $today, 5, 15 ),
		array( 'SNAP Mock 1 · full-length', 'om-snap-m-1', 60, 60 ),
		array( 'SNAP sample paper', 'om-snap-pyq-0', 60, 60 ),
	) ),
);
// Tests marked free in the portal replace the defaults above (the daily test stays first).
$portal_free = de_portal_free_tests();
foreach ( array( 'cat' => 'CAT', 'cet' => 'MBA-CET', 'snap' => 'SNAP' ) as $k => $code ) {
	if ( ! empty( $portal_free[ $code ] ) ) {
		$list = array( $free_by_exam[ $k ][2][0] );
		foreach ( array_slice( $portal_free[ $code ], 0, 11 ) as $t ) {
			$list[] = array( $t['name'], $t['slug'], (int) $t['questions'], (int) $t['minutes'] );
		}
		$free_by_exam[ $k ][2] = $list;
	}
}
$notes = de_free_resources();
?>
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
