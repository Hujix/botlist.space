/* global CodeMirror, markdownit */

(function () {
	var requestSuccessAlert = document.querySelector('#req-success');
	var requestFailedAlert = document.querySelector('#req-failed');
	var descriptionValidation = document.querySelector('.description .validation');
	var form = document.querySelector('form.form');
	var tags = document.querySelector('#tags');
	var expandCardPreviewButton = document.querySelector('#card-preview');
	var cardPreviewContainer = document.querySelector('#card-preview-container');
	var backgroundField = document.querySelector('#background');
	var shortDescriptionField = document.querySelector('#shortDescription');
	var theme = parseInt(document.body.getAttribute('data-theme'));
	var submitted = false;

	var renderer = markdownit({
		html: Boolean(document.querySelector('#vanity'))
	});

	// Initialize CodeMirror for the full description
	var code = CodeMirror.fromTextArea(document.querySelector('textarea'), {
		lineNumbers: true,
		mode: 'markdown',
		theme: theme === 1 || theme === 2 ? 'darcula' : 'default'
	});

	// It's very hard to use an event listener for changes in CodeMirror, use a loop instead \o/
	setInterval(function () {
		var value = code.getValue();

		document.querySelector('.preview-desc').innerHTML = renderer.render(value);

		if (value.length > 15000) {
			descriptionValidation.classList.add('invalid');
		} else {
			descriptionValidation.classList.remove('invalid');
		}

		descriptionValidation.innerText = value.length + '/15000';
	}, 500);

	document.querySelector('#send-webhook').addEventListener('click', function () {
		var request = new XMLHttpRequest();
		request.addEventListener('load', function () {
			if (this.status === 200) {
				requestSuccessAlert.classList.remove('d-none');
				setTimeout(function () {
					requestSuccessAlert.classList.add('d-none');
				}, 3000);
			} else {
				requestFailedAlert.classList.remove('d-none');
				requestFailedAlert.innerText = 'Failed to send POST request: ' + (JSON.parse(this.response).error || JSON.parse(this.response).message);
				setTimeout(function () {
					requestFailedAlert.classList.add('d-none');
				}, 3000);
			}
		});
		request.open('POST', 'https://api.botlist.space/v1/internal/test-webhook?id=' + encodeURIComponent(document.querySelector('#id').value) + '&url=' + encodeURIComponent(document.querySelector('#webhook').value));
		request.send();
	});

	document.querySelectorAll('input.validate').forEach(function (input) {
		var validation = input.parentElement.querySelector('.validation');

		if (!validation) {
			validation = input.parentElement.parentElement.querySelector('.validation');
		}

		function update() {
			var validationResult = input.value.length + '/';
			var isInvalid = false;

			if (input.hasAttribute('data-min')) {
				var minimum = parseInt(input.getAttribute('data-min'));

				if (input.value.length < minimum) {
					isInvalid = true;
				}

				validationResult += minimum + '-';
			}

			if (input.hasAttribute('data-max')) {
				var maximum = parseInt(input.getAttribute('data-max'));

				if (input.value.length > maximum) {
					isInvalid = true;
				}

				validationResult += maximum;
			}

			if (isInvalid) {
				validation.classList.add('invalid');
			} else {
				validation.classList.remove('invalid');
			}

			validation.innerText = validationResult;
		}

		input.addEventListener('input', update);

		input.addEventListener('focus', function () {
			validation.classList.remove('invisible');
		});

		input.addEventListener('focusout', function () {
			validation.classList.add('invisible');
		});

		update();
	});

	form.addEventListener('submit', function () {
		submitted = true;
	});

	window.addEventListener('beforeunload', function (event) {
		if (submitted) {
			submitted = false;
			return;
		}

		var changes = false;

		document.querySelectorAll('input[type="text"]').forEach(function (input) {
			if (!changes) {
				changes = input.value !== (input.getAttribute('value') || '');
			}
		});

		document.querySelectorAll('select').forEach(function (select) {
			for (var i = 0; i < select.children.length; i++) {
				var child = select.children[i];

				if (!changes) {
					changes = child.hasAttribute('selected') && !child.selected;
				}
			}
		});

		if (!changes) {
			changes = code.getValue() !== document.querySelector('#fullDescription').innerText;
		}

		if (changes) {
			var confirmationMessage = 'You have unsaved changes, are you sure you want to leave?';

			(event || window.event).returnValue = confirmationMessage;

			return confirmationMessage;
		}
	});

	if (expandCardPreviewButton && backgroundField) {
		expandCardPreviewButton.addEventListener('click', function () {
			if (parseInt(cardPreviewContainer.style.height) < 1) {
				cardPreviewContainer.setAttribute('style', 'margin-top: 1rem;');
				expandCardPreviewButton.innerText = 'Collapse Preview';
			} else {
				cardPreviewContainer.setAttribute('style', 'height: 0; overflow: hidden; margin-top: 0;');
				expandCardPreviewButton.innerText = 'Expand Preview';
			}
		});

		backgroundField.addEventListener('input', function () {
			cardPreviewContainer.querySelector('.card').setAttribute('style', 'background-image: url("' + backgroundField.value + '");');
			cardPreviewContainer.querySelector('.card').classList[backgroundField.value.length > 0 ? 'add' : 'remove']('background');
		});

		shortDescriptionField.addEventListener('input', function () {
			cardPreviewContainer.querySelector('p.description').innerText = shortDescriptionField.value;
		});
	}

	tags.setAttribute('style', 'height: ' + (tags.scrollHeight + 2) + 'px;');
})();