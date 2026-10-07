/* Editor UI for the "DE Educare section" block: a picker plus a live server-rendered preview. */
( function ( wp ) {
	var el = wp.element.createElement;
	var InspectorControls = wp.blockEditor.InspectorControls;
	var useBlockProps = wp.blockEditor.useBlockProps;
	var PanelBody = wp.components.PanelBody;
	var SelectControl = wp.components.SelectControl;
	var ServerSideRender = wp.serverSideRender;
	var sections = window.DE_SECTIONS || {};

	wp.blocks.registerBlockType( 'deeducare/section', {
		apiVersion: 3,
		title: 'DE Educare section',
		icon: 'welcome-learn-more',
		category: 'theme',
		attributes: {
			name: { type: 'string', default: 'home-hero' },
			exam: { type: 'string', default: 'cat' }
		},
		edit: function ( props ) {
			var a = props.attributes;
			var options = Object.keys( sections ).map( function ( k ) { return { value: k, label: sections[ k ] }; } );
			return el( 'div', useBlockProps(),
				el( InspectorControls, null,
					el( PanelBody, { title: 'Section' },
						el( SelectControl, { label: 'Show', value: a.name, options: options, onChange: function ( v ) { props.setAttributes( { name: v } ); } } ),
						a.name === 'exam' && el( SelectControl, {
							label: 'Exam', value: a.exam,
							options: [ { value: 'cat', label: 'CAT' }, { value: 'cet', label: 'MBA-CET' }, { value: 'omet', label: 'OMETs' } ],
							onChange: function ( v ) { props.setAttributes( { exam: v } ); }
						} )
					)
				),
				el( ServerSideRender, { block: 'deeducare/section', attributes: a } )
			);
		},
		save: function () { return null; }
	} );
} )( window.wp );
