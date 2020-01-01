const moment = require('moment');
const Socket = require('../Structure/Socket');
const Logger = require('../Util/Logger');
const cryptography = require('../Util/cryptography');

class Analytics extends Socket {
	constructor(parent) {
		super('analytics', '/analytics');

		Object.assign(this, parent);
	}

	onConnection(client, request) {
		if (!('cookie' in request.headers)) return client.close(1000, 'Missing cookie header from request');

		const sessionToken = /session=([0-9a-f]+)/.exec(request.headers.cookie);

		if (!sessionToken || sessionToken.length < 2) return client.close(1000, 'No session cookie has been set');

		cryptography.decrypt(sessionToken[1])
			.then((token) => {
				this.db.getUserSession(token)
					.then((user) => {
						if (!user) return client.close(1000, 'No user was found by that session token');

						client.heartbeatTimeout = setTimeout(() => {
							if (client.readyState !== client.OPEN) return;

							client.close(1000, 'No heartbeat received in time');
						}, 1000 * 15);

						client.heartbeatInterval = setInterval(() => {
							if (client.readyState !== client.OPEN) return;

							this.send(client, 'heartbeat');
						}, 1000 * 5);

						client.identifyTimeout = setTimeout(() => {
							client.close(1000, 'Client did not identify in time');
						}, 1000 * 2);

						client.bot = null;

						this.send(client, 'ready');

						client.on('message', async (data) => {
							try {
								data = JSON.parse(data);

								if (data.type === 'heartbeat') {
									client.heartbeatTimeout.refresh();
								} else if (data.type === 'identify') {
									const bot = await this.db.getBot(data.bot);

									if (!bot) return client.close(1000, 'No bot exists by that ID');
									if (!bot.owners.includes(user.id) && !user.admin) return client.close(1000, 'You do not own that bot');

									client.bot = bot;

									this.send(client, 'identify', { success: true });

									clearTimeout(client.identifyTimeout);
								} else if (data.type === 'request') {
									if (!client.bot) return;

									let timestamp = 0;

									if (data.duration === 'today') {
										timestamp = moment().startOf('day').valueOf();
									} else if (data.duration === 'week') {
										timestamp = moment().startOf('week').valueOf();
									} else if (data.duration === 'month') {
										timestamp = moment().startOf('month').valueOf();
									} else if (data.duration === 'year') {
										timestamp = moment().startOf('year').valueOf();
									} else if (data.duration === 'beginning') {
										timestamp = 0;
									} else {
										timestamp = moment().startOf(data.duration).valueOf();
									}

									if (data.statistic === 0) {
										const views = await this.db.getBotViewStatisticsAfter(client.bot.id, timestamp);

										this.send(client, 'data', { viewCount: views.length, views: views.map((view) => ({ timestamp: view.views.timestamp })), duration: data.duration, timestamp: new Date(timestamp).toUTCString(), botAddedAt: client.bot.created_at });
									} else if (data.statistic === 1) {
										const invites = await this.db.getBotInviteStatisticsAfter(client.bot.id, timestamp);

										this.send(client, 'data', { inviteCount: invites.length, invites: invites.map((invite) => ({ timestamp: invite.invites.timestamp })), duration: data.duration, timestamp: new Date(timestamp).toUTCString(), botAddedAt: client.bot.created_at });
									} else if (data.statistic === 2) {
										const upvotes = await this.db.getBotUpvoteStatisticsAfter(client.bot.id, timestamp);

										this.send(client, 'data', { upvoteCount: upvotes.length, upvotes: upvotes.map((upvote) => ({ timestamp: upvote.upvotes.timestamp })), duration: data.duration, timestamp: new Date(timestamp).toUTCString(), botAddedAt: client.bot.created_at });
									}
								}
							} catch (e) {
								if (!/^Unexpected token/.test(e.message)) {
									Logger.error(e);
								}
							}
						});
					})
					.catch((error) => {
						Logger.error(error);
						client.close(1000, 'Internal server error');
					});
			})
			.catch((error) => {
				Logger.error(error);
				client.close(1000, 'Internal server error');
			});
	}

	send(client, type, data = {}) {
		if (client.readyState !== client.OPEN) return;

		client.send(JSON.stringify({ type, time: Date.now(), ...data }));
	}

	onBotView() {
		// todo: make these analytics live
	}

	onBotInvite() {
		// todo: make these analytics live
	}

	onBotUpvote() {
		// todo: make these analytics live
	}
}

module.exports = Analytics;