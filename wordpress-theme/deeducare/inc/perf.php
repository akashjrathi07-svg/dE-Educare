<?php
/**
 * Speed: a built-in page cache for visitors who aren't signed in, instant page loads on hover
 * (speculation rules), and less WordPress output in every page head.
 *
 * The page cache keeps a copy of each public page in wp-content/cache/deeducare/ and serves it before
 * WordPress builds the page. A copy older than 10 minutes is still served at once while a background
 * request rebuilds it, so visitors never wait for a rebuild (only a copy older than an hour is rebuilt
 * while the visitor waits). Saving a page, menu, the Customizer or new portal data marks every copy
 * old and rebuilds the main pages straight away. It is skipped for signed-in users, form results
 * (any query string), and when a caching plugin is active. Turn it off in Customize → DE Educare → Speed.
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

const DE_PAGE_CACHE_TTL       = 600;
const DE_PAGE_CACHE_MAX_STALE = 3600;

function de_page_cache_dir() {
	return WP_CONTENT_DIR . '/cache/deeducare/';
}

/** A caching plugin is active: leave caching to it. */
function de_cache_plugin_active() {
	foreach ( (array) get_option( 'active_plugins', array() ) as $plugin ) {
		if ( preg_match( '#^(litespeed-cache|wp-rocket|w3-total-cache|wp-super-cache|wp-fastest-cache|sg-cachepress|breeze|hummingbird-performance|cache-enabler|wp-optimize|nitropack|comet-cache|hyper-cache|swift-performance[a-z-]*)/#', $plugin ) ) {
			return true;
		}
	}
	return false;
}

/** Marks the theme's own background rebuild requests, which must build the page rather than read the copy. */
function de_page_cache_regen_key() {
	return substr( wp_hash( 'de_page_cache_regen' ), 0, 16 );
}

/** Asks the site, without waiting, to rebuild these pages. */
function de_page_cache_rebuild( $urls ) {
	foreach ( $urls as $url ) {
		wp_remote_get( $url, array(
			'blocking'  => false,
			'timeout'   => 0.01,
			'sslverify' => apply_filters( 'https_local_ssl_verify', false ),
			'headers'   => array( 'X-DE-Regen' => de_page_cache_regen_key() ),
		) );
	}
}

/** The cache file for this request, or null when this request must not be cached. */
function de_page_cache_file() {
	static $file = false;
	if ( false !== $file ) {
		return $file;
	}
	$file = null;
	$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
	if ( ( defined( 'DE_PAGE_CACHE' ) && ! DE_PAGE_CACHE ) || ! get_theme_mod( 'de_page_cache', true ) || de_cache_plugin_active() ) {
		return $file;
	}
	if ( ! in_array( $method, array( 'GET', 'HEAD' ), true ) || is_admin() || wp_doing_ajax() || wp_doing_cron() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) {
		return $file;
	}
	foreach ( array_keys( $_COOKIE ) as $name ) {
		if ( preg_match( '/^(wordpress_logged_in_|wp-postpass_|comment_author_|wordpress_sec_)/', $name ) ) {
			return $file;
		}
	}
	$uri  = $_SERVER['REQUEST_URI'] ?? '/';
	$path = (string) wp_parse_url( $uri, PHP_URL_PATH );
	// Ad and campaign tags don't change the page; any other query (form results, search, previews) skips the cache.
	parse_str( (string) wp_parse_url( $uri, PHP_URL_QUERY ), $query );
	foreach ( array_keys( $query ) as $key ) {
		if ( ! preg_match( '/^(utm_[a-z]+|gclid|fbclid|gbraid|wbraid|srsltid)$/', $key ) ) {
			return $file;
		}
	}
	if ( preg_match( '#^/(wp-|xmlrpc|feed)|\.(xml|txt|php)$#', $path ) ) {
		return $file;
	}
	$scheme = is_ssl() ? 'https' : 'http';
	$file   = de_page_cache_dir() . md5( $scheme . '://' . ( $_SERVER['HTTP_HOST'] ?? '' ) . $path ) . '.html';
	return $file;
}

/**
 * Serves the cached copy and stops. Runs while the theme loads, before WordPress builds the page.
 * An old copy is served too, and a background request rebuilds it (one at a time per page).
 */
function de_page_cache_serve() {
	$file = de_page_cache_file();
	if ( ! $file || ! is_readable( $file ) || ( $_SERVER['HTTP_X_DE_REGEN'] ?? '' ) === de_page_cache_regen_key() ) {
		return;
	}
	$age = time() - filemtime( $file );
	if ( $age > DE_PAGE_CACHE_MAX_STALE ) {
		return;
	}
	header( 'Content-Type: text/html; charset=' . get_option( 'blog_charset', 'UTF-8' ) );
	header( 'X-DE-Cache: ' . ( $age > DE_PAGE_CACHE_TTL ? 'STALE' : 'HIT' ) );
	if ( 'HEAD' !== ( $_SERVER['REQUEST_METHOD'] ?? 'GET' ) ) {
		readfile( $file );
	}
	$lock = $file . '.lock';
	if ( $age > DE_PAGE_CACHE_TTL && ( ! file_exists( $lock ) || filemtime( $lock ) < time() - 60 ) ) {
		@touch( $lock ); // phpcs:ignore
		if ( function_exists( 'fastcgi_finish_request' ) ) {
			fastcgi_finish_request();
		}
		$path = (string) wp_parse_url( $_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH );
		de_page_cache_rebuild( array( ( is_ssl() ? 'https' : 'http' ) . '://' . ( $_SERVER['HTTP_HOST'] ?? '' ) . $path ) );
	}
	exit;
}
de_page_cache_serve();

