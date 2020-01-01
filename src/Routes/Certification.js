const express = require('express');
const Route = require('../Structure/Route');

class Certification extends Route {
	constructor(parent) {
		super({
			position: 2,
			route: '/certification'
		});

		Object.assign(this, parent);

		this.router = express.Router();
		this.setupRoutes();
	}

	setupRoutes() {
		this.router.get('/', (req, res) => {
			res.render('certification/index.pug', {
				title: 'Certification',
				footerPage: 1
			});
		});

		this.router.get('/apply', async (req, res) => {
			if (!req.user) return res.cookie('redirect', req.url).redirect('/auth');

			const bots = await this.db.getBotsByOwner(req.user.id);

			res.render('certification/apply.pug', {
				title: 'Apply for Certification',
				footerPage: 1,
				bots
			});
		});

		this.router.post('/apply', async (req, res) => {
			if (!req.user) return res.cookie('redirect', req.url).redirect('/auth');

			if (!('bot' in req.body)) return res.status(400).render('error.pug', { title: '400', code: 400, message: 'Missing "bot" from form body' });
			if (!('purpose' in req.body)) return res.status(400).render('error.pug', { title: '400', code: 400, message: 'Missing "purpose" from form body' });
			if (!('unique' in req.body)) return res.status(400).render('error.pug', { title: '400', code: 400, message: 'Missing "unique" from form body' });
			if (!('website' in req.body)) return res.status(400).render('error.pug', { title: '400', code: 400, message: 'Missing "website" from form body' });

			if (req.body.bot === '' || req.body.purpose === '' || req.body.unique === '' || req.body.website === '') return res.status(400).render('error.pug', { title: '400', code: 400, message: 'Some field is blank' });

			const bot = await this.db.getBot(req.body.bot);

			if (!bot) return res.status(404).render('error.pug', { title: '404', code: 404, message: 'Bot does not exist' });

			if (!bot.owners.includes(req.user.id)) return res.status(403).render('error.pug', { title: '403', code: 403, message: 'You do not own that bot' });

			const certification = await this.db.getCertificationApplication(bot.id);

			if (certification) return res.status(409).render('error.pug', { title: '409', code: 409, message: 'This bot has already been applied for certification' });

			await this.db.insertCertificationApplication({
				id: bot.id,
				purpose: req.body.purpose,
				unique: req.body.unique,
				website: req.body.website,
				timestamp: Date.now()
			});

			this.redis.evalBot('handleCertificationApplication', req.user.only('username', 'discriminator'), bot.only('username', 'discriminator'));

			res.render('certification/thankyou.pug', {
				title: 'Thank You',
				footerPage: 1
			});
		});
	}
}

module.exports = Certification;