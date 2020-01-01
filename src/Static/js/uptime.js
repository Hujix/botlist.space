(function () {
	var minutes = document.querySelector('#minutes');
	var hours = document.querySelector('#hours');
	var days = document.querySelector('#days');
	var result = document.querySelector('#result');
	var overLimit = document.querySelector('#overLimit');
	var uptimeData = null;
	var botData = null;
	var botCount = null;

	function check() {
		var request = new XMLHttpRequest();
		request.addEventListener('load', function () {
			if (this.status === 200) {
				try {
					uptimeData = JSON.parse(this.response);
				} catch (e) {
					alert('Failed to retrieve status');
					console.warn(e);
				}
			} else {
				alert('Failed to retrieve status');
				console.warn(this);
			}
		});
		request.open('GET', 'https://api.botlist.space/v1/bots/' + window.location.pathname.split('/')[2] + '/uptime');
		request.send();

		var request2 = new XMLHttpRequest();
		request2.addEventListener('load', function () {
			if (this.status === 200) {
				try {
					botData = JSON.parse(this.response);
				} catch (e) {
					alert('Failed to retrieve status');
					console.warn(e);
				}
			} else {
				alert('Failed to retrieve status');
				console.warn(this);
			}
		});
		request2.open('GET', 'https://api.botlist.space/v1/bots/' + window.location.pathname.split('/')[2]);
		request2.send();

		var request3 = new XMLHttpRequest();
		request3.addEventListener('load', function () {
			if (this.status === 200) {
				try {
					botCount = JSON.parse(this.response).total_bots;
				} catch (e) {
					alert('Failed to retrieve status');
					console.warn(e);
				}
			} else {
				alert('Failed to retrieve status');
				console.warn(this);
			}
		});
		request3.open('GET', 'https://api.botlist.space/v1/statistics');
		request3.send();
	}

	function update() {
		if (!uptimeData || !botData || !botCount) return result.innerText = 'Loading uptime data...';

		var minutesDuration = parseInt(minutes.value || 0) * 60;
		var hoursDuration = parseInt(hours.value || 0) * 60 * 60;
		var daysDuration = parseInt(days.value || 0) * 60 * 60 * 24;

		var onlineChecks = uptimeData.online_checks;
		var totalChecks = uptimeData.total_checks;

		var startOfNextMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1).getTime();
		var checksInterval = botCount / 5;
		var checksPerSecond = checksInterval / 3600;

		var remainingMonthDuration = (startOfNextMonth - Date.now()) / 1000;
		var remainingMonthChecks = checksPerSecond * remainingMonthDuration;

		var newOnlineChecksBeforeOffline = onlineChecks + remainingMonthChecks;
		var newTotalChecks = totalChecks + remainingMonthChecks;

		var totalDuration = minutesDuration + hoursDuration + daysDuration;

		if (totalDuration > (startOfNextMonth - Date.now()) / 1000) {
			overLimit.classList.remove('d-none');
		} else {
			overLimit.classList.add('d-none');
		}

		totalDuration = Math.min(totalDuration, (startOfNextMonth - Date.now()) / 1000);

		var offlineChecks = checksPerSecond * totalDuration;

		var newOnlineChecks = newOnlineChecksBeforeOffline - offlineChecks;

		result.innerText = 'Your bot\'s uptime will be ' + ((newOnlineChecks / newTotalChecks) * 100).toFixed(1) + '% at the end of the month if you continued a constant uptime after this duration.';
	}

	check();

	setInterval(check, 1000 * 30);
	setInterval(update, 250);
})();