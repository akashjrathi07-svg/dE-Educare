<?php
/**
 * Student reviews. Students write them in the portal (Profile → Write a
 * review), staff approve them in Admin → Reviews, and approved ones show
 * here. Nothing is shown until real reviews exist.
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

/**
 * Approved reviews from the portal, cached for 10 minutes.
 * Each: id, name, exam, kind (tests|classes|guru), rating, text, photo, date.
 */
function de_reviews() {
	$cached = get_transient( 'de_reviews' );
	if ( false !== $cached ) {
		return $cached;
	}
	$res  = wp_remote_get( de_portal( 'api/public/reviews' ), array( 'timeout' => 3 ) );
	$list = array();
	if ( ! is_wp_error( $res ) && 200 === wp_remote_retrieve_response_code( $res ) ) {
		$data = json_decode( wp_remote_retrieve_body( $res ), true );
		foreach ( ( $data['reviews'] ?? array() ) as $r ) {
			if ( ! empty( $r['text'] ) && ! empty( $r['name'] ) ) {
				$list[] = $r;
			}
		}
	}
	set_transient( 'de_reviews', $list, $list ? 10 * MINUTE_IN_SECONDS : 2 * MINUTE_IN_SECONDS );
	return $list;
}

function de_review_kinds() {
	return array( 'tests' => 'Test series', 'classes' => 'Classes', 'guru' => 'Guru AI' );
}
