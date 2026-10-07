<?php
/**
 * Guru preview on the home page: POST /wp-json/deeducare/v1/guru
 *
 * A server-side proxy to the Claude API, so the API key never reaches the
 * browser. Set the key in wp-config.php:
 *
 *     define( 'DEEDUCARE_ANTHROPIC_API_KEY', 'sk-ant-…' );
 *
 * Optional: define( 'DEEDUCARE_GURU_MODEL', 'claude-opus-5-5' );
 *
 * Without a key the preview still works and answers with a fixed study tip.
 * Visitors get 3 preview questions per day (per IP), as in the design.
 *
 * Uses WordPress's HTTP API rather than the Anthropic PHP SDK, so the theme
 * needs no Composer install on the host.
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

const DE_GURU_FREE_PREVIEWS = 3;

add_action( 'rest_api_init', function () {
	register_rest_route( 'deeducare/v1', '/guru', array(
		'methods'             => 'POST',
		'permission_callback' => '__return_true',
		'args'                => array(
			'q' => array( 'type' => 'string', 'required' => true, 'sanitize_callback' => 'sanitize_textarea_field' ),
		),
		'callback'            => 'de_guru_answer',
	) );
} );

function de_guru_answer( WP_REST_Request $req ) {
	$q = trim( mb_substr( (string) $req->get_param( 'q' ), 0, 300 ) );
	if ( '' === $q ) {
		return new WP_Error( 'empty', 'Ask a question first.', array( 'status' => 400 ) );
	}

	$ip_key = 'de_guru_' . md5( ( $_SERVER['REMOTE_ADDR'] ?? '' ) . wp_date( 'Ymd' ) );
	$used   = (int) get_transient( $ip_key );
	if ( $used >= DE_GURU_FREE_PREVIEWS ) {
		return array( 'answer' => 'That’s the end of the preview. Create a free DE Educare ID for 10 Guru questions a day.', 'left' => 0, 'done' => true );
	}
	set_transient( $ip_key, $used + 1, DAY_IN_SECONDS );

	return array(
		'answer' => de_guru_ask_claude( $q ),
		'left'   => DE_GURU_FREE_PREVIEWS - $used - 1,
		'done'   => false,
	);
}

/** Calls the Messages API. Returns the fallback tip on any failure. */
function de_guru_ask_claude( $question ) {
	if ( ! defined( 'DEEDUCARE_ANTHROPIC_API_KEY' ) || ! DEEDUCARE_ANTHROPIC_API_KEY ) {
		return DE_GURU_FALLBACK;
	}

	$body = array(
		'model'         => defined( 'DEEDUCARE_GURU_MODEL' ) ? DEEDUCARE_GURU_MODEL : 'claude-opus-5-5',
		'max_tokens'    => 4000,
		'output_config' => array( 'effort' => 'low' ),
		// If a safety classifier declines, the API retries on a suitable model.
		'fallbacks'     => 'default',
		'system'        => 'You are Guru, the AI study assistant at DE Educare, a Mumbai test-prep platform for CAT, MBA-CET and OMETs (SNAP, NMAT, XAT, CMAT). You are answering a website visitor in a short preview chat. Reply warmly and specifically in under 70 words, plain text, no markdown. If the question is not about exam preparation or DE Educare, steer back to exam prep politely.',
		'messages'      => array( array( 'role' => 'user', 'content' => $question ) ),
	);

	$res = wp_remote_post( 'https://api.anthropic.com/v1/messages', array(
		'timeout' => 30,
		'headers' => array(
			'content-type'      => 'application/json',
			'x-api-key'         => DEEDUCARE_ANTHROPIC_API_KEY,
			'anthropic-version' => '2023-06-01',
			'anthropic-beta'    => 'server-side-fallback-2026-07-01',
		),
		'body'    => wp_json_encode( $body ),
	) );

	if ( is_wp_error( $res ) || 200 !== wp_remote_retrieve_response_code( $res ) ) {
		return DE_GURU_FALLBACK;
	}

	$data = json_decode( wp_remote_retrieve_body( $res ), true );
	if ( ! is_array( $data ) || 'refusal' === ( $data['stop_reason'] ?? '' ) ) {
		return DE_GURU_FALLBACK;
	}

	$text = '';
	foreach ( (array) ( $data['content'] ?? array() ) as $block ) {
		if ( 'text' === ( $block['type'] ?? '' ) ) {
			$text .= $block['text'];
		}
	}
	$text = trim( $text );
	return '' !== $text ? $text : DE_GURU_FALLBACK;
}
