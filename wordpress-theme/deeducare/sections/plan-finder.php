<?php
/**
 * "Which plan is right for me?" Three quick choices recommend a test series or coaching programme.
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

$recs = array();
foreach ( array( 'cat-10', 'cat-ts', 'cet-ts', 'om-single' ) as $id ) {
	$p = de_plan( $id );
	if ( $p && empty( $p['soon'] ) ) {
		$recs[ $id ] = array( 'name' => $p['name'], 'price' => $p['price'], 'desc' => $p['desc'], 'url' => de_checkout_url( $id ), 'cta' => 'Buy ' . $p['name'] );
	}
}
foreach ( de_coaching() as $c ) {
	$recs[ $c['id'] ] = array( 'name' => $c['name'], 'price' => de_rupees( $c['fee'] ), 'desc' => $c['for'], 'lead' => $c['id'], 'cta' => 'Enquire about ' . $c['name'] );
}
$qs = array(
	'exam'  => array( 'Which exam?', array( 'cat' => 'CAT', 'cet' => 'MBA-CET', 'both' => 'CAT + CET', 'snap' => 'SNAP' ) ),
	'stage' => array( 'Where are you?', array( 'start' => 'Just starting', 'mid' => 'Know the basics', 'final' => 'Exam in 3 months or less' ) ),
	'want'  => array( 'What do you need?', array( 'mocks' => 'Only mocks', 'series' => 'Mocks + sectionals + topic tests', 'coach' => 'Live classes and mentors' ) ),
);
?>
<div class="de-finder" data-finder data-recs="<?php echo esc_attr( wp_json_encode( $recs ) ); ?>">
	<div class="de-finder__q">
		<span class="de-eyebrow de-eyebrow--blue">FIND YOUR PLAN · 10 SECONDS</span>
		<h3 class="de-h3">Not sure which one to pick?</h3>
		<?php foreach ( $qs as $k => $q ) : ?>
			<div class="de-finder__row" role="group" aria-label="<?php echo esc_attr( $q[0] ); ?>">
				<span class="de-finder__label"><?php de_e( $q[0] ); ?></span>
				<div class="de-chips">
					<?php $first = true; foreach ( $q[1] as $v => $label ) : ?>
						<button type="button" class="de-chip" data-finder-<?php echo esc_attr( $k ); ?>="<?php echo esc_attr( $v ); ?>" aria-pressed="<?php echo $first ? 'true' : 'false'; ?>"><?php de_e( $label ); ?></button>
					<?php $first = false; endforeach; ?>
				</div>
			</div>
		<?php endforeach; ?>
	</div>
	<div class="de-finder__out" aria-live="polite">
		<span class="de-eyebrow de-eyebrow--amber">WE RECOMMEND</span>
		<b class="de-finder__name" data-finder-name></b>
		<span class="de-finder__price" data-finder-price></span>
		<p class="de-finder__desc" data-finder-desc></p>
		<p class="de-finder__why" data-finder-why></p>
		<a class="de-btn de-btn--amber de-btn--block de-btn--lg" href="#" data-finder-cta></a>
		<a class="de-finder__alt" href="#" data-finder-alt hidden></a>
	</div>
</div>
