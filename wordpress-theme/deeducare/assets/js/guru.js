/**
 * Guru on the website: a floating button on every page that opens the same
 * Guru students use in the portal.
 *
 * Signed-in students (shared DE Educare login cookie) talk to their own
 * Guru through the portal API: same chat history, same coins, chat or voice.
 * Visitors get 3 free preview questions a day, then an invitation to sign up.
 *
 * Opens from the button, from any link to #ask-guru, and from
 * elements with data-guru-open (optionally data-guru-q="question").
 */
( function () {
	'use strict';

	var CFG = window.DE_SITE || {};
	var API = ( CFG.portal || '' ) + '/api/guru';
	var PREVIEW = ( CFG.portal || '' ) + '/api/public/guru-preview';
	var COST = { chat: 1, voice: 3 };
	var SUGG = [ 'How should I start CAT prep?', 'Is 85 enough for 99 %ile?', 'CAT or CET first?' ];

	var state = { open: false, loaded: false, signedIn: false, mode: 'chat', busy: false, left: null, limit: null, bonus: 0, previewLeft: 3, previewDone: false, voice: 'idle', name: '' };
	var el = {};

	function h( tag, attrs, kids ) {
		var n = document.createElement( tag );
		Object.keys( attrs || {} ).forEach( function ( k ) {
			if ( 'text' === k ) { n.textContent = attrs[ k ]; } else if ( 'class' === k ) { n.className = attrs[ k ]; } else { n.setAttribute( k, attrs[ k ] ); }
		} );
		( kids || [] ).forEach( function ( c ) { if ( c ) { n.appendChild( c ); } } );
		return n;
	}

	function pageLabel() {
		var t = document.title.split( '|' )[ 0 ].trim();
		return ( 'Website · ' + ( t || location.pathname ) ).slice( 0, 60 );
	}

	/* ---------- Build the button and the panel ---------- */
	function build() {
		el.fab = h( 'button', { type: 'button', class: 'de-guru-fab', 'aria-label': 'Ask Guru, your AI mentor', 'aria-expanded': 'false', 'aria-controls': 'de-guru-panel' }, [
			h( 'span', { class: 'de-orb', 'aria-hidden': 'true' } ),
			h( 'span', { class: 'de-guru-fab__txt' }, [ h( 'span', { class: 'de-guru-fab__t', text: 'Ask Guru' } ), h( 'span', { class: 'de-guru-fab__d', text: 'Chat or voice · AI mentor' } ) ] ),
		] );

		el.status = h( 'span', { class: 'de-guru__status', text: '3 free questions today' } );
		el.tabChat = h( 'button', { type: 'button', 'aria-pressed': 'true', text: 'Chat' } );
		el.tabVoice = h( 'button', { type: 'button', 'aria-pressed': 'false', text: 'Voice' } );
		el.close = h( 'button', { type: 'button', class: 'de-guru__x', 'aria-label': 'Close Guru', text: '×' } );
		el.log = h( 'div', { class: 'de-guru__log', 'aria-live': 'polite' } );
		el.chips = h( 'div', { class: 'de-guru__chips' } );
		SUGG.forEach( function ( s ) {
			var b = h( 'button', { type: 'button', class: 'de-chat__chip', text: s } );
			b.addEventListener( 'click', function () { ask( s ); } );
			el.chips.appendChild( b );
		} );
		el.input = h( 'input', { type: 'text', id: 'de-guru-in', maxlength: '2000', autocomplete: 'off', placeholder: 'Ask about CAT, CET or OMET prep' } );
		el.send = h( 'button', { type: 'submit', class: 'de-chat__send', text: 'Send' } );
		el.form = h( 'form', { class: 'de-chat__form de-guru__form' }, [ h( 'label', { class: 'screen-reader-text', for: 'de-guru-in', text: 'Ask Guru' } ), el.input, el.send ] );
		el.cta = h( 'div', { class: 'de-guru__cta', hidden: '' } );

		el.vOrb = h( 'div', { class: 'de-guru__vorb', 'aria-hidden': 'true' } );
		el.vLabel = h( 'div', { class: 'de-guru__vlabel', text: 'Tap to talk' } );
		el.vQ = h( 'div', { class: 'de-guru__vq' } );
		el.vA = h( 'div', { class: 'de-guru__va', hidden: '' } );
		el.vBtn = h( 'button', { type: 'button', class: 'de-guru__vbtn', text: 'Tap to talk' } );
		el.voicePane = h( 'div', { class: 'de-guru__voice', hidden: '' }, [ h( 'div', { class: 'de-guru__vstage' }, [ el.vOrb, el.vLabel, el.vQ, el.vA ] ), el.vBtn ] );
		el.chatPane = h( 'div', { class: 'de-guru__chat' }, [ el.log, el.chips, el.cta, el.form ] );

		el.panel = h( 'aside', { class: 'de-guru-panel', id: 'de-guru-panel', role: 'dialog', 'aria-label': 'Guru, AI mentor', hidden: '' }, [
			h( 'div', { class: 'de-guru__head' }, [
				h( 'span', { class: 'de-orb', 'aria-hidden': 'true' } ),
				h( 'div', { class: 'de-guru__who' }, [ h( 'span', { class: 'de-guru__name', text: 'Guru' } ), el.status ] ),
				h( 'div', { class: 'de-guru__seg', role: 'group', 'aria-label': 'Chat or voice' }, [ el.tabChat, el.tabVoice ] ),
				el.close,
			] ),
			el.chatPane,
			el.voicePane,
		] );

		document.body.appendChild( el.fab );
		document.body.appendChild( el.panel );

		el.fab.addEventListener( 'click', function () { open(); } );
		el.close.addEventListener( 'click', close );
		el.tabChat.addEventListener( 'click', function () { setMode( 'chat' ); } );
		el.tabVoice.addEventListener( 'click', function () { setMode( 'voice' ); } );
		el.form.addEventListener( 'submit', function ( e ) { e.preventDefault(); ask( el.input.value ); } );
		el.vBtn.addEventListener( 'click', talk );
		document.addEventListener( 'keydown', function ( e ) { if ( 'Escape' === e.key && state.open ) { close(); } } );
	}

	/* ---------- Messages ---------- */
	function bubble( role, text ) {
		var b = h( 'div', { class: 'de-chat__msg' + ( 'user' === role ? ' de-chat__msg--me' : '' ), text: text } );
		el.log.appendChild( b );
		el.log.scrollTop = el.log.scrollHeight;
		return b;
	}

	function showCta( kind ) {
		el.cta.textContent = '';
		var signup = CFG.signup || ( CFG.portal + '/signup' );
		if ( 'signup' === kind ) {
			el.cta.appendChild( h( 'p', { text: 'Create a free DE Educare ID for 10 Guru coins a day, chat and voice. Your chats then follow you to the portal and the app.' } ) );
			el.cta.appendChild( h( 'a', { class: 'de-btn de-btn--amber de-btn--block', href: signup, text: 'Create free DE Educare ID' } ) );
			el.cta.appendChild( h( 'a', { class: 'de-guru__login', href: ( CFG.login || CFG.portal + '/login' ), text: 'Already have one? Sign in' } ) );
		} else if ( 'coins' === kind ) {
			el.cta.appendChild( h( 'a', { class: 'de-btn de-btn--amber de-btn--block', href: CFG.portal + '/profile', text: 'Earn more coins in the portal' } ) );
		}
		el.cta.hidden = false;
		el.chips.hidden = true;
	}

	function updateStatus() {
		var t;
		if ( ! state.signedIn ) {
			t = state.previewDone ? 'Preview used up for today' : state.previewLeft + ' free question' + ( 1 === state.previewLeft ? '' : 's' ) + ' today';
		} else if ( null === state.left ) {
			t = 'Unlimited · synced with your portal';
		} else {
			t = state.left + ( state.limit ? ' of ' + state.limit : '' ) + ' coins left today' + ( state.bonus ? ' · ' + state.bonus + ' bonus' : '' ) + ' · ' + ( 'voice' === state.mode ? COST.voice + ' per voice reply' : COST.chat + ' per message' );
		}
		el.status.textContent = t;
	}

	/* ---------- Loading: who is this? ---------- */
	function load() {
		if ( state.loaded ) { return Promise.resolve(); }
		state.loaded = true;
		return fetch( API, { credentials: 'include' } ).then( function ( r ) {
			if ( ! r.ok ) { throw new Error( 'guest' ); }
			return r.json();
		} ).then( function ( d ) {
			state.signedIn = true;
			state.name = d.firstName || '';
			if ( d.coins ) { state.limit = d.coins.limit; state.left = null === d.coins.limit ? null : d.coins.left; state.bonus = d.coins.bonus || 0; }
			el.log.textContent = '';
			if ( d.messages && d.messages.length ) {
				d.messages.forEach( function ( m ) { bubble( m.role, m.text ); } );
			} else {
				bubble( 'assistant', 'Hi ' + ( state.name || 'there' ) + ', I’m Guru. I’ve read your recent tests. Ask me about any question, topic or your study plan.' );
			}
			el.input.placeholder = 'Ask Guru anything';
		} ).catch( function () {
			state.signedIn = false;
			el.log.textContent = '';
			bubble( 'assistant', 'Hi, I’m Guru, the AI mentor at DE Educare. Ask me anything about CAT, MBA-CET or OMET prep. You have 3 free questions today.' );
		} ).then( updateStatus );
	}

	/* ---------- Asking ---------- */
	function ask( text, viaVoice ) {
		text = ( text || '' ).trim();
		if ( ! text || state.busy ) { return Promise.resolve( null ); }
		if ( ! state.signedIn && state.previewDone ) { showCta( 'signup' ); return Promise.resolve( null ); }
		state.busy = true;
		el.send.disabled = true;
		el.input.value = '';
		bubble( 'user', text );
		var out = bubble( 'assistant', 'Guru is thinking…' );
		out.classList.add( 'de-chat__msg--thinking' );
		var done = state.signedIn ? askPortal( text, viaVoice, out ) : askPreview( text, out );
		return done.catch( function () {
			out.textContent = 'Guru is offline right now. Please try again in a minute.';
			return null;
		} ).then( function ( reply ) {
			out.classList.remove( 'de-chat__msg--thinking' );
			state.busy = false;
			el.send.disabled = false;
			updateStatus();
			return reply;
		} );
	}

	function askPortal( text, viaVoice, out ) {
		return fetch( API, {
			method: 'POST',
			credentials: 'include',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify( { text: text, page: pageLabel(), mode: viaVoice ? 'voice' : 'chat' } ),
		} ).then( function ( res ) {
			var l = res.headers.get( 'X-Guru-Left' );
			if ( l ) { state.left = 'unlimited' === l ? null : Number( l ); }
			var b = res.headers.get( 'X-Guru-Bonus' );
			if ( b ) { state.bonus = Number( b ); }
			if ( 401 === res.status ) {
				// Signed out in another tab: fall back to the preview.
				state.signedIn = false;
				state.loaded = false;
				return askPreview( text, out );
			}
			if ( ! res.ok || ! res.body || ! window.TextDecoder ) {
				return res.text().then( function ( t ) {
					out.textContent = t;
					if ( 429 === res.status ) { showCta( 'coins' ); }
					return res.ok ? t : null;
				} );
			}
			var reader = res.body.getReader();
			var dec = new TextDecoder();
			var reply = '';
			var pump = function () {
				return reader.read().then( function ( r ) {
					if ( r.done ) { return reply; }
					reply += dec.decode( r.value, { stream: true } );
					out.classList.remove( 'de-chat__msg--thinking' );
					out.textContent = reply;
					el.log.scrollTop = el.log.scrollHeight;
					return pump();
				} );
			};
			return pump();
		} );
	}

	function askPreview( text, out ) {
		return fetch( PREVIEW, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify( { q: text.slice( 0, 300 ) } ) } )
			.then( function ( r ) { return r.json(); } )
			.then( function ( d ) {
				out.textContent = d.answer || d.error || 'Guru is offline right now.';
				if ( 'number' === typeof d.left ) { state.previewLeft = d.left; }
				if ( d.done || 0 === d.left ) { state.previewDone = true; showCta( 'signup' ); }
				return d.done ? null : d.answer;
			} );
	}

	/* ---------- Voice ---------- */
	function setVoice( v ) {
		state.voice = v;
		var label = { idle: 'Tap to talk', listening: 'Listening…', thinking: 'Thinking…', speaking: 'Speaking' }[ v ];
		el.vLabel.textContent = label;
		el.vBtn.textContent = 'speaking' === v ? 'Stop' : 'listening' === v ? 'Done talking' : label;
		el.vBtn.classList.toggle( 'is-stop', 'speaking' === v );
		el.vOrb.setAttribute( 'data-state', v );
	}

	function speak( text ) {
		if ( ! window.speechSynthesis || ! window.SpeechSynthesisUtterance ) { setVoice( 'idle' ); return; }
		var u = new SpeechSynthesisUtterance( text );
		u.lang = 'en-IN';
		u.onend = function () { setVoice( 'idle' ); };
		window.speechSynthesis.speak( u );
		setVoice( 'speaking' );
	}

	var recog = null;
	function talk() {
		if ( 'speaking' === state.voice ) { window.speechSynthesis.cancel(); setVoice( 'idle' ); return; }
		if ( 'listening' === state.voice ) { if ( recog ) { recog.stop(); } return; }
		if ( 'idle' !== state.voice ) { return; }
		var Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
		if ( ! Ctor ) {
			el.vA.hidden = false;
			el.vA.textContent = 'Voice is not supported in this browser. Try Chrome, or type in Chat.';
			return;
		}
		var r = new Ctor();
		var heard = '';
		r.lang = 'en-IN';
		r.interimResults = false;
		r.onresult = function ( e ) { heard = e.results[ 0 ][ 0 ].transcript; };
		r.onerror = function () { setVoice( 'idle' ); };
		r.onend = function () {
			if ( ! heard ) { setVoice( 'idle' ); return; }
			el.vQ.textContent = '“' + heard + '”';
			el.vA.hidden = true;
			setVoice( 'thinking' );
			ask( heard, true ).then( function ( a ) {
				if ( ! a ) {
					el.vA.hidden = false;
					el.vA.textContent = el.log.lastChild ? el.log.lastChild.textContent : '';
					setVoice( 'idle' );
					return;
				}
				el.vA.hidden = false;
				el.vA.textContent = a;
				speak( a );
			} );
		};
		recog = r;
		el.vQ.textContent = '';
		setVoice( 'listening' );
		r.start();
	}

	/* ---------- Open, close, mode ---------- */
	function setMode( m ) {
		state.mode = m;
		el.tabChat.setAttribute( 'aria-pressed', String( 'chat' === m ) );
		el.tabVoice.setAttribute( 'aria-pressed', String( 'voice' === m ) );
		el.chatPane.hidden = 'chat' !== m;
		el.voicePane.hidden = 'voice' !== m;
		updateStatus();
	}

	function open( question, mode ) {
		state.open = true;
		el.panel.hidden = false;
		el.fab.hidden = true;
		el.fab.setAttribute( 'aria-expanded', 'true' );
		document.documentElement.classList.add( 'de-guru-on' );
		setMode( mode || state.mode );
		return load().then( function () {
			if ( question ) { ask( question ); } else if ( 'chat' === state.mode ) { el.input.focus(); }
		} );
	}

	function close() {
		state.open = false;
		el.panel.hidden = true;
		el.fab.hidden = false;
		el.fab.setAttribute( 'aria-expanded', 'false' );
		document.documentElement.classList.remove( 'de-guru-on' );
		if ( recog && 'listening' === state.voice ) { recog.stop(); }
		if ( window.speechSynthesis && 'speaking' === state.voice ) { window.speechSynthesis.cancel(); setVoice( 'idle' ); }
		el.fab.focus();
	}

	function init() {
		if ( ! CFG.portal ) { return; }
		build();
		document.addEventListener( 'click', function ( e ) {
			var t = e.target.closest( 'a[href$="#ask-guru"], [data-guru-open]' );
			if ( ! t ) { return; }
			var href = t.getAttribute( 'href' );
			if ( href && href.indexOf( '#ask-guru' ) > 0 && href.split( '#' )[ 0 ] !== location.href.split( '#' )[ 0 ] && href.split( '#' )[ 0 ] !== location.pathname ) { return; }
			e.preventDefault();
			open( t.getAttribute( 'data-guru-q' ) || '', t.getAttribute( 'data-guru-mode' ) || '' );
		} );
		// The home page's Guru box: typing there opens Guru with the question.
		document.addEventListener( 'submit', function ( e ) {
			var f = e.target.closest( 'form[data-guru-form]' );
			if ( ! f ) { return; }
			e.preventDefault();
			var q = f.querySelector( 'input' );
			open( q ? q.value : '' );
			if ( q ) { q.value = ''; }
		} );
		if ( '#ask-guru' === location.hash ) { open(); }
		// Other scripts (and the app's web views) can call DEGuru.open('question').
		window.DEGuru = { open: open, close: close, ask: function ( q ) { return open( q ); } };
	}

	if ( 'loading' === document.readyState ) { document.addEventListener( 'DOMContentLoaded', init ); } else { init(); }
}() );
