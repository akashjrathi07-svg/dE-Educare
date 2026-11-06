<?php
/**
 * Meta Pixel (Facebook / Instagram ads): PageView on every page, ViewContent on exam pages.
 * Leads, contact clicks and clicks into the portal are tracked in assets/js/site.js.
 * The pixel ID is set in Customize → DE Educare → Portal and contact; empty turns it off.
 * Not loaded for signed-in editors, so the team's own visits don't count.
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

function de_pixel_id() {
	$id = preg_replace( '/\D/', '', (string) de_setting( 'meta_pixel_id' ) );
	return ( $id && ! current_user_can( 'edit_posts' ) ) ? $id : '';
}

add_action( 'wp_head', function () {
	$id = de_pixel_id();
	if ( ! $id ) {
		return;
	}
	$names = array( 'cat' => 'CAT', 'cet' => 'MBA-CET', 'omet' => 'OMETs', 'free' => 'Free resources' );
	$key   = de_page_key();
	?>
<script>
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','<?php echo esc_js( $id ); ?>');
fbq('track','PageView');
<?php if ( isset( $names[ $key ] ) ) : ?>
fbq('track','ViewContent',{content_name:'<?php echo esc_js( $names[ $key ] ); ?>',content_category:'exam page'});
<?php endif; ?>
</script>
	<?php
}, 2 );

add_action( 'wp_body_open', function () {
	$id = de_pixel_id();
	if ( $id ) {
		printf( '<noscript><img height="1" width="1" style="display:none" alt="" src="https://www.facebook.com/tr?id=%s&amp;ev=PageView&amp;noscript=1"></noscript>' . "\n", esc_attr( $id ) );
	}
} );
