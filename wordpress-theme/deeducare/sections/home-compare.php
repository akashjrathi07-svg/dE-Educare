<?php
/**
 * Side-by-side comparison of the three CAT plans.
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

$plans = de_plans()['cat'];
$rows  = array(
	array( 'Full-length CAT mocks', '—', '10', '20' ),
	array( 'Previous year papers as mocks', '—', '✓', '✓' ),
	array( 'Sectional tests', '—', '—', '10 per section' ),
	array( 'Topic tests', 'Daily mix', '—', '3 per topic' ),
	array( 'All-India percentile', '—', '✓', '✓' ),
	array( 'Worked solutions', '✓', '✓', '✓' ),
	array( 'Topic-wise analytics', '—', '—', '✓' ),
	array( 'Guru AI mentor', '10 a day', '10 a day', 'Unlimited' ),
	array( 'Web + app, one login', '✓', '✓', '✓' ),
);
?>
<section class="de-wrap de-compare" data-reveal>
	<div class="de-split de-split--end">
		<h2 class="de-h2 de-h2--lg">Compare CAT plans</h2>
		<span class="de-note">Prices include GST · UPI, cards and EMI</span>
	</div>
	<div class="de-compare__scroll">
		<table class="de-compare__table">
			<caption class="screen-reader-text">CAT plans compared</caption>
			<thead>
				<tr>
					<th scope="col" class="de-compare__corner">What you get</th>
					<?php foreach ( $plans as $p ) : ?>
						<th scope="col" class="de-compare__head<?php echo ! empty( $p['dark'] ) ? ' is-dark' : ''; ?>">
							<span class="de-compare__name"><?php de_e( $p['name'] ); ?><?php if ( ! empty( $p['tag'] ) ) : ?><span class="de-tag"><?php de_e( $p['tag'] ); ?></span><?php endif; ?></span>
							<span class="de-compare__price"><?php de_e( $p['price'] ); ?></span>
							<a class="de-btn de-btn--block de-btn--sm <?php echo ! empty( $p['dark'] ) ? 'de-btn--amber' : 'de-btn--primary'; ?>" <?php echo de_plan_action( $p, 'cat' ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped in helper. ?>><?php de_e( $p['cta'] ); ?></a>
						</th>
					<?php endforeach; ?>
				</tr>
			</thead>
			<tbody>
				<?php foreach ( $rows as $r ) : ?>
					<tr>
						<th scope="row"><?php de_e( $r[0] ); ?></th>
						<?php for ( $i = 1; $i <= 3; $i++ ) : ?>
							<?php $v = $r[ $i ]; ?>
							<td class="<?php echo '—' === $v ? 'is-none' : ( '✓' === $v ? 'is-yes' : '' ); ?><?php echo 3 === $i ? ' is-hl' : ''; ?>"><?php if ( '✓' === $v ) : ?><span aria-label="Included">✓</span><?php elseif ( '—' === $v ) : ?><span aria-label="Not included">—</span><?php else : de_e( $v ); endif; ?></td>
						<?php endfor; ?>
					</tr>
				<?php endforeach; ?>
			</tbody>
		</table>
	</div>
</section>
