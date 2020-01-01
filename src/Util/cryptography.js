const crypto = require('crypto');
const config = require('../config');

const hash = crypto.createHash('md5').update(config.authSecret, 'utf-8').digest('hex').toUpperCase();
const iv = new Buffer.alloc(16);

module.exports.encrypt = (text) => {
	return new Promise((resolve, reject) => {
		try {
			let cipher = crypto.createCipheriv('aes-256-cbc', hash, iv);
			resolve(cipher.update(text, 'utf8', 'hex') + cipher.final('hex'));
		} catch (e) {
			reject(e);
		}
	});
};

module.exports.decrypt = (text) => {
	return new Promise((resolve, reject) => {
		try {
			let cipher = crypto.createDecipheriv('aes-256-cbc', hash, iv);
			resolve(cipher.update(text, 'hex', 'utf8') + cipher.final('utf8'));
		} catch (e) {
			reject(e);
		}
	});
};