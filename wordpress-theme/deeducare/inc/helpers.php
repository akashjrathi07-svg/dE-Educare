<?php
/**
 * Settings, portal links and small render helpers.
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

/** Default values for every theme setting (Appearance → Customize → DE Educare). */
function de_setting_defaults() {
	$up = 'https://deeducare.com/wp-content/uploads/';
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
		'whatsapp_group' => '',
		'telegram'       => '',
		'youtube'        => '',
		'instagram'      => '',
		'facebook'       => '',
		'img_cat'        => $up . '2026/08/WhatsApp-Image-2026-09-03-at-1.17.23-PM.jpeg',
		'img_cet'        => $up . '2026/09/MAH-MBA-CET-Exam-1-1024x683.jpeg',
		'img_omet'       => $up . '2026/08/WhatsApp-Image-2026-09-03-at-1.13.57-PM.jpeg',
		'img_govt'       => $up . '2026/08/Admin.png',
		'img_bank'       => $up . '2026/09/2EE6AA28-FB2D-4D85-AB0C-41D777BF8E2A.png',
		'img_rbi'        => $up . '2026/08/WhatsApp-Image-2026-09-03-at-1.08.04-PM.jpeg',
		'img_upsc'       => $up . '2026/08/WhatsApp-Image-2026-09-03-at-1.10.49-PM.jpeg',
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
function de_image( $setting_or_url, $label, $class = 'de-img' ) {
	$src = $setting_or_url && 0 === strpos( $setting_or_url, 'img_' ) ? de_setting( $setting_or_url ) : $setting_or_url;
	if ( $src ) {
		printf( '<img class="%s" src="%s" alt="%s" loading="lazy" decoding="async">', esc_attr( $class ), esc_url( $src ), esc_attr( $label ) );
		return;
	}
	printf( '<span class="%s de-img--empty" role="img" aria-label="%s"><span>%s</span></span>', esc_attr( $class ), esc_attr( $label ), esc_html( $label ) );
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
 * Live plan prices from the portal (Admin → Courses & plans), cached for 10 minutes.
 * Returns [] when the portal can't be reached, so the prices typed in content.php are used.
 */
function de_portal_plans() {
	$cached = get_transient( 'de_portal_plans' );
	if ( false !== $cached ) {
		return $cached;
	}
	$res   = wp_remote_get( de_portal( 'api/public/plans' ), array( 'timeout' => 3 ) );
	$plans = array();
	if ( ! is_wp_error( $res ) && 200 === wp_remote_retrieve_response_code( $res ) ) {
		$data = json_decode( wp_remote_retrieve_body( $res ), true );
		foreach ( ( $data['plans'] ?? array() ) as $p ) {
			if ( ! empty( $p['id'] ) ) {
				$plans[ $p['id'] ] = $p;
			}
		}
	}
	// On failure, retry in 2 minutes instead of hammering the portal on every page view.
	set_transient( 'de_portal_plans', $plans, $plans ? 10 * MINUTE_IN_SECONDS : 2 * MINUTE_IN_SECONDS );
	return $plans;
}

/** Puts the portal's live price on each paid plan; plans that are draft in the portal show "₹ —". */
function de_apply_portal_prices( $by_exam ) {
	$live = de_portal_plans();
	if ( ! $live ) {
		return $by_exam;
	}
	foreach ( $by_exam as $exam => $plans ) {
		foreach ( $plans as $i => $p ) {
			if ( ! empty( $p['free'] ) || empty( $live[ $p['id'] ] ) ) {
				continue;
			}
			$lp = $live[ $p['id'] ];
			if ( ! empty( $lp['live'] ) && $lp['amount'] > 0 ) {
				$by_exam[ $exam ][ $i ]['price']  = '₹' . number_format_i18n( $lp['amount'] );
				$by_exam[ $exam ][ $i ]['amount'] = (int) $lp['amount'];
			} else {
				$by_exam[ $exam ][ $i ]['price'] = '₹ —';
				unset( $by_exam[ $exam ][ $i ]['amount'] );
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
 * Plan button attributes: a checkout link, the daily free test, or a
 * "pricing coming soon" notice while the price is '₹ —'.
 */
function de_plan_action( $plan, $exam = 'cat' ) {
	if ( ! empty( $plan['free'] ) ) {
		return 'href="' . esc_url( de_daily_url( $exam ) ) . '"';
	}
	if ( '₹ —' === $plan['price'] ) {
		return 'href="#" data-toast="' . esc_attr( 'Pricing for ' . $plan['name'] . ' coming soon' ) . '"';
	}
	return 'href="' . esc_url( de_checkout_url( $plan['id'] ) ) . '"';
}
