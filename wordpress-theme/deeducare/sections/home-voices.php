<?php
/**
 * Student reviews, written in the portal and approved in Admin → Reviews.
 * The section is hidden until at least one approved review exists.
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

$reviews = de_reviews();
if ( ! $reviews ) {
	if ( defined( 'REST_REQUEST' ) && REST_REQUEST ) {
		echo '<p style="padding:20px">Student reviews appear here once reviews are approved in the portal (Admin → Reviews).</p>';
	}
	return;
}
$kinds = de_review_kinds();
$avg   = array_sum( array_map( function ( $r ) { return (int) ( $r['rating'] ?? 5 ); }, $reviews ) ) / count( $reviews );
$used  = array_unique( array_column( $reviews, 'kind' ) );
?>
<section class="de-wrap de-sec-40 de-stack-22" id="reviews" data-reveal data-reviews>
	<div class="de-split de-split--end">
		<div class="de-stack-10">
			<span class="de-eyebrow de-eyebrow--blue">STUDENT REVIEWS</span>
			<h2 class="de-h2 de-h2--md">From students using DE Educare</h2>
			<span class="de-rv-sum"><span class="de-stars" aria-hidden="true"><?php echo esc_html( str_repeat( '★', (int) round( $avg ) ) ); ?></span> <?php echo esc_html( number_format( $avg, 1 ) ); ?> average from <?php echo (int) count( $reviews ); ?> verified students</span>
		</div>
		<?php if ( count( $used ) > 1 ) : ?>
			<div class="de-chips" role="group" aria-label="Filter reviews">
				<button type="button" class="de-chip" aria-pressed="true" data-rv-filter="">All</button>
				<?php foreach ( $kinds as $k => $label ) : ?>
					<?php if ( in_array( $k, $used, true ) ) : ?>
						<button type="button" class="de-chip" aria-pressed="false" data-rv-filter="<?php echo esc_attr( $k ); ?>"><?php de_e( $label ); ?></button>
					<?php endif; ?>
				<?php endforeach; ?>
			</div>
		<?php endif; ?>
	</div>
	<div class="de-reviews">
		<?php foreach ( $reviews as $i => $v ) : ?>
			<?php
			$kind   = $kinds[ $v['kind'] ?? '' ] ?? '';
			$rating = max( 1, min( 5, (int) ( $v['rating'] ?? 5 ) ) );
			?>
			<figure class="de-voice" data-rv="<?php echo esc_attr( $v['kind'] ?? '' ); ?>"<?php echo $i >= 9 ? ' data-rv-more hidden' : ''; ?>>
				<?php if ( ! empty( $v['photo'] ) ) : ?>
					<img class="de-voice__photo" src="<?php echo esc_url( $v['photo'] ); ?>" alt="<?php echo esc_attr( $v['name'] . ' practising on the DE Educare portal' ); ?>" loading="lazy" decoding="async" width="400" height="300">
				<?php endif; ?>
				<div class="de-voice__meta">
					<span class="de-stars" aria-label="<?php echo esc_attr( $rating . ' out of 5' ); ?>"><?php echo esc_html( str_repeat( '★', $rating ) . str_repeat( '☆', 5 - $rating ) ); ?></span>
					<?php if ( $kind ) : ?><span class="de-voice__kind"><?php de_e( $kind ); ?></span><?php endif; ?>
				</div>
				<blockquote class="de-voice__q"><?php de_e( $v['text'] ); ?></blockquote>
				<figcaption class="de-voice__who">
					<span class="de-voice__avatar" aria-hidden="true"><?php echo esc_html( mb_substr( $v['name'], 0, 1 ) ); ?></span>
					<span><span class="de-voice__n"><?php de_e( $v['name'] ); ?></span><span class="de-voice__e"><?php de_e( $v['exam'] ?? '' ); ?></span></span>
				</figcaption>
			</figure>
		<?php endforeach; ?>
	</div>
	<div class="de-row">
		<?php if ( count( $reviews ) > 9 ) : ?>
			<button type="button" class="de-btn de-btn--outline" data-rv-all>Show all <?php echo (int) count( $reviews ); ?> reviews</button>
		<?php endif; ?>
		<a class="de-btn de-btn--ghost" href="<?php echo esc_url( de_portal( 'profile', array( 'review' => '1' ) ) ); ?>">Studying with us? Write a review →</a>
	</div>
</section>
