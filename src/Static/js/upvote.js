(function () {
	var upvoteButton = document.querySelector('#upvote');
	var successAlert = document.querySelector('#success-alert');
	var alreadyVotedAlert = document.querySelector('#already-voted-alert');

	upvoteButton.addEventListener('click', function () {
		var request = new XMLHttpRequest();
		request.addEventListener('load', function () {
			if (this.status === 200) {
				upvoteButton.setAttribute('disabled', 'true');
				upvoteButton.classList.add('disabled');
				successAlert.classList.remove('d-none');
				setTimeout(function () {
					successAlert.classList.add('d-none');
				}, 3000);
			} else if (this.status === 400) {
				try {
					var data = JSON.parse(this.response);
					alreadyVotedAlert.innerText = data.error.message;
					alreadyVotedAlert.classList.remove('d-none');
					setTimeout(function () {
						alreadyVotedAlert.classList.add('d-none');
					}, 3000);
				} catch (e) {
					console.warn(e);
				}
			} else {
				alert('Failed to upvote bot.');
			}
		});
		request.open('POST', window.location.href);
		request.send();
	});
})();