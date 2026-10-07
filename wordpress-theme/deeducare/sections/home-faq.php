<?php
/**
 * Home FAQs (also emitted as FAQPage JSON-LD by inc/seo.php).
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;
?>
<section class="de-narrow de-faq-sec" data-reveal>
	<h2 class="de-h2 de-h2--faq">Common questions</h2>
	<?php de_faq_list( de_home_faqs(), 'de-faq--lg' ); ?>
</section>
