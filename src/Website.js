const express = require('express');
const fs = require('fs').promises;
const http = require('http');
const path = require('path');
const Logger = require('./Util/Logger');
const Database = require('./Structure/Database');
const WebSocket = require('./Structure/WebSocket');
const Redis = require('./Structure/Redis');

require('express-async-errors');

class Website {
	constructor() {
		this.routers = [];
		this.jobs = [];
		this.sockets = [];

		this.app = express();
		this.server = http.createServer(this.app);

		this.db = new Database(this);
		this.redis = new Redis(this);
		this.socket = new WebSocket(this);

		process.on('exit', () => {
			this.db.client.close();

			process.kill(process.pid);
		});

		this.setup();
	}

	async setup() {
		this.app.set('view engine', 'pug');
		this.app.set('views', path.join(__dirname, 'Dynamic'));
		this.app.set('json spaces', 4);
		this.app.disable('x-powered-by');

		this.app.use((req, res, next) => {
			res.set('Access-Control-Allow-Origin', '*');
			res.set('Access-Control-Allow-Methods', 'GET, POST');

			res.locals.min = process.env.NODE_ENV === 'production' ? '.min' : '';
			res.locals.env = process.env.NODE_ENV;

			next();
		});

		process.on('uncaughtException', (error) => {
			Logger.error(error);
		});

		process.on('unhandledRejection', (error) => {
			Logger.error(error);
		});

		try {
			await fs.mkdir(path.join(__dirname, 'Assets'));
		} catch {
			// ignore
		}

		try {
			await fs.mkdir(path.join(__dirname, 'Assets', 'Backgrounds'));
		} catch {
			// ignore
		}

		this.loadDatabase();
	}

	async loadDatabase() {
		await this.db.connect();

		this.loadRoutes(path.join(__dirname, 'Routes'));
	}

	async loadRoutes(directory) {
		const routes = await fs.readdir(directory);

		if (routes.length > 0) {
			for (let i = 0; i < routes.length; i++) {
				const Router = require(path.join(directory, routes[i]));
				const route = new Router(this);
				this.routers.push(route);

				if (i + 1 === routes.length) {
					this.routers.sort((a, b) => {
						if (a.position > b.position) return 1;
						if (b.position > a.position) return -1;
						return 0;
					});

					for (i = 0; i < this.routers.length; i++) {
						this.app.use(this.routers[i].route, this.routers[i].router);

						if (i + 1 === this.routers.length) {
							this.app.use((req, res) => {
								res.status(404).render('error.pug', {
									title: '404',
									code: 404,
									message: 'File not found'
								});
							});

							this.app.use((error, req, res, next) => { // eslint-disable-line no-unused-vars
								Logger.error(error.stack || error);

								if (req._readableState.ended) return;

								res.status(500).render('error.pug', {
									title: '500',
									code: 500,
									message: 'An internal error occurred'
								});
							});

							Logger.info('Loaded ' + routes.length + ' routes.');

							this.loadJobs(path.join(__dirname, 'Jobs'));
						}
					}
				}
			}
		} else {
			this.loadJobs(path.join(__dirname, 'Jobs'));
		}
	}

	async loadJobs(directory) {
		const jobs = await fs.readdir(directory);

		if (jobs.length > 0) {
			for (let i = 0; i < jobs.length; i++) {
				const Job = require(path.join(directory, jobs[i]));
				const job = new Job(this);
				this.jobs.push(job);

				if (i + 1 === jobs.length) {
					Logger.info('Loaded ' + jobs.length + ' jobs.');

					this.loadSockets(path.join(__dirname, 'Sockets'));
				}
			}
		} else {
			this.loadSockets(path.join(__dirname, 'Sockets'));
		}
	}

	async loadSockets(directory) {
		const sockets = await fs.readdir(directory);

		if (sockets.length > 0) {
			for (let i = 0; i < sockets.length; i++) {
				const Socket = require(path.join(directory, sockets[i]));
				const socket = new Socket(this);
				this.sockets.push(socket);

				if (i + 1 === sockets.length) {
					Logger.info('Loaded ' + sockets.length + ' sockets.');

					this.launch();
				}
			}
		} else {
			this.launch();
		}
	}

	launch() {
		this.server.listen(process.env.PORT || 3000, process.env.HOST || 'localhost', () => {
			Logger.info('Listening on port ' + (process.env.PORT || 3000) + '.');
		});

		for (let i = 0; i < this.jobs.length; i++) {
			if (this.jobs[i].autoStart) {
				this.jobs[i].execute();
			}
		}
	}
}

module.exports = Website;