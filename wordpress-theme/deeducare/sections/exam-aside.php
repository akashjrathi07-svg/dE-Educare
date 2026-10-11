<?php
/**
 * Exam sidebar: coaching fee with an enquiry button, the test series offer price and today's free test.
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

list( , $group, $key ) = de_exam_view( $exam );
$plans = de_plans()[ $group ];
$top   = $plans[0];
foreach ( $plans as $p ) {
	if ( ! empty( $p['dark'] ) ) {
		$top = $p;
		break;
	}
}
$coach_id = array( 'cat' => 'cat-coaching-2027', 'cet' => 'cet-coaching-2028', 'omet' => 'mba-plus' )[ $group ];
$coach    = null;
foreach ( de_coaching() as $c ) {
	if ( $c['id'] === $coach_id ) {
		$coach = $c;
	}
}
$daily = de_daily_url( 'omet' === $group ? $key : $group );
?>
<aside class="de-exam-aside">
	<div class="de-price-card de-price-card--coach">
		<span class="de-eyebrow de-eyebrow--sm de-blue">COACHING</span>
		<span class="de-price-card__name"><?php de_e( $coach['name'] ); ?></span>
		<span class="de-price-card__price"><?php de_e( de_rupees( $coach['fee'] ) ); ?></span>
		<?php de_lead_button( $coach['id'], 'Enquire now', 'de-btn de-btn--primary de-btn--block de-btn--lg' ); ?>
		<span class="de-price-card__note">Batch dates and a free counselling call.</span>
	</div>
	<div class="de-price-card">
		<span class="de-eyebrow de-eyebrow--amber de-eyebrow--sm">TEST SERIES · MOST POPULAR</span>
		<span class="de-price-card__name"><?php de_e( $top['name'] ); ?></span>
		<span class="de-price-card__price"><?php de_e( $top['price'] ); ?><?php if ( ! empty( $top['mrp'] ) && ! empty( $top['amount'] ) && $top['mrp'] > $top['amount'] ) : ?> <s class="de-plan__was"><span class="screen-reader-text">was </span><?php de_e( de_rupees( $top['mrp'] ) ); ?></s><?php endif; ?></span>
		<ul>
			<?php foreach ( array_slice( $top['feat'], 0, 4 ) as $f ) : ?>
				<li><span aria-hidden="true">✓</span><?php de_e( $f ); ?></li>
			<?php endforeach; ?>
		</ul>
		<a class="de-btn de-btn--amber de-btn--block de-btn--lg" <?php echo de_plan_action( $top, $group ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in helper. ?>><?php de_e( $top['cta'] ); ?></a>
	</div>
	<a class="de-daily-card" href="<?php echo esc_url( $daily ); ?>">
		<span class="de-daily-card__big">5Q</span>
		<span><span class="de-daily-card__t">Today’s free test</span><span class="de-daily-card__d">AI analysis included</span></span>
	</a>
</aside>
