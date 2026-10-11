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
}, 20 );

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
