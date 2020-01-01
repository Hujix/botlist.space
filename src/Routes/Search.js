const express = require('express');
const stringSimilarity = require('string-similarity');
const Route = require('../Structure/Route');

class Search extends Route {
	constructor(parent) {
		super({
			position: 2,
			route: '/search'
		});

		Object.assign(this, parent);

		this.router = express.Router();
		this.setupRoutes();
	}

	setupRoutes() {
		this.router.get('/', async (req, res) => {
			if (!('q' in req.query) || req.query.q === '') return res.status(400).render('error.pug', { title: '400', code: 400, message: 'Invalid search query' });

			const search = req.query.q.toLowerCase();

			const bots = await this.db.getAllApprovedBots();

			const page = Math.max(Math.min(parseInt(req.query.page) || 1, Math.ceil(bots.length / 12)), 1);

			let results = bots
				.filter((bot) => {
					return bot.username.toLowerCase().includes(search)
						|| bot.short_description.toLowerCase().includes(search)
						|| bot.tags.some((tag) => tag.toLowerCase().includes(search))
						|| stringSimilarity.compareTwoStrings(bot.username, search) > 0.5
						|| stringSimilarity.compareTwoStrings(bot.short_description, search) > 0.5
						|| bot.tags.some((tag) => stringSimilarity.compareTwoStrings(tag, search) > 0.5);
				})
				.sort((a, b) => {
					if (a.username.toLowerCase() === search && b.username.toLowerCase() !== search) return -Infinity;
					if (a.username.toLowerCase() !== search && b.username.toLowerCase() === search) return Infinity;

					if (a.short_description.toLowerCase() === search && b.short_description.toLowerCase() !== search) return -999;
					if (a.short_description.toLowerCase() !== search && b.short_description.toLowerCase() === search) return 999;

					if (a.tags.some((tag) => tag.toLowerCase() === search) && !b.tags.some((tag) => tag.toLowerCase() === search)) return -999;
					if (!a.tags.some((tag) => tag.toLowerCase() === search) && b.tags.some((tag) => tag.toLowerCase() === search)) return 999;

					if (a.username.toLowerCase().startsWith(search) && !b.username.toLowerCase().startsWith(search)) return -500;
					if (!a.username.toLowerCase().startsWith(search) && b.username.toLowerCase().startsWith(search)) return 500;

					if (a.username.toLowerCase().includes(search) && !b.username.toLowerCase().includes(search)) return -100;
					if (!a.username.toLowerCase().includes(search) && b.username.toLowerCase().includes(search)) return 100;

					if (a.short_description.toLowerCase().includes(search) && !b.short_description.toLowerCase().includes(search)) return -50;
					if (!a.short_description.toLowerCase().includes(search) && b.short_description.toLowerCase().includes(search)) return 50;

					if (a.tags.some((tag) => tag.toLowerCase().includes(search)) && !b.tags.some((tag) => tag.toLowerCase().includes(search))) return -10;
					if (!a.tags.some((tag) => tag.toLowerCase().includes(search)) && b.tags.some((tag) => tag.toLowerCase().includes(search))) return 10;

					const aSimilarityUsername = stringSimilarity.compareTwoStrings(a.username, search);
					const bSimilarityUsername = stringSimilarity.compareTwoStrings(a.username, search);

					if (aSimilarityUsername > 0.5 || bSimilarityUsername > 0.5) {
						if (aSimilarityUsername > bSimilarityUsername) return Math.abs(aSimilarityUsername - bSimilarityUsername) * 100;
						if (bSimilarityUsername > aSimilarityUsername) return Math.abs(bSimilarityUsername - aSimilarityUsername) * 100;
					}

					const aSimilarityDescription = stringSimilarity.compareTwoStrings(a.short_description, search);
					const bSimilarityDescription = stringSimilarity.compareTwoStrings(a.short_description, search);

					if (aSimilarityDescription > 0.5 || bSimilarityDescription > 0.5) {
						if (aSimilarityDescription > bSimilarityDescription) return Math.abs(aSimilarityDescription - bSimilarityDescription) * 75;
						if (bSimilarityDescription > aSimilarityDescription) return Math.abs(bSimilarityDescription - aSimilarityDescription) * 75;
					}

					const aSimilarityTags = a.tags.map((tag) => stringSimilarity.compareTwoStrings(tag, search)).reduce((a, b) => a + b, 0);
					const bSimilarityTags = b.tags.map((tag) => stringSimilarity.compareTwoStrings(tag, search)).reduce((a, b) => a + b, 0);

					if (aSimilarityTags > 0.5 || bSimilarityTags > 0.5) {
						if (aSimilarityTags > bSimilarityTags) return Math.abs(aSimilarityTags - bSimilarityTags) * (50 / 3);
						if (bSimilarityTags > aSimilarityTags) return Math.abs(bSimilarityTags - aSimilarityTags) * (50 / 3);
					}

					return 0;
				})
				.slice((page * 12) - 12, page * 12);

			const botStatuses = bots.length > 0 ? await this.redis.getStatusMany(bots.map((bot) => bot.id)) : [];

			results = results.map((bot) => {
				bot.status = botStatuses[results.indexOf(bot)] || 'unknown';

				return bot;
			});

			res.render('search.pug', {
				title: 'Search',
				navPage: 1,
				bots: results,
				currentPage: page,
				pages: Math.ceil(bots.length / 12),
				search: req.query.q
			});

			// await this.db.pushStatisticsField(results.map((bot) => bot.id), { impressions: { user: req.user ? req.user.id : null, timestamp: Date.now() } });
		});
	}
}

module.exports = Search;