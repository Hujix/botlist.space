(function () {
	var preview = document.querySelector('#preview');
	var loading = document.querySelector('#loading');
	var url = document.querySelector('#url');
	var customHex = document.querySelector('#custom');
	var property = document.querySelector('#property');
	var style = document.querySelector('#style');
	var color = document.querySelector('#color');

	function update() {
		var propertyName = property.options[property.selectedIndex].innerText;
		var styleName = style.options[style.selectedIndex].innerText;
		var colorName = color.options[color.selectedIndex].innerText;

		if (color.options[color.selectedIndex].hasAttribute('data-custom')) {
			colorName = customHex.value;
			customHex.removeAttribute('style');
		} else {
			customHex.setAttribute('style', 'display: none;');
		}

		preview.setAttribute('src', window.location.pathname.substr(0, window.location.pathname.length - 1) + '?property=' + propertyName + '&style=' + styleName + '&color=' + colorName);

		loading.removeAttribute('style');
		preview.setAttribute('style', 'display: none;');
		url.parentElement.setAttribute('style', 'display: none;');

		var eventListener = preview.addEventListener('load', function () {
			loading.setAttribute('style', 'display: none;');
			preview.removeAttribute('style');
			url.parentElement.removeAttribute('style');
			url.innerText = 'https://botlist.space' + window.location.pathname.substr(0, window.location.pathname.length - 1) + '?property=' + propertyName + '&style=' + styleName + '&color=' + colorName;

			preview.removeEventListener('load', eventListener);
		});
	}


	property.setAttribute('style', 'height: ' + (property.scrollHeight + 2) + 'px; overflow: hidden;');
	style.setAttribute('style', 'height: ' + (style.scrollHeight + 2) + 'px; overflow: hidden;');
	color.setAttribute('style', 'height: ' + (color.scrollHeight + 2) + 'px; overflow: hidden;');

	property.addEventListener('change', update);
	style.addEventListener('change', update);
	color.addEventListener('change', update);
	customHex.addEventListener('input', update);
})();