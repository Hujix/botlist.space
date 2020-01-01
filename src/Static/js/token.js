(function () {
	var spoiler = document.querySelector('.code-spoiler');
	var token = document.querySelector('.code-spoiler .code');
	var copyToken = document.querySelector('#copy');

	function selectText(node) {
		var range;

		if (document.body.createTextRange) {
			range = document.body.createTextRange();
			range.moveToElementText(node);
			range.select();
		} else if (window.getSelection) {
			var selection = window.getSelection();
			range = document.createRange();
			range.selectNodeContents(node);
			selection.removeAllRanges();
			selection.addRange(range);
		} else {
			console.warn('Could not select text in node: Unsupported browser.');
		}
	}

	copyToken.addEventListener('click', function () {
		spoiler.classList.add('show');
		selectText(token);
		document.execCommand('copy');
		spoiler.classList.remove('show');
	});
})();