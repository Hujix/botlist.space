module.exports = {
	authSecret: '',
	bot: {
		token: '',
		prefix: '^',
		clientOptions: {
			getAllUsers: true,
			restMode: true
		}
	},
	discord: {
		clientID: '',
		clientSecret: '',
		scope: ['identify'],
		callbackURL: '/auth/callback',
		server: 'https://discord.gg/GjEWBQE',
		guildID: '387812458661937152',
		channels: {
			siteLogs: '387838533747867648',
			upvoteLogs: '499724059681095717'
		},
		roles: {
			bot: '387815333487968257',
			botDeveloper: '387815863677616130',
			serverOwner: '501940234083368962',
			pendingVerification: '419551687414513705',
			staff: '387819458024177676',
			certified: '566673589252915232',
			certificationTeam: '586763674836795404'
		}
	}
};
