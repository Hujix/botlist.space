const express = require('express');
const sitemap = require('sitemap');
const Route = require('../Structure/Route');

class Index extends Route {
	constructor(parent) {
		super({
			position: 2,
			route: '/'
		});

		Object.assign(this, parent);

		this.topTags = [];

		this.router = express.Router();
		this.setupRoutes();
		this.getTopTags();
	}

	setupRoutes() {
		this.router.get('/', async (req, res) => {
			let topVotedBots = await this.db.getTopBotsByUpvotes(6);
			let randomBots = await this.db.getRandomBots(6);
			let certified = await this.db.getRandomCertifiedBots(6);
			let newBots = await this.db.getNewBots(6);

			const topVotedBotStatuses = topVotedBots.length > 0 ? await this.redis.getStatusMany(topVotedBots.map((bot) => bot.id)) : [];
			const randomBotStatuses = randomBots.length > 0 ? await this.redis.getStatusMany(randomBots.map((bot) => bot.id)) : [];
			const certifiedStatuses = certified.length > 0 ? await this.redis.getStatusMany(certified.map((bot) => bot.id)) : [];
			const newBotStatuses = newBots.length > 0 ? await this.redis.getStatusMany(newBots.map((bot) => bot.id)) : [];

			topVotedBots = topVotedBots.map((bot) => {
				bot.status = topVotedBotStatuses[topVotedBots.indexOf(bot)] || 'unknown';

				return bot;
			});

			randomBots = randomBots.map((bot) => {
				bot.status = randomBotStatuses[randomBots.indexOf(bot)] || 'unknown';

				return bot;
			});

			certified = certified.map((bot) => {
				bot.status = certifiedStatuses[certified.indexOf(bot)] || 'unknown';

				return bot;
			});

			newBots = newBots.map((bot) => {
				bot.status = newBotStatuses[newBots.indexOf(bot)] || 'unknown';

				return bot;
			});

			res.render('index.pug', {
				title: 'Home - Popular and feature-rich Discord bots',
				navPage: 0,
				topVotedBots,
				certified,
				randomBots,
				newBots,
				topTags: this.topTags
			});

			// await this.db.pushStatisticsField([...topVotedBots, ...randomBots, ...certified, ...newBots].map((bot) => bot.id), { impressions: { user: req.user ? req.user.id : null, timestamp: Date.now() } });
		});

		this.router.get('/view/:id', (req, res) => {
			res.redirect('/bot/' + req.params.id);
		});

		this.router.get('/server/:id', (req, res) => {
			res.redirect('https://serverlist.space/server/' + req.params.id);
		});

		this.router.get('/cssreset', async (req, res) => {
			if (!req.user) return res.status(404).render('error.pug', { title: '404', code: 404, message: 'You are not logged in' });

			await this.db.updateUser(req.user.id, { custom_css: '' });

			res.redirect('/');
		});

		this.router.get('/sitemap.xml', async (req, res) => {
			const bots = await this.db.getAllBots();

			const sm = sitemap.createSitemap({
				hostname: 'https://botlist.space/',
				cacheTime: 1000 * 60 * 10,
				urls: [
					{
						url: '/',
						changefreq: 'hourly',
						priority: 0.9
					},
					{
						url: '/bots',
						changefreq: 'hourly',
						priority: 0.9
					},
					{
						url: '/tags',
						changefreq: 'weekly',
						priority: 0.9
					},
					{
						url: '/about',
						changefreq: 'weekly',
						priority: 0.9
					},
					{
						url: '/privacy',
						changefreq: 'weekly',
						priority: 0.9
					},
					{
						url: '/terms',
						changefreq: 'weekly',
						priority: 0.9
					},
					{
						url: '/certification',
						changefreq: 'weekly',
						priority: 0.9
					},
					...bots.map((bot) => ({
						url: '/bot/' + bot.id,
						changefreq: 'daily',
						priority: 1
					}))
				]
			});

			res.set('Content-Type', 'application/xml').send(sm.toString());
		});

		this.router.get('/sitemap.txt', async (req, res) => {
			const bots = await this.db.getAllBots();

			const result = [];

			result.push('https://botlist.space/');
			result.push('https://botlist.space/bots');
			result.push('https://botlist.space/tags');
			result.push('https://botlist.space/about');
			result.push('https://botlist.space/privacy');
			result.push('https://botlist.space/terms');
			result.push('https://botlist.space/certification');

			for (let i = 0; i < bots.length; i++) {
				result.push('https://botlist.space/bot/' + bots[i].id);
			}

			res.set('Content-Type', 'text/plain').send(result.join('\n'));
		});
	}

	async getTopTags() {
		const topTags = await this.db.getTopUpvotedTags(3);

		this.topTags = topTags;

		setTimeout(() => this.getTopTags(), 1000 * 60 * 15);
	}
}

module.exports = Index;