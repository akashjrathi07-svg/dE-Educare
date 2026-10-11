<?php
/**
 * Free tests by exam (CAT, MBA-CET, SNAP): live free tests from the portal, with defaults.
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
	<div class="de-stack-14 de-anchor" id="free-tests" data-reveal>
		<div class="de-seg" role="tablist" aria-label="Exam">
			<?php $first = true; foreach ( $free_by_exam as $k => $fx ) : ?>
				<button <?php echo de_tab_attrs( 'ft', $k, $first ); // phpcs:ignore ?>><?php de_e( $fx[0] ); ?></button>
			<?php $first = false; endforeach; ?>
		</div>
		<?php $first = true; foreach ( $free_by_exam as $k => $fx ) : ?>
			<div <?php echo de_panel_attrs( 'ft', $k, $first ); // phpcs:ignore ?> class="de-stack-12">
				<div class="de-tests">
					<?php foreach ( $fx[2] as $i => $t ) : ?>
						<?php if ( 0 === $i ) : ?>
							<div class="de-test de-test--daily">
								<div class="de-test__top"><span class="de-test__tag de-test__tag--free">FREE · DAILY</span><span class="de-test__meta">15 min</span></div>
								<span class="de-test__name"><?php de_e( $t[0] ); ?></span>
								<span class="de-test__status">New every morning · keeps your streak</span>
								<a class="de-test__btn de-test__btn--start" href="<?php echo esc_url( de_daily_url( $fx[1] ) ); ?>">Start today’s test</a>
							</div>
						<?php else : ?>
							<?php de_test_card( $t[0], $t[1], $t[2], $t[3], true, null ); ?>
						<?php endif; ?>
					<?php endforeach; ?>
				</div>
			</div>
		<?php $first = false; endforeach; ?>
	</div>
