<?php
/**
 * "One DE Educare ID" block and community links.
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

$community = array(
	array( 'WhatsApp', 'Daily questions', de_setting( 'whatsapp_group' ) ),
	array( 'Telegram', 'Exam updates', de_setting( 'telegram' ) ),
	array( 'YouTube', 'Strategy videos', de_setting( 'youtube' ) ),
	array( 'Instagram', 'Quick tips', de_setting( 'instagram' ) ),
);
?>
<section class="de-wrap de-sec-40 de-grid de-grid--380" data-reveal>
	<div class="de-onelogin">
		<span class="de-eyebrow">ONE DE EDUCARE ID</span>
		<h2 class="de-h3-xl">Start a mock on your laptop. Review it on your phone.</h2>
		<p>The same mobile number logs you into this website, the student portal and the app. Purchases, percentiles, streaks and Guru chats stay in sync.</p>
		<div class="de-row de-push">
			<a class="de-btn de-btn--ink" href="<?php echo esc_url( de_portal() ); ?>">Open web portal</a>
			<?php if ( de_setting( 'app_url' ) ) : ?>
				<a class="de-btn de-btn--line-dark" href="<?php echo esc_url( de_setting( 'app_url' ) ); ?>">See the app</a>
			<?php endif; ?>
		</div>
	</div>
	<div class="de-card de-card--pad30 de-stack-14">
		<span class="de-eyebrow de-eyebrow--muted">JOIN THE COMMUNITY</span>
		<h2 class="de-h3-xl">Daily questions, exam updates and doubt threads.</h2>
		<div class="de-community de-push">
			<?php foreach ( $community as $c ) : ?>
				<?php if ( $c[2] ) : ?>
					<a class="de-community__item" href="<?php echo esc_url( $c[2] ); ?>" target="_blank" rel="noopener"><span class="de-community__t"><?php de_e( $c[0] ); ?></span><span class="de-community__d"><?php de_e( $c[1] ); ?></span></a>
				<?php else : ?>
					<a class="de-community__item" href="#" data-toast="<?php echo esc_attr( $c[0] . ' link coming soon' ); ?>"><span class="de-community__t"><?php de_e( $c[0] ); ?></span><span class="de-community__d"><?php de_e( $c[1] ); ?></span></a>
				<?php endif; ?>
			<?php endforeach; ?>
		</div>
	</div>
</section>
