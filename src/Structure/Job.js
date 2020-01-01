const scheduler = require('node-schedule');
const humanizeDuration = require('humanize-duration');

class Job {
	constructor(name, interval, autoStart) {
		this.name = name;
		this.isRunning = false;
		this.autoStart = autoStart || false;

		this.job = scheduler.scheduleJob(interval, () => {
			this.execute();
		});
	}

	timeUntil() {
		return humanizeDuration(this.job.nextInvocation().getTime() - Date.now(), { round: true });
	}

	nextInvocation() {
		return this.job.nextInvocation().getTime();
	}
}

module.exports = Job;