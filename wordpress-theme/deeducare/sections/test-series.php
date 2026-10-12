<?php
/**
 * Test series cards with test counts, offer price and MRP (live from the portal).
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

$contact  = de_page_url( 'contact' );
$coaching = array();
foreach ( de_coaching() as $c ) {
	$coaching[ $c['id'] ] = $c;
}
$hx = array(
	array( 'id' => 'cat', 'name' => 'CAT', 'sub' => 'Coaching 2027 · Test Series', 'status' => 'LIVE', 'img' => 'img_cat', 'coach' => 'cat-coaching-2027', 'plan' => 'cat-ts', 'tests' => '20 mocks · 30 sectionals · 3 topic tests each', 'cta' => 'Explore CAT', 'url' => de_page_url( 'cat' ) ),
	array( 'id' => 'cet', 'name' => 'MBA-CET', 'sub' => 'Coaching 2028 · Test Series', 'status' => 'LIVE', 'img' => 'img_cet', 'coach' => 'cet-coaching-2028', 'plan' => 'cet-ts', 'tests' => '30 mocks · 40 sectionals · 3 topic tests each', 'cta' => 'Explore MBA-CET', 'url' => de_page_url( 'mba-cet' ) ),
	array( 'id' => 'omet', 'name' => 'OMETs', 'sub' => 'SNAP · NMAT · XAT · CMAT', 'status' => 'LIVE', 'img' => 'img_omet', 'coach' => 'mba-plus', 'plan' => 'om-single', 'tests' => '15 SNAP mocks · sectionals · 3 topic tests each', 'cta' => 'Explore OMETs', 'url' => de_page_url( 'omet' ) ),
	array( 'id' => 'govt', 'name' => 'Govt exams', 'sub' => 'Bank PO · RBI · UPSC', 'status' => 'SOON', 'img' => 'img_govt', 'coach' => '', 'plan' => '', 'tests' => '', 'cta' => 'Get notified', 'url' => add_query_arg( 'exam', 'Bank PO', $contact ) ),
);
$trust = array( 'Free daily test, no card', 'AI analysis on every attempt', 'One login on web and app', 'Mumbai-based team' );

/** Price with the struck-through MRP and the saving. */
$price = function ( $p, $size = '' ) {
	if ( ! $p ) {
		return;
	}
	echo '<span class="de-price' . ( $size ? ' de-price--' . esc_attr( $size ) : '' ) . '">';
	echo '<span class="de-price__now">' . esc_html( $p['price'] ) . '</span>';
	if ( ! empty( $p['mrp'] ) && ! empty( $p['amount'] ) && $p['mrp'] > $p['amount'] ) {
		echo '<s class="de-price__was"><span class="screen-reader-text">was </span>' . esc_html( de_rupees( $p['mrp'] ) ) . '</s>';
		echo '<span class="de-price__off">Save ' . esc_html( de_rupees( $p['mrp'] - $p['amount'] ) ) . '</span>';
	}
	echo '</span>';
};
?>
<div class="de-wrap de-ts-wrap" data-reveal>
	<div class="de-stack-12">
		<div class="de-ts">
			<?php foreach ( de_test_series() as $t ) : ?>
				<?php
				$p = de_plan( $t['plan'] );
				if ( ! $p ) {
					continue;
				}
				?>
				<article class="de-ts__card<?php echo 'cat-ts' === $t['plan'] ? ' is-hl' : ''; ?>">
					<div class="de-ts__top">
						<h3 class="de-ts__name"><a href="<?php echo esc_url( $t['url'] ); ?>"><?php de_e( $t['name'] ); ?></a></h3>
						<?php if ( ! empty( $p['tag'] ) ) : ?><span class="de-tag"><?php de_e( $p['tag'] ); ?></span><?php endif; ?>
					</div>
					<dl class="de-ts__counts">
						<?php foreach ( $t['counts'] as $n ) : ?>
							<div><dt><?php de_e( $n[1] ); ?></dt><dd><?php de_e( $n[0] ); ?></dd></div>
						<?php endforeach; ?>
					</dl>
					<?php $price( $p ); ?>
						<a class="de-btn de-btn--block <?php echo empty( $p['soon'] ) ? 'de-btn--primary' : 'de-btn--outline'; ?>" <?php echo de_plan_action( $p, $t['exam'] ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in helper. ?>><?php de_e( de_plan_cta( $p, 'Buy now' ) ); ?></a>
				</article>
			<?php endforeach; ?>
		</div>
	</div>
</div>
