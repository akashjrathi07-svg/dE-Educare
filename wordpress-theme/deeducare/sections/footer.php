<?php
/**
 * Footer: CTA band, link columns and contact.
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

$cols = array(
	'COACHING'     => array( array( 'CAT Coaching 2027', home_url( '/#coaching' ) ), array( 'CET Coaching 2028', home_url( '/#coaching' ) ), array( 'MBA+ (CAT + CET + OMET)', home_url( '/#coaching' ) ), array( 'Enquire now', '#enquire' ) ),
	'MBA ENTRANCE' => array( array( 'CAT Test Series', de_page_url( 'cat' ) ), array( '10 CAT Mocks', de_page_url( 'cat' ) . '#plans' ), array( 'MBA-CET', de_page_url( 'mba-cet' ) ), array( 'OMETs', de_page_url( 'omet' ) ) ),
	'FREE'         => array( array( 'Daily free test', de_daily_url( 'cat' ) ), array( 'Free questions', de_page_url( 'free-resources' ) ), array( 'Percentile & college predictor', de_page_url( 'free-resources' ) . '#predictor' ), array( 'Previous papers', de_page_url( 'free-resources' ) . '#free-tests' ) ),
	'STUDENTS'     => array_values( array_filter( array( array( 'Sign in', de_login_url() ), array( 'Web portal', de_portal() ), de_setting( 'app_url' ) ? array( 'Mobile app', de_setting( 'app_url' ) ) : null, array( 'Contact us', de_page_url( 'contact' ) ) ) ) ),
);

$social = array();
foreach ( array( 'facebook' => 'Facebook', 'instagram' => 'Instagram', 'youtube' => 'YouTube', 'telegram' => 'Telegram' ) as $k => $label ) {
	if ( de_setting( $k ) ) {
		$social[] = '<a href="' . esc_url( de_setting( $k ) ) . '" rel="noopener" target="_blank">' . esc_html( $label ) . '</a>';
	}
}
?>
<footer class="de-footer">
	<div class="de-wrap de-footer__in">
		<div class="de-footer__cta">
			<div class="de-stack-20">
				<?php de_logo( 'de-logo de-logo--footer' ); ?>
				<p class="de-footer__h">Your next mock starts in under a minute.</p>
				<div class="de-row">
					<a class="de-btn de-btn--amber de-btn--lg" href="<?php echo esc_url( de_signup_url() ); ?>">Create free DE Educare ID</a>
					<a class="de-btn de-btn--line-light de-btn--lg" href="#enquire" data-lead="counselling">Talk to a counsellor</a>
				</div>
			</div>
			<img class="de-footer__art" src="<?php echo esc_url( de_asset_img( 'footer-cta.webp' ) ); ?>" width="900" height="700" alt="Mock progress tracker on the DE Educare student portal" loading="lazy" decoding="async">
		</div>
		<div class="de-footer__cols">
			<?php foreach ( $cols as $h => $items ) : ?>
				<div class="de-footer__col">
					<span class="de-eyebrow de-eyebrow--amber"><?php de_e( $h ); ?></span>
					<?php foreach ( $items as $it ) : ?>
						<a href="<?php echo esc_url( $it[1] ); ?>"><?php de_e( $it[0] ); ?></a>
					<?php endforeach; ?>
				</div>
			<?php endforeach; ?>
			<address class="de-footer__col">
				<span class="de-eyebrow de-eyebrow--amber">CONTACT</span>
				<span><?php de_e( de_setting( 'city' ) ); ?></span>
				<a href="mailto:<?php echo esc_attr( de_setting( 'email' ) ); ?>"><?php de_e( de_setting( 'email' ) ); ?></a>
				<a href="tel:<?php echo esc_attr( preg_replace( '/[^\d+]/', '', de_setting( 'phone' ) ) ); ?>"><?php de_e( de_setting( 'phone' ) ); ?></a>
				<span><?php de_e( de_setting( 'hours' ) ); ?></span>
			</address>
		</div>
		<div class="de-footer__base">
			<span>Copyright © <?php echo esc_html( wp_date( 'Y' ) ); ?> DE EDUCARE LLP</span>
			<?php if ( $social ) : ?>
				<span class="de-footer__social"><?php echo implode( ' · ', $social ); // phpcs:ignore WordPress.Security.EscapeOutput -- escaped above. ?></span>
			<?php endif; ?>
		</div>
	</div>
</footer>
