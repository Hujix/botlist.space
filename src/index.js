Object.prototype.only = function (...args) {
	const newObject = {};
	const props = Object.getOwnPropertyNames(this);

	for (let i = 0; i < props.length; i++) {
		if (Object.prototype.hasOwnProperty.call(this, props[i]) && args.includes(props[i])) {
			newObject[props[i]] = this[props[i]];
		}
	}

	return newObject;
};

global.typeCheck = (thing, constructor) => {
	return !!thing && thing.constructor === constructor;
};

const dotenv = require('dotenv');
dotenv.config();

const bluebird = require('bluebird');
bluebird.config({ longStackTraces: true, warnings: { wForgottenReturn: false } });
global.Promise = bluebird;

const Website = require('./Website');
new Website();