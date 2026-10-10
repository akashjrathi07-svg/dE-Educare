<?php
/**
 * Dark utility strip (quick links + CAT countdown) and sticky header with the Exams mega-menu.
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

$key  = de_page_key();
$days = de_days_to_exam();

$util = array(
	array( 'Daily free test', de_daily_url( 'cat' ) ),
	array( 'Percentile predictor', de_page_url( 'free-resources' ) . '#predictor' ),
	array( 'Free questions', de_page_url( 'free-resources' ) ),
);
if ( de_setting( 'whatsapp_group' ) ) {
	$util[] = array( 'WhatsApp group', de_setting( 'whatsapp_group' ) );
}
$util[] = array( de_setting( 'phone' ), 'tel:' . preg_replace( '/[^\d+]/', '', de_setting( 'phone' ) ) );

$nav = array(
	array( 'CAT', de_page_url( 'cat' ), 'cat' === $key ),
	array( 'MBA-CET', de_page_url( 'mba-cet' ), 'cet' === $key ),
	array( 'OMETs', de_page_url( 'omet' ), 'omet' === $key ),
	array( 'Free resources', de_page_url( 'free-resources' ), 'free' === $key ),
	array( 'Contact', de_page_url( 'contact' ), 'contact' === $key ),
);

$mega = array(
	'MBA ENTRANCE'     => array(
		array( 'CAT', 'CAT', 'Mocks, sectionals, topic tests', de_page_url( 'cat' ), '' ),
		array( 'CET', 'MBA-CET', 'MAH MBA CET mocks and crash course', de_page_url( 'mba-cet' ), '' ),
		array( 'OM', 'OMETs', 'SNAP, NMAT, XAT, CMAT', de_page_url( 'omet' ), '' ),
	),
	'GOVERNMENT EXAMS' => array(
		array( 'BK', 'Bank PO', 'IBPS PO, SBI PO', add_query_arg( 'exam', 'Bank PO', de_page_url( 'contact' ) ), 'soon' ),
		array( 'RBI', 'RBI Grade B', 'Phase 1 and 2', add_query_arg( 'exam', 'RBI', de_page_url( 'contact' ) ), 'soon' ),
		array( 'UP', 'UPSC', 'Prelims and Mains', add_query_arg( 'exam', 'UPSC', de_page_url( 'contact' ) ), 'soon' ),
	),
	'FREE'             => array(
		array( '5Q', 'Daily free test', 'New every morning', de_daily_url( 'cat' ), 'free' ),
		array( 'FQ', 'Free questions', 'With worked solutions', de_page_url( 'free-resources' ), 'free' ),
		array( '%', 'Percentile predictor', 'Score to percentile', de_page_url( 'free-resources' ) . '#predictor', 'free' ),
	),
);
?>
<div class="de-util">
	<div class="de-wrap de-util__in">
		<nav class="de-util__links" aria-label="<?php esc_attr_e( 'Quick links', 'deeducare' ); ?>">
			<?php foreach ( $util as $u ) : ?>
				<a href="<?php echo esc_url( $u[1] ); ?>"><?php de_e( $u[0] ); ?></a>
			<?php endforeach; ?>
		</nav>
		<div class="de-util__count">
			<span class="de-util__muted">CAT <?php echo esc_html( substr( de_setting( 'cat_date' ), 0, 4 ) ); ?> in</span>
			<span class="de-util__days"><span class="de-util__num" data-countdown><?php echo (int) $days; ?></span><span class="de-util__muted">days</span></span>
		</div>
	</div>
</div>

<header class="de-header" data-header>
	<div class="de-wrap de-header__in">
		<a class="de-logo" href="<?php echo esc_url( home_url( '/' ) ); ?>" aria-label="<?php esc_attr_e( 'DE Educare home', 'deeducare' ); ?>">
			<?php if ( has_custom_logo() ) : ?>
				<?php echo wp_get_attachment_image( get_theme_mod( 'custom_logo' ), 'thumbnail', false, array( 'class' => 'de-logo__img', 'alt' => '' ) ); ?>
			<?php else : ?>
				<span class="de-logo__mark" aria-hidden="true">DE</span>
			<?php endif; ?>
			<span class="de-logo__text">DE Educare</span>
		</a>

		<nav class="de-nav" aria-label="<?php esc_attr_e( 'Main', 'deeducare' ); ?>">
			<button type="button" class="de-nav__link" aria-expanded="false" aria-controls="de-mega" data-mega-toggle>Exams <span aria-hidden="true">▾</span></button>
			<?php foreach ( $nav as $n ) : ?>
				<a class="de-nav__link<?php echo $n[2] ? ' is-active' : ''; ?>" href="<?php echo esc_url( $n[1] ); ?>"<?php echo $n[2] ? ' aria-current="page"' : ''; ?>><?php de_e( $n[0] ); ?></a>
			<?php endforeach; ?>
		</nav>

		<div class="de-header__actions">
			<a class="de-btn de-btn--ghost de-hide-sm" href="<?php echo esc_url( de_login_url() ); ?>" data-de-auth="signin">Sign in</a>
			<a class="de-btn de-btn--primary" href="<?php echo esc_url( de_signup_url() ); ?>" data-de-auth="join">Join free</a>
			<button type="button" class="de-burger" aria-expanded="false" aria-controls="de-mega" aria-label="<?php esc_attr_e( 'Menu', 'deeducare' ); ?>" data-mega-toggle>☰</button>
		</div>
	</div>

	<div class="de-mega" id="de-mega" hidden>
		<div class="de-wrap de-mega__grid">
			<nav class="de-mega__mobile" aria-label="<?php esc_attr_e( 'Pages', 'deeducare' ); ?>">
				<?php foreach ( $nav as $n ) : ?>
					<a href="<?php echo esc_url( $n[1] ); ?>"><?php de_e( $n[0] ); ?></a>
				<?php endforeach; ?>
				<a href="<?php echo esc_url( de_login_url() ); ?>" data-de-auth="signin">Sign in</a>
			</nav>
			<?php foreach ( $mega as $heading => $items ) : ?>
				<div class="de-mega__col">
					<span class="de-eyebrow de-eyebrow--sm"><?php de_e( $heading ); ?></span>
					<?php foreach ( $items as $mi ) : ?>
						<a class="de-mega__item" href="<?php echo esc_url( $mi[3] ); ?>">
							<span class="de-mono-badge de-mono-badge--<?php echo esc_attr( $mi[4] ? $mi[4] : 'blue' ); ?>"><?php de_e( $mi[0] ); ?></span>
							<span class="de-mega__txt">
								<span class="de-mega__t"><?php de_e( $mi[1] ); ?><?php if ( 'soon' === $mi[4] ) : ?><span class="de-soon">SOON</span><?php endif; ?></span>
								<span class="de-mega__d"><?php de_e( $mi[2] ); ?></span>
							</span>
						</a>
					<?php endforeach; ?>
				</div>
			<?php endforeach; ?>
			<div class="de-mega__promo">
				<span class="de-eyebrow de-eyebrow--amber de-eyebrow--sm">MOST POPULAR</span>
				<span class="de-mega__promo-t">CAT Test Series</span>
				<span class="de-mega__promo-d">20 mocks, sectionals and topic tests with All-India percentile.</span>
				<a class="de-btn de-btn--white de-btn--sm" href="<?php echo esc_url( de_page_url( 'cat' ) ); ?>">₹2,500 · View →</a>
			</div>
		</div>
	</div>
</header>
