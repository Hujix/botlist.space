const snekfetch = require('snekfetch');
const path = require('path');
const fs = require('fs').promises;

module.exports = (user) => {
	if (!user.background || user.background.length < 1 || !/^https?:\/\//.test(user.background)) return Promise.resolve();

	return snekfetch
		.get(user.background)
		.then((result) => {
			return fs.writeFile(path.join(__dirname, '..', 'Assets', 'Backgrounds', user.id + '.png'), result.body);
		});
};