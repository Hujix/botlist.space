(function () {
	var background = document.querySelector('img.background');
	var jumbotron = document.querySelector('.jumbotron');
	var navbarToggler = document.querySelector('.navbar-toggler');
	var navbarCollapse = document.querySelector('.navbar-collapse');

	if ('serviceWorker' in navigator) {
		window.addEventListener('load', function () {
			navigator.serviceWorker.getRegistrations().then(function (registrations) {
				registrations.forEach(function (registration) {
					registration.unregister();
				});
			})
		});
	}

	var lazy = Array.from(document.body.querySelectorAll('img.lazy[data-src]'));

	if ('scrollRestoration' in history) {
		history.scrollRestoration = 'manual';
	}

	function onResize() {
		if (background && jumbotron) {
			var jumbotronBounds = jumbotron.getClientRects()[0];
			var backgroundBounds = background.getClientRects()[0];

			if (jumbotronBounds && backgroundBounds) {
				var top = Math.min(jumbotronBounds.bottom + window.scrollY - backgroundBounds.height * 0.6 - Math.max(window.innerWidth - 1300, 1) / 5, 0);

				background.setAttribute('style', 'top: ' + top + 'px;');
			}
		}
	}

	function onScroll() {
		var bottom = window.scrollY + window.innerHeight;

		for (var i = 0; i < lazy.length; i++) {
			var bounds = lazy[i].getClientRects();

			if (bounds.length > 0 && bottom > bounds[0].top) {
				lazy[i].setAttribute('src', lazy[i].getAttribute('data-src'));
				lazy[i].removeAttribute('data-src');
				lazy[i].classList.remove('lazy');

				lazy.splice(i, 1);

				i--;
			}
		}
	}

	function onKeyDown(event) {
		if (event.keyCode === 192 && event.ctrlKey) {
			window.location.href = '/game';
		}
	}

	function onNavbarTogglerClick() {
		if (navbarCollapse.classList.contains('collapsing')) {
			onResize();

			requestAnimationFrame(onNavbarTogglerClick);
		}
	}

	window.addEventListener('scroll', onScroll);
	window.addEventListener('resize', onResize);
	window.addEventListener('orientationchange', onResize);
	document.addEventListener('DOMContentLoaded', onScroll);
	document.addEventListener('DOMContentLoaded', onResize);
	document.addEventListener('load', onScroll);
	document.addEventListener('keydown', onKeyDown);
	navbarToggler.addEventListener('touchstart', onNavbarTogglerClick, { passive: true });
	navbarToggler.addEventListener('click', onNavbarTogglerClick);

	setInterval(onScroll, 500);
	setInterval(onResize, 500);

	onResize();
})();