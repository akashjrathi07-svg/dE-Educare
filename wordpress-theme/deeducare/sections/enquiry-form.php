<?php
/**
 * Coaching enquiry form (goes to the CRM webhook and by email). The exam picks the programme shown first.
 *
 * @package deeducare
 */

defined( 'ABSPATH' ) || exit;

list( , $group ) = de_exam_view( $exam );
$pick = array( 'cat' => 'cat-coaching-2027', 'cet' => 'cet-crash', 'omet' => 'cat-coaching-2027' )[ $group ];
?>
<div class="de-card de-coach__form">
	<?php de_lead_form( $pick, true ); ?>
</div>
