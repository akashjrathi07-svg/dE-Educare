<?php
/**
 * Page setup. The site's pages (Home, CAT, MBA-CET, OMETs, Free resources,
 * Contact) are ordinary WordPress pages made of standard blocks, so every
 * heading, paragraph, image, button, table and FAQ can be edited, moved,
 * copied or deleted in the block editor.
 *
 * On theme activation empty pages are filled from inc/page-builder.php.
 * Appearance → DE Educare pages rebuilds a page from the theme's content
 * (the old version stays in the page's revisions).
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

add_action( 'after_switch_theme', function () {
	de_build_pages();
	update_option( 'de_pages_built', DE_THEME_VERSION );
	flush_rewrite_rules();
} );

/** Theme updates do not re-run activation, so fill empty pages once per new version too. */
add_action( 'init', function () {
	if ( get_option( 'de_pages_built' ) === DE_THEME_VERSION || wp_installing() ) {
		return;
	}
	update_option( 'de_pages_built', DE_THEME_VERSION );
	de_build_pages();
	de_update_page_text();
	de_refresh_pages();
}, 20 );

/**
 * Sections whose content is the theme's data (prices, programmes, plans, FAQs), refreshed on update.
 * Keys are block anchors (#coaching) or class names (de-exam-hero). Everything else on the page stays as edited.
 */
function de_refreshed_sections() {
	return array(
		'home'    => array( 'coaching', 'faq' ),
		'cat'     => array( 'coaching' ),
		'mba-cet' => array( 'de-exam-hero', 'coaching', 'faq' ),
		'omet'    => array( 'de-exam-hero', 'coaching', 'snap', 'nmat', 'xat', 'cmat' ),
	);
}

/** After a theme update: pages nobody edited are rebuilt in full; edited pages get only the theme's data sections. */
function de_refresh_pages() {
	$pages = de_buildable_pages();
	foreach ( de_refreshed_sections() as $slug => $keys ) {
		$page = de_site_page( $slug );
		if ( ! $page || ! isset( $pages[ $slug ] ) || '' === trim( $page->post_content ) ) {
			continue;
		}
		$fresh = call_user_func( $pages[ $slug ][1] );
		$hash  = get_post_meta( $page->ID, '_de_built_hash', true );
		$new   = $hash && md5( $page->post_content ) === $hash ? $fresh : de_replace_sections( $page->post_content, $fresh, $keys );
		if ( $new !== $page->post_content ) {
			wp_update_post( array( 'ID' => $page->ID, 'post_content' => wp_slash( $new ) ) );
			update_post_meta( $page->ID, '_de_built_hash', md5( get_post_field( 'post_content', $page->ID, 'raw' ) ) );
		}
	}
}

/** Swaps the blocks marked by $keys (anchor or class name) in $content for the same blocks in $fresh. */
function de_replace_sections( $content, $fresh, $keys ) {
	$key_of = function ( $b ) use ( $keys ) {
		$attrs = $b['attrs'] ?? array();
		if ( ! empty( $attrs['anchor'] ) && in_array( $attrs['anchor'], $keys, true ) ) {
			return $attrs['anchor'];
		}
		foreach ( preg_split( '/\s+/', $attrs['className'] ?? '' ) as $c ) {
			if ( $c && in_array( $c, $keys, true ) ) {
				return $c;
			}
		}
		return '';
	};
	$found = array();
	$scan  = function ( $blocks ) use ( &$scan, &$found, $key_of ) {
		foreach ( $blocks as $b ) {
			$k = $key_of( $b );
			if ( $k && ! isset( $found[ $k ] ) ) {
				$found[ $k ] = $b;
				continue;
			}
			$scan( $b['innerBlocks'] ?? array() );
		}
	};
	$scan( parse_blocks( $fresh ) );
	$done = array();
	$walk = function ( $blocks ) use ( &$walk, &$found, &$done, $key_of ) {
		foreach ( $blocks as $i => $b ) {
			$k = $key_of( $b );
			if ( $k && isset( $found[ $k ] ) && ! isset( $done[ $k ] ) ) {
				$blocks[ $i ] = $found[ $k ];
				$done[ $k ]   = true;
				continue;
			}
			if ( ! empty( $b['innerBlocks'] ) ) {
				$inner = $walk( $b['innerBlocks'] );
				if ( $inner !== $b['innerBlocks'] ) {
					// innerContent holds the inner blocks as null placeholders, so only innerBlocks change.
					$blocks[ $i ]['innerBlocks'] = $inner;
				}
			}
		}
		return $blocks;
	};
	$blocks = $walk( parse_blocks( $content ) );
	return $done ? serialize_blocks( $blocks ) : $content;
}

