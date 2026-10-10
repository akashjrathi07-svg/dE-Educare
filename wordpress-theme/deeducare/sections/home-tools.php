<?php
/**
 * Quick tools row.
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

$free  = de_page_url( 'free-resources' );
$tools = array(
	array( 'icon-target.webp', 'Daily free test', 'CAT, MBA-CET, SNAP', '#free-daily' ),
	array( 'icon-mentor.webp', 'Coaching 2027–28', 'Live classes + mentors', '#coaching' ),
	array( 'icon-percentile.webp', 'Percentile & college predictor', 'Score → percentile → colleges', '#predict' ),
	array( 'icon-solutions.webp', 'Previous papers', 'Attempt as mocks', $free . '#free-tests' ),
	array( 'icon-guru.webp', 'Ask Guru', 'Free AI mentor', '#guru' ),
);
?>
<section class="de-wrap de-tools" data-reveal>
	<?php foreach ( $tools as $t ) : ?>
		<a class="de-tool" href="<?php echo esc_url( $t[3] ); ?>">
			<?php de_icon_img( $t[0], '', 44 ); ?>
			<span class="de-tool__txt"><span class="de-tool__t"><?php de_e( $t[1] ); ?></span><span class="de-tool__d"><?php de_e( $t[2] ); ?></span></span>
		</a>
	<?php endforeach; ?>
</section>
