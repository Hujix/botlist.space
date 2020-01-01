(function () {
	var quickReason = document.querySelector('#quick-reason');
	var reasonInput = document.querySelector('#reason');

	quickReason.addEventListener('change', function () {
		var selected = quickReason.options[quickReason.selectedIndex];

		if (selected.hasAttribute('data-other')) {
			reasonInput.value = '';
			reasonInput.setAttribute('style', 'margin-top: 15px;');
		} else {
			reasonInput.value = selected.innerText;
			reasonInput.setAttribute('style', 'visibility: hidden; height: 0; margin: 0;');
		}
	});
})();