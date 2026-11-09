<?php
/**
 * Details-and-offers form on exam pages (saved, emailed and sent to the CRM webhook). The exam picks the choice shown first.
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

list( , $group ) = de_exam_view( $exam );
$pick = array( 'cat' => 'cat-mocks', 'cet' => 'cet-mocks', 'omet' => 'snap-mocks' )[ $group ];
?>
<div class="de-card de-coach__form">
	<?php de_lead_form( $pick, true ); ?>
</div>
