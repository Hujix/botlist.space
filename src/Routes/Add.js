const fs = require('fs');
const path = require('path');
const express = require('express');
const snekfetch = require('snekfetch');
const crypto = require('crypto');
const Route = require('../Structure/Route');
const config = require('../config');
const uuid = require('../Util/uuid');
const Logger = require('../Util/Logger');

class Add extends Route {
	constructor(parent) {
		super({
			position: 2,
			route: '/add'
		});

		Object.assign(this, parent);

		this.router = express.Router();
		this.setupRoutes();
	}

	setupRoutes() {
		this.router.get('/', async (req, res) => {
			if (!req.user) return res.cookie('redirect', req.url).redirect('/auth');
			if (req.user.banned) return res.status(403).render('error.pug', { title: '403', code: 403, message: 'You have been banned from adding bots to this site. Please contact a moderator if you think this is a mistake' });

			const libraries = await this.db.getAllLibrariesSorted();
			const tags = await this.db.getAllTagsSorted();

			res.render('add.pug', {
				title: 'Add Bot',
				libraries,
				tags
			});
		});

		this.router.post('/', async (req, res) => {
			if (!req.user) return res.cookie('redirect', req.url).redirect('/auth');

			if (!('id' in req.body)) return res.status(400).render('error.pug', { title: '400', code: 400, message: 'Missing "id" from form body' });
			if (!('short_description' in req.body)) return res.status(400).render('error.pug', { title: '400', code: 400, message: 'Missing "short_description" from form body' });
			if (!('invite' in req.body)) return res.status(400).render('error.pug', { title: '400', code: 400, message: 'Missing "invite" from form body' });
			if (!('prefix' in req.body)) return res.status(400).render('error.pug', { title: '400', code: 400, message: 'Missing "prefix" from form body' });
			if (!('library' in req.body)) return res.status(400).render('error.pug', { title: '400', code: 400, message: 'Missing "library" from form body' });

			req.body.full_description = 'full_description' in req.body && req.body.full_description.length > 0 ? req.body.full_description : '';
			req.body.support = 'support' in req.body && req.body.support.length > 0 ? req.body.support : null;
			req.body.secondary_owners = 'secondary_owners' in req.body && req.body.secondary_owners.length > 0 ? req.body.secondary_owners.split(',').map((value) => value.trim()) : [];
			req.body.webhook = 'webhook' in req.body && req.body.webhook.length > 0 ? req.body.webhook : null;
			req.body.website = 'website' in req.body && req.body.website.length > 0 ? req.body.website : null;
			req.body.vanity = (req.user.donationTier > 1 || req.user.admin || req.user.developer) && 'vanity' in req.body && req.body.vanity.length > 0 ? req.body.vanity : null;
			req.body.background = (req.user.donationTier > 1 || req.user.admin || req.user.developer) && 'background' in req.body && req.body.background.length > 0 ? req.body.background : null;
			req.body.tags = 'tags' in req.body ? (typeof req.body.tags === 'string' ? [...req.body.tags.split(',')] : req.body.tags) : [];

			if (req.body.id.length < 1 || req.body.id.length > 24) return res.status(400).render('error.pug', { title: '400', code: 400, message: 'Invalid ID' });
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

			const bot = await this.db.getBot(req.body.id);
			if (bot) return res.status(409).render('error.pug', { title: '409', code: 409, message: 'Bot already exists in database' });

			const library = await this.db.getLibrary(req.body.library);
			if (!library) return res.status(400).render('error.pug', { title: '400', code: 400, message: 'Selected library was not in list' });

			const tags = await this.db.getTags(req.body.tags);
			if (tags.length < 1 || tags.length > 3) return res.status(400).render('error.pug', { title: '400', code: 400, message: 'You must select at least 1 tag, and at most 3' });

			snekfetch
				.get('https://discordapp.com/api/users/' + req.body.id)
				.set('Authorization', 'Bot ' + config.bot.token)
				.then(async (bot) => {
					bot = bot.body;

					if (!bot.bot) return res.status(400).render('error.pug', { title: '400', code: 400, message: 'You cannot add a user as a bot' });

					const downloadBackground = () => {
						if (req.body.background && req.body.background.length > 0) {
							snekfetch
								.get(bot.background)
								.then(async (result) => {
									if (result.headers['content-type'] !== 'image/png') return res.status(400).render('error.pug', { title: '400', code: 400, message: 'The Content-Type header of the background image is not a PNG image' });

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
						await this.db.deleteStatistics(bot.id);

						await this.db.insertStatistics({
							_id: uuid(),
							id: bot.id,
							views: [],
							upvotes: [],
							invites: [],
							impressions: []
						});

						const entry = {
							id: bot.id,
							username: bot.username,
							discriminator: bot.discriminator,
							short_description: req.body.short_description,
							full_description: req.body.full_description,
							approved: false,
							avatar_child_friendly: req.body.child_friendly === 'on',
							certified: false,
							avatar: bot.avatar ? 'https://cdn.discordapp.com/avatars/' + bot.id + '/' + bot.avatar + '.png?size=256' : 'https://cdn.discordapp.com/embed/avatars/0.png',
							library: library.id,
							links: {
								invite: req.body.invite,
								no_permission_invite: req.body.invite.replace(/(\?|&)permissions=-?\d+/g, '$1permissions=0'),
								support: req.body.support
							},
							owners: [
								req.user.id,
								...req.body.secondary_owners
							],
							tags: tags.map((tag) => tag.id),
							prefix: req.body.prefix,
							server_count: null,
							shards: null,
							created_at: Date.now(),
							updated_at: Date.now(),
							token: crypto.randomBytes(48).toString('hex'),
							upvotes: [],
							vanity: req.body.vanity,
							website: req.body.website,
							webhook: req.body.webhook,
							background: req.body.background
						};

						await this.db.insertBot(entry);

						await this.db.insertAudit({
							id: uuid(),
							type: 0,
							old_entry: null,
							new_entry: entry,
							user: req.user.id,
							timestamp: Date.now()
						});

						this.redis.evalBot('handleAddedBot', req.user.only('username', 'discriminator'), bot.only('id', 'username', 'discriminator'));

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
									res.status(500).render('error.pug', { title: '404', code: 404, message: 'Invalid or expired support server invite' });
								} else if (error.statusCode === 429) {
									res.status(429).render('error.pug', { title: '429', code: 429, message: 'Too many requests are being sent right now, please try again later' });
								} else {
									Logger.error(error);
									res.status(500).render('error.pug', { title: '500', code: 500, message: 'Failed to resolve support server invite' });
								}
							});
					} else {
						downloadBackground();
					}
				})
				.catch((error) => {
					if (error.statusCode === 404) {
						res.status(404).render('error.pug', { title: '404', code: 404, message: 'The bot ID submitted does not exist on Discord' });
					} else {
						res.status(500).render('error.pug', { title: '500', code: 500, message: 'Failed to retrieve bot from Discord' });
						Logger.error(error);
					}
				});
		});

		this.router.get('/requirements', (req, res) => {
			if (!req.user) return res.cookie('redirect', req.url).redirect('/auth');

			res.render('requirements.pug', {
				title: 'Listing Requirements'
			});
		});
	}
}

module.exports = Add;