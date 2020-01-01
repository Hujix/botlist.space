/* eslint no-console: off */

const chalk = require('chalk');
const dateFormat = require('dateformat');
const util = require('util');

class Logger {
	static get prefix() {
		return chalk.gray(dateFormat(Date.now(), 'ddd HH:MM:ss'));
	}

	static formatInput(args) {
		return args.map((arg) => arg instanceof Object ? util.inspect(arg) : arg);
	}

	static info(...args) {
		args = this.formatInput(args);
		console.log(this.prefix + ' ' + chalk.green('[INFO]') + ' ' + args.join(' '));
	}

	static warn(...args) {
		args = this.formatInput(args);
		console.warn(this.prefix + ' ' + chalk.yellow('[WARN]') + ' ' + args.join(' '));
	}

	static error(...args) {
		args = this.formatInput(args);
		console.error(this.prefix + ' ' + chalk.red('[ERROR]') + ' ' + args.join(' '));
	}
}

module.exports = Logger;