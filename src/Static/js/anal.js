/* global Chart, moment */

(function () {
	var socket = new WebSocket(window.location.protocol.replace(/http(s)?/, 'ws$1') + '//' + window.location.host + '/analytics');
	var viewsDurationSelect = document.querySelector('#view-duration');
	var invitesDurationSelect = document.querySelector('#invite-duration');
	var upvotesDurationSelect = document.querySelector('#upvote-duration');
	var viewsStatisticValue = document.querySelector('#views');
	var invitesStatisticValue = document.querySelector('#invites');
	var upvotesStatisticValue = document.querySelector('#upvotes');
	var viewsCanvas = document.querySelector('#views-canvas');
	var invitesCanvas = document.querySelector('#invites-canvas');
	var upvotesCanvas = document.querySelector('#upvotes-canvas');

	var viewsChart = new Chart(viewsCanvas.getContext('2d', { alpha: true }), {
		type: 'line',
		data: {
			labels: [],
			datasets: [
				{
					label: '# of Views',
					data: [],
					backgroundColor: 'rgba(255, 0, 0, 0.4)',
					borderColor: 'rgba(255, 0, 0, 0.5)',
					borderWidth: 1
				}
			]
		},
		options: {
			scales: {
				xAxes: [
					{
						type: 'time',
						time: {
							unit: 'hour',
							min: moment().toDate(),
							max: moment().add(1, 'hour').toDate(),
							tooltipFormat: 'MM/DD/YYYY'
						}
					}
				],
				yAxes: [
					{
						ticks: {
							beginAtZero: true,
							precision: 0
						},
						display: true
					}
				]
			}
		}
	});

	var invitesChart = new Chart(invitesCanvas.getContext('2d', { alpha: true }), {
		type: 'line',
		data: {
			labels: [],
			datasets: [
				{
					label: '# of Invites',
					data: [],
					backgroundColor: 'rgba(50, 205, 50, 0.4)',
					borderColor: 'rgba(50, 205, 50, 0.5)',
					borderWidth: 1
				}
			]
		},
		options: {
			scales: {
				xAxes: [
					{
						type: 'time',
						time: {
							unit: 'hour',
							min: moment().toDate(),
							max: moment().add(1, 'hour').toDate(),
							tooltipFormat: 'MM/DD/YYYY'
						}
					}
				],
				yAxes: [
					{
						ticks: {
							beginAtZero: true,
							precision: 0
						},
						display: true
					}
				]
			}
		}
	});

	var upvotesChart = new Chart(upvotesCanvas.getContext('2d', { alpha: true }), {
		type: 'line',
		data: {
			labels: [],
			datasets: [
				{
					label: '# of Upvotes',
					data: [],
					backgroundColor: 'rgba(30, 144, 255, 0.4)',
					borderColor: 'rgba(30, 144, 255, 0.5)',
					borderWidth: 1
				}
			]
		},
		options: {
			scales: {
				xAxes: [
					{
						type: 'time',
						time: {
							unit: 'hour',
							min: moment().toDate(),
							max: moment().add(1, 'hour').toDate(),
							tooltipFormat: 'MM/DD/YYYY'
						}
					}
				],
				yAxes: [
					{
						ticks: {
							beginAtZero: true,
							precision: 0
						},
						display: true
					}
				]
			}
		}
	});

	var heartbeatTimeout = null;
	var heartbeatInterval = null;

	function onSocketOpen() {
		console.log('WebSocket is open');

		heartbeatTimeout = setTimeout(function () {
			if (socket.readyState !== socket.OPEN) return;

			socket.close(1000, 'No heartbeat received in time');
		}, 1000 * 15);

		heartbeatInterval = setInterval(function () {
			if (socket.readyState !== socket.OPEN) return;

			send('heartbeat');
		}, 1000 * 5);
	}

	function onSocketMessage(message) {
		var i, roundedTime, index, months;

		try {
			var data = JSON.parse(message.data);

			console.log(data);

			if (data.type === 'heartbeat') {
				clearTimeout(heartbeatTimeout);

				heartbeatTimeout = setTimeout(function () {
					if (socket.readyState !== socket.OPEN) return;

					socket.close(1000, 'No heartbeat received in time');
				}, 1000 * 15);
			} else if (data.type === 'data') {
				if ('viewCount' in data && data.duration === viewsDurationSelect.options[viewsDurationSelect.selectedIndex].getAttribute('value')) {
					viewsStatisticValue.innerText = data.viewCount.toLocaleString();

					viewsChart.config.data.datasets[0].data = [];

					if (data.duration === 'today') {
						viewsChart.config.options.scales.xAxes[0].time.unit = 'hour';
						viewsChart.config.options.scales.xAxes[0].time.min = moment().startOf('day').toDate();
						viewsChart.config.options.scales.xAxes[0].time.max = moment().startOf('hour').add(1, 'hour').toDate();
						viewsChart.config.options.scales.xAxes[0].time.tooltipFormat = 'h:mm A';

						for (i = 0; i < 24; i++) {
							viewsChart.config.data.datasets[0].data.push({
								x: moment().startOf('day').add(i, 'hours').toDate(),
								y: 0
							});
						}

						for (i = 0; i < data.views.length; i++) {
							roundedTime = moment(data.views[i].timestamp).add(30, 'minutes').startOf('hour');
							index = viewsChart.config.data.datasets[0].data.indexOf(viewsChart.config.data.datasets[0].data.filter(function (value) {
								return value.x.getTime() === roundedTime.valueOf();
							})[0]);

							if (index < 0) {
								viewsChart.config.data.datasets[0].data.push({
									x: roundedTime.toDate(),
									y: 1
								});
							} else {
								viewsChart.config.data.datasets[0].data[index].y++;
							}
						}
					} else if (data.duration === 'week') {
						viewsChart.config.options.scales.xAxes[0].time.unit = 'day';
						viewsChart.config.options.scales.xAxes[0].time.min = moment().startOf('week').toDate();
						viewsChart.config.options.scales.xAxes[0].time.max = moment().startOf('week').add(1, 'week').toDate();
						viewsChart.config.options.scales.xAxes[0].time.tooltipFormat = 'dddd, MM/DD/YYYY';

						for (i = 0; i < 8; i++) {
							viewsChart.config.data.datasets[0].data.push({
								x: moment().startOf('week').add(i, 'days').toDate(),
								y: 0
							});
						}

						for (i = 0; i < data.views.length; i++) {
							roundedTime = moment(data.views[i].timestamp).add(12, 'hours').startOf('day');
							index = viewsChart.config.data.datasets[0].data.indexOf(viewsChart.config.data.datasets[0].data.filter(function (value) {
								return value.x.getTime() === roundedTime.valueOf();
							})[0]);

							if (index < 0) {
								viewsChart.config.data.datasets[0].data.push({
									x: roundedTime.toDate(),
									y: 1
								});
							} else {
								viewsChart.config.data.datasets[0].data[index].y++;
							}
						}
					} else if (data.duration === 'month') {
						viewsChart.config.options.scales.xAxes[0].time.unit = 'day';
						viewsChart.config.options.scales.xAxes[0].time.min = moment().startOf('month').toDate();
						viewsChart.config.options.scales.xAxes[0].time.max = moment().startOf('month').add(1, 'month').toDate();
						viewsChart.config.options.scales.xAxes[0].time.tooltipFormat = 'MM/DD/YYYY';

						for (i = 0; i < 32; i++) {
							viewsChart.config.data.datasets[0].data.push({
								x: moment().startOf('month').add(i, 'days').toDate(),
								y: 0
							});
						}

						for (i = 0; i < data.views.length; i++) {
							roundedTime = moment(data.views[i].timestamp).add(12, 'hours').startOf('day');
							index = viewsChart.config.data.datasets[0].data.indexOf(viewsChart.config.data.datasets[0].data.filter(function (value) {
								return value.x.getTime() === roundedTime.valueOf();
							})[0]);

							if (index < 0) {
								viewsChart.config.data.datasets[0].data.push({
									x: roundedTime.toDate(),
									y: 1
								});
							} else {
								viewsChart.config.data.datasets[0].data[index].y++;
							}
						}
					} else if (data.duration === 'year') {
						viewsChart.config.options.scales.xAxes[0].time.unit = 'month';
						viewsChart.config.options.scales.xAxes[0].time.min = moment().startOf('year').toDate();
						viewsChart.config.options.scales.xAxes[0].time.max = moment().startOf('year').add(1, 'year').toDate();
						viewsChart.config.options.scales.xAxes[0].time.tooltipFormat = 'MMMM YYYY';

						for (i = 0; i < 13; i++) {
							viewsChart.config.data.datasets[0].data.push({
								x: moment().startOf('year').add(i, 'months').toDate(),
								y: 0
							});
						}

						for (i = 0; i < data.views.length; i++) {
							roundedTime = moment(data.views[i].timestamp).add(15, 'days').startOf('month');
							index = viewsChart.config.data.datasets[0].data.indexOf(viewsChart.config.data.datasets[0].data.filter(function (value) {
								return value.x.getTime() === roundedTime.valueOf();
							})[0]);

							if (index < 0) {
								viewsChart.config.data.datasets[0].data.push({
									x: roundedTime.toDate(),
									y: 1
								});
							} else {
								viewsChart.config.data.datasets[0].data[index].y++;
							}
						}
					} else if (data.duration === 'beginning') {
						delete viewsChart.config.options.scales.xAxes[0].time.unit;
						viewsChart.config.options.scales.xAxes[0].time.min = moment(new Date(data.botAddedAt)).subtract(3, 'days').toDate();
						viewsChart.config.options.scales.xAxes[0].time.max = moment().add(1, 'month').toDate();
						viewsChart.config.options.scales.xAxes[0].time.tooltipFormat = 'MM/DD/YYYY';

						months = (moment().add(1, 'month').valueOf() - data.botAddedAt) / 1000 / 60 / 60 / 24 / 31;

						if (months >= 18) {
							for (i = 0; i < months / 12 + 1; i++) {
								viewsChart.config.data.datasets[0].data.push({
									x: moment(new Date(data.botAddedAt)).add(i, 'years').toDate(),
									y: 0
								});
							}
						} else {
							for (i = 0; i < months + 1; i++) {
								viewsChart.config.data.datasets[0].data.push({
									x: moment(new Date(data.botAddedAt)).startOf('month').add(i, 'months').toDate(),
									y: 0
								});
							}
						}

						for (i = 0; i < data.views.length; i++) {
							roundedTime = moment(data.views[i].timestamp).add(15, 'days').startOf('month');
							index = viewsChart.config.data.datasets[0].data.indexOf(viewsChart.config.data.datasets[0].data.filter(function (value) {
								return value.x.getTime() === roundedTime.valueOf();
							})[0]);

							if (index < 0) {
								viewsChart.config.data.datasets[0].data.push({
									x: roundedTime.toDate(),
									y: 1
								});
							} else {
								viewsChart.config.data.datasets[0].data[index].y++;
							}
						}
					}

					viewsChart.update();
				}

				if ('inviteCount' in data && data.duration === invitesDurationSelect.options[invitesDurationSelect.selectedIndex].getAttribute('value')) {
					invitesStatisticValue.innerText = data.inviteCount.toLocaleString();

					invitesChart.config.data.datasets[0].data = [];

					if (data.duration === 'today') {
						invitesChart.config.options.scales.xAxes[0].time.unit = 'hour';
						invitesChart.config.options.scales.xAxes[0].time.min = moment().startOf('day').toDate();
						invitesChart.config.options.scales.xAxes[0].time.max = moment().startOf('hour').add(1, 'hour').toDate();
						invitesChart.config.options.scales.xAxes[0].time.tooltipFormat = 'h:mm A';

						for (i = 0; i < 24; i++) {
							invitesChart.config.data.datasets[0].data.push({
								x: moment().startOf('day').add(i, 'hours').toDate(),
								y: 0
							});
						}

						for (i = 0; i < data.invites.length; i++) {
							roundedTime = moment(data.invites[i].timestamp).add(30, 'minutes').startOf('hour');
							index = invitesChart.config.data.datasets[0].data.indexOf(invitesChart.config.data.datasets[0].data.filter(function (value) {
								return value.x.getTime() === roundedTime.valueOf();
							})[0]);

							if (index < 0) {
								invitesChart.config.data.datasets[0].data.push({
									x: roundedTime.toDate(),
									y: 1
								});
							} else {
								invitesChart.config.data.datasets[0].data[index].y++;
							}
						}
					} else if (data.duration === 'week') {
						invitesChart.config.options.scales.xAxes[0].time.unit = 'day';
						invitesChart.config.options.scales.xAxes[0].time.min = moment().startOf('week').toDate();
						invitesChart.config.options.scales.xAxes[0].time.max = moment().startOf('week').add(1, 'week').toDate();
						invitesChart.config.options.scales.xAxes[0].time.tooltipFormat = 'dddd, MM/DD/YYYY';

						for (i = 0; i < 8; i++) {
							invitesChart.config.data.datasets[0].data.push({
								x: moment().startOf('week').add(i, 'days').toDate(),
								y: 0
							});
						}

						for (i = 0; i < data.invites.length; i++) {
							roundedTime = moment(data.invites[i].timestamp).add(12, 'hours').startOf('day');
							index = invitesChart.config.data.datasets[0].data.indexOf(invitesChart.config.data.datasets[0].data.filter(function (value) {
								return value.x.getTime() === roundedTime.valueOf();
							})[0]);

							if (index < 0) {
								invitesChart.config.data.datasets[0].data.push({
									x: roundedTime.toDate(),
									y: 1
								});
							} else {
								invitesChart.config.data.datasets[0].data[index].y++;
							}
						}
					} else if (data.duration === 'month') {
						invitesChart.config.options.scales.xAxes[0].time.unit = 'day';
						invitesChart.config.options.scales.xAxes[0].time.min = moment().startOf('month').toDate();
						invitesChart.config.options.scales.xAxes[0].time.max = moment().startOf('month').add(1, 'month').toDate();
						invitesChart.config.options.scales.xAxes[0].time.tooltipFormat = 'MM/DD/YYYY';

						for (i = 0; i < 32; i++) {
							invitesChart.config.data.datasets[0].data.push({
								x: moment().startOf('month').add(i, 'days').toDate(),
								y: 0
							});
						}

						for (i = 0; i < data.invites.length; i++) {
							roundedTime = moment(data.invites[i].timestamp).add(12, 'hours').startOf('day');
							index = invitesChart.config.data.datasets[0].data.indexOf(invitesChart.config.data.datasets[0].data.filter(function (value) {
								return value.x.getTime() === roundedTime.valueOf();
							})[0]);

							if (index < 0) {
								invitesChart.config.data.datasets[0].data.push({
									x: roundedTime.toDate(),
									y: 1
								});
							} else {
								invitesChart.config.data.datasets[0].data[index].y++;
							}
						}
					} else if (data.duration === 'year') {
						invitesChart.config.options.scales.xAxes[0].time.unit = 'month';
						invitesChart.config.options.scales.xAxes[0].time.min = moment().startOf('year').toDate();
						invitesChart.config.options.scales.xAxes[0].time.max = moment().startOf('year').add(1, 'year').toDate();
						invitesChart.config.options.scales.xAxes[0].time.tooltipFormat = 'MMMM YYYY';

						for (i = 0; i < 13; i++) {
							invitesChart.config.data.datasets[0].data.push({
								x: moment().startOf('year').add(i, 'months').toDate(),
								y: 0
							});
						}

						for (i = 0; i < data.invites.length; i++) {
							roundedTime = moment(data.invites[i].timestamp).add(15, 'days').startOf('month');
							index = invitesChart.config.data.datasets[0].data.indexOf(invitesChart.config.data.datasets[0].data.filter(function (value) {
								return value.x.getTime() === roundedTime.valueOf();
							})[0]);

							if (index < 0) {
								invitesChart.config.data.datasets[0].data.push({
									x: roundedTime.toDate(),
									y: 1
								});
							} else {
								invitesChart.config.data.datasets[0].data[index].y++;
							}
						}
					} else if (data.duration === 'beginning') {
						delete invitesChart.config.options.scales.xAxes[0].time.unit;
						invitesChart.config.options.scales.xAxes[0].time.min = moment(new Date(data.botAddedAt)).subtract(3, 'days').toDate();
						invitesChart.config.options.scales.xAxes[0].time.max = moment().add(1, 'month').toDate();
						invitesChart.config.options.scales.xAxes[0].time.tooltipFormat = 'MM/DD/YYYY';

						months = (moment().add(1, 'month').valueOf() - data.botAddedAt) / 1000 / 60 / 60 / 24 / 31;

						if (months >= 18) {
							for (i = 0; i < months / 12 + 1; i++) {
								invitesChart.config.data.datasets[0].data.push({
									x: moment(new Date(data.botAddedAt)).add(i, 'years').toDate(),
									y: 0
								});
							}
						} else {
							for (i = 0; i < months + 1; i++) {
								invitesChart.config.data.datasets[0].data.push({
									x: moment(new Date(data.botAddedAt)).startOf('month').add(i, 'months').toDate(),
									y: 0
								});
							}
						}

						for (i = 0; i < data.invites.length; i++) {
							roundedTime = moment(data.invites[i].timestamp).add(15, 'days').startOf('month');
							index = invitesChart.config.data.datasets[0].data.indexOf(invitesChart.config.data.datasets[0].data.filter(function (value) {
								return value.x.getTime() === roundedTime.valueOf();
							})[0]);

							if (index < 0) {
								invitesChart.config.data.datasets[0].data.push({
									x: roundedTime.toDate(),
									y: 1
								});
							} else {
								invitesChart.config.data.datasets[0].data[index].y++;
							}
						}
					}

					invitesChart.update();
				}

				if ('upvoteCount' in data && data.duration === upvotesDurationSelect.options[upvotesDurationSelect.selectedIndex].getAttribute('value')) {
					upvotesStatisticValue.innerText = data.upvoteCount.toLocaleString();

					upvotesChart.config.data.datasets[0].data = [];

					if (data.duration === 'today') {
						upvotesChart.config.options.scales.xAxes[0].time.unit = 'hour';
						upvotesChart.config.options.scales.xAxes[0].time.min = moment().startOf('day').toDate();
						upvotesChart.config.options.scales.xAxes[0].time.max = moment().startOf('hour').add(1, 'hour').toDate();
						upvotesChart.config.options.scales.xAxes[0].time.tooltipFormat = 'h:mm A';

						for (i = 0; i < 24; i++) {
							upvotesChart.config.data.datasets[0].data.push({
								x: moment().startOf('day').add(i, 'hours').toDate(),
								y: 0
							});
						}

						for (i = 0; i < data.upvotes.length; i++) {
							roundedTime = moment(data.upvotes[i].timestamp).add(30, 'minutes').startOf('hour');
							index = upvotesChart.config.data.datasets[0].data.indexOf(upvotesChart.config.data.datasets[0].data.filter(function (value) {
								return value.x.getTime() === roundedTime.valueOf();
							})[0]);

							if (index < 0) {
								upvotesChart.config.data.datasets[0].data.push({
									x: roundedTime.toDate(),
									y: 1
								});
							} else {
								upvotesChart.config.data.datasets[0].data[index].y++;
							}
						}
					} else if (data.duration === 'week') {
						upvotesChart.config.options.scales.xAxes[0].time.unit = 'day';
						upvotesChart.config.options.scales.xAxes[0].time.min = moment().startOf('week').toDate();
						upvotesChart.config.options.scales.xAxes[0].time.max = moment().startOf('week').add(1, 'week').toDate();
						upvotesChart.config.options.scales.xAxes[0].time.tooltipFormat = 'dddd, MM/DD/YYYY';

						for (i = 0; i < 8; i++) {
							upvotesChart.config.data.datasets[0].data.push({
								x: moment().startOf('week').add(i, 'days').toDate(),
								y: 0
							});
						}

						for (i = 0; i < data.upvotes.length; i++) {
							roundedTime = moment(data.upvotes[i].timestamp).add(12, 'hours').startOf('day');
							index = upvotesChart.config.data.datasets[0].data.indexOf(upvotesChart.config.data.datasets[0].data.filter(function (value) {
								return value.x.getTime() === roundedTime.valueOf();
							})[0]);

							if (index < 0) {
								upvotesChart.config.data.datasets[0].data.push({
									x: roundedTime.toDate(),
									y: 1
								});
							} else {
								upvotesChart.config.data.datasets[0].data[index].y++;
							}
						}
					} else if (data.duration === 'month') {
						upvotesChart.config.options.scales.xAxes[0].time.unit = 'day';
						upvotesChart.config.options.scales.xAxes[0].time.min = moment().startOf('month').toDate();
						upvotesChart.config.options.scales.xAxes[0].time.max = moment().startOf('month').add(1, 'month').toDate();
						upvotesChart.config.options.scales.xAxes[0].time.tooltipFormat = 'MM/DD/YYYY';

						for (i = 0; i < 32; i++) {
							upvotesChart.config.data.datasets[0].data.push({
								x: moment().startOf('month').add(i, 'days').toDate(),
								y: 0
							});
						}

						for (i = 0; i < data.upvotes.length; i++) {
							roundedTime = moment(data.upvotes[i].timestamp).add(12, 'hours').startOf('day');
							index = upvotesChart.config.data.datasets[0].data.indexOf(upvotesChart.config.data.datasets[0].data.filter(function (value) {
								return value.x.getTime() === roundedTime.valueOf();
							})[0]);

							if (index < 0) {
								upvotesChart.config.data.datasets[0].data.push({
									x: roundedTime.toDate(),
									y: 1
								});
							} else {
								upvotesChart.config.data.datasets[0].data[index].y++;
							}
						}
					} else if (data.duration === 'year') {
						upvotesChart.config.options.scales.xAxes[0].time.unit = 'month';
						upvotesChart.config.options.scales.xAxes[0].time.min = moment().startOf('year').toDate();
						upvotesChart.config.options.scales.xAxes[0].time.max = moment().startOf('year').add(1, 'year').toDate();
						upvotesChart.config.options.scales.xAxes[0].time.tooltipFormat = 'MMMM YYYY';

						for (i = 0; i < 13; i++) {
							upvotesChart.config.data.datasets[0].data.push({
								x: moment().startOf('year').add(i, 'months').toDate(),
								y: 0
							});
						}

						for (i = 0; i < data.upvotes.length; i++) {
							roundedTime = moment(data.upvotes[i].timestamp).add(15, 'days').startOf('month');
							index = upvotesChart.config.data.datasets[0].data.indexOf(upvotesChart.config.data.datasets[0].data.filter(function (value) {
								return value.x.getTime() === roundedTime.valueOf();
							})[0]);

							if (index < 0) {
								upvotesChart.config.data.datasets[0].data.push({
									x: roundedTime.toDate(),
									y: 1
								});
							} else {
								upvotesChart.config.data.datasets[0].data[index].y++;
							}
						}
					} else if (data.duration === 'beginning') {
						delete upvotesChart.config.options.scales.xAxes[0].time.unit;
						upvotesChart.config.options.scales.xAxes[0].time.min = moment(new Date(data.botAddedAt)).subtract(3, 'days').toDate();
						upvotesChart.config.options.scales.xAxes[0].time.max = moment().add(1, 'month').toDate();
						upvotesChart.config.options.scales.xAxes[0].time.tooltipFormat = 'MM/DD/YYYY';

						months = (moment().add(1, 'month').valueOf() - data.botAddedAt) / 1000 / 60 / 60 / 24 / 31;

						if (months >= 18) {
							for (i = 0; i < months / 12 + 1; i++) {
								upvotesChart.config.data.datasets[0].data.push({
									x: moment(new Date(data.botAddedAt)).add(i, 'years').toDate(),
									y: 0
								});
							}
						} else {
							for (i = 0; i < months + 1; i++) {
								upvotesChart.config.data.datasets[0].data.push({
									x: moment(new Date(data.botAddedAt)).startOf('month').add(i, 'months').toDate(),
									y: 0
								});
							}
						}

						for (i = 0; i < data.upvotes.length; i++) {
							roundedTime = moment(data.upvotes[i].timestamp).add(15, 'days').startOf('month');
							index = upvotesChart.config.data.datasets[0].data.indexOf(upvotesChart.config.data.datasets[0].data.filter(function (value) {
								return value.x.getTime() === roundedTime.valueOf();
							})[0]);

							if (index < 0) {
								upvotesChart.config.data.datasets[0].data.push({
									x: roundedTime.toDate(),
									y: 1
								});
							} else {
								upvotesChart.config.data.datasets[0].data[index].y++;
							}
						}
					}

					upvotesChart.update();
				}
			} else if (data.type === 'identify') {
				onViewsDurationChange();
				onInvitesDurationChange();
				onUpvotesDurationChange();
			} else if (data.type === 'ready') {
				send('identify', { bot: window.location.pathname.split('/')[2] });
			}
		} catch (e) {
			console.warn(e);
		}
	}

	function onSocketClose(event) {
		console.log('WebSocket has closed', event);

		clearTimeout(heartbeatTimeout);
		clearInterval(heartbeatInterval);

		socket = new WebSocket(window.location.protocol.replace(/http(s)?/, 'ws$1') + '//' + window.location.host + '/analytics');
		socket.addEventListener('open', onSocketOpen);
		socket.addEventListener('message', onSocketMessage);
		socket.addEventListener('close', onSocketClose);
	}

	function send(type, data) {
		if (socket.readyState !== socket.OPEN) return;

		data = data || {};

		var payload = { type: type, time: Date.now() };

		for (var key in data) {
			if (Object.prototype.hasOwnProperty.call(data, key)) {
				payload[key] = data[key];
			}
		}

		socket.send(JSON.stringify(payload));
	}

	function onViewsDurationChange() {
		viewsStatisticValue.innerText = 'Loading...';

		send('request', { statistic: 0, duration: viewsDurationSelect.options[viewsDurationSelect.selectedIndex].getAttribute('value') });
	}

	function onInvitesDurationChange() {
		invitesStatisticValue.innerText = 'Loading...';

		send('request', { statistic: 1, duration: invitesDurationSelect.options[invitesDurationSelect.selectedIndex].getAttribute('value') });
	}

	function onUpvotesDurationChange() {
		upvotesStatisticValue.innerText = 'Loading...';

		send('request', { statistic: 2, duration: upvotesDurationSelect.options[upvotesDurationSelect.selectedIndex].getAttribute('value') });
	}

	viewsDurationSelect.addEventListener('change', onViewsDurationChange);
	invitesDurationSelect.addEventListener('change', onInvitesDurationChange);
	upvotesDurationSelect.addEventListener('change', onUpvotesDurationChange);
	socket.addEventListener('open', onSocketOpen);
	socket.addEventListener('message', onSocketMessage);
	socket.addEventListener('close', onSocketClose);
})();