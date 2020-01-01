(function () {
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

	document.querySelectorAll('.copy').forEach(function (copyElem) {
		copyElem.addEventListener('click', function () {
			selectText(copyElem.parentElement.querySelector('pre code'));
			document.execCommand('copy');
		});
	});
})();