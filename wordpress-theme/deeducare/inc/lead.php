<?php
/**
 * Coaching enquiries. Every "Enquire" button opens one form (de_lead_dialog),
 * which posts to /wp-json/deeducare/v1/lead. The lead is forwarded to the CRM
 * webhook (n8n, set in Customize → DE Educare → Portal and contact) and
 * emailed to the team, so nothing is lost if the webhook is down.
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

/** Choices for the "Interested in" field. */
function de_lead_interests() {
	$list = array();
	foreach ( de_coaching() as $c ) {
		$list[ $c['id'] ] = $c['name'] . ' · ' . de_rupees( $c['fee'] );
	}
	$list['test-series'] = 'Test series only';
	$list['counselling'] = 'Not sure yet, help me choose';
	return $list;
}

/**
 * Validates and sends a lead. Returns true, or an error message.
 *
 * @param array $in Raw fields.
 */
function de_submit_lead( $in ) {
	// Honeypot: bots fill every field. Pretend it worked.
	if ( ! empty( $in['website'] ) ) {
		return true;
	}
	$lead = array(
		'name'      => sanitize_text_field( $in['name'] ?? '' ),
		'phone'     => preg_replace( '/[^\d+]/', '', (string) ( $in['phone'] ?? '' ) ),
		'email'     => sanitize_email( $in['email'] ?? '' ),
		'city'      => sanitize_text_field( $in['city'] ?? '' ),
		'interest'  => sanitize_key( $in['interest'] ?? '' ),
		'status'    => sanitize_text_field( $in['status'] ?? '' ),
		'mode'      => sanitize_text_field( $in['mode'] ?? '' ),
		'message'   => sanitize_textarea_field( $in['message'] ?? '' ),
		'page'      => esc_url_raw( $in['page'] ?? '' ),
		'source'    => 'website',
		'createdAt' => gmdate( 'c' ),
	);
	$interests = de_lead_interests();
	$digits    = preg_replace( '/\D/', '', $lead['phone'] );
	if ( '' === $lead['name'] || strlen( $digits ) < 10 || strlen( $digits ) > 13 ) {
		return 'Please enter your name and a 10-digit mobile number.';
	}
	if ( ! isset( $interests[ $lead['interest'] ] ) ) {
		$lead['interest'] = 'counselling';
	}
	$lead['interestLabel'] = $interests[ $lead['interest'] ];
	foreach ( array( 'utm_source', 'utm_medium', 'utm_campaign' ) as $k ) {
		if ( ! empty( $in[ $k ] ) ) {
			$lead[ $k ] = sanitize_text_field( $in[ $k ] );
		}
	}

	// Flood guard: 5 enquiries per IP per hour.
	$ip_key = 'de_lead_' . md5( $_SERVER['REMOTE_ADDR'] ?? '' );
	$count  = (int) get_transient( $ip_key );
	if ( $count >= 5 ) {
		return true;
	}
	set_transient( $ip_key, $count + 1, HOUR_IN_SECONDS );

	$hook = de_setting( 'lead_webhook' );
	if ( $hook ) {
		wp_remote_post( $hook, array(
			'timeout'  => 5,
			'blocking' => false,
			'headers'  => array( 'Content-Type' => 'application/json' ),
			'body'     => wp_json_encode( $lead ),
		) );
	}

	$body = "New coaching enquiry from deeducare.com\n\n";
	foreach ( array( 'Name' => 'name', 'Mobile' => 'phone', 'Email' => 'email', 'City' => 'city', 'Interested in' => 'interestLabel', 'Currently' => 'status', 'Mode' => 'mode', 'Message' => 'message', 'Page' => 'page' ) as $label => $k ) {
		if ( '' !== $lead[ $k ] ) {
			$body .= $label . ': ' . $lead[ $k ] . "\n";
		}
	}
	wp_mail( de_setting( 'contact_to' ), 'Enquiry: ' . $lead['name'] . ' (' . $lead['interestLabel'] . ')', $body );

	/**
	 * Fires after an enquiry is accepted.
	 *
	 * @param array $lead The cleaned lead.
	 */
	do_action( 'deeducare_lead', $lead );
	return true;
}

add_action( 'rest_api_init', function () {
	register_rest_route( 'deeducare/v1', '/lead', array(
		'methods'             => 'POST',
		'permission_callback' => '__return_true',
		'callback'            => function ( WP_REST_Request $req ) {
			$r = de_submit_lead( $req->get_params() );
			return true === $r ? array( 'ok' => true ) : new WP_REST_Response( array( 'ok' => false, 'message' => $r ), 400 );
		},
	) );
} );

/** Without JavaScript the form posts here and comes back with ?lead=sent. */
function de_handle_lead_post() {
	$back = remove_query_arg( 'lead', wp_get_referer() ? wp_get_referer() : home_url( '/' ) );
	// phpcs:ignore WordPress.Security.NonceVerification.Missing -- public lead form on cached pages; honeypot and rate limit instead.
	$r = de_submit_lead( wp_unslash( $_POST ) );
	wp_safe_redirect( add_query_arg( 'lead', true === $r ? 'sent' : 'error', $back ) );
	exit;
}
add_action( 'admin_post_nopriv_de_lead', 'de_handle_lead_post' );
add_action( 'admin_post_de_lead', 'de_handle_lead_post' );

