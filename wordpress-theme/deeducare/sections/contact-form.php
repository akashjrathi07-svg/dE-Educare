<?php
/**
 * Call-back request form (handled in inc/contact.php; also sent to the CRM webhook).
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

$exams  = array( 'CAT', 'MBA-CET', 'OMETs', 'Bank PO', 'RBI', 'UPSC' );
$picked = isset( $_GET['exam'] ) ? sanitize_text_field( wp_unslash( $_GET['exam'] ) ) : 'CAT'; // phpcs:ignore WordPress.Security.NonceVerification
$picked = in_array( $picked, $exams, true ) ? $picked : 'CAT';
$status = isset( $_GET['callback'] ) ? sanitize_key( $_GET['callback'] ) : ''; // phpcs:ignore WordPress.Security.NonceVerification
$rows   = array(
	array( 'WHERE', de_setting( 'city' ), '' ),
	array( 'EMAIL', de_setting( 'email' ), 'mailto:' . de_setting( 'email' ) ),
	array( 'PHONE', de_setting( 'phone' ), 'tel:' . preg_replace( '/[^\d+]/', '', de_setting( 'phone' ) ) ),
	array( 'HOURS', de_setting( 'hours' ), '' ),
);
?>
	<form class="de-card de-contact__form" method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
		<h2 class="de-contact__ft">Book a free counselling call</h2>
		<?php if ( 'sent' === $status ) : ?>
			<p class="de-alert de-alert--ok" role="status">Thanks. The team will call you within one working day.</p>
		<?php elseif ( 'error' === $status ) : ?>
			<p class="de-alert de-alert--err" role="alert">Please enter your name and a 10-digit mobile number.</p>
		<?php endif; ?>
		<input type="hidden" name="action" value="de_callback">
		<label class="screen-reader-text" for="de-c-name">Your name</label>
		<input id="de-c-name" name="name" required maxlength="80" autocomplete="name" placeholder="Your name">
		<label class="screen-reader-text" for="de-c-phone">Mobile number</label>
		<input id="de-c-phone" name="phone" required inputmode="numeric" pattern="[0-9 +]{10,15}" maxlength="15" autocomplete="tel" placeholder="Mobile number">
		<div class="de-hp" aria-hidden="true"><label>Leave empty <input name="website" tabindex="-1" autocomplete="off"></label></div>
		<fieldset class="de-contact__exams">
			<legend class="screen-reader-text">Exam</legend>
			<?php foreach ( $exams as $e ) : ?>
				<label class="de-radio-chip"><input type="radio" name="exam" value="<?php echo esc_attr( $e ); ?>"<?php checked( $picked, $e ); ?>><span><?php de_e( $e ); ?></span></label>
			<?php endforeach; ?>
		</fieldset>
		<button type="submit" class="de-btn de-btn--primary de-btn--block de-btn--lg">Request a call back</button>
	</form>
