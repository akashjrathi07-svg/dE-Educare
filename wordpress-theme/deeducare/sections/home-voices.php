<?php
/**
 * Student reviews, written in the portal and approved in Admin → Reviews.
 * Until the first review is approved, it invites students to write one.
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

$reviews = de_reviews();
if ( ! $reviews ) :
	$asks = array(
		array( 'icon-checklist.webp', 'Test series', 'Did the mocks feel like the real paper? Did the analysis help?' ),
		array( 'icon-mentor.webp', 'Classes', 'How were the live classes, recordings and mentors?' ),
		array( 'icon-guru.webp', 'Guru AI', 'Did Guru’s plans and doubt solving move your scores?' ),
	);
	?>
	<section class="de-wrap de-sec-40 de-stack-22" id="reviews" data-reveal>
		<div class="de-split de-split--end">
			<div class="de-stack-10">
				<span class="de-eyebrow de-eyebrow--blue">STUDENT REVIEWS</span>
				<h2 class="de-h2 de-h2--md">From students using DE Educare</h2>
				<p class="de-p15">We only show real reviews from students on the portal, with their permission. Studying with us? Be among the first to share how it’s going.</p>
			</div>
			<a class="de-btn de-btn--primary de-btn--lg" href="<?php echo esc_url( de_portal( 'review' ) ); ?>">Write a review →</a>
		</div>
		<div class="de-grid de-grid--280">
			<?php foreach ( $asks as $a ) : ?>
				<a class="de-voice de-voice--ask" href="<?php echo esc_url( de_portal( 'review' ) ); ?>">
					<?php de_icon_img( $a[0], '', 48 ); ?>
					<span class="de-voice__n"><?php de_e( $a[1] ); ?></span>
					<span class="de-voice__q"><?php de_e( $a[2] ); ?></span>
					<span class="de-link-strong">Review <?php de_e( strtolower( $a[1] ) ); ?> →</span>
				</a>
			<?php endforeach; ?>
		</div>
	</section>
	<?php
	return;
endif;
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
		<a class="de-btn de-btn--ghost" href="<?php echo esc_url( de_portal( 'review' ) ); ?>">Studying with us? Write a review →</a>
	</div>
</section>
