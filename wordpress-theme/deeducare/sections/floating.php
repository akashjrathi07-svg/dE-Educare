<?php
/**
 * WhatsApp "Talk to a counsellor" pill (desktop), sticky action bar (mobile) and the toast.
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

$key      = de_page_key();
$exam     = in_array( $key, array( 'cat', 'cet', 'omet' ), true ) ? $key : 'cat';
?>
<a class="de-wa" href="<?php echo esc_url( de_whatsapp_url() ); ?>" target="_blank" rel="noopener">
	<span class="de-wa__ic" aria-hidden="true">WA</span>
	<span class="de-wa__txt"><span class="de-wa__t">Talk to a counsellor</span><span class="de-wa__d">WhatsApp · <?php de_e( preg_replace( '/,.*$/', '', de_setting( 'hours' ) ) ); ?></span></span>
</a>

<div class="de-mbar">
	<a class="de-mbar__wa" href="<?php echo esc_url( de_whatsapp_url() ); ?>" target="_blank" rel="noopener" title="WhatsApp">WA</a>
	<a class="de-mbar__btn" href="<?php echo esc_url( de_daily_url( $exam ) ); ?>">Free test</a>
	<a class="de-mbar__btn de-mbar__btn--primary" href="#enquire" data-lead="<?php echo esc_attr( 'cet' === $exam ? 'cet-coaching-2028' : ( 'omet' === $exam ? 'mba-plus' : 'cat-coaching-2027' ) ); ?>">Enquire for coaching</a>
</div>

<div class="de-toast" role="status" aria-live="polite" hidden data-toast-box></div>
