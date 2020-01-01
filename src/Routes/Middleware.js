const express = require('express');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const snekfetch = require('snekfetch');
const compression = require('compression');
const Route = require('../Structure/Route');
const config = require('../config');
const cryptography = require('../Util/cryptography');

class AuthenticationRoute extends Route {
	constructor(parent) {
		super({
			position: 1,
			route: '/'
		});

		Object.assign(this, parent);

		this.router = express.Router();
		this.setupRoutes();
	}

	setupRoutes() {
		this.router.use((req, res, next) => {
			res.locals.start = Date.now();

			next();
		});
		this.router.use(cookieParser(config.discord.clientSecret));
		this.router.use(bodyParser.urlencoded({ extended: true }));
		this.router.use(compression());

		this.router.use((req, res, next) => {
			res.set('Cache-Control', [
				'no-cache',
				'no-store',
				'must-revalidate'
			]);

			res.set('Strict-Transport-Security', [
				'max-age=31536000',
				'includeSubDomains'
			]);

			if (!['/auth', '/avatar', '/background'].some((path) => req.url.startsWith(path))) res.cookie('url', req.url, { maxAge: 1000 * 60 * 60 * 24 });

			res.clearCookie('postLoginNotifications').clearCookie('redirect');

			req.user = null;
			res.locals.user = null;
			res.locals.avatarURL = (user) => user && user.avatar ? 'https://cdn.discordapp.com/avatars/' + user.id + '/' + user.avatar + '.' + (user.avatar && user.avatar.startsWith('a_') ? 'gif' : 'png') + '?size=256' : 'https://cdn.discordapp.com/embed/avatars/0.png?size=256';
			res.locals.onerror = 'this.onerror = null; this.src = "https://cdn.discordapp.com/embed/avatars/0.png?size=256";';
			res.locals.styleMap = {
				1: { file: 'dark', name: 'Dark', requires: [] },
				2: { file: 'ultra-dark', name: 'Ultra Dark', requires: [1] }
			};

			if (!this.db.ready) return res.render('error.pug', { title: '503', code: 503, message: 'The database is not ready yet, try again later' });

			if (!('session' in req.cookies)) return next();

			cryptography
				.decrypt(req.cookies.session)
				.then(async (sessionToken) => {
					const result = await this.db.getUserSession(sessionToken);

					if (result) {
						req.user = result;
						res.locals.user = result;
					} else {
						res.clearCookie('session');
					}

					next();
				})
				.catch(() => {
					res.clearCookie('session');

					next();
				});
		});

		this.router.get('/auth', (req, res) => {
			res.cookie('redirect', req.get('Referer') || '/').redirect(302, 'https://discordapp.com/api/oauth2/authorize?client_id=' + config.discord.clientID + '&redirect_uri=' + req.protocol + '%3A%2F%2F' + req.get('Host') + '%2Fauth%2Fcallback&response_type=code&scope=' + config.discord.scope.join('%20') + '&prompt=none');
		});

		this.router.use('/auth/callback', async (req, res) => {
			if (!('code' in req.query)) return res.status(400).render('error.pug', { title: '400', code: 400, message: 'Missing authentication code' });

			const auth = await snekfetch
				.post('https://discordapp.com/api/oauth2/token')
				.set('Content-Type', 'application/x-www-form-urlencoded')
				.send({
					client_id: config.discord.clientID,
					client_secret: config.discord.clientSecret,
					grant_type: 'authorization_code',
					code: req.query.code,
					redirect_uri: req.protocol + '://' + req.get('Host') + '/auth/callback',
					scope: config.discord.scope.join(' ')
				});

			const authUser = await snekfetch
				.get('https://discordapp.com/api/users/@me').set('Authorization', 'Bearer ' + auth.body.access_token)
				.then(resp => resp.body);

			const sessionToken = crypto.randomBytes(256).toString('hex');

			const result = await this.db.getUser(authUser.id);

			if (result) {
				await this.db.updateUser(authUser.id, {
					username: authUser.username,
					discriminator: authUser.discriminator,
					avatar: authUser.avatar,
					session: sessionToken
				});

				const session = await cryptography.encrypt(sessionToken);

				res.cookie('session', session, { maxAge: 1000 * 60 * 60 * 24 * 7, httpOnly: true }).redirect(req.cookies.url || '/');
			} else {
				await this.db.insertUser({
					id: authUser.id,
					username: authUser.username,
					discriminator: authUser.discriminator,
					avatar: authUser.avatar,
					short_description: '',
					style: 0,
					custom_css: '',
					session: sessionToken,
					admin: false,
					developer: false,
					certification: false,
					website: null,
					donator: false,
					donationTier: 0
				});

				const session = await cryptography.encrypt(sessionToken);

				res.cookie('session', session, { maxAge: 1000 * 60 * 60 * 24 * 7, httpOnly: true }).redirect(req.cookies.url || '/');
			}
		});

		this.router.get('/auth/logout', (req, res) => {
			if (!req.user) return res.redirect('/');

			res.clearCookie('session').redirect(302, '/');
		});
	}
}

module.exports = AuthenticationRoute;