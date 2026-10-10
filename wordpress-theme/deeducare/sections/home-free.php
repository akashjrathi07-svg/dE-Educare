<?php
/**
 * Free every day: daily tests for CAT, MBA-CET and SNAP, plus free material
 * on the Free resources page. Sits just above "Your climb to 99".
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

$free = de_page_url( 'free-resources' );
$more = array(
	array( 'PY', 'Previous year papers', 'CAT and CET papers as timed mocks', $free . '#free-tests' ),
	array( 'FQ', 'Free questions', 'Worked solutions for Quant, DILR, VARC', $free . '#free-questions' ),
	array( 'PDF', 'Formula sheets and notes', 'Read in the portal after free sign-in', $free . '#notes' ),
	array( '%', 'Percentile and college predictor', 'Score to percentile to colleges', '#predict' ),
);
?>
<section class="de-wrap de-sec-40" id="free-daily" data-reveal>
	<div class="de-free-home">
		<div class="de-stack-16">
			<span class="de-eyebrow de-eyebrow--blue">FREE, EVERY DAY</span>
			<h2 class="de-h2 de-h2--md">A free daily test for CAT, MBA-CET and SNAP</h2>
			<p class="de-p15">A new 15-minute test every morning with an instant scorecard and the same AI analysis as paid tests. Sign in free with your mobile number. No card needed.</p>
			<div class="de-daily3">
				<?php foreach ( de_free_daily() as $d ) : ?>
					<a class="de-daily3__card" href="<?php echo esc_url( de_daily_url( $d[0] ) ); ?>">
						<?php de_icon_img( $d[3], '', 44 ); ?>
						<span class="de-daily3__txt"><span class="de-daily3__t">Today’s <?php de_e( $d[1] ); ?> test</span><span class="de-daily3__d"><?php de_e( $d[2] ); ?></span></span>
						<span class="de-daily3__go" aria-hidden="true">→</span>
					</a>
				<?php endforeach; ?>
			</div>
			<div class="de-grid de-grid--230">
				<?php foreach ( $more as $m ) : ?>
					<a class="de-tool" href="<?php echo esc_url( $m[3] ); ?>">
						<span class="de-mono-badge de-mono-badge--lg"><?php de_e( $m[0] ); ?></span>
						<span class="de-tool__txt"><span class="de-tool__t"><?php de_e( $m[1] ); ?></span><span class="de-tool__d"><?php de_e( $m[2] ); ?></span></span>
					</a>
				<?php endforeach; ?>
			</div>
			<a class="de-link-strong" href="<?php echo esc_url( $free ); ?>">All free resources →</a>
		</div>
		<div class="de-free-home__art">
			<img src="<?php echo esc_url( de_asset_img( 'hero-mock-test.webp' ) ); ?>" width="1200" height="1000" alt="DE Educare CAT mock test screen with question palette, All-India percentile and topic accuracy" loading="lazy" decoding="async">
		</div>
	</div>
</section>
