<?php
/**
 * Settings, portal links and small render helpers.
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

/** Default values for every theme setting (Appearance → Customize → DE Educare). */
function de_setting_defaults() {
	$img = DE_THEME_URI . '/assets/img/';
	return array(
		'portal_url'     => 'https://portal.deeducare.com',
		'app_url'        => '',
		'phone'          => '+91 8830165057',
		'whatsapp'       => '918830165057',
		'email'          => 'deteam@gmail.com',
		'hours'          => '9 AM – 6 PM, Mon – Fri',
		'city'           => 'Mumbai, India',
		'cat_date'       => '2026-11-29',
		'contact_to'     => '',
		'lead_webhook'   => '',
		'whatsapp_group' => '',
		'telegram'       => '',
		'youtube'        => '',
		'instagram'      => '',
		'facebook'       => '',
		'img_cat'        => $img . 'cat-mock-test-series-de-educare.webp',
		'img_cet'        => $img . 'mba-cet-mock-test-de-educare.webp',
		'img_omet'       => $img . 'omet-mock-tests-de-educare.webp',
		'img_govt'       => $img . 'bank-po-test-series-de-educare.webp',
		'img_bank'       => $img . 'bank-po-test-series-de-educare.webp',
		'img_rbi'        => $img . 'rbi-grade-b-test-series-de-educare.webp',
		'img_upsc'       => $img . 'upsc-prelims-test-series-de-educare.webp',
		'img_share'      => $img . 'de-educare-share.jpg',
	);
}

function de_setting( $key ) {
	$defaults = de_setting_defaults();
	$value    = get_theme_mod( 'de_' . $key, $defaults[ $key ] ?? '' );
	return '' === $value && 'contact_to' === $key ? get_option( 'admin_email' ) : $value;
}

/**
 * Builds a link into the student portal. The portal owns login, payments,
 * the exam window and the AI analysis; the website only links to it.
 */
function de_portal( $path = '', $args = array() ) {
	$url = untrailingslashit( de_setting( 'portal_url' ) ) . '/' . ltrim( $path, '/' );
	return $args ? add_query_arg( array_map( 'rawurlencode', $args ), $url ) : $url;
}

function de_login_url() {
	return de_portal( 'login' );
}

function de_signup_url() {
	return de_portal( 'signup' );
}

function de_test_url( $test_id ) {
	return de_portal( 'test/' . rawurlencode( $test_id ) );
}

function de_daily_url( $exam = 'cat' ) {
	return de_portal( 'daily/' . rawurlencode( $exam ) );
}

/** Checkout link for a plan. `test` lets the portal send owners straight to the test. */
function de_checkout_url( $plan_id, $test_id = '' ) {
	$args = array( 'plan' => $plan_id );
	if ( $test_id ) {
		$args['test'] = $test_id;
	}
	return de_portal( 'checkout', $args );
}

function de_whatsapp_url() {
	return 'https://wa.me/' . preg_replace( '/\D/', '', de_setting( 'whatsapp' ) ) . '?text=' . rawurlencode( 'Hi DE Educare, I want to know about your test series.' );
}

/** URL of a site page by its slug, e.g. de_page_url( 'cat' ). */
function de_page_url( $slug = '' ) {
	return $slug ? home_url( '/' . trim( $slug, '/' ) . '/' ) : home_url( '/' );
}

/** Which design page is being shown: home, cat, cet, omet, free, contact or ''. */
function de_page_key() {
	if ( is_front_page() ) {
		return 'home';
	}
	if ( is_page() ) {
		$map  = array( 'cat' => 'cat', 'mba-cet' => 'cet', 'omet' => 'omet', 'free-resources' => 'free', 'contact' => 'contact' );
		$slug = get_post_field( 'post_name', get_queried_object_id() );
		return $map[ $slug ] ?? '';
	}
	return '';
}

/** Days until the CAT exam date (also refreshed client-side, so cached pages stay right). */
function de_days_to_exam() {
	$target = strtotime( de_setting( 'cat_date' ) . ' 00:00:00' );
	$today  = strtotime( wp_date( 'Y-m-d' ) . ' 00:00:00' );
	return max( 0, (int) ceil( ( $target - $today ) / DAY_IN_SECONDS ) );
}

function de_slugify( $text ) {
	return sanitize_title( str_replace( '&', 'and', $text ) );
}

/** Echoes an escaped string. Short name because the section templates use it a lot. */
function de_e( $text ) {
	echo esc_html( $text );
}

/**
 * Image box. Shows the configured photo, or the striped placeholder from
 * the design when no photo is set.
 */
function de_image( $setting_or_url, $label, $class = 'de-img', $eager = false ) {
	$src = $setting_or_url && 0 === strpos( $setting_or_url, 'img_' ) ? de_setting( $setting_or_url ) : $setting_or_url;
	if ( $src ) {
		printf( '<img class="%s" src="%s" alt="%s" %s decoding="async">', esc_attr( $class ), esc_url( $src ), esc_attr( $label ), $eager ? 'fetchpriority="high"' : 'loading="lazy"' );
		return;
	}
	printf( '<span class="%s de-img--empty" role="img" aria-label="%s"><span>%s</span></span>', esc_attr( $class ), esc_attr( $label ), esc_html( $label ) );
}

