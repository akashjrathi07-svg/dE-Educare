<?php
/**
 * Free notes and PDFs from the portal (Admin → Free resources); open view-only after sign-in.
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
	<div class="de-stack-14 de-anchor" id="notes" data-reveal>
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
