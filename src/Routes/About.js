const express = require('express');
const Route = require('../Structure/Route');
const config = require('../config');

class About extends Route {
	constructor(parent) {
		super({
			position: 2,
			route: '/'
		});

		Object.assign(this, parent);

		this.router = express.Router();
		this.setupRoutes();
	}

	setupRoutes() {
		this.router.get('/about', async (req, res) => {
			let team = await this.db.getAdminUsers();

			const statuses = await this.redis.getStatusMany(team.map((user) => user.id));

			team = team.map((user) => {
				user.status = statuses[team.indexOf(user)] || 'unknown';

				return user;
			});

			res.render('about.pug', {
				title: 'About',
				footerPage: 0,
				team
			});
		});

		this.router.get('/terms', (req, res) => {
			res.render('terms.pug', {
				title: 'Terms of Service',
				footerPage: 2
			});
		});

		this.router.get('/privacy', (req, res) => {
			res.render('privacy.pug', {
				title: 'Privacy Policy',
				footerPage: 3
			});
		});

		this.router.get('/server', (req, res) => {
			res.redirect(config.discord.server);
		});
	}
}

module.exports = About;