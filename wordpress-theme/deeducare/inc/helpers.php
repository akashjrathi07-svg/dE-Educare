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
 * otherwise the "DE" mark. Used in the header and footer.
 */
function de_logo( $class = 'de-logo' ) {
	echo '<a class="' . esc_attr( $class ) . '" href="' . esc_url( home_url( '/' ) ) . '" aria-label="DE Educare home">';
	if ( has_custom_logo() ) {
		echo wp_get_attachment_image( get_theme_mod( 'custom_logo' ), 'medium', false, array( 'class' => 'de-logo__img', 'alt' => 'DE Educare logo' ) );
	} else {
		echo '<span class="de-logo__mark" aria-hidden="true">DE</span>';
	}
	echo '<span class="de-logo__text">DE Educare</span></a>';
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
				if ( ! empty( $lp['mrp'] ) && $lp['mrp'] > $lp['amount'] ) {
					$by_exam[ $exam ][ $i ]['mrp'] = (int) $lp['mrp'];
				} else {
					unset( $by_exam[ $exam ][ $i ]['mrp'] );
				}
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
