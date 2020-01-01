const express = require('express');
const Route = require('../Structure/Route');

class Bots extends Route {
	constructor(parent) {
		super({
			position: 2,
			route: '/bots'
		});

		Object.assign(this, parent);

		this.router = express.Router();
		this.setupRoutes();
	}

	setupRoutes() {
		this.router.get('/', async (req, res) => {
			const botCount = await this.db.getAllBotsApprovedCount();

			const page = Math.max(Math.min(parseInt(req.query.page) || 1, Math.ceil(botCount / 12)), 1);

			let bots = await this.db.getTopBotsByUpvotesPaginated((page - 1) * 12, 12);

			const botStatuses = bots.length > 0 ? await this.redis.getStatusMany(bots.map((bot) => bot.id)) : [];

			bots = bots.map((bot) => {
				bot.status = botStatuses[bots.indexOf(bot)] || 'unknown';

				return bot;
			});

			res.render('bots.pug', {
				title: 'Bots',
				navPage: 1,
				sortedBy: 'upvotes',
				bots,
				currentPage: page,
				pages: Math.ceil(botCount / 12),
				showBackground: true
			});

			// await this.db.pushStatisticsField(bots.map((bot) => bot.id), { impressions: { user: req.user ? req.user.id : null, timestamp: Date.now() } });
		});

		this.router.get('/new', async (req, res) => {
			const botCount = await this.db.getAllBotsApprovedCount();

			const page = Math.max(Math.min(parseInt(req.query.page) || 1, Math.ceil(botCount / 12)), 1);

			let bots = await this.db.getTopBotsByTimestampPaginated((page - 1) * 12, 12);

			const botStatuses = bots.length > 0 ? await this.redis.getStatusMany(bots.map((bot) => bot.id)) : [];

			bots = bots.map((bot) => {
				bot.status = botStatuses[bots.indexOf(bot)] || 'unknown';

				return bot;
			});

			res.render('bots.pug', {
				title: 'Bots',
				navPage: 1,
				sortedBy: 'new',
				bots,
				currentPage: page,
				pages: Math.ceil(botCount / 12),
				showBackground: true
			});

			// await this.db.pushStatisticsField(bots.map((bot) => bot.id), { impressions: { user: req.user ? req.user.id : null, timestamp: Date.now() } });
		});

		this.router.get('/certified', async (req, res) => {
			const botCount = await this.db.getCertifiedBotsCount();

			const page = Math.max(Math.min(parseInt(req.query.page) || 1, Math.ceil(botCount / 12)), 1);

			let bots = await this.db.getCertifiedBotsByIDPaginated((page - 1) * 12, 12);

			const botStatuses = bots.length > 0 ? await this.redis.getStatusMany(bots.map((bot) => bot.id)) : [];

			bots = bots.map((bot) => {
				bot.status = botStatuses[bots.indexOf(bot)] || 'unknown';

				return bot;
			});

			res.render('bots.pug', {
				title: 'Bots',
				navPage: 1,
				sortedBy: 'certified',
				bots,
				currentPage: page,
				pages: Math.ceil(botCount / 12),
				showBackground: true
			});

			// await this.db.pushStatisticsField(bots.map((bot) => bot.id), { impressions: { user: req.user ? req.user.id : null, timestamp: Date.now() } });
		});

		this.router.get('/library/:library', async (req, res) => {
			const library = await this.db.getLibraryByShort(req.params.library);

			if (!library) return res.status(404).render('error.pug', { title: '404', code: 404, message: 'Unknown library' });

			const botCount = await this.db.getApprovedBotsByLibraryCount(library.id);

			const page = Math.max(Math.min(parseInt(req.query.page) || 1, Math.ceil(botCount / 12)), 1);

			let bots = await this.db.getApprovedBotsByLibraryPaginated(library.id, (page - 1) * 12, 12);

			const botStatuses = bots.length > 0 ? await this.redis.getStatusMany(bots.map((bot) => bot.id)) : [];

			bots = bots.map((bot) => {
				bot.status = botStatuses[bots.indexOf(bot)] || 'unknown';

				return bot;
			});

			res.render('bots.pug', {
				title: 'Bots',
				navPage: 1,
				sortedBy: 'tag',
				bots,
				currentPage: page,
				pages: Math.ceil(botCount / 12),
				showBackground: true
			});

			// await this.db.pushStatisticsField(bots.map((bot) => bot.id), { impressions: { user: req.user ? req.user.id : null, timestamp: Date.now() } });
		});

		this.router.get('/tag/:tag', async (req, res) => {
			const tag = await this.db.getTagByShort(req.params.tag);

			if (!tag) return res.status(404).render('error.pug', { title: '404', code: 404, message: 'Unknown tag' });

			const botCount = await this.db.getApprovedBotsByTagCount(tag.id);

			const page = Math.max(Math.min(parseInt(req.query.page) || 1, Math.ceil(botCount / 12)), 1);

			let bots = await this.db.getApprovedBotsByTagPaginated(tag.id, (page - 1) * 12, 12);

			const botStatuses = bots.length > 0 ? await this.redis.getStatusMany(bots.map((bot) => bot.id)) : [];

			bots = bots.map((bot) => {
				bot.status = botStatuses[bots.indexOf(bot)] || 'unknown';

				return bot;
			});

			res.render('bots.pug', {
				title: 'Bots',
				navPage: 1,
				sortedBy: 'tag',
				bots,
				currentPage: page,
				pages: Math.ceil(botCount / 12),
				showBackground: true
			});

			// await this.db.pushStatisticsField(bots.map((bot) => bot.id), { impressions: { user: req.user ? req.user.id : null, timestamp: Date.now() } });
		});
	}
}

module.exports = Bots;