/**
 * Theme 2.1.0 saved pages without wp_slash(), so block settings lost their backslashes
 * ("de-hero\u002d\u002dintro" became "de-herou002du002dintro") and the editor showed
 * those blocks as changed. Puts the backslashes back inside block comments only.
 */
function de_repair_block_escapes( $content ) {
	return preg_replace_callback( '/<!-- wp:[^>]*?-->/', function ( $m ) {
		return preg_replace( '/(?<!\\\\)u00(2d|3c|3e|26|22)/', '\\\\u00$1', $m[0] );
	}, $content );
}

/**
 * Corrects sentences the theme wrote into pages in an earlier version, only where
 * the page still has the theme's exact wording (edited text is left alone).
 * The old version stays in the page's revisions.
 */
function de_update_page_text() {
	$fixes = array(
		// EMI is offered on coaching only, not on mocks and test series.
		'Prices include GST · UPI, cards and EMI' => 'Prices include GST · UPI, cards and netbanking',
		'UPI, cards, netbanking and EMI through a secure payment gateway. Your plan unlocks instantly on web and app.' => 'UPI, cards and netbanking through a secure payment gateway. Your plan unlocks instantly on web and app. EMI is available on coaching programmes.',
		'No. The OMET Combo (₹3,000) covers SNAP, NMAT, XAT and CMAT with 15 mocks each. An individual OMET pack is ₹1,000.' => 'The SNAP Test Series is ₹1,500 (15 SNAP mocks, sectionals and topic tests). The OMET Combo, covering SNAP, NMAT, XAT and CMAT with 15 mocks each, is coming soon.',
		'Programme fees per student. Send an enquiry for batch start dates, timings and payment options.' => 'Programme fees per student. EMI available on all coaching programmes. Send an enquiry for batch start dates, timings and payment options.',
	);
	foreach ( array_keys( de_buildable_pages() ) as $slug ) {
		$page = de_site_page( $slug );
		if ( ! $page ) {
			continue;
		}
		$new = de_repair_block_escapes( strtr( $page->post_content, $fixes ) );
		if ( $new !== $page->post_content ) {
			wp_update_post( array( 'ID' => $page->ID, 'post_content' => wp_slash( $new ) ) );
		}
	}
}

/**
 * Until a page has been built, show the theme's version of it so the site
 * never looks empty (for example right after an update, before activation runs).
 */
add_filter( 'render_block_core/post-content', function ( $html ) {
	if ( '' !== trim( wp_strip_all_tags( $html, true ) ) || is_admin() ) {
		return $html;
	}
	$slug = '';
	if ( is_front_page() ) {
		$slug = 'home';
	} elseif ( is_page() ) {
		$slug = get_post_field( 'post_name', get_queried_object_id() );
	}
	// Only the theme's own pages, and only while they are still empty.
	$pages = de_buildable_pages();
	if ( ! isset( $pages[ $slug ] ) ) {
		return $html;
	}
	$post = get_queried_object();
	if ( $post instanceof WP_Post && '' !== trim( $post->post_content ) ) {
		return $html;
	}
	return do_blocks( call_user_func( $pages[ $slug ][1] ) );
} );

/* ------------------------------------------------------------------ Button styles */

add_action( 'init', function () {
	$styles = array(
		'de-primary' => 'Blue',
		'de-outline' => 'Outline',
		'de-amber'   => 'Amber',
		'de-white'   => 'White',
		'de-ghost'   => 'Ghost',
		'de-soft'    => 'Soft blue',
		'de-ink'     => 'Dark',
	);
	foreach ( $styles as $name => $label ) {
		register_block_style( 'core/button', array( 'name' => $name, 'label' => $label ) );
	}
} );

/* ------------------------------------------------------------------ Admin screen */

add_action( 'admin_menu', function () {
	add_theme_page( 'DE Educare pages', 'DE Educare pages', 'edit_pages', 'de-pages', 'de_pages_screen' );
} );

