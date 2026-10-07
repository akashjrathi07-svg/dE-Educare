<?php
/**
 * "Your climb to 99" percentile ladder.
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

$cat    = de_page_url( 'cat' );
$ladder = array(
	array( 'Start', 'Daily free test', 'Build the habit with 5 questions a day.', 150, '#232842', '#fff', de_daily_url( 'cat' ) ),
	array( '80+', 'Topic tests', 'Three per topic. Fix a gap the day you find it.', 200, '#2C3FA8', '#fff', $cat . '#tests' ),
	array( '90+', 'Sectionals', '40-minute section lock trains speed and selection.', 250, '#1F3A8A', '#fff', $cat . '#tests' ),
	array( '95+', 'Full mocks', 'Two hours, All-India percentile, every weekend.', 310, '#6D8CFF', '#0E1230', $cat . '#tests' ),
	array( '99', 'Guru plan', 'Every attempt turns into next week’s plan.', 370, '#FFC44D', '#2A1F00', $cat ),
);
?>
<section class="de-dark" data-reveal>
	<div class="de-wrap de-ladder">
		<div class="de-split">
			<h2 class="de-h2 de-h2--xl">Your climb to 99, one kind of test at a time.</h2>
			<p class="de-ladder__p">Each step on De Educare trains a different skill. Topic tests fix gaps, sectionals build speed, full mocks build stamina, and Guru connects them into one plan.</p>
		</div>
		<div class="de-ladder__steps">
			<?php foreach ( $ladder as $l ) : ?>
				<a class="de-ladder__step" href="<?php echo esc_url( $l[6] ); ?>" style="height:<?php echo (int) $l[3]; ?>px;background:<?php echo esc_attr( $l[4] ); ?>;color:<?php echo esc_attr( $l[5] ); ?>">
					<span class="de-ladder__z"><?php de_e( $l[0] ); ?></span>
					<span class="de-ladder__txt"><span class="de-ladder__t"><?php de_e( $l[1] ); ?></span><span class="de-ladder__d"><?php de_e( $l[2] ); ?></span></span>
				</a>
			<?php endforeach; ?>
		</div>
	</div>
</section>
