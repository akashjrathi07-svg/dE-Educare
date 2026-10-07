<?php
/**
 * Call-back request form: validates, emails the team, redirects back.
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

function de_handle_callback() {
	$back = wp_get_referer() ? wp_get_referer() : de_page_url( 'contact' );
	$back = remove_query_arg( 'callback', $back );

	// No nonce: this is a public lead form on pages that are usually cached,
	// and a cached nonce would expire. The honeypot and the rate limit below
	// keep spam out instead.
	// phpcs:disable WordPress.Security.NonceVerification.Missing
	// Honeypot: bots fill every field.
	if ( ! empty( $_POST['website'] ) ) {
		wp_safe_redirect( add_query_arg( 'callback', 'sent', $back ) );
		exit;
	}

	$name   = sanitize_text_field( wp_unslash( $_POST['name'] ?? '' ) );
	$phone  = preg_replace( '/[^\d+]/', '', wp_unslash( $_POST['phone'] ?? '' ) );
	$exam   = sanitize_text_field( wp_unslash( $_POST['exam'] ?? '' ) );
	$digits = preg_replace( '/\D/', '', $phone );

	if ( '' === $name || strlen( $digits ) < 10 || strlen( $digits ) > 13 ) {
		wp_safe_redirect( add_query_arg( 'callback', 'error', $back ) . '#de-c-name' );
		exit;
	}

	// Simple flood guard: 5 requests per IP per hour.
	$ip_key = 'de_cb_' . md5( $_SERVER['REMOTE_ADDR'] ?? '' );
	$count  = (int) get_transient( $ip_key );
	if ( $count >= 5 ) {
		wp_safe_redirect( add_query_arg( 'callback', 'sent', $back ) );
		exit;
	}
	set_transient( $ip_key, $count + 1, HOUR_IN_SECONDS );

	$body = sprintf( "New call-back request from deeducare.com\n\nName: %s\nMobile: %s\nExam: %s\nTime: %s\n", $name, $phone, $exam, wp_date( 'j M Y, g:i a' ) );
	wp_mail( de_setting( 'contact_to' ), 'Call-back request: ' . $name . ' (' . $exam . ')', $body );

	/**
	 * Fires after a call-back request is accepted, e.g. to push it to a CRM or the portal.
	 *
	 * @param array $lead name, phone, exam.
	 */
	do_action( 'deeducare_callback_request', compact( 'name', 'phone', 'exam' ) );

	wp_safe_redirect( add_query_arg( 'callback', 'sent', $back ) );
	exit;
}
add_action( 'admin_post_nopriv_de_callback', 'de_handle_callback' );
add_action( 'admin_post_de_callback', 'de_handle_callback' );
