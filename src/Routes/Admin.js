const express = require('express');
const humanizeDuration = require('humanize-duration');
const Route = require('../Structure/Route');
const uuid = require('../Util/uuid');
const config = require('../config');

class Admin extends Route {
	constructor(parent) {
		super({
			position: 2,
			route: '/admin'
		});

		Object.assign(this, parent);

		this.router = express.Router();
		this.setupRoutes();
	}

	setupRoutes() {
		this.router.use((req, res, next) => {
			if (!req.user || !req.user.admin) return res.status(401).render('error.pug', { title: '403', code: 403, message: 'You do not have authorization to view this page.' });

			next();
		});

		this.router.get('/', (req, res) => {
			res.render('admin/overview.pug', {
				title: 'Overview'
			});
		});

		this.router.get('/queue', async (req, res) => {
			let bots = await this.db.getAllUnapprovedBots();

			const botStatuses = bots.length > 0 ? await this.redis.getStatusMany(bots.map((bot) => bot.id)) : [];

			bots = bots.map((bot) => {
				bot.invite = bot.links.invite.replace(/(\?|&)permissions=\d+/g, '').replace(/authorize\/?&/, 'authorize?') + '&guild_id=' + config.discord.guildID;
				bot.status = botStatuses[bots.indexOf(bot)] || 'unknown';
				bot.duration = humanizeDuration(Date.now() - bot.created_at, { round: true });

				return bot;
			});

			res.render('admin/queue.pug', {
				title: 'Queue',
				bots
			});
		});

		this.router.get('/queue/:id/approve', this.getBot(), async (req, res) => {
			const bot = res.locals.bot;

			if (bot.approved) return res.status(409).render('error.pug', { title: '409', code: 409, message: 'That bot has already been approved' });

			await this.db.updateBot(bot.id, { approved: true });

			const newBot = await this.db.getBot(bot.id);

			await this.db.insertAudit({
				_id: uuid(),
				id: uuid(),
				type: 1,
				old_entry: bot,
				new_entry: newBot,
				user: req.user.id,
				timestamp: Date.now()
			});

			this.redis.evalBot('handleApprovedBot', req.user.only('username', 'discriminator'), bot.only('id', 'username', 'discriminator', 'owners'));

			res.redirect('/admin/queue');
		});

		this.router.get('/queue/:id/decline', this.getBot(), (req, res) => {
			res.render('admin/decline.pug', {
				title: 'Decline'
			});
		});

		this.router.post('/queue/:id/decline', this.getBot(), async (req, res) => {
			const bot = res.locals.bot;

			if (!('reason' in req.body) || req.body.reason === '') return res.status(400).render('error.pug', { title: '400', code: 400, message: 'Missing "reason" from form body' });

			await this.db.deleteBot(bot.id);
			await this.db.deleteUptime(bot.id);
			await this.db.deleteStatistics(bot.id);

			this.redis.evalBot('handleDeclinedBot', req.user.only('username', 'discriminator'), bot.only('id', 'username', 'discriminator'), req.body.reason);

			res.redirect('/admin/queue');
		});

		this.router.get('/certification', this.certificationPerms(), async (req, res) => {
			let bots = await this.db.getCertificationQueueWithUptime();

			const botStatuses = bots.length > 0 ? await this.redis.getStatusMany(bots.map((bot) => bot.id)) : [];

			bots = bots.map((bot) => {
				bot.status = botStatuses[bots.indexOf(bot)] || 'unknown';

				return bot;
			});

			res.render('admin/certification.pug', {
				title: 'Certification',
				bots
			});
		});

		this.router.get('/certification/:id/accept', this.certificationPerms(), this.getBot(), async (req, res) => {
			if (!req.user.certification && !req.user.developer) return res.status(403).render('error.pug', { title: '404', code: 404, message: 'You do not have permission to view this page' });

			const bot = res.locals.bot;

			const application = await this.db.getCertification(bot.id);

			if (!application) return res.status(404).render('error.pug', { title: '404', code: 404, message: 'That bot has not applied for certification' });

			await this.db.updateBot(bot.id, { certified: true });
			await this.db.deleteCertification(bot.id);

			this.redis.evalBot('handleCertificationAcceptedBot', req.user.only('username', 'discriminator'), bot.only('id', 'owners', 'username', 'discriminator'));

			res.redirect('/admin/certification');
		});

		this.router.get('/certification/:id/decline', this.certificationPerms(), this.getBot(), async (req, res) => {
			if (!req.user.certification && !req.user.developer) return res.status(403).render('error.pug', { title: '403', code: 403, message: 'You do not have permission to view this page' });

			const bot = res.locals.bot;

			const application = await this.db.getCertification(bot.id);

			if (!application) return res.status(404).render('error.pug', { title: '404', code: 404, message: 'That bot has not applied for certification' });

			res.render('admin/certification-decline.pug', {
				title: 'Decline Certification',
				application,
				bot
			});
		});

		this.router.post('/certification/:id/decline', this.certificationPerms(), this.getBot(), async (req, res) => {
			if (!req.user.certification && !req.user.developer) return res.status(403).render('error.pug', { title: '404', code: 404, message: 'You do not have permission to view this page' });

			const bot = res.locals.bot;

			const application = await this.db.getCertification(bot.id);

			if (!application) return res.status(404).render('error.pug', { title: '404', code: 404, message: 'That bot has not applied for certification' });

			await this.db.deleteCertification(bot.id);

			this.redis.evalBot('handleCertificationDeclinedBot', req.user.only('username', 'discriminator'), bot.only('id', 'owners', 'username', 'discriminator'), req.body.reason.length > 0 ? req.body.reason : null);

			res.redirect('/admin/certification');
		});

		this.router.get('/bots', async (req, res) => {
			if ('q' in req.query && req.query.q !== '') {
				const botCount = await this.db.findBotsByUsernameCount(req.query.q);

				const page = Math.max(Math.min(parseInt(req.query.page) || 1, Math.ceil(botCount / 12)), 1);

				let bots = await this.db.findBotsByUsername(req.query.q, (page - 1) * 12, 12);

				const botStatuses = bots.length > 0 ? await this.redis.getStatusMany(bots.map((bot) => bot.id)) : [];

				bots = bots.map((bot) => {
					bot.status = botStatuses[bots.indexOf(bot)] || 'unknown';

					return bot;
				});

				res.render('admin/bots.pug', {
					title: 'Bots',
					bots,
					currentPage: page,
					pages: Math.ceil(botCount / 12),
					search: req.query.q
				});
			} else {
				const botCount = await this.db.getAllBotsCount();

				const page = Math.max(Math.min(parseInt(req.query.page) || 1, Math.ceil(botCount / 12)), 1);

				let bots = await this.db.getAllBotsPaginatedSorted((page - 1) * 12, 12);

				const botStatuses = bots.length > 0 ? await this.redis.getStatusMany(bots.map((bot) => bot.id)) : [];

				bots = bots.map((bot) => {
					bot.status = botStatuses[bots.indexOf(bot)] || 'unknown';

					return bot;
				});

				res.render('admin/bots.pug', {
					title: 'Bots',
					bots,
					currentPage: page,
					pages: Math.ceil(botCount / 12)
				});
			}
		});

		this.router.get('/users', async (req, res) => {
			if ('q' in req.query && req.query.q !== '') {
				const userCount = await this.db.findUsersByUsernameCount(req.query.q);

				const page = Math.max(Math.min(parseInt(req.query.page) || 1, Math.ceil(userCount / 16)), 1);

				let users = await this.db.findUsersByUsernameSorted(req.query.q, (page - 1) * 16, 16);

				const userStatuses = users.length > 0 ? await this.redis.getStatusMany(users.map((user) => user.id)) : [];

				users = users.map((user) => {
					user.status = userStatuses[users.indexOf(user)] || 'unknown';

					return user;
				});

				res.render('admin/users.pug', {
					title: 'Users',
					users,
					currentPage: page,
					pages: Math.ceil(userCount / 16),
					search: req.query.q
				});
			} else {
				const userCount = await this.db.getAllUsersCount();

				const page = Math.max(Math.min(parseInt(req.query.page) || 1, Math.ceil(userCount / 12)), 1);

				let users = await this.db.getAllUsersPaginatedSorted((page - 1) * 12, 12);

				const userStatuses = users.length > 0 ? await this.redis.getStatusMany(users.map((user) => user.id)) : [];

				users = users.map((user) => {
					user.status = userStatuses[users.indexOf(user)] || 'unknown';

					return user;
				});

				res.render('admin/users.pug', {
					title: 'Users',
					users,
					currentPage: page,
					pages: Math.ceil(userCount / 12)
				});
			}
		});

		this.router.get('/admins', async (req, res) => {
			let admins = await this.db.getAdminUsers();

			const userStatuses = admins.length > 0 ? await this.redis.getStatusMany(admins.map((user) => user.id)) : [];

			admins = admins.map((user) => {
				user.status = userStatuses[admins.indexOf(user)] || 'unknown';

				return user;
			});

			res.render('admin/admins.pug', {
				title: 'Admins',
				users: admins
			});
		});

		this.router.get('/banned', async (req, res) => {
			let users = await this.db.getAllBannedUsers();

			const userStatuses = users.length > 0 ? await this.redis.getStatusMany(users.map((user) => user.id)) : [];

			users = users.map((user) => {
				user.status = userStatuses[users.indexOf(user)] || 'unknown';

				return user;
			});

			res.render('admin/banned.pug', {
				title: 'Banned Users',
				users
			});
		});

		this.router.get('/uptime', async (req, res) => {
			let bots = await this.db.getAllApprovedBotsWithUptime();

			bots = bots
				.map((bot) => {
					bot.checks = bot.uptime ? bot.uptime.total : null;
					bot.uptime = bot.uptime ? (bot.uptime.online / bot.uptime.total) * 100 : null;

					return bot;
				})
				.sort((a, b) => {
					if (a.uptime < b.uptime) return 1;
					if (b.uptime < a.uptime) return -1;
					return 0;
				});

			res.render('admin/uptime.pug', {
				title: 'Uptime',
				bots
			});
		});

		this.router.get('/libraries', async (req, res) => {
			const libraries = await this.db.getAllLibrariesSorted();

			res.render('admin/libraries.pug', {
				title: 'Libraries',
				libraries
			});
		});

		this.router.get('/libraries/add', (req, res) => {
			res.render('admin/add-library.pug', {
				title: 'Libraries'
			});
		});

		this.router.post('/libraries/add', async (req, res) => {
			if (!('library_name' in req.body)) return res.status(400).render('error.pug', { title: '400', code: 400, message: 'Missing "library_name" from form body' });

			const library = await this.db.findLibraryByName(req.body.library_name);

			if (library) return res.status(400).render('error.pug', { title: '409', code: 409, message: 'Library with that name already exists' });

			await this.db.insertLibrary({ _id: uuid(), id: uuid(), name: req.body.library_name });

			res.redirect('/admin/libraries');
		});

		this.router.get('/libraries/:id/delete', async (req, res) => {
			const library = await this.db.getLibrary(req.params.id);

			if (!library) return res.status(404).render('error.pug', { title: '404', code: 404, message: 'Invalid library' });

			await this.db.deleteLibrary(library.id);

			res.redirect('/admin/libraries');
		});

		this.router.get('/jobs', this.developerPerms(), (req, res) => {
			res.render('admin/jobs.pug', {
				title: 'Jobs',
				jobs: this.jobs
			});
		});
	}

	getBot() {
		return async (req, res, next) => {
			if (req.params.id.length > 25) return res.status(404).render('error.pug', { title: '404', code: 404, message: 'Bot not found' });

			const bot = await this.db.getBotVanity(req.params.id);

			if (!bot) return res.status(404).render('error.pug', {
				title: '404',
				code: 404,
				message: 'Bot not found'
			});

			res.locals.bot = bot;
			next();
		};
	}

	developerPerms() {
		return (req, res, next) => {
			if (!req.user.developer) return res.status(403).render('error.pug', { title: '403', code: 403, message: 'You do not have permission to view this page' });

			next();
		};
	}

	certificationPerms() {
		return (req, res, next) => {
			if (!req.user.certification && !req.user.developer) return res.status(403).render('error.pug', { title: '403', code: 403, message: 'You do not have permission to view this page' });

			next();
		};
	}
}

module.exports = Admin;