<?php
/**
 * Speed: a built-in page cache for visitors who aren't signed in, and less WordPress output in every page head.
 *
 * The page cache keeps a copy of each public page in wp-content/cache/deeducare/ and serves it before
 * WordPress builds the page. On PHP-FPM or LiteSpeed hosting, a copy older than 10 minutes is still served
 * at once and rebuilt in the same request after the visitor has the page; elsewhere it is rebuilt while the
 * visitor waits. It never makes extra HTTP requests to the site (hosts' bot protection can treat those as an
 * attack). Saving a page, menu, the Customizer or new portal data marks every copy old. It is skipped for
 * signed-in users, form results (any query string), and when a caching plugin is active.
 * Turn it off in Customize → DE Educare → Speed.
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
 * An old copy is served too when the host can finish the response early; WordPress then rebuilds it.
 */
function de_page_cache_serve() {
	$file = de_page_cache_file();
	if ( ! $file || ! is_readable( $file ) ) {
		return;
	}
	$age    = time() - filemtime( $file );
	$finish = function_exists( 'fastcgi_finish_request' ) ? 'fastcgi_finish_request' : ( function_exists( 'litespeed_finish_request' ) ? 'litespeed_finish_request' : null );
	$lock   = $file . '.lock';
	$stale  = $age > DE_PAGE_CACHE_TTL;
	// Rebuild while the visitor waits when the host can't finish the response early, or the copy is over an hour old.
	if ( $stale && ( ! $finish || $age > DE_PAGE_CACHE_MAX_STALE ) ) {
		return;
	}
	header( 'Content-Type: text/html; charset=' . get_option( 'blog_charset', 'UTF-8' ) );
	header( 'X-DE-Cache: ' . ( $stale ? 'STALE' : 'HIT' ) );
	if ( 'HEAD' !== ( $_SERVER['REQUEST_METHOD'] ?? 'GET' ) ) {
		readfile( $file );
	}
	if ( ! $stale || ( file_exists( $lock ) && filemtime( $lock ) > time() - 60 ) ) {
		exit;
	}
	// Send the page now, then let WordPress carry on and rebuild the copy (template_redirect below stores it).
	@touch( $lock ); // phpcs:ignore
	$finish();
	ignore_user_abort( true );
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
	if ( ! headers_sent() ) {
		header( 'X-DE-Cache: MISS' );
	}
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

/** Something changed: mark every copy old, so the next visit rebuilds it. */
function de_page_cache_purge() {
	foreach ( (array) glob( de_page_cache_dir() . '*.html' ) as $f ) {
		@touch( $f, time() - DE_PAGE_CACHE_TTL - 1 ); // phpcs:ignore
	}
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
