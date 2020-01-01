const Logger = require('./Logger');

module.exports = (error, res) => {
	Logger.error(error);
	res.status(500).render('error.pug', { title: '500', code: 500, message: 'An internal error occurred, please try again later' });
};