/**
 * Site logo: the image from Customize → Site Identity → Logo when set,
 * otherwise the "DE" mark with the name. Used in the header and footer.
 * An uploaded logo usually already shows the name, so the text name is only
 * added when "Show the name next to the logo" is ticked.
 */
function de_logo( $class = 'de-logo' ) {
	echo '<a class="' . esc_attr( $class ) . '" href="' . esc_url( home_url( '/' ) ) . '" aria-label="DE Educare home">';
	if ( has_custom_logo() ) {
		echo wp_get_attachment_image( get_theme_mod( 'custom_logo' ), 'medium', false, array( 'class' => 'de-logo__img', 'alt' => 'DE Educare', 'loading' => false ) );
		if ( get_theme_mod( 'de_logo_text', false ) ) {
			echo '<span class="de-logo__text">DE Educare</span>';
		}
	} else {
		echo '<span class="de-logo__mark" aria-hidden="true">DE</span><span class="de-logo__text">DE Educare</span>';
	}
	echo '</a>';
}

/** URL of an image bundled with the theme (assets/img). */
function de_asset_img( $file ) {
	return DE_THEME_URI . '/assets/img/' . $file;
}

/** Bundled illustration with fixed size, so the layout doesn't shift while it loads. */
function de_icon_img( $file, $alt = '', $size = 56 ) {
	printf( '<img class="de-ico" src="%s" alt="%s" width="%d" height="%d" loading="lazy" decoding="async">', esc_url( de_asset_img( $file ) ), esc_attr( $alt ), (int) $size, (int) $size );
}

/** "₹2,500" from 2500. */
function de_rupees( $amount ) {
	return '₹' . number_format_i18n( (int) $amount );
}

/** FAQ list as native <details>, so answers are in the HTML for search engines. */
function de_faq_list( $faqs, $class = '' ) {
	echo '<div class="de-faq ' . esc_attr( $class ) . '">';
	foreach ( $faqs as $i => $f ) {
		printf(
			'<details class="de-faq__item"%s><summary>%s<span class="de-faq__icon" aria-hidden="true"></span></summary><div class="de-faq__a">%s</div></details>',
			0 === $i ? ' open' : '',
			esc_html( $f[0] ),
			esc_html( $f[1] )
		);
	}
	echo '</div>';
}

/**
 * Data from the portal API, kept in the database so pages never wait for the portal.
 *
 * A fresh copy (10 minutes) is used as is. An older copy is shown straight away and
 * refreshed after the page has been sent to the visitor. Only the very first request
 * ever waits for the portal (2 seconds at most). A failed refresh keeps the last good
 * copy, so a portal hiccup never blanks prices or tests on the website.
 *
 * @param string   $key    Cache name.
 * @param string   $path   Portal API path, e.g. api/public/plans.
 * @param callable $mapper Turns the decoded JSON into the value pages use.
 */
function de_portal_data( $key, $path, $mapper ) {
	static $memo = array();
	if ( isset( $memo[ $key ] ) ) {
		return $memo[ $key ];
	}
	$option = 'de_pc_' . $key;
	$cached = get_option( $option );
	if ( ( $GLOBALS['de_portal_force'] ?? '' ) === $key ) {
		return $memo[ $key ] = de_portal_fetch( $option, $path, $mapper, $cached, 5 );
	}
	if ( is_array( $cached ) && array_key_exists( 'd', $cached ) ) {
		$age = time() - (int) $cached['t'];
		if ( $age > ( $cached['ok'] ? 10 * MINUTE_IN_SECONDS : 2 * MINUTE_IN_SECONDS ) && ! get_transient( $option . '_lock' ) ) {
			// One refresh at a time, after the response is sent.
			set_transient( $option . '_lock', 1, MINUTE_IN_SECONDS );
			if ( function_exists( 'fastcgi_finish_request' ) || function_exists( 'litespeed_finish_request' ) ) {
				// Send the page first (PHP-FPM or LiteSpeed hosting), then refresh.
				add_action( 'shutdown', function () use ( $option, $path, $mapper, $cached ) {
					function_exists( 'fastcgi_finish_request' ) ? fastcgi_finish_request() : litespeed_finish_request();
					de_portal_fetch( $option, $path, $mapper, $cached, 5 );
				} );
			} else {
				// Other hosting can't send the page early: refresh in a background WP-Cron request instead,
				// so no visitor waits for the portal.
				wp_schedule_single_event( time(), 'de_portal_refresh', array( $key ) );
			}
		}
		return $memo[ $key ] = $cached['d'];
	}
	return $memo[ $key ] = de_portal_fetch( $option, $path, $mapper, null, 2 );
}

