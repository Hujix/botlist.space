/* global CodeMirror */

(function () {
	var theme = parseInt(document.body.getAttribute('data-theme'));

	CodeMirror.fromTextArea(document.querySelector('textarea'), {
		lineNumbers: true,
		mode: 'css',
		theme: theme === 1 || theme === 2 ? 'darcula' : 'default'
	});
})();