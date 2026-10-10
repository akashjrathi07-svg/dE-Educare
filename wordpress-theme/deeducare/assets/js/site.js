/* DE Educare · front-end behaviour. No dependencies. Everything works as plain links/HTML without it. */
( function () {
	'use strict';

	var $ = function ( sel, root ) { return ( root || document ).querySelector( sel ); };
	var $$ = function ( sel, root ) { return Array.prototype.slice.call( ( root || document ).querySelectorAll( sel ) ); };
	var CFG = window.DE_SITE || {};
	var HEADER_OFFSET = 130;
	var reduceMotion = window.matchMedia && window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;

	/* ---------- Toast ---------- */
	var toastTimer;
	function toast( text ) {
		var box = $( '[data-toast-box]' );
		if ( ! box ) { return; }
		box.textContent = text;
		box.hidden = false;
		clearTimeout( toastTimer );
		toastTimer = setTimeout( function () { box.hidden = true; }, 2400 );
	}
	document.addEventListener( 'click', function ( e ) {
		var t = e.target.closest( '[data-toast]' );
		if ( t ) { e.preventDefault(); toast( t.getAttribute( 'data-toast' ) ); }
	} );

	/* ---------- Smooth in-page scrolling ---------- */
	function scrollToEl( el ) {
		if ( ! el ) { return; }
		var top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
		window.scrollTo( { top: top, behavior: reduceMotion ? 'auto' : 'smooth' } );
	}
	function scrollToHash( hash ) {
		var id = ( hash || '' ).replace( /^#/, '' );
		if ( ! id ) { return false; }
		var el = document.getElementById( id );
		if ( ! el ) { return false; }
		scrollToEl( el );
		return true;
	}
	document.addEventListener( 'click', function ( e ) {
		var a = e.target.closest( 'a[href^="#"]' );
		if ( ! a || a.hasAttribute( 'data-toast' ) || a.getAttribute( 'href' ) === '#' ) { return; }
		if ( a.hasAttribute( 'data-activate' ) ) { return; } // handled below
		if ( scrollToHash( a.getAttribute( 'href' ) ) ) {
			e.preventDefault();
			history.replaceState( null, '', a.getAttribute( 'href' ) );
		}
	} );

	/* ---------- Mega menu ---------- */
	var mega = $( '#de-mega' );
	var toggles = $$( '[data-mega-toggle]' );
	function setMega( open ) {
		if ( ! mega ) { return; }
		mega.hidden = ! open;
		toggles.forEach( function ( b ) { b.setAttribute( 'aria-expanded', open ? 'true' : 'false' ); } );
	}
	toggles.forEach( function ( b ) {
		b.addEventListener( 'click', function ( e ) { e.stopPropagation(); setMega( mega.hidden ); } );
	} );
	document.addEventListener( 'click', function ( e ) {
		if ( mega && ! mega.hidden && ! e.target.closest( '#de-mega' ) ) { setMega( false ); }
	} );
	document.addEventListener( 'keydown', function ( e ) {
		if ( e.key === 'Escape' && mega && ! mega.hidden ) { setMega( false ); toggles[ 0 ] && toggles[ 0 ].focus(); }
	} );

	/* ---------- Countdown (kept fresh on cached pages) ---------- */
	if ( CFG.examDate ) {
		var target = new Date( CFG.examDate + 'T00:00:00' );
		var now = new Date();
		now.setHours( 0, 0, 0, 0 );
		var days = Math.max( 0, Math.ceil( ( target - now ) / 864e5 ) );
		$$( '[data-countdown]' ).forEach( function ( el ) { el.textContent = String( days ); } );
	}

	/* ---------- Generic tabs ---------- */
	function activate( group, key ) {
		$$( '[data-tab-group="' + group + '"]' ).forEach( function ( b ) {
			b.setAttribute( 'aria-selected', b.getAttribute( 'data-tab' ) === key ? 'true' : 'false' );
		} );
		$$( '[data-panel-group="' + group + '"]' ).forEach( function ( p ) {
			p.hidden = p.getAttribute( 'data-panel' ) !== key;
		} );
	}
	document.addEventListener( 'click', function ( e ) {
		var b = e.target.closest( '[data-tab-group][data-tab]' );
		if ( b ) { activate( b.getAttribute( 'data-tab-group' ), b.getAttribute( 'data-tab' ) ); }
	} );
	document.addEventListener( 'keydown', function ( e ) {
		var b = e.target.closest && e.target.closest( '[data-tab-group][data-tab]' );
		if ( ! b || ( e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' ) ) { return; }
		var all = $$( '[data-tab-group="' + b.getAttribute( 'data-tab-group' ) + '"]' );
		var next = all[ ( all.indexOf( b ) + ( e.key === 'ArrowRight' ? 1 : all.length - 1 ) ) % all.length ];
		next.focus();
		next.click();
	} );

	/* Syllabus topic → open its topic tests and scroll to them. */
	document.addEventListener( 'click', function ( e ) {
		var a = e.target.closest( '[data-activate]' );
		if ( ! a ) { return; }
		e.preventDefault();
		a.getAttribute( 'data-activate' ).split( ' ' ).forEach( function ( pair ) {
			var i = pair.lastIndexOf( ':' );
			activate( pair.slice( 0, i ), pair.slice( i + 1 ) );
		} );
		scrollToHash( a.getAttribute( 'href' ) );
	} );

	/* ---------- Home hero exam picker ---------- */
	var picker = $( '[data-picker]' );
	if ( picker ) {
		var coarse = window.matchMedia && window.matchMedia( '(hover: none)' ).matches;
		var pick = function ( i ) {
			$$( '[data-pick]', picker ).forEach( function ( b ) { b.setAttribute( 'aria-selected', b.getAttribute( 'data-pick' ) === i ? 'true' : 'false' ); } );
			$$( '[data-pick-panel]', picker ).forEach( function ( p ) { p.hidden = p.getAttribute( 'data-pick-panel' ) !== i; } );
		};
		$$( '[data-pick]', picker ).forEach( function ( b ) {
			var i = b.getAttribute( 'data-pick' );
			b.addEventListener( 'mouseenter', function () { pick( i ); } );
			b.addEventListener( 'focus', function () { pick( i ); } );
			b.addEventListener( 'click', function ( e ) {
				// On touch screens the first tap previews the exam; the banner button opens it.
				if ( coarse && b.getAttribute( 'aria-selected' ) !== 'true' ) { e.preventDefault(); pick( i ); }
			} );
		} );
	}

	/* ---------- OMET switcher (SNAP / NMAT / XAT / CMAT) ---------- */
	var ometRoot = $( '[data-omet-root]' );
	if ( ometRoot && ometRoot.getAttribute( 'data-omet-root' ) ) {
		var setOmet = function ( key, push ) {
			if ( ! $( '[data-omet="' + key + '"]', ometRoot ) ) { return; }
			$$( '[data-omet]', ometRoot ).forEach( function ( b ) { b.setAttribute( 'aria-selected', b.getAttribute( 'data-omet' ) === key ? 'true' : 'false' ); } );
			$$( '[data-omet-panel]', ometRoot ).forEach( function ( p ) {
				var on = p.getAttribute( 'data-omet-panel' ) === key;
				p.hidden = ! on;
				// Section anchors (#tests, #overview…) always point at the visible exam.
				$$( '[data-sec]', p ).forEach( function ( s ) {
					if ( on ) { s.id = s.getAttribute( 'data-sec' ); } else { s.removeAttribute( 'id' ); }
				} );
			} );
			var btn = $( '[data-omet="' + key + '"]', ometRoot );
			$$( '[data-omet-name]', ometRoot ).forEach( function ( n ) { n.textContent = btn.textContent; } );
			if ( push ) {
				var url = new URL( window.location.href );
				url.searchParams.set( 'exam', key );
				url.hash = '';
				history.replaceState( null, '', url );
			}
		};
		$$( '[data-omet]', ometRoot ).forEach( function ( b ) {
			b.addEventListener( 'click', function () { setOmet( b.getAttribute( 'data-omet' ), true ); } );
		} );
		var fromHash = window.location.hash.replace( '#', '' );
		if ( fromHash && $( '[data-omet="' + fromHash + '"]', ometRoot ) ) { setOmet( fromHash, false ); }
	}

	/* ---------- Sticky section nav: highlight the section in view ---------- */
	var secLinks = $$( '[data-secnav-link]' );
	if ( secLinks.length ) {
		var spy = function () {
			var current = secLinks[ 0 ].getAttribute( 'data-secnav-link' );
			secLinks.forEach( function ( a ) {
				var el = document.getElementById( a.getAttribute( 'data-secnav-link' ) );
				if ( el && el.getBoundingClientRect().top <= HEADER_OFFSET + 10 ) { current = a.getAttribute( 'data-secnav-link' ); }
			} );
			secLinks.forEach( function ( a ) {
				var on = a.getAttribute( 'data-secnav-link' ) === current;
				if ( on && ! a.classList.contains( 'is-active' ) && a.scrollIntoView ) {
					a.parentNode.scrollTo( { left: a.offsetLeft - 24, behavior: 'auto' } );
				}
				a.classList.toggle( 'is-active', on );
			} );
		};
		var ticking = false;
		window.addEventListener( 'scroll', function () {
			if ( ticking ) { return; }
			ticking = true;
			requestAnimationFrame( function () { spy(); ticking = false; } );
		}, { passive: true } );
		spy();
	}

	/* ---------- Free questions ---------- */
	$$( '[data-fq]' ).forEach( function ( fq ) {
		var answered = 0, correct = 0;
		var updateScore = function () {
			$$( '[data-fq-score]', fq ).forEach( function ( s ) { s.textContent = correct + ' / ' + answered + ' correct'; } );
		};
		$$( '[data-fq-q]', fq ).forEach( function ( q ) {
			var right = parseInt( q.getAttribute( 'data-answer' ), 10 );
			$$( '[data-opt]', q ).forEach( function ( o ) {
				o.addEventListener( 'click', function () {
					var picked = parseInt( o.getAttribute( 'data-opt' ), 10 );
					$$( '[data-opt]', q ).forEach( function ( x ) {
						var i = parseInt( x.getAttribute( 'data-opt' ), 10 );
						x.disabled = true;
						if ( i === right ) { x.classList.add( 'is-right' ); } else if ( i === picked ) { x.classList.add( 'is-wrong' ); }
					} );
					var v = $( '[data-fq-verdict]', q );
					var ok = picked === right;
					v.textContent = ok ? 'Correct' : 'Not quite. Correct answer: ' + 'ABCD'.charAt( right );
					v.className = 'de-fq__verdict ' + ( ok ? 'is-right' : 'is-wrong' );
					$( '[data-fq-sol]', q ).hidden = false;
					answered++;
					if ( ok ) { correct++; }
					updateScore();
				} );
			} );
		} );
		$$( '[data-fq-set]', fq ).forEach( function ( set ) {
			var qs = $$( '[data-fq-q]', set ), i = 0;
			var show = function ( n ) { i = n; qs.forEach( function ( q, k ) { q.hidden = k !== n; } ); };
			$( '[data-fq-prev]', set ).addEventListener( 'click', function () { show( Math.max( 0, i - 1 ) ); } );
			var next = $( '[data-fq-next]', set );
			next.addEventListener( 'click', function () {
				if ( i < qs.length - 1 ) { show( i + 1 ); } else { toast( next.getAttribute( 'data-end-toast' ) ); }
			} );
		} );
	} );

	/* ---------- Percentile predictor → college predictor ---------- */
	$$( '[data-predict]' ).forEach( function ( box ) {
		var table = JSON.parse( box.getAttribute( 'data-table' ) );
		var data = JSON.parse( box.getAttribute( 'data-colleges' ) );
		var inputs = $$( '[data-pred-input]', box );
		var cpPct = $( '[data-cp-pct]', box );
		var cpExam = $( '[data-cp-exam]', box );
		var touched = false; // stop syncing once the student types their own percentile
		var toPct = function ( score ) {
			for ( var k = 0; k < table.length - 1; k++ ) {
				var hs = table[ k ][ 0 ], hp = table[ k ][ 1 ], ls = table[ k + 1 ][ 0 ], lp = table[ k + 1 ][ 1 ];
				if ( score >= hs ) { return hp; }
				if ( score >= ls ) { return lp + ( ( score - ls ) / ( hs - ls ) ) * ( hp - lp ); }
			}
			return table[ table.length - 1 ][ 1 ];
		};
		var fill = function ( ul, list ) {
			ul.innerHTML = '';
			if ( ! list.length ) { var e = document.createElement( 'li' ); e.className = 'is-empty'; e.textContent = '—'; ul.appendChild( e ); }
			list.forEach( function ( c ) {
				var li = document.createElement( 'li' );
				var n = document.createElement( 'span' ); n.textContent = c[ 0 ];
				var v = document.createElement( 'span' ); v.className = 'de-cp__cut'; v.textContent = c[ 3 ].toFixed( c[ 3 ] % 1 ? 1 : 0 ) + '+';
				li.appendChild( n ); li.appendChild( v ); ul.appendChild( li );
			} );
		};
		var colleges = function () {
			var exam = cpExam.value;
			var pct = Math.min( 100, Math.max( 0, parseFloat( cpPct.value ) || 0 ) );
			var relax = data.relax[ $( '[data-cp-cat]', box ).value ] || 0;
			var acad = $$( '[data-cp-acad]', box ).map( function ( el ) { return parseFloat( el.value ) || 0; } );
			var avg = acad.reduce( function ( a, b ) { return a + b; }, 0 ) / acad.length;
			var wx = parseFloat( $( '[data-cp-wx]', box ).value ) || 0;
			// Profile adjustment for colleges that weigh academics and work experience (IIMs, SPJIMR, MDI…).
			var prof = ( avg >= 90 ? 0.4 : avg >= 80 ? 0 : avg >= 70 ? -0.6 : -1.2 ) + ( wx >= 12 && wx <= 36 ? 0.3 : wx > 36 ? 0.1 : 0 );
			var good = [], mid = [], reach = [];
			( data[ exam ] || [] ).forEach( function ( c ) {
				var cut = Math.max( 50, c[ 1 ] - relax );
				var diff = pct + ( c[ 2 ] ? prof : 0 ) - cut;
				var row = [ c[ 0 ], c[ 1 ], c[ 2 ], cut ];
				if ( diff >= 0.5 ) { good.push( row ); } else if ( diff >= -0.8 ) { mid.push( row ); } else { reach.push( row ); }
			} );
			fill( $( '[data-cp-good]', box ), good.slice( 0, 6 ) );
			fill( $( '[data-cp-mid]', box ), mid.slice( 0, 5 ) );
			fill( $( '[data-cp-reach]', box ), reach.slice( -3 ).reverse() );
		};
		var calc = function () {
			var score = inputs.reduce( function ( s, el ) { return s + ( parseFloat( el.value ) || 0 ); }, 0 );
			var pct = toPct( score );
			$( '[data-pred-score]', box ).textContent = String( Math.round( score * 100 ) / 100 );
			$( '[data-pred-pct]', box ).textContent = pct.toFixed( 1 );
			if ( ! touched && cpExam.value === 'cat' ) { cpPct.value = pct.toFixed( 1 ); }
			colleges();
		};
		inputs.forEach( function ( el ) { el.addEventListener( 'input', calc ); } );
		cpPct.addEventListener( 'input', function () { touched = true; } );
		$$( 'input, select', $( '[data-cp]', box ) ).forEach( function ( el ) { el.addEventListener( 'input', colleges ); el.addEventListener( 'change', colleges ); } );
		calc();
	} );

	/* ---------- Coaching enquiry form ---------- */
	var lead = $( '[data-lead-dialog]' );
	if ( lead ) {
		var lform = $( '[data-lead-form]', lead );
		var openLead = function ( interest ) {
			if ( interest ) { $( '[data-lead-interest]', lead ).value = interest; }
			$( '[data-lead-page]', lead ).value = window.location.href.split( '#' )[ 0 ];
			if ( lead.showModal ) { if ( ! lead.open ) { lead.showModal(); } } else { lead.setAttribute( 'open', '' ); }
			var first = $( 'input[name="name"]', lead );
			if ( first ) { first.focus(); }
		};
		var closeLead = function () { if ( lead.close ) { lead.close(); } else { lead.removeAttribute( 'open' ); } };
		document.addEventListener( 'click', function ( e ) {
			var b = e.target.closest( '[data-lead]' );
			if ( b ) { e.preventDefault(); openLead( b.getAttribute( 'data-lead' ) ); }
		} );
		$( '[data-lead-close]', lead ).addEventListener( 'click', closeLead );
		lead.addEventListener( 'click', function ( e ) { if ( e.target === lead ) { closeLead(); } } );
		if ( lead.hasAttribute( 'data-open' ) || window.location.hash === '#enquire' ) { openLead( '' ); }
		lform.addEventListener( 'submit', function ( e ) {
			if ( ! window.fetch || ! window.FormData ) { return; } // plain POST fallback
			e.preventDefault();
			var err = $( '[data-lead-err]', lead ), ok = $( '[data-lead-ok]', lead ), btn = $( '[data-lead-submit]', lead );
			err.hidden = true;
			var body = {};
			new FormData( lform ).forEach( function ( v, k ) { body[ k ] = v; } );
			var qs = new URLSearchParams( window.location.search );
			[ 'utm_source', 'utm_medium', 'utm_campaign' ].forEach( function ( k ) { if ( qs.get( k ) ) { body[ k ] = qs.get( k ); } } );
			btn.disabled = true;
			btn.textContent = 'Sending…';
			fetch( CFG.leadUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify( body ) } )
				.then( function ( r ) { return r.json().then( function ( d ) { return { ok: r.ok, d: d }; } ); } )
				.then( function ( res ) {
					if ( ! res.ok ) { throw new Error( ( res.d && res.d.message ) || 'Please check the form and try again.' ); }
					ok.hidden = false;
					btn.hidden = true;
					$$( '.de-enq__grid', lead ).forEach( function ( g ) { g.hidden = true; } );
				} )
				.catch( function ( x ) { err.textContent = x.message || 'Could not send. Please WhatsApp us instead.'; err.hidden = false; } )
				.then( function () { btn.disabled = false; btn.textContent = 'Send enquiry'; } );
		} );
	}

	/* ---------- Reviews filter ---------- */
	var rv = $( '[data-reviews]' );
	if ( rv ) {
		var showAll = $( '[data-rv-all]', rv );
		$$( '[data-rv-filter]', rv ).forEach( function ( b ) {
			b.addEventListener( 'click', function () {
				var k = b.getAttribute( 'data-rv-filter' );
				$$( '[data-rv-filter]', rv ).forEach( function ( x ) { x.setAttribute( 'aria-pressed', x === b ? 'true' : 'false' ); } );
				$$( '[data-rv]', rv ).forEach( function ( c ) { c.hidden = k ? c.getAttribute( 'data-rv' ) !== k : c.hasAttribute( 'data-rv-more' ) && !! showAll; } );
			} );
		} );
		if ( showAll ) {
			showAll.addEventListener( 'click', function () {
				$$( '[data-rv-more]', rv ).forEach( function ( c ) { c.hidden = false; c.removeAttribute( 'data-rv-more' ); } );
				showAll.remove();
				showAll = null;
			} );
		}
	}

	/* ---------- Guru preview chat ---------- */
	var guru = $( '[data-guru]' );
	if ( guru ) {
		var log = $( '[data-guru-log]', guru );
		var form = $( '[data-guru-form]', guru );
		var input = form.querySelector( 'input' );
		var send = form.querySelector( 'button' );
		var left = $( '[data-guru-left]', guru );
		var busy = false, done = false;
		var add = function ( text, cls ) {
			var m = document.createElement( 'div' );
			m.className = 'de-chat__msg' + ( cls ? ' ' + cls : '' );
			m.textContent = text;
			log.appendChild( m );
			log.scrollTop = log.scrollHeight;
			return m;
		};
		var finish = function () {
			done = true;
			var a = document.createElement( 'a' );
			a.className = 'de-chat__cta';
			a.href = guru.getAttribute( 'data-signup' );
			a.textContent = 'Create free DE Educare ID →';
			log.appendChild( a );
			log.scrollTop = log.scrollHeight;
		};
		var ask = function ( q ) {
			q = ( q || '' ).trim();
			if ( ! q || busy ) { return; }
			add( q, 'de-chat__msg--me' );
			input.value = '';
			if ( done ) { add( 'That’s the end of the preview. Create a free DE Educare ID for 10 Guru questions a day.' ); return; }
			busy = true;
			send.disabled = true;
			var thinking = add( 'Guru is thinking…', 'de-chat__msg--thinking' );
			fetch( CFG.guruUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify( { q: q } ) } )
				.then( function ( r ) { return r.ok ? r.json() : Promise.reject( r ); } )
				.then( function ( data ) {
					thinking.remove();
					add( data.answer || CFG.fallback );
					if ( typeof data.left === 'number' ) { left.textContent = data.left + ' FREE PREVIEW QUESTION' + ( data.left === 1 ? '' : 'S' ); }
					if ( data.done || data.left === 0 ) { finish(); }
				} )
				.catch( function () { thinking.remove(); add( CFG.fallback ); } )
				.then( function () { busy = false; send.disabled = false; } );
		};
		form.addEventListener( 'submit', function ( e ) { e.preventDefault(); ask( input.value ); } );
		$$( '[data-guru-ask]', guru ).forEach( function ( b ) { b.addEventListener( 'click', function () { ask( b.getAttribute( 'data-guru-ask' ) ); } ); } );
	}

	/* ---------- Shared login: show "Hi Akash · Dashboard" when signed in on the portal ---------- */
	// The portal's de_session cookie is shared across *.deeducare.com; the portal answers with a first name only.
	if ( CFG.portal && window.fetch ) {
		fetch( CFG.portal + '/api/public/me', { credentials: 'include' } )
			.then( function ( r ) { return r.ok ? r.json() : null; } )
			.then( function ( me ) {
				if ( ! me || ! me.signedIn ) { return; }
				$$( '[data-de-auth="signin"]' ).forEach( function ( a ) {
					a.textContent = 'Hi ' + me.firstName;
					a.href = CFG.portal + '/profile';
				} );
				$$( '[data-de-auth="join"]' ).forEach( function ( a ) {
					a.textContent = 'Go to dashboard';
					a.href = CFG.portal + '/';
				} );
			} )
			.catch( function () {} );
	}

	/* ---------- Scroll reveal: fade up 22px over 650ms. Content is never hidden before this runs. ---------- */
	if ( ! reduceMotion && 'IntersectionObserver' in window ) {
		var io = new IntersectionObserver( function ( entries ) {
			entries.forEach( function ( en ) {
				if ( ! en.isIntersecting ) { return; }
				io.unobserve( en.target );
				if ( en.target.animate ) {
					en.target.animate( [ { opacity: 0, transform: 'translateY(22px)' }, { opacity: 1, transform: 'none' } ], { duration: 650, easing: 'cubic-bezier(.2,.7,.2,1)' } );
				}
			} );
		}, { rootMargin: '0px 0px -5% 0px' } );
		var vh = window.innerHeight;
		$$( '[data-reveal]' ).forEach( function ( el ) {
			// Skip what is already on screen at load, so the first view doesn't flash.
			if ( el.getBoundingClientRect().top < vh * 0.95 ) { return; }
			io.observe( el );
		} );
	}
} )();
