const express = require('express');
const path = require('path');
const Route = require('../Structure/Route');

class Static extends Route {
	constructor(parent) {
		super({
			position: 0,
			route: '/'
		});

		Object.assign(this, parent);

		this.router = express.Router();
		this.setupRoutes();
	}

	setupRoutes() {
		this.router.use(express.static(path.join(__dirname, '..', 'Static'), {
			setHeaders: (res, path) => {
				if (process.env.NODE_ENV !== 'production') return;

				res.removeHeader('Set-Cookie');
				res.removeHeader('Cache-Control');
				res.set('Cache-Control', [
					'public',
					'max-age=86400',
					'must-revalidate'
				]);
				res.set('Access-Control-Allow-Origin', '*');

				if (path.includes('style.min.css')) {
					res.removeHeader('Cache-Control');
					res.set('Cache-Control', [
						'public',
						'max-age=43200',
						'must-revalidate'
					]);
				} else if (['bootstrap', '.svg', '.png'].some((file) => path.includes(file))) {
					res.removeHeader('Cache-Control');
					res.set('Cache-Control', [
						'public',
						'max-age=604800',
						'must-revalidate'
					]);
				}
			}
		}));

		this.router.use('/background', express.static(path.join(__dirname, '..', 'Assets', 'Backgrounds'), {
			setHeaders: (res) => {
				if (process.env.NODE_ENV !== 'production') return;

				res.removeHeader('Set-Cookie');
				res.removeHeader('Cache-Control');
				res.set('Access-Control-Allow-Origin', '*');
				res.set('Cache-Control', [
					'public',
					'max-age=86400',
					'must-revalidate'
				]);
			}
		}));
	}
}

module.exports = Static;