/* global typeCheck */

const path = require('path');
const fs = require('fs').promises;
const express = require('express');
const snekfetch = require('snekfetch');
const dateformat = require('dateformat');
const markdownIt = require('markdown-it');
const crypto = require('crypto');
const humanizeDuration = require('humanize-duration');
const Route = require('../Structure/Route');
const uuid = require('../Util/uuid');
const config = require('../config');
const Logger = require('../Util/Logger');

class Bot extends Route {
	constructor(parent) {
		super({
			position: 2,
			route: '/bot'
		});

		Object.assign(this, parent);

		this.botPropertyNames = {
			short_description: 'short description',
			full_description: 'full description',
			avatar_child_friendly: 'avatar child friendly',
			library: 'library',
			links: {
				invite: 'invite URL',
				support: 'support server code'
			},
			owners: 'secondary owners',
			tags: 'tags',
			prefix: 'prefix',
			vanity: 'vanity URL',
			website: 'website URL',
			webhook: 'webhook URL',
			background: 'card background URL'
		};

		this.router = express.Router();
		this.setupRoutes();
	}

	setupRoutes() {
		this.router.get('/', (req, res) => {
			res.redirect('https://discordapp.com/oauth2/authorize?client_id=' + config.discord.clientID + '&scope=bot&permissions=19457');
		});

		this.router.get('/:id', this.getBot(), async (req, res) => {
			const bot = res.locals.bot;

			const tags = await this.db.getTags(bot.tags);
			const owners = await this.db.getUsers(bot.owners);
			const library = await this.db.getLibrary(bot.library);

			if (bot.full_description) bot.full_description = markdownIt({ html: bot.certified || owners.some((owner) => owner.donator), linkify: true, typographer: true, breaks: false }).render(bot.full_description);
			bot.tags = tags;
			bot.owners = owners.sort((a, b) => {
				if (bot.owners.indexOf(a.id) > bot.owners.indexOf(b.id)) return 1;
				if (bot.owners.indexOf(a.id) < bot.owners.indexOf(b.id)) return -1;
				return 0;
			});
			bot.library = library;
			bot.status = await this.redis.getStatus(bot.id);

			this.redis.evalGateway('handleBotView', bot.id);

			res.render('bot/index.pug', {
				title: bot.username + '#' + bot.discriminator,
				navPage: 1,
				bot
			});

			await this.db.pushStatisticField(bot.id, { views: { user: req.user ? req.user.id : null, timestamp: Date.now() } });
		});

		this.router.get('/:id/invite', this.getBot(), async (req, res) => {
			const bot = res.locals.bot;

			this.redis.evalGateway('handleBotInvite', bot.id);

			res.redirect(bot.links.invite);

			await this.db.pushStatisticField(bot.id, { invites: { user: req.user ? req.user.id : null, timestamp: Date.now() } });
		});

		this.router.get('/:id/server', this.getBot(), (req, res) => {
			const bot = res.locals.bot;

			this.redis.evalGateway('handleBotServer', bot.id);

			if (!bot.links.support) return res.status(404).render('error.pug', { title: '404', code: 404, message: 'This bot does not have a support server' });

			res.redirect('https://discord.gg/' + bot.links.support);
		});

		this.router.get('/:id/manage', this.checkAuth(), this.getBot(), this.botPermission(), (req, res) => {
			res.render('bot/manage.pug', {
				title: 'Manage',
				navPage: 1
			});
		});

		this.router.get('/:id/widget', this.checkAuth(), this.getBot(), this.botPermission(), async (req, res) => {
			res.render('bot/widgets.pug', {
				title: 'Widgets',
				navPage: 1
			});
		});

		this.router.get('/:id/widget/:style', async (req, res) => {
			res.set('Content-Type', 'image/svg+xml').render('bot/deprecated-widget.pug');
		});

		this.router.get('/:id/badges', this.checkAuth(), this.getBot(), this.botPermission(), async (req, res) => {
			res.render('bot/badges.pug', {
				title: 'Badges',
				navPage: 1,
				properties: ['tag', 'username', 'discriminator', 'support', 'approved', 'certified', 'status', 'library', 'servers', 'shards', 'owner', 'owner.username', 'owner.discriminator', 'tags', 'prefix', 'website', 'uptime', 'uptime.1', 'uptime.2', 'uptime.3'],
				colors: ['brightgreen', 'green', 'yellowgreen', 'yellow', 'orange', 'red', 'blue', 'lightgrey', 'success', 'important', 'critical', 'informational', 'inactive', 'blueviolet', 'ff69b4', '9cf'],
				styles: ['plastic', 'flat', 'flat-square', 'for-the-badge', 'social']
			});
		});

		this.router.get('/:id/badge', this.getBot(), async (req, res) => {
			const bot = res.locals.bot;

			bot.library = await this.db.getLibrary(bot.library);
			bot.owners = await this.db.getUsers(bot.owners);
			bot.tags = await this.db.getTags(bot.tags);
			bot.uptime = await this.db.getUptime(bot.id);

			const query = {
				label: 'error',
				message: 'unknown error',
				color: 'success',
				style: 'flat'
			};

			const sendRedirect = async () => {
				res.redirect('https://img.shields.io/static/v1.svg?label=' + encodeURIComponent(query.label) + '&message=' + encodeURIComponent(query.message) + '&color=' + encodeURIComponent(query.color) + '&style=' + encodeURIComponent(query.style));
			};

			if ('property' in req.query) {
				if (req.query.property.toLowerCase() === 'tag') {
					query.label = 'tag';
					query.message = bot.username + '#' + bot.discriminator;
				} else if (req.query.property.toLowerCase() === 'username') {
					query.label = 'username';
					query.message = bot.username;
				} else if (req.query.property.toLowerCase() === 'discriminator') {
					query.label = 'discriminator';
					query.message = bot.discriminator;
				} else if (req.query.property.toLowerCase() === 'support') {
					if (bot.links.support) {
						query.label = 'support';
						query.message = 'https://discord.gg/' + bot.links.support;
					} else {
						query.label = 'error';
						query.message = 'bot has no support server';
						query.color = 'critical';

						return sendRedirect();
					}
				} else if (req.query.property.toLowerCase() === 'approved') {
					query.label = 'approved';
					query.message = bot.approved ? 'yes' : 'no';
					query.color = bot.approved ? 'success' : 'critical';
				} else if (req.query.property.toLowerCase() === 'certified') {
					query.label = 'certified';
					query.message = bot.certified ? 'yes' : 'no';
					query.color = bot.certified ? 'success' : 'critical';
				} else if (req.query.property.toLowerCase() === 'status') {
					const status = await this.redis.getStatus(bot.id);

					query.label = 'status';
					query.message = status === 'dnd' ? 'do not disturb' : status;
					query.color = status === 'online' ? 'success' : status === 'idle' ? 'yellow' : status === 'dnd' ? 'critical' : status === 'offline' ? 'lightgrey' : 'black';
				} else if (req.query.property.toLowerCase() === 'library') {
					query.label = 'library';
					query.message = bot.library.name;
				} else if (req.query.property.toLowerCase() === 'servers') {
					query.label = 'servers';
					query.message = bot.server_count ? bot.server_count.toLocaleString() : 'N/A';
				} else if (req.query.property.toLowerCase() === 'shards') {
					query.label = 'shards';
					query.message = bot.shards && bot.shards.length > 0 ? bot.shards.length.toLocaleString() : 'N/A';
				} else if (req.query.property.toLowerCase() === 'owner' || req.query.property.toLowerCase() === 'owner.tag') {
					query.label = 'owner';
					query.message = bot.owners[0].username + '#' + bot.owners[0].discriminator;
				} else if (req.query.property.toLowerCase() === 'owner.username') {
					query.label = 'owner';
					query.message = bot.owners[0].username;
				} else if (req.query.property.toLowerCase() === 'owner.discriminator') {
					query.label = 'owner';
					query.message = bot.owners[0].discriminator;
				} else if (req.query.property.toLowerCase() === 'tags') {
					query.label = 'tags';
					query.message = bot.tags.map((tag) => tag.name).join(', ');
				} else if (req.query.property.toLowerCase() === 'prefix') {
					query.label = 'prefix';
					query.message = bot.prefix;
				} else if (req.query.property.toLowerCase() === 'website') {
					query.label = 'website';
					query.message = bot.website ? bot.website : 'N/A';
				} else if (req.query.property.toLowerCase() === 'uptime') {
					query.label = 'uptime';
					query.message = bot.uptime ? Math.trunc((bot.uptime.online / bot.uptime.total) * 100) + '%' : 'unknown';
				} else if (req.query.property.toLowerCase() === 'uptime.1') {
					query.label = 'uptime';
					query.message = bot.uptime ? (Math.round(((bot.uptime.online / bot.uptime.total) * 100) * 10) / 10).toFixed(1) + '%' : 'unknown';
				} else if (req.query.property.toLowerCase() === 'uptime.2') {
					query.label = 'uptime';
					query.message = bot.uptime ? (Math.round(((bot.uptime.online / bot.uptime.total) * 100) * 100) / 100).toFixed(2) + '%' : 'unknown';
				} else if (req.query.property.toLowerCase() === 'uptime.3') {
					query.label = 'uptime';
					query.message = bot.uptime ? (Math.round(((bot.uptime.online / bot.uptime.total) * 100) * 1000) / 1000).toFixed(3) + '%' : 'unknown';
				} else {
					query.label = 'error';
					query.message = 'unknown property name';
					query.color = 'critical';

					return sendRedirect();
				}

				query.property = req.query.property.toLowerCase();
			} else {
				query.label = 'error';
				query.message = 'missing property query param';
				query.color = 'critical';

				return sendRedirect();
			}

			if ('color' in req.query) {
				const availableColors = ['brightgreen', 'green', 'yellowgreen', 'yellow', 'orange', 'red', 'blue', 'lightgrey', 'success', 'important', 'critical', 'informational', 'inactive', 'blueviolet', 'ff69b4', '9cf'];

				if (parseInt(req.query.color, 16) > 0xFFFFFF && !availableColors.some((color) => color === req.query.color.toLowerCase())) {
					query.label = 'error';
					query.message = 'invalid color: ' + req.query.color;
					query.color = 'critical';

					return sendRedirect();
				}

				query.color = req.query.color.toLowerCase();
			}

			if ('style' in req.query) {
				const availableStyles = ['plastic', 'flat', 'flat-square', 'for-the-badge', 'social'];

				if (!availableStyles.some((style) => style === req.query.style.toLowerCase())) {
					query.label = 'error';
					query.message = 'invalid color: ' + req.query.color;
					query.color = 'critical';

					return sendRedirect();
				}

				query.style = req.query.style.toLowerCase();
			}

			if ('label' in req.query) {
				if (req.query.label.length > 32) {
					query.label = 'error';
					query.message = 'label too long';
					query.color = 'critical';

					return sendRedirect();
				}

				if (req.query.label < 1) {
					query.label = 'error';
					query.message = 'label too short';
					query.color = 'critical';

					return sendRedirect();
				}

				query.label = req.query.label;
			}

			sendRedirect();
		});

		this.router.get('/:id/analytics', this.checkAuth(), this.getBot(), this.botPermission(), (req, res) => {
			res.render('bot/analytics.pug', {
				title: 'Analytics',
				navPage: 1
			});
		});

		this.router.get('/:id/uptime', this.checkAuth(), this.getBot(), this.botPermission(), async (req, res) => {
			const uptime = await this.db.getUptime(res.locals.bot.id);

			if (!uptime) return res.status(400).render('error.pug', { title: '400', code: 400, message: 'The bot has not recorded uptime information for this bot yet' });

			const count = await this.db.getAllBotsCount();

			const checkInterval = humanizeDuration((count / 5) * 1000, { round: true });

			res.render('bot/uptime.pug', {
				title: 'Uptime',
				navPage: 1,
				uptime,
				checkInterval
			});
		});

		this.router.get('/:id/audit', this.checkAuth(), this.getBot(), this.botPermission(), async (req, res) => {
			let audit = await this.db.getAllAuditsForBotWithUsersSorted(res.locals.bot.id);

			audit = audit.map((log) => {;
				log.time = humanizeDuration(Date.now() - log.timestamp, { round: true });
				log.alt_timestamp = dateformat(log.timestamp, 'mm/dd/yyyy HH:MM:ss (hh:MM:ss TT)');
				if (log.type > 0) {
					log.modifications = [];

					const oldEntries = Object.entries(log.old_entry);

					oldEntries.forEach((entry) => {
						const key = entry[0];
						const value = entry[1];
						const newValue = log.new_entry[entry[0]];

						if (typeCheck(value, Object) && typeCheck(newValue, Object)) {
							for (const prop in value) {
								if (value[prop] !== newValue[prop] && key in this.botPropertyNames && prop in this.botPropertyNames[key]) {
									log.modifications.push(this.botPropertyNames[key][prop]);
								}
							}
						} else if (typeCheck(value, Array) && typeCheck(newValue, Array)) {
							for (let i = 0; i < value.length; i++) {
								if (value[i] !== newValue[i] && key in this.botPropertyNames) {
									log.modifications.push(this.botPropertyNames[key]);
								}
							}
						} else {
							if (value !== newValue && key in this.botPropertyNames) {
								log.modifications.push(this.botPropertyNames[entry[0]]);
							}
						}
					});
				}

				return log;
			});

			res.render('bot/audit.pug', {
				title: 'Audit Log',
				navPage: 1,
				audit
			});
		});

		this.router.get('/:id/token', this.checkAuth(), this.getBot(), this.botPermission(), (req, res) => {
			res.render('bot/token.pug', {
				title: 'Token',
				navPage: 1
			});
		});

		this.router.post('/:id/token', this.checkAuth(), this.getBot(), this.botPermission(), async (req, res) => {
			await this.db.updateBot(req.params.id, { token: crypto.randomBytes(48).toString('hex') });

			res.redirect('/bot/' + req.params.id + '/token');
		});

		this.router.get('/:id/edit', this.checkAuth(), this.getBot(), this.botPermission(), async (req, res) => {
			const bot = res.locals.bot;

			const libraries = await this.db.getAllLibrariesSorted();
			const tags = await this.db.getAllTagsSorted();
			const owners = await this.db.getUsers(bot.owners);

			bot.status = await this.redis.getStatus(bot.id);

			res.render('bot/edit.pug', {
				title: 'Edit',
				navPage: 1,
				bot,
				libraries,
				tags,
				owners
			});
		});

		this.router.post('/:id/edit', this.checkAuth(), this.getBot(), this.botPermission(), async (req, res) => {
			const bot = res.locals.bot;

			if (!('short_description' in req.body)) return res.status(400).render('error.pug', { title: '400', code: 400, message: 'Missing "short_description" from form body' });
			if (!('invite' in req.body)) return res.status(400).render('error.pug', { title: '400', code: 400, message: 'Missing "invite" from form body' });
			if (!('prefix' in req.body)) return res.status(400).render('error.pug', { title: '400', code: 400, message: 'Missing "prefix" from form body' });
			if (!('library' in req.body)) return res.status(400).render('error.pug', { title: '400', code: 400, message: 'Missing "library" from form body' });

			req.body.full_description = 'full_description' in req.body && req.body.full_description.length > 0 ? req.body.full_description : '';
			req.body.support = 'support' in req.body && req.body.support.length > 0 ? req.body.support : null;
			req.body.secondary_owners = (bot.owners[0] === req.user.id || req.user.admin || req.user.developer) && 'secondary_owners' in req.body ? req.body.secondary_owners.split(',').map((value) => value.trim()) : bot.owners.slice(1);
			req.body.webhook = 'webhook' in req.body && req.body.webhook.length > 0 ? req.body.webhook : null;
			req.body.website = 'website' in req.body && req.body.website.length > 0 ? req.body.website : null;
			req.body.vanity = (bot.certified || req.user.donationTier > 1 || req.user.admin || req.user.developer) && 'vanity' in req.body && req.body.vanity.length > 0 ? req.body.vanity : null;
			req.body.background = (bot.certified || req.user.donationTier > 1 || req.user.admin || req.user.developer) && 'background' in req.body && req.body.background.length > 0 ? req.body.background : null;
			req.body.tags = 'tags' in req.body ? (typeof req.body.tags === 'string' ? [...req.body.tags.split(',')] : req.body.tags) : [];

			if (req.body.short_description.length < 1 || req.body.short_description.length > 180) return res.status(400).render('error.pug', { title: '400', code: 400, message: 'Invalid short description' });
			if (req.body.full_description.length > 15000) return res.status(400).render('error.pug', { title: '400', code: 400, message: 'Invalid full description' });
			if (req.body.invite.length < 1 || req.body.invite.length > 500) return res.status(400).render('error.pug', { title: '400', code: 400, message: 'Invalid invite' });
			if (req.body.prefix.length < 1 || req.body.prefix.length > 12) return res.status(400).render('error.pug', { title: '400', code: 400, message: 'Invalid prefix' });
			if (req.body.support && req.body.support.length > 48) return res.status(400).render('error.pug', { title: '400', code: 400, message: 'Invalid support code' });
			if (req.body.secondary_owners.length > 10) return res.status(400).render('error.pug', { title: '400', code: 400, message: 'Invalid secondary owners' });
			if (req.body.webhook && req.body.webhook.length > 1024) return res.status(400).render('error.pug', { title: '400', code: 400, message: 'Invalid Webhook URL' });
			if (req.body.website && req.body.website.length > 256) return res.status(400).render('error.pug', { title: '400', code: 400, message: 'Invalid website URL' });
			if (req.body.vanity && req.body.vanity.length > 48) return res.status(400).render('error.pug', { title: '400', code: 400, message: 'Invalid vanity URL' });
			if (req.body.background && req.body.background.length > 0 && (!/^https?:\/\//.test(req.body.background) || req.body.background.length > 256)) return res.status(400).render('error.pug', { title: '400', code: 400, message: 'Invalid background URL' });
			if (!/^https?:\/\/discordapp\.com\/(api\/)?oauth2\/authorize/.test(req.body.invite)) return res.status(400).render('error.pug', { title: '400', code: 400, message: 'Invite is not a Discord OAuth link' });
			if (req.body.website && req.body.website.length > 0 && !/^https?:\/\//.test(req.body.website)) return res.status(400).render('error.pug', { title: '400', code: 400, message: 'Website URL must use http or https protocol' });
			if (/^https?:\/\/discordapp\.com\/api\/oauth2\/authorize/.test(req.body.invite)) req.body.invite = req.body.invite.replace(/^https?:\/\/discordapp\.com\/api\/oauth2\/authorize/, 'https://discordapp.com/oauth2/authorize');
			if (req.body.support && req.body.support.length > 0 && /^https?:\/\/discord\.gg\//.test(req.body.support)) req.body.support = req.body.support.replace(/^https?:\/\/discord\.gg\//, '');

			if (req.body.secondary_owners.includes(req.user.id)) return res.status(400).render('error.pug', { title: '400', code: 400, message: 'You cannot add yourself as a secondary owner' });

			const library = await this.db.getLibrary(req.body.library);
			if (!library) return res.status(400).render('error.pug', { title: '400', code: 400, message: 'Selected library was not in list' });

			const tags = await this.db.getTags(req.body.tags);
			if (tags.length < 1 || tags.length > 3) return res.status(400).render('error.pug', { title: '400', code: 400, message: 'You must select at least 1 tag, and at most 3' });

			snekfetch
				.get('https://discordapp.com/api/users/' + bot.id)
				.set('Authorization', 'Bot ' + config.bot.token)
				.then(async (result) => {
					result = result.body;

					if (req.body.vanity && req.body.vanity.length > 0) {
						const botVanity = await this.db.findBotByVanityIgnoreID(req.body.vanity, bot.id);
						if (botVanity) return res.status(409).render('error.pug', { title: '409', code: 409, message: 'A bot with that vanity URL already exists' });
					}

					const downloadBackground = () => {
						if (bot.certified && req.body.background && req.body.background.length > 0 && bot.background !== req.body.background) {
							snekfetch
								.get(req.body.background)
								.then(async (result) => {
									await fs.writeFile(path.join(__dirname, '..', 'Assets', 'Backgrounds', bot.id + '.png'), result.body);

									submit();
								})
								.catch((error) => {
									res.status(400).render('error.pug', { title: '400', code: 400, message: 'Failed to request the background, got error code: ' + error.statusCode });
								});
						} else {
							submit();
						}
					};

					const submit = async () => {
						await this.db.updateBot(result.id, {
							username: result.username,
							discriminator: result.discriminator,
							short_description: req.body.short_description,
							full_description: req.body.full_description,
							avatar_child_friendly: req.body.child_friendly === 'on',
							avatar: result.avatar,
							library: library.id,
							links: {
								invite: req.body.invite,
								support: req.body.support
							},
							owners: [
								bot.owners[0],
								...req.body.secondary_owners
							],
							webhook: req.body.webhook,
							tags: tags.map((tag) => tag.id),
							prefix: req.body.prefix,
							updated_at: Date.now(),
							vanity: req.body.vanity,
							website: req.body.website,
							background: req.body.background
						});

						const newBot = await this.db.getBot(result.id);

						await this.db.insertAudit({
							id: uuid(),
							type: 2,
							old_entry: bot,
							new_entry: newBot,
							user: req.user.id,
							timestamp: Date.now()
						});

						this.redis.evalBot('handleEditedBot', req.user.only('username', 'discriminator'), bot.only('username', 'discriminator', 'id'));

						res.redirect('/bot/' + bot.id);
					};

					if (req.body.support && req.body.support.length > 0) {
						snekfetch
							.get('https://discordapp.com/api/invites/' + req.body.support)
							.set('Authorization', 'Bot ' + config.bot.token)
							.then(() => {
								downloadBackground();
							})
							.catch((error) => {
								if (error.statusCode === 404) {
									res.status(400).render('error.pug', { title: '400', code: 400, message: 'Failed to resolve invite for that support server, is the invite still active?' });
								} else {
									Logger.error(error);
									res.status(500).render('error.pug', { title: '500', code: 500, message: 'Internal server error' });
								}
							});
					} else {
						downloadBackground();
					}
				})
				.catch(() => {
					res.status(500).render('error.pug', { title: '500', code: 500, message: 'Failed to retrieve bot from Discord' });
				});
		});

		this.router.get('/:id/delete', this.checkAuth(), this.getBot(), this.botPermission(), async (req, res) => {
			const bot = res.locals.bot;

			bot.status = await this.redis.getStatus(bot.id);

			res.render('bot/delete.pug', {
				title: 'Delete',
				navPage: 1,
				bot
			});
		});

		this.router.post('/:id/delete', this.checkAuth(), this.getBot(), this.botPermission(), async (req, res) => {
			const bot = res.locals.bot;

			await this.db.deleteBot(bot.id);
			await this.db.deleteUptime(bot.id);
			await this.db.deleteStatistics(bot.id);

			this.redis.evalBot('handleDeletedBot', req.user.only('username', 'discriminator'), bot.only('id', 'owners', 'username', 'discriminator'), req.body.reason);

			res.redirect('/user/' + req.user.id);
		});

		this.router.get('/:id/upvote', this.checkAuth(), this.getBot(), async (req, res) => {
			const bot = res.locals.bot;

			bot.status = await this.redis.getStatus(bot.id);

			res.render('bot/upvote.pug', {
				title: 'Upvote',
				navPage: 1,
				bot
			});
		});

		this.router.post('/:id/upvote', this.checkAuth(), this.getBot(), async (req, res) => {
			if (!req.user) return res.cookie('redirect', req.url).redirect('/auth');

			const bot = res.locals.bot;
			const upvotes = bot.upvotes.filter((upvote) => upvote.id === req.user.id && Date.now() - upvote.timestamp < (1000 * 60 * 60 * 24));

			if (upvotes.length > 0) return res.status(400).json({ error: { code: 400, message: 'You have already upvote this bot in the past 24 hours. Try again in ' + humanizeDuration((1000 * 60 * 60 * 24) - (Date.now() - upvotes[0].timestamp), { round: true, conjunction: ' and ' }) + '.' } });

			bot.upvotes.push({
				id: req.user.id,
				timestamp: Date.now()
			});

			await this.db.updateBot(bot.id, { upvotes: bot.upvotes });

			const user = await this.db.getUserWithFields(req.user.id, ['id', 'username', 'discriminator', 'avatar', 'short_description']);

			this.redis.evalGateway('handleBotUpvote', bot.id, user);

			res.json({ success: true, code: 200, message: 'Successfully voted for bot' });

			if (bot.webhook) {
				if (/^https?:\/\/discordapp\.com\/api\/webhooks\/\d+\/.*$/.test(bot.webhook)) {
					snekfetch
						.post(bot.webhook)
						.send({
							username: 'botlist.space',
							avatar_url: 'https://botlist.space/img/logo.png',
							embeds: [
								{
									title: bot.username + ' - Upvote',
									color: 0x222222,
									url: 'https://botlist.space/bot/' + bot.id,
									fields: [
										{
											name: 'User',
											value: user.username + '#' + user.discriminator,
											inline: true
										},
										{
											name: 'Bot',
											value: bot.username + '#' + bot.discriminator,
											inline: true
										}
									],
									thumbnail: {
										url: 'https://botlist.space/avatar/' + user.id + '.' + (user.avatar && user.avatar.startsWith('a_') ? 'gif' : 'png')
									},
									timestamp: new Date().toISOString()
								}
							]
						})
						.then(() => {
							// ignore
						})
						.catch(() => {
							// ignore
						});
				} else {
					snekfetch
						.post(bot.webhook)
						.set('User-Agent', 'botlist.space Webhooks (https://botlist.space)')
						.set('Content-Type', 'application/json')
						.set('Authorization', bot.token)
						.send({
							site: 'botlist.space',
							bot: bot.id,
							timestamp: Date.now(),
							user
						})
						.then(() => {
							// ignore
						})
						.catch(() => {
							// ignore
						});
				}
			}

			await this.db.pushStatisticField(bot.id, { upvotes: { user: req.user ? req.user.id : null, timestamp: Date.now() } });
		});

		this.router.get('/:id/transfer', this.checkAuth(), this.getBot(), this.botPermission(false), async (req, res) => {
			const bot = res.locals.bot;

			bot.status = await this.redis.getStatus(bot.id);

			res.render('bot/transfer.pug', {
				title: 'Transfer Ownership',
				navPage: 1,
				bot
			});
		});

		this.router.post('/:id/transfer', this.checkAuth(), this.getBot(), this.botPermission(false), async (req, res) => {
			const bot = res.locals.bot;

			if (!('user' in req.body)) return res.status(400).render('error.pug', { title: '400', code: 400, message: 'Missing "user" from form body' });
			if (!('agree' in req.body) || req.body.agree !== 'on') return res.status(400).render('error.pug', { title: '400', code: 400, message: 'You did not agree to transfer this bot' });

			const user = await this.db.getUser(req.body.user);

			if (!user) return res.status(404).render('error.pug', { title: '404', code: 404, message: 'No user by that ID has logged into the site' });

			await this.db.updateBot(bot.id, { owners: [req.body.user] });

			this.redis.evalBot('handleBotTransferred', req.user.only('username', 'discriminator'), bot.only('id', 'username', 'discriminator', 'owners'), user.only('username', 'discriminator'));

			res.redirect('/bot/' + bot.id);
		});
	}

	checkAuth() {
		return (req, res, next) => {
			if (!req.user) return res.cookie('redirect', req.url).redirect('/auth');

			next();
		};
	}

	getBot() {
		return async (req, res, next) => {
			if (req.params.id.length > 25) return res.status(404).render('error.pug', { title: '404', code: 404, message: 'Bot not found' });

			const bot = await this.db.getBotVanity(req.params.id);

			if (!bot) return res.status(404).render('error.pug', {
				page: '404',
				code: 404,
				message: 'Bot not found'
			});

			res.locals.bot = bot;
			next();
		};
	}

	botPermission(allowSecondary = true) {
		return (req, res, next) => {
			if (!req.user) return res.cookie('redirect', req.url).redirect('/auth');

			if (res.locals.bot.owners[0] === req.user.id || (allowSecondary && res.locals.bot.owners.includes(req.user.id)) || req.user.admin) {
				next();
			} else {
				res.status(403).render('error.pug', { title: '403', code: 403, message: 'You don\'t have permission to view this page' });
			}
		};
	}
}

module.exports = Bot;