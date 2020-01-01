const Job = require('../Structure/Job');
const updateBackground = require('../Util/updateBackground');

class UpdateBotBackgrounds extends Job {
	constructor(parent) {
		super('Update Bot Backgrounds', '@weekly', true);

		this.id = 4;

		Object.assign(this, parent);

		this.bots = [];
		this.index = 0;
	}

	async execute() {
		this.index = 0;
		this.bots = [];

		const bots = await this.db.getAllBots();

		this.bots.push(...bots.filter((bot) => bot.certified && bot.background && bot.background.length > 0 && /^https?:\/\//.test(bot.background)));

		this.check();
	}

	async check() {
		if (this.index >= this.bots.length) return;

		const bot = this.bots[this.index];

		await updateBackground(bot);

		setTimeout(() => this.next(), 1000);
	}

	next() {
		this.index++;
		this.check();
	}
}

module.exports = UpdateBotBackgrounds;