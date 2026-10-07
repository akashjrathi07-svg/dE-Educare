<?php
/**
 * Scrolling strip of target colleges.
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

$colleges = de_marquee_colleges();
?>
<div class="de-marquee">
	<span class="de-eyebrow de-eyebrow--sm de-marquee__label">STUDENTS TARGET</span>
	<div class="de-marquee__mask">
		<ul class="de-marquee__track">
			<?php foreach ( array_merge( $colleges, $colleges ) as $i => $c ) : ?>
				<li<?php echo $i >= count( $colleges ) ? ' aria-hidden="true"' : ''; ?> class="<?php echo $i % 2 ? 'de-blue' : ''; ?>"><?php de_e( $c ); ?></li>
			<?php endforeach; ?>
		</ul>
	</div>
</div>
<div class="de-spacer-28"></div>
