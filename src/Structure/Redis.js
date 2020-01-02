const EventEmitter = require('events').EventEmitter;
const Client = require('ioredis');

class Redis extends EventEmitter {
	constructor(parent) {
		super();

		Object.assign(this, parent);

		this.avatarDB = new Client(process.env.REDIS_AVATAR);
		this.statusDB = new Client(process.env.REDIS_STATUS);
		this.ipcDB = new Client(process.env.REDIS_IPC);

		this.ipcEvents = new Client(process.env.REDIS_IPC);

		this.ipcEvents.subscribe('botlist.website');

		this.ipcEvents.on('message', (channel, data) => {
			data = JSON.parse(data);

			this.emit('data', data);
		});
	}

	async getAvatar(id) {
		const avatar = await this.avatarDB.get(id);

		return avatar || null;
	}

	async getStatus(id) {
		const status = await this.statusDB.get(id);

		return status || 'unknown';
	}

	async getAvatarMany(avatars) {
		return this.avatarDB.mget(...avatars);
	}

	async getStatusMany(statuses) {
		return this.statusDB.mget(...statuses);
	}

	setAvatar(id, avatar) {
		return this.avatarDB.set(id, avatar || null);
	}

	setStatus(id, status) {
		return this.statusDB.set(id, status || 'offline');
	}

	setAvatarMany(avatars) {
		return this.avatarDB.mset(avatars);
	}

	setStatusMany(statuses) {
		return this.statusDB.mset(statuses);
	}

	async uploadAvatars() {
		const avatars = {};

		this.client.guilds.forEach((guild) => {
			guild.members.forEach((member) => {
				avatars[member.id] = member.avatar || null;
			});
		});

		const keys = Object.keys(avatars);

		for (let i = 0; i < keys.length; i += 1000) {
			const slicedAvatars = {};
			const slicedKeys = keys.slice(i, i + 1000);

			for (let j = 0; j < slicedKeys.length; j++) {
				slicedAvatars[slicedKeys[j]] = avatars[slicedKeys[j]];
			}

			this.setAvatarMany(slicedAvatars);
		}
	}

	async uploadStatuses() {
		const statuses = {};

		this.client.guilds.forEach((guild) => {
			guild.members.forEach((member) => {
				statuses[member.id] = member.status || 'offline';
			});
		});

		const keys = Object.keys(statuses);

		for (let i = 0; i < keys.length; i += 1000) {
			const slicedStatuses = {};
			const slicedKeys = keys.slice(i, i + 1000);

			for (let j = 0; j < slicedKeys.length; j++) {
				slicedStatuses[slicedKeys[j]] = statuses[slicedKeys[j]];
			}

			this.setStatusMany(slicedStatuses);
		}
	}

	evalWebsite(fn, ...args) {
		this.ipcDB.publish('botlist.website', JSON.stringify({ function: fn, arguments: args }));
	}

	evalBot(fn, ...args) {
		this.ipcDB.publish('botlist.bot', JSON.stringify({ function: fn, arguments: args }));
	}

	evalGateway(fn, ...args) {
		this.ipcDB.publish('botlist.gateway', JSON.stringify({ function: fn, arguments: args }));
	}
}

module.exports = Redis;