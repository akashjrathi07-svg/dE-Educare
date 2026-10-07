<?php
/**
 * Student quotes. These are samples from the design; replace with real reviews in inc/content.php.
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;
?>
<section class="de-wrap de-sec-40 de-stack-22" data-reveal>
	<div class="de-split de-split--end">
		<h2 class="de-h2 de-h2--md">From students using De Educare</h2>
		<span class="de-note de-note--sm">Sample quotes · replace with real reviews</span>
	</div>
	<div class="de-grid de-grid--280">
		<?php foreach ( de_voices() as $v ) : ?>
			<figure class="de-voice">
				<span class="de-voice__mark" aria-hidden="true">“</span>
				<blockquote class="de-voice__q"><?php de_e( $v[0] ); ?></blockquote>
				<figcaption class="de-voice__who">
					<span class="de-voice__avatar" aria-hidden="true"><?php echo esc_html( mb_substr( $v[1], 0, 1 ) ); ?></span>
					<span><span class="de-voice__n"><?php de_e( $v[1] ); ?></span><span class="de-voice__e"><?php de_e( $v[2] ); ?></span></span>
				</figcaption>
			</figure>
		<?php endforeach; ?>
	</div>
</section>