/** Background refresh (WP-Cron) for hosts without fastcgi_finish_request: calls the dataset's getter with a forced fetch. */
add_action( 'de_portal_refresh', function ( $key ) {
	$getters = array( 'plans' => 'de_portal_plans', 'reviews' => 'de_reviews', 'resources' => 'de_free_resources', 'free_tests' => 'de_portal_free_tests' );
	if ( isset( $getters[ $key ] ) && function_exists( $getters[ $key ] ) ) {
		$GLOBALS['de_portal_force'] = $key;
		call_user_func( $getters[ $key ] );
		unset( $GLOBALS['de_portal_force'] );
	}
} );

/** Fetches and stores one portal dataset. Returns the data (the previous copy if the portal fails). */
function de_portal_fetch( $option, $path, $mapper, $previous, $timeout ) {
	$res = wp_remote_get( de_portal( $path ), array( 'timeout' => $timeout ) );
	if ( ! is_wp_error( $res ) && 200 === wp_remote_retrieve_response_code( $res ) ) {
		$data = call_user_func( $mapper, (array) json_decode( wp_remote_retrieve_body( $res ), true ) );
		update_option( $option, array( 't' => time(), 'ok' => true, 'd' => $data ), false );
		delete_transient( $option . '_lock' );
		return $data;
	}
	$data = is_array( $previous ) ? $previous['d'] : array();
	update_option( $option, array( 't' => time(), 'ok' => false, 'd' => $data ), false );
	return $data;
}

/**
 * Live plan prices from the portal (Admin → Courses & plans).
 * Returns [] when the portal has never been reached, so the prices typed in content.php are used.
 */
function de_portal_plans() {
	return de_portal_data( 'plans', 'api/public/plans', function ( $data ) {
		$plans = array();
		foreach ( ( $data['plans'] ?? array() ) as $p ) {
			if ( ! empty( $p['id'] ) ) {
				$plans[ $p['id'] ] = $p;
			}
		}
		return $plans;
	} );
}

/** Puts the portal's live price on each paid plan; plans that are draft in the portal show "₹ —". */
function de_apply_portal_prices( $by_exam ) {
	$live = de_portal_plans();
	foreach ( $by_exam as $exam => $plans ) {
		foreach ( $plans as $i => $p ) {
			if ( ! empty( $p['free'] ) || empty( $live[ $p['id'] ] ) ) {
				if ( '₹ —' === $p['price'] ) {
					$by_exam[ $exam ][ $i ]['soon'] = true;
				}
				continue;
			}
			$lp = $live[ $p['id'] ];
			if ( ! empty( $lp['live'] ) && $lp['amount'] > 0 ) {
				$by_exam[ $exam ][ $i ]['price']  = '₹' . number_format_i18n( $lp['amount'] );
				$by_exam[ $exam ][ $i ]['amount'] = (int) $lp['amount'];
				if ( ! empty( $lp['mrp'] ) && $lp['mrp'] > $lp['amount'] ) {
					$by_exam[ $exam ][ $i ]['mrp'] = (int) $lp['mrp'];
				} else {
					unset( $by_exam[ $exam ][ $i ]['mrp'] );
				}
			} else {
				$by_exam[ $exam ][ $i ]['soon'] = true;
			}
		}
	}
	// Plans marked "soon" here (content.php) or draft in the portal show "Coming soon" and a Notify me button.
	foreach ( $by_exam as $exam => $plans ) {
		foreach ( $plans as $i => $p ) {
			if ( ! empty( $p['soon'] ) ) {
				$by_exam[ $exam ][ $i ]['price'] = 'Coming soon';
				$by_exam[ $exam ][ $i ]['tag']   = 'COMING SOON';
				unset( $by_exam[ $exam ][ $i ]['amount'], $by_exam[ $exam ][ $i ]['mrp'] );
			}
		}
	}
	return $by_exam;
}

/** Returns the plan by id from any exam. */
function de_plan( $id ) {
	foreach ( de_plans() as $plans ) {
		foreach ( $plans as $p ) {
			if ( $p['id'] === $id ) {
				return $p;
			}
		}
	}
	return null;
}

/**
 * Plan button attributes: a checkout link, the daily free test, or, for a plan
 * that is coming soon, the contact form to be told when it launches.
 */
function de_plan_action( $plan, $exam = 'cat' ) {
	if ( ! empty( $plan['free'] ) ) {
		return 'href="' . esc_url( de_daily_url( $exam ) ) . '"';
	}
	if ( ! empty( $plan['soon'] ) ) {
		return 'href="' . esc_url( add_query_arg( 'exam', $plan['name'], de_page_url( 'contact' ) ) ) . '"';
	}
	return 'href="' . esc_url( de_checkout_url( $plan['id'] ) ) . '"';
}

/** Button text for a plan: "Notify me" while it is coming soon. */
function de_plan_cta( $plan, $label ) {
	return ! empty( $plan['soon'] ) ? 'Notify me' : $label;
}
