const express = require('express');
const Route = require('../Structure/Route');

class Tags extends Route {
	constructor(parent) {
		super({
			position: 2,
			route: '/tags'
		});

		Object.assign(this, parent);

		this.router = express.Router();
		this.setupRoutes();
	}

	setupRoutes() {
		this.router.get('/', async (req, res) => {
			const tags = await this.db.getAllTags();

			res.render('tags.pug', {
				title: 'Bots',
				navPage: 1,
				tags
			});
		});
	}
}

module.exports = Tags;