// Store the page once WordPress has built it.
add_action( 'template_redirect', function () {
	$file = de_page_cache_file();
	if ( $file && is_404() && file_exists( $file ) ) {
		@unlink( $file ); // phpcs:ignore A page that is gone.
	}
	if ( ! $file || is_404() || is_search() || is_preview() || is_feed() || is_robots() || is_trackback() || ( is_singular() && post_password_required() ) ) {
		return;
	}
	header( 'X-DE-Cache: MISS' );
	ob_start( function ( $html ) use ( $file ) {
		if ( http_response_code() !== 200 || defined( 'DONOTCACHEPAGE' ) || strlen( $html ) < 1000 || false === stripos( $html, '</html>' ) ) {
			return $html;
		}
		foreach ( headers_list() as $h ) {
			if ( stripos( $h, 'set-cookie:' ) === 0 || ( stripos( $h, 'content-type:' ) === 0 && false === stripos( $h, 'text/html' ) ) ) {
				return $html;
			}
		}
		$dir = dirname( $file );
		if ( ! is_dir( $dir ) && ! wp_mkdir_p( $dir ) ) {
			return $html;
		}
		if ( ! file_exists( $dir . '/index.php' ) ) {
			@file_put_contents( $dir . '/index.php', "<?php // Silence.\n" ); // phpcs:ignore
		}
		$tmp = $file . '.' . wp_rand() . '.tmp';
		if ( false !== @file_put_contents( $tmp, $html . "\n<!-- DE Educare page cache " . gmdate( 'c' ) . " -->" ) ) { // phpcs:ignore
			@rename( $tmp, $file ); // phpcs:ignore
		}
		@unlink( $file . '.lock' ); // phpcs:ignore
		return $html;
	} );
}, 0 );

/**
 * Something changed: mark every copy old (visitors still get it at once while it is rebuilt), and rebuild
 * the home page and published pages in the background when this request ends.
 */
function de_page_cache_purge() {
	static $queued = false;
	foreach ( (array) glob( de_page_cache_dir() . '*.html' ) as $f ) {
		@touch( $f, time() - DE_PAGE_CACHE_TTL - 1 ); // phpcs:ignore
	}
	if ( $queued ) {
		return;
	}
	$queued = true;
	add_action( 'shutdown', function () {
		$urls = array( home_url( '/' ) );
		foreach ( get_pages( array( 'number' => 30, 'post_status' => 'publish' ) ) as $page ) {
			$urls[] = get_permalink( $page );
		}
		de_page_cache_rebuild( array_unique( $urls ) );
	} );
}

foreach ( array( 'save_post', 'deleted_post', 'trashed_post', 'customize_save_after', 'switch_theme', 'wp_update_nav_menu', 'comment_post', 'transition_comment_status', 'activated_plugin', 'deactivated_plugin', 'upgrader_process_complete' ) as $hook ) {
	add_action( $hook, 'de_page_cache_purge' );
}
// New plans, reviews or tests from the portal: clear pages so they show at once.
add_action( 'updated_option', function ( $option, $old, $new ) {
	if ( 0 === strpos( $option, 'de_pc_' ) && ( is_array( $old ) ? $old['d'] ?? null : null ) !== ( is_array( $new ) ? $new['d'] ?? null : null ) ) {
		de_page_cache_purge();
	}
}, 10, 3 );

/**
 * Instant page loads: the browser starts loading a page when a visitor hovers over (or presses) a link to it.
 * WordPress 6.8+ has this built in (prefetch); there it is switched to prerender.
 */
add_filter( 'wp_speculation_rules_configuration', function ( $config ) {
	return is_array( $config ) ? array( 'mode' => 'prerender', 'eagerness' => 'moderate' ) : $config;
} );
add_action( 'wp_footer', function () {
	if ( function_exists( 'wp_get_speculation_rules_configuration' ) || is_user_logged_in() ) {
		return;
	}
	$rules = array(
		'prerender' => array(
			array(
				'source'    => 'document',
				'where'     => array(
					'and' => array(
						array( 'href_matches' => '/*' ),
						array( 'not' => array( 'href_matches' => array( '/wp-*', '/*\\?*', '/*.xml', '/*.pdf' ) ) ),
						array( 'not' => array( 'selector_matches' => '[rel~=nofollow], [target=_blank], .no-prerender' ) ),
					),
				),
				'eagerness' => 'moderate',
			),
		),
	);
	echo '<script type="speculationrules">' . wp_json_encode( $rules ) . "</script>\n";
} );

// Leaner page head: no emoji script, oEmbed discovery, RSD, shortlink or version tag.
add_action( 'init', function () {
	remove_action( 'wp_head', 'print_emoji_detection_script', 7 );
	remove_action( 'wp_print_styles', 'print_emoji_styles' );
	remove_action( 'wp_enqueue_scripts', 'wp_enqueue_emoji_styles' );
	remove_action( 'wp_head', 'wp_oembed_add_discovery_links' );
	remove_action( 'wp_head', 'rsd_link' );
	remove_action( 'wp_head', 'wlwmanifest_link' );
	remove_action( 'wp_head', 'wp_shortlink_wp_head' );
	remove_action( 'wp_head', 'wp_generator' );
	remove_action( 'wp_head', 'feed_links_extra', 3 );
	add_filter( 'emoji_svg_url', '__return_false' );
} );