// Call-back requests from the contact page go to the CRM too.
add_action( 'deeducare_callback_request', function ( $cb ) {
	$hook = de_setting( 'lead_webhook' );
	if ( $hook ) {
		wp_remote_post( $hook, array(
			'timeout'  => 5,
			'blocking' => false,
			'headers'  => array( 'Content-Type' => 'application/json' ),
			'body'     => wp_json_encode( array( 'name' => $cb['name'], 'phone' => $cb['phone'], 'interest' => 'callback', 'interestLabel' => 'Call-back: ' . $cb['exam'], 'source' => 'website-contact', 'createdAt' => gmdate( 'c' ) ) ),
		) );
	}
} );

/** "Enquire" button that opens the form with a programme picked. */
function de_lead_button( $interest, $label = 'Enquire now', $class = 'de-btn de-btn--primary' ) {
	printf( '<a class="%s" href="#enquire" data-lead="%s">%s</a>', esc_attr( $class ), esc_attr( $interest ), esc_html( $label ) );
}

/**
 * The enquiry form fields and buttons. Used in the dialog and inline on exam pages.
 *
 * @param string $interest Programme picked by default.
 * @param bool   $inline   Inline version (no close button, its own heading).
 */
function de_lead_form( $interest = '', $inline = false ) {
	$sent = isset( $_GET['lead'] ) ? sanitize_key( wp_unslash( $_GET['lead'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
	$hid  = $inline ? 'de-lead-h-inline' : 'de-lead-h';
	?>
	<form class="de-enq__form<?php echo $inline ? ' de-enq__form--inline' : ''; ?>" method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" aria-labelledby="<?php echo esc_attr( $hid ); ?>" data-lead-form>
		<div class="de-enq__head">
			<div class="de-stack-6">
				<span class="de-eyebrow de-eyebrow--blue">COACHING ENQUIRY</span>
				<h2 class="de-enq__h" id="<?php echo esc_attr( $hid ); ?>">Get batch dates and a free counselling call</h2>
			</div>
			<?php if ( ! $inline ) : ?>
				<button type="button" class="de-enq__x" data-lead-close aria-label="Close">×</button>
			<?php endif; ?>
		</div>
		<?php if ( ! $inline && 'sent' === $sent ) : ?>
			<p class="de-alert de-alert--ok" role="status">Thanks! Our team will call you within one working day.</p>
		<?php elseif ( ! $inline && 'error' === $sent ) : ?>
			<p class="de-alert de-alert--err" role="alert">Please enter your name and a 10-digit mobile number.</p>
		<?php endif; ?>
		<input type="hidden" name="action" value="de_lead">
		<input type="hidden" name="page" value="" data-lead-page>
		<label class="de-hp" aria-hidden="true">Website <input type="text" name="website" tabindex="-1" autocomplete="off"></label>
		<div class="de-enq__grid">
			<label class="de-field">Full name<input name="name" required autocomplete="name" maxlength="80"></label>
			<label class="de-field">Mobile number<input name="phone" type="tel" required inputmode="tel" autocomplete="tel" pattern="[0-9+ \-]{10,16}" maxlength="16" placeholder="10-digit mobile"></label>
			<label class="de-field">Email <span class="de-opt">(optional)</span><input name="email" type="email" autocomplete="email" maxlength="120"></label>
			<label class="de-field">City<input name="city" autocomplete="address-level2" maxlength="60"></label>
			<label class="de-field de-field--span">Interested in
				<select name="interest" data-lead-interest>
					<?php foreach ( de_lead_interests() as $id => $label ) : ?>
						<option value="<?php echo esc_attr( $id ); ?>"<?php selected( $id, $interest ); ?>><?php de_e( $label ); ?></option>
					<?php endforeach; ?>
				</select>
			</label>
			<label class="de-field">I am
				<select name="status">
					<option>In college (final year)</option>
					<option>In college</option>
					<option>Graduate</option>
					<option>Working professional</option>
				</select>
			</label>
			<label class="de-field">Preferred mode
				<select name="mode">
					<option>Online (live)</option>
					<option>Classroom, Mumbai</option>
					<option>Either</option>
				</select>
			</label>
			<label class="de-field de-field--span">Anything we should know? <span class="de-opt">(optional)</span><textarea name="message" rows="2" maxlength="600"></textarea></label>
		</div>
		<p class="de-alert de-alert--err" role="alert" hidden data-lead-err></p>
		<p class="de-alert de-alert--ok" role="status" hidden data-lead-ok>Thanks! Our team will call you within one working day. You can also <a href="<?php echo esc_url( de_whatsapp_url() ); ?>">WhatsApp us</a>.</p>
		<button class="de-btn de-btn--primary de-btn--lg de-btn--block" type="submit" data-lead-submit>Send enquiry</button>
		<span class="de-note de-note--xs">By sending, you agree to a call or WhatsApp from DE Educare about coaching. No spam.</span>
	</form>
	<?php
}

/** The enquiry dialog, printed once per page in the footer. */
function de_lead_dialog() {
	$sent = isset( $_GET['lead'] ) ? sanitize_key( wp_unslash( $_GET['lead'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
	?>
	<dialog class="de-enq" id="enquire" aria-labelledby="de-lead-h" data-lead-dialog<?php echo $sent ? ' data-open' : ''; ?>>
		<?php de_lead_form(); ?>
	</dialog>
	<?php
}
add_action( 'wp_footer', function () {
	if ( de_page_key() ) {
		de_lead_dialog();
	}
}, 5 );
