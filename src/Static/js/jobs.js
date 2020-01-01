/* global humanizeDuration */

(function () {
	document.querySelectorAll('[data-countdown]').forEach(function (element) {
		var end = element.getAttribute('data-countdown');

		var update = function () {
			var remaining = parseInt(end) - Date.now();

			element.innerText = humanizeDuration(remaining, { round: true });

			if (remaining > 0) {
				setTimeout(update, Date.now() % 1000);
			} else {
				element.innerText = 'Running...';
			}
		};

		update();
	});
})();