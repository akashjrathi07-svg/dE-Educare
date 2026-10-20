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
// The highlighted plan, or else the first one on sale (not "coming soon").
foreach ( $plans as $p ) {
	if ( empty( $p['soon'] ) && empty( $p['free'] ) && ( ! empty( $p['dark'] ) || ! empty( $top['soon'] ) || ! empty( $top['free'] ) ) ) {
		$top = $p;
		if ( ! empty( $p['dark'] ) ) {
			break;
		}
	}
}
$coach_id = array( 'cat' => 'cat-coaching-2027', 'cet' => 'cet-crash', 'omet' => 'cat-coaching-2027' )[ $group ];
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
		<a class="de-btn de-btn--amber de-btn--block de-btn--lg" <?php echo de_plan_action( $top, $group ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in helper. ?>><?php de_e( de_plan_cta( $top, $top['cta'] ) ); ?></a>
	</div>
	<?php
	// Score planner: attempts and accuracy → expected score and time per question, in this exam's marking.
	$pat = array(
		'cat' => array( 'q' => 68, 'plus' => 3, 'minus' => 1, 'min' => 120, 'att' => 40 ),
		'cet' => array( 'q' => 200, 'plus' => 1, 'minus' => 0, 'min' => 150, 'att' => 160 ),
	);
	if ( 'omet' === $group ) {
		$om  = de_omets()[ $key ] ?? de_omets()['snap'];
		$num = function ( $v ) { return abs( (float) str_replace( array( '−', '+' ), array( '-', '' ), $v ) ); };
		$pat['omet'] = array( 'q' => $om['q'], 'plus' => $num( $om['marks'][0][0] ) ?: 1, 'minus' => $num( $om['marks'][1][0] ), 'min' => $om['mins'], 'att' => (int) round( $om['q'] * 0.75 ) );
	}
	$pp = $pat[ $group ];
	?>
	<div class="de-planner" data-planner data-q="<?php echo (int) $pp['q']; ?>" data-plus="<?php echo esc_attr( $pp['plus'] ); ?>" data-minus="<?php echo esc_attr( $pp['minus'] ); ?>" data-min="<?php echo (int) $pp['min']; ?>"<?php echo 'cat' === $group ? ' data-table="' . esc_attr( wp_json_encode( de_percentile_table() ) ) . '"' : ''; ?>>
		<span class="de-eyebrow de-eyebrow--sm de-blue">SCORE PLANNER</span>
		<label class="de-planner__f"><span>Questions attempted <output data-pl-att-out><?php echo (int) $pp['att']; ?></output> / <?php echo (int) $pp['q']; ?></span>
			<input type="range" min="0" max="<?php echo (int) $pp['q']; ?>" value="<?php echo (int) $pp['att']; ?>" data-pl-att></label>
		<label class="de-planner__f"><span>Accuracy <output data-pl-acc-out>80</output>%</span>
			<input type="range" min="20" max="100" value="80" data-pl-acc></label>
		<div class="de-planner__res">
			<div><b data-pl-score>—</b><span>Expected score</span></div>
			<div><b data-pl-time>—</b><span>Seconds per attempt</span></div>
			<?php if ( 'cat' === $group ) : ?><div><b data-pl-pct>—</b><span>Est. percentile</span></div><?php endif; ?>
		</div>
		<span class="de-planner__tip" data-pl-tip></span>
	</div>
	<a class="de-daily-card" href="<?php echo esc_url( $daily ); ?>">
		<span class="de-daily-card__big">5Q</span>
		<span><span class="de-daily-card__t">Today’s free test</span><span class="de-daily-card__d">AI analysis included</span></span>
	</a>
</aside>
