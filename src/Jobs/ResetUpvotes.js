const Job = require('../Structure/Job');
const Logger = require('../Util/Logger');

class ResetUpvotes extends Job {
	constructor(parent) {
		super('Reset Upvotes', '@monthly');

		this.id = 1;

		Object.assign(this, parent);
	}

	execute() {
		this.db.updateAllBots({ upvotes: [] })
			.catch((error) => {
				Logger.error(error);
			});
	}
}

module.exports = ResetUpvotes;