function de_pages_screen() {
	if ( ! current_user_can( 'edit_pages' ) ) {
		return;
	}
	$result = null;
	if ( isset( $_POST['de_build'] ) && check_admin_referer( 'de_build_pages' ) ) {
		$only   = isset( $_POST['de_only'] ) ? array( sanitize_key( wp_unslash( $_POST['de_only'] ) ) ) : array();
		$force  = ! empty( $_POST['de_force'] );
		$result = de_build_pages( $force, $only );
	}
	?>
	<div class="wrap">
		<h1>DE Educare pages</h1>
		<p>Each page is built from standard blocks: edit any heading, text, image, button, table or FAQ in the block editor, add your own blocks, or move sections around. Blocks marked <strong>Live</strong> (prices, tests, forms, the predictor and reviews) come from the student portal and update on their own.</p>
		<p>To start a new landing page with the same look, create a page and choose the template <em>DE Educare sections (full width)</em>.</p>
		<?php
		// A front-page template saved earlier in the Site Editor would hide the editable Home page.
		$front = function_exists( 'get_block_template' ) ? get_block_template( get_stylesheet() . '//front-page' ) : null;
		if ( $front && 'custom' === $front->source ) :
			?>
			<div class="notice notice-warning"><p>The Home page is still using a copy of the old home template saved in the Site Editor. Go to <a href="<?php echo esc_url( admin_url( 'site-editor.php?postType=wp_template' ) ); ?>">Appearance → Editor → Templates</a>, open <strong>Front Page</strong>, and choose <strong>Reset</strong> (⋮ menu) so Home shows the page you edit here.</p></div>
		<?php endif; ?>
		<?php if ( $result ) : ?>
			<div class="notice notice-success"><p>
				<?php foreach ( $result as $r ) : ?>
					<?php echo esc_html( wp_specialchars_decode( $r[0] ) . ': ' . $r[1] ); ?><br>
				<?php endforeach; ?>
			</p></div>
		<?php endif; ?>
		<table class="widefat striped" style="max-width:900px">
			<thead><tr><th>Page</th><th>Status</th><th></th></tr></thead>
			<tbody>
			<?php foreach ( de_buildable_pages() as $slug => $p ) : ?>
				<?php $page = de_site_page( $slug ); ?>
				<tr>
					<td><strong><?php echo esc_html( $page ? wp_specialchars_decode( $page->post_title ) : $p[0] ); ?></strong><br><code>/<?php echo esc_html( 'home' === $slug ? '' : $slug . '/' ); ?></code></td>
					<td><?php echo esc_html( ! $page ? 'Not created' : ( '' === trim( $page->post_content ) ? 'Empty (showing the theme version)' : 'Editable blocks · last edited ' . get_the_modified_date( 'j M Y', $page ) ) ); ?></td>
					<td>
						<?php if ( $page ) : ?>
							<a class="button" href="<?php echo esc_url( get_edit_post_link( $page->ID ) ); ?>">Edit</a>
							<a class="button" href="<?php echo esc_url( get_permalink( $page ) ); ?>">View</a>
						<?php endif; ?>
						<form method="post" style="display:inline" onsubmit="return <?php echo $page && trim( $page->post_content ) ? "confirm('Replace this page with the theme version? Your current version stays in Revisions.')" : 'true'; ?>">
							<?php wp_nonce_field( 'de_build_pages' ); ?>
							<input type="hidden" name="de_only" value="<?php echo esc_attr( $slug ); ?>">
							<input type="hidden" name="de_force" value="1">
							<button class="button" name="de_build" value="1"><?php echo $page && trim( $page->post_content ) ? 'Rebuild from theme' : 'Build'; ?></button>
						</form>
					</td>
				</tr>
			<?php endforeach; ?>
			</tbody>
		</table>
		<form method="post" style="margin-top:16px">
			<?php wp_nonce_field( 'de_build_pages' ); ?>
			<button class="button button-primary" name="de_build" value="1">Create missing pages and fill empty ones</button>
			<p class="description">Pages you have already edited are left as they are.</p>
		</form>
	</div>
	<?php
}

/** Reminder until the pages exist. */
add_action( 'admin_notices', function () {
	if ( ! current_user_can( 'edit_pages' ) || ( isset( $_GET['page'] ) && 'de-pages' === $_GET['page'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification
		return;
	}
	foreach ( array_keys( de_buildable_pages() ) as $slug ) {
		if ( ! de_site_page( $slug ) ) {
			printf( '<div class="notice notice-warning"><p>%s <a href="%s">%s</a></p></div>', esc_html__( 'DE Educare: some site pages are missing.', 'deeducare' ), esc_url( admin_url( 'themes.php?page=de-pages' ) ), esc_html__( 'Create them', 'deeducare' ) );
			return;
		}
	}
} );

/**
 * Image blocks: lazy-load everything except the exam page banner, which is the
 * largest thing on screen and should load first.
 */
add_filter( 'render_block_core/image', function ( $html, $block ) {
	$p = new WP_HTML_Tag_Processor( $html );
	if ( ! $p->next_tag( 'img' ) ) {
		return $html;
	}
	if ( false !== strpos( $block['attrs']['className'] ?? '', 'de-exam-hero__img' ) ) {
		$p->remove_attribute( 'loading' );
		$p->set_attribute( 'fetchpriority', 'high' );
	} elseif ( null === $p->get_attribute( 'loading' ) ) {
		$p->set_attribute( 'loading', 'lazy' );
	}
	$p->set_attribute( 'decoding', 'async' );
	return $p->get_updated_html();
}, 10, 2 );
