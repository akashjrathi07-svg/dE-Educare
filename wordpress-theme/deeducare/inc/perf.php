<?php
/**
 * Speed: a built-in page cache for visitors who aren't signed in, instant page loads on hover
 * (speculation rules), and less WordPress output in every page head.
 *
 * The page cache keeps a copy of each public page in wp-content/cache/deeducare/ for 10 minutes and
 * serves it before WordPress builds the page. It is skipped for signed-in users, form results
 * (any query string), and when a caching plugin is active (WP_CACHE). Saving a page, menu, the
 * Customizer or new portal data clears it. Turn it off in Customize → DE Educare → Speed.
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

const DE_PAGE_CACHE_TTL = 600;

function de_page_cache_dir() {
	return WP_CONTENT_DIR . '/cache/deeducare/';
}

/** The cache file for this request, or null when this request must not be cached. */
function de_page_cache_file() {
	static $file = false;
	if ( false !== $file ) {
		return $file;
	}
	$file = null;
	$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
	if ( ( defined( 'WP_CACHE' ) && WP_CACHE ) || ( defined( 'DE_PAGE_CACHE' ) && ! DE_PAGE_CACHE ) || ! get_theme_mod( 'de_page_cache', true ) ) {
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

/** Serves the cached copy and stops, if there is a fresh one. Runs while the theme loads, before WordPress builds the page. */
function de_page_cache_serve() {
	$file = de_page_cache_file();
	if ( ! $file || ! is_readable( $file ) || filemtime( $file ) < time() - DE_PAGE_CACHE_TTL ) {
		return;
	}
	header( 'Content-Type: text/html; charset=' . get_option( 'blog_charset', 'UTF-8' ) );
	header( 'X-DE-Cache: HIT' );
	if ( 'HEAD' !== ( $_SERVER['REQUEST_METHOD'] ?? 'GET' ) ) {
		readfile( $file );
	}
	exit;
}
de_page_cache_serve();

// Store the page once WordPress has built it.
add_action( 'template_redirect', function () {
	$file = de_page_cache_file();
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
		return $html;
	} );
}, 0 );

function de_page_cache_purge() {
	foreach ( (array) glob( de_page_cache_dir() . '*.html' ) as $f ) {
		@unlink( $f ); // phpcs:ignore
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
