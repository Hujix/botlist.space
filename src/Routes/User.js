const express = require('express');
const dateformat = require('dateformat');
const Route = require('../Structure/Route');

class User extends Route {
	constructor(parent) {
		super({
			position: 2,
			route: '/user'
		});

		Object.assign(this, parent);

		this.router = express.Router();
		this.setupRoutes();
	}

	setupRoutes() {
		this.router.get('/user', (req, res) => {
			if (!req.user) return res.cookie('redirect', req.url).redirect('/auth');

			res.redirect('/user/' + req.user.id);
		});

		this.router.get('/:id', this.getUser(), async (req, res) => {
			const user = res.locals.usr;

			user.status = await this.redis.getStatus(user.id);

			let bots = await this.db.getBotsByOwner(user.id);

			if (bots.length > 0) {
				const botStatuses = await this.redis.getStatusMany(bots.map((bot) => bot.id));

				bots = bots.map((bot) => {
					bot.status = botStatuses[bots.indexOf(bot)] || 'unknown';

					return bot;
				});
			}

			if (user.bannedAt) user.bannedAt = dateformat(user.bannedAt, 'mm/dd/yyyy');

			res.render('user/index.pug', {
				title: user.username + '#' + user.discriminator,
				usr: user,
				bots
			});

			// await this.db.pushStatisticsField(bots.map((bot) => bot.id), { impressions: { user: req.user ? req.user.id : null, timestamp: Date.now() } });
		});

		this.router.get('/:id/manage', this.checkAuth(), this.userPermission(), this.getUser(), (req, res) => {
			res.render('user/manage.pug', {
				title: 'Manage'
			});
		});

		this.router.get('/:id/ban', this.checkAuth(), this.userPermission(), this.getUser(), async (req, res) => {
			const user = res.locals.usr;

			user.status = await this.redis.getStatus(user.id);

			if (!req.user.admin) return res.status(403).render('error.pug', { title: '403', code: 403, message: 'You do not have permission to view this page' });
			if (req.user.id === user.id) return res.status(400).render('error.pug', { title: '400', code: 400, message: 'You can\'t ban yourself from the site' });
			if (user.admin) return res.status(400).render('error.pug', { title: '400', code: 400, message: 'You can\'t ban another admin from the site' });

			if (user.banned) {
				await this.db.updateUser(user.id, { banned: false, banReason: null, bannedAt: null });

				this.redis.evalBot('handleUnbannedUser', req.user.only('username', 'discriminator'), user.only('username', 'discriminator'));

				res.redirect('/user/' + user.id);
			} else {
				res.render('user/ban.pug', {
					title: 'Ban',
					usr: user
				});
			}
		});

		this.router.post('/:id/ban', this.checkAuth(), this.userPermission(), this.getUser(), async (req, res) => {
			const user = res.locals.usr;

			if (!req.user.admin) return res.status(403).render('error.pug', { title: '403', code: 403, message: 'You do not have permission to view this page' });
			if (req.user.id === user.id) return res.status(400).render('error.pug', { title: '400', code: 400, message: 'You can\'t ban yourself from the site' });
			if (user.admin) return res.status(400).render('error.pug', { title: '400', code: 400, message: 'You can\'t ban another admin from the site' });
			if (!('reason' in req.body) || req.body.reason.length < 1) return res.status(400).render('error.pug', { title: '400', code: 400, message: 'You must provide a ban reason' });

			await this.db.updateUser(user.id, { banned: true, banReason: req.body.reason, bannedAt: Date.now() });

			this.redis.evalBot('handleBannedUser', req.user.only('username', 'discriminator'), user.only('username', 'discriminator'), req.body.reason);

			res.redirect('/user/' + user.id);
		});

		this.router.get('/:id/edit', this.checkAuth(), this.userPermission(), this.getUser(), (req, res) => {
			res.render('user/edit.pug', {
				title: 'Edit'
			});
		});

		this.router.post('/:id/edit', this.checkAuth(), this.userPermission(), this.getUser(), this.verifyUser(), async (req, res) => {
			const user = res.locals.usr;

			if (!('short_description' in req.body)) return res.status(400).render('error.pug', { title: '400', code: 400, message: 'Missing "short_description" from form body' });
			if (!('website' in req.body)) return res.status(400).render('error.pug', { title: '400', code: 400, message: 'Missing "website" from form body' });

			if (req.body.short_description.length > 240) return res.status(400).render('error.pug', { title: '400', code: 400, message: 'Invalid short description' });
			if (req.body.website.length > 256) return res.status(400).render('error.pug', { title: '400', code: 400, message: 'Invalid website URL' });

			if (req.body.website.length > 0 && !/^http?s:\/\//.test(req.body.website)) return res.status(400).render('error.pug', { title: '400', code: 400, message: 'Website URL must use http or https protocol' });

			await this.db.updateUser(user.id, {
				short_description: req.body.short_description.length > 0 ? req.body.short_description : null,
				website: req.body.website.length > 0 ? req.body.website : null
			});

			res.redirect('/user/' + user.id);
		});

		this.router.get('/:id/settings', this.checkAuth(), this.userPermission(), this.getUser(), (req, res) => {
			res.render('user/settings.pug', {
				title: 'Settings'
			});
		});

		this.router.post('/:id/settings', this.checkAuth(), this.userPermission(), this.getUser(), this.verifySettings(), async (req, res) => {
			const user = res.locals.usr;

			await this.db.updateUser(user.id, {
				style: parseInt(req.body.style),
				custom_css: req.body.custom_css
			});

			res.redirect('/user/' + user.id);
		});
	}

	getUser() {
		return async (req, res, next) => {
			if (req.params.id.length > 25) return res.status(404).render('error.pug', { title: '404', code: 404, message: 'User not found' });

			const result = await this.db.getUser(req.params.id);

			if (!result) return res.status(404).render('error.pug', {
				page: '404',
				code: 404,
				message: 'User not found'
			});

			res.locals.usr = result;
			next();
		};
	}

	checkAuth() {
		return (req, res, next) => {
			if (!req.user) return res.cookie('redirect', req.url).redirect('/auth');

			next();
		};
	}

	userPermission() {
		return (req, res, next) => {
			if (req.params.id !== req.user.id && !req.user.admin) return res.status(403).render('error.pug', { title: '403', code: 403, message: 'You do not have permission to view this page' });

			next();
		};
	}

	verifyUser() {
		return (req, res, next) => {
			if (!('short_description' in req.body)) return res.status(404).render('error.pug', { title: '404', code: 404, message: 'Missing "short_description" from form body' });
			if (req.body.short_description.length > 180) return res.status(404).render('error.pug', { title: '404', code: 404, message: 'Invalid biography' });

			next();
		};
	}

	verifySettings() {
		return (req, res, next) => {
			if (!('style' in req.body)) return res.status(404).render('error.pug', { title: '404', code: 404, message: 'Missing "style" from form body' });
			if (!('custom_css' in req.body)) return res.status(404).render('error.pug', { title: '404', code: 404, message: 'Missing "custom_css" from form body' });
			if (isNaN(req.body.style) || parseInt(req.body.style) < 0 || (!(parseInt(req.body.style) in res.locals.styleMap) && parseInt(req.body.style) !== 0)) return res.status(404).render('error.pug', { title: '404', code: 404, message: 'Invalid style' });
			if (req.body.custom_css.length > 50000) return res.status(404).render('error.pug', { title: '404', code: 404, message: 'Custom CSS can only be 50,000 characters long' });

			next();
		};
	}
}

module.exports = User;