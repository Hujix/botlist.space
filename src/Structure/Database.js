const MongoDB = require('mongodb');
const EventEmitter = require('events').EventEmitter;

class Database extends EventEmitter {
	constructor(parent) {
		super();

		Object.assign(this, parent);

		this.client = new MongoDB.MongoClient(process.env.MONGO, { useNewUrlParser: true, useUnifiedTopology: true, poolSize: 12 });
		this.db = null;

		this.ready = false;

		this.connect();
	}

	connect() {
		return this.client.connect()
			.then(() => {
				this.ready = true;

				this.emit('ready');

				this.db = this.client.db('botlist');
			});
	}

	getAllBots() {
		return this.db
			.collection('bots')
			.find()
			.toArray();
	}

	getAllUsers() {
		return this.db
			.collection('users')
			.find()
			.toArray();
	}

	getTopBotsByUpvotes(limit) {
		return this.db
			.collection('bots')
			.aggregate([
				{ $match: { approved: true } },
				{ $addFields: { upvotes: { $size: '$upvotes' } } }
			])
			.sort({ upvotes: -1 })
			.limit(limit)
			.toArray();
	}

	getRandomCertifiedBots(limit) {
		return this.db
			.collection('bots')
			.aggregate([
				{ $match: { approved: true, certified: true } },
				{ $sample: { size: limit } },
			])
			.toArray();
	}

	getRandomBots(limit) {
		return this.db
			.collection('bots')
			.aggregate([
				{ $match: { approved: true } },
				{ $sample: { size: limit } }
			])
			.toArray();
	}

	getNewBots(limit) {
		return this.db
			.collection('bots')
			.find({ approved: true })
			.sort({ created_at: -1 })
			.limit(limit)
			.toArray();
	}

	getTopUpvotedTags(limit) {
		return this.db
			.collection('tags')
			.aggregate([
				{ $lookup: { from: 'bots', localField: 'id', foreignField: 'tags', as: 'bots' } },
				{ $addFields: { upvotes: { $map: { input: '$bots', as: 'bot', in: { $size: '$$bot.upvotes' } } } } },
				{ $addFields: { upvotes: { $reduce: { input: '$upvotes', initialValue: 0, in: { $add: ['$$this', '$$value'] } } } } }
			])
			.sort({ upvotes: -1 })
			.limit(limit)
			.toArray();
	}

	getAllTags() {
		return this.db
			.collection('tags')
			.find()
			.toArray();
	}

	getAllTagsSorted() {
		return this.db
			.collection('tags')
			.aggregate([
				{ $addFields: { lowerName: { $toLower: '$name' } } }
			])
			.sort({ name: -1 })
			.toArray();
	}

	getBot(id) {
		return this.db
			.collection('bots')
			.findOne({ id });
	}

	getBotVanity(id) {
		return this.db
			.collection('bots')
			.findOne({ $or: [{ id }, { vanity: id }] });
	}

	findBotByVanityIgnoreID(vanity, id) {
		return this.db
			.collection('bots')
			.findOne({ vanity, id: { $not: { $eq: id } } });
	}

	getTags(tags) {
		return this.db
			.collection('tags')
			.find({ id: { $in: tags } })
			.toArray();
	}

	getTag(id) {
		return this.db
			.collection('tags')
			.findOne({ id });
	}

	getTagByShort(short) {
		return this.db
			.collection('tags')
			.findOne({ short });
	}

	getUsers(users) {
		return this.db
			.collection('users')
			.find({ id: { $in: users } })
			.toArray();
	}

	getUser(id) {
		return this.db
			.collection('users')
			.findOne({ id });
	}

	getUserSession(token) {
		return this.db
			.collection('users')
			.findOne({ session: token });
	}

	updateUser(id, props) {
		return this.db
			.collection('users')
			.updateOne({ id }, { $set: props });
	}

	updateUptime(id, props) {
		return this.db
			.collection('uptime')
			.updateOne({ id }, { $set: props });
	}

	updateBot(id, props) {
		return this.db
			.collection('bots')
			.updateOne({ id }, { $set: props });
	}

	getBotsByOwner(id) {
		return this.db
			.collection('bots')
			.find({
				owners: { $in: [id] }
			})
			.toArray();
	}

	getApprovedBotsByOwner(id) {
		return this.db
			.collection('bots')
			.find({
				owners: { $in: [id] },
				approved: true
			})
			.toArray();
	}

	getAllLanguages() {
		return this.db
			.collection('languages')
			.find()
			.toArray();
	}

	getAdminUsers() {
		return this.db
			.collection('users')
			.find({ admin: true })
			.toArray();
	}

	getAllLibrariesSorted() {
		return this.db
			.collection('libraries')
			.find()
			.sort({ name: 1 })
			.toArray();
	}

	getLibrary(id) {
		return this.db
			.collection('libraries')
			.findOne({ id });
	}

	getLibraryByShort(short) {
		return this.db
			.collection('libraries')
			.findOne({ short });
	}

	insertBot(document) {
		return this.db
			.collection('bots')
			.insertOne(document);
	}

	insertStatistics(document) {
		return this.db
			.collection('statistics')
			.insertOne(document);
	}

	deleteStatistics(id) {
		return this.db
			.collection('statistics')
			.deleteOne({ id });
	}

	insertUser(document) {
		return this.db
			.collection('users')
			.insertOne(document);
	}

	insertUptime(document) {
		return this.db
			.collection('uptime')
			.insertOne(document);
	}

	insertAudit(document) {
		return this.db
			.collection('audit')
			.insertOne(document);
	}

	getAllUnapprovedBots() {
		return this.db
			.collection('bots')
			.find({ approved: false })
			.sort({ created_at: 1 })
			.toArray();
	}

	getCertificationQueueWithUptime() {
		return this.db
			.collection('certification')
			.aggregate([
				{ $lookup: { from: 'bots', localField: 'id', foreignField: 'id', as: 'bot' } },
				{ $lookup: { from: 'uptime', localField: 'id', foreignField: 'id', as: 'uptime' } },
				{ $addFields: { bot: { $arrayElemAt: ['$bot', 0] }, uptime: { $arrayElemAt: ['$uptime', 0] } } },
				{ $lookup: { from: 'users', localField: 'bot.owners', foreignField: 'id', as: 'bot.owners' } }
			])
			.sort({ created_at: -1 })
			.toArray();
	}

	deleteCertification(id) {
		return this.db
			.collection('certification')
			.deleteOne({ id });
	}

	getCertification(id) {
		return this.db
			.collection('certification')
			.findOne({ id });
	}

	findBotsByUsernameSorted(username, page, count) {
		return this.db
			.collection('bots')
			.find({ username: { $regex: username } })
			.sort({ username: 1 })
			.skip(page)
			.limit(count)
			.toArray();
	}

	findBotsByUsernameCount(username) {
		return this.db
			.collection('bots')
			.find({ username: { $regex: username } })
			.count();
	}

	getAllBotsCount() {
		return this.db
			.collection('bots')
			.countDocuments();
	}

	getAllBotsPaginatedSorted(skip, count) {
		return this.db
			.collection('bots')
			.find()
			.sort({ username: 1 })
			.skip(skip)
			.limit(count)
			.toArray();
	}

	findUsersByUsernameSorted(username, page, count) {
		return this.db
			.collection('users')
			.find({ username: { $regex: username } })
			.sort({ username: 1 })
			.skip(page)
			.limit(count)
			.toArray();
	}

	findUsersByUsernameCount(username) {
		return this.db
			.collection('users')
			.find({ username: { $regex: username } })
			.count();
	}

	getAllUsersCount() {
		return this.db
			.collection('users')
			.countDocuments();
	}

	getAllUsersPaginatedSorted(skip, count) {
		return this.db
			.collection('users')
			.find()
			.sort({ username: 1 })
			.skip(skip)
			.limit(count)
			.toArray();
	}

	getAllBannedUsers() {
		return this.db
			.collection('users')
			.find({ banned: true })
			.toArray();
	}

	getAllApprovedBots() {
		return this.db
			.collection('bots')
			.find({ approved: true })
			.toArray();
	}

	getAllApprovedBotsCount() {
		return this.db
			.collection('bots')
			.find({ approved: true })
			.count();
	}

	getAllApprovedBotsWithUptime() {
		return this.db
			.collection('bots')
			.aggregate([
				{ $match: { approved: true } },
				{ $lookup: { from: 'uptime', localField: 'id', foreignField: 'id', as: 'uptime' } },
				{ $addFields: { uptime: { $arrayElemAt: ['$uptime', 0] } } }
			])
			.toArray();
	}

	findLibraryByName(name) {
		return this.db
			.collection('libraries')
			.findOne({ name });
	}

	insertLibrary(document) {
		return this.db
			.collection('libraries')
			.insertOne(document);
	}

	deleteLibrary(id) {
		return this.db
			.collection('libraries')
			.deleteOne({ id });
	}

	getUptime(id) {
		return this.db
			.collection('uptime')
			.findOne({ id });
	}

	getAllAuditsForBotWithUsersSorted(id) {
		return this.db
			.collection('audit')
			.aggregate([
				{ $match: { $or: [{ 'new_entry.id': id }, { 'old_entry.id': id }] } },
				{ $lookup: { from: 'users', localField: 'user', foreignField: 'id', as: 'user' } },
				{ $addFields: { user: { $arrayElemAt: ['$user', 0] } } }
			])
			.sort({ timestamp: -1 })
			.toArray();
	}

	deleteBot(id) {
		return this.db
			.collection('bots')
			.deleteOne({ id });
	}

	deleteUptime(id) {
		return this.db
			.collection('uptime')
			.deleteOne({ id });
	}

	getUserWithFields(id, fields) {
		const project = {};

		for (let i = 0; i < fields.length; i++) {
			project[fields[i]] = '$' + fields[i];
		}

		return this.db
			.collection('users')
			.aggregate([
				{ $match: { id } },
				{ $project: { _id: 0, ...project } }
			])
			.limit(1)
			.next();
	}

	getAllBotsWithFields(fields, userFields) {
		const project = {};

		for (let i = 0; i < fields.length; i++) {
			project[fields[i]] = '$' + fields[i];
		}

		const userProject = {};

		for (let i = 0; i < userFields.length; i++) {
			userProject[userFields[i]] = '$$owner.' + userFields[i];
		}

		return this.db
			.collection('bots')
			.aggregate([
				{ $project: { _id: 0, ...project } },
				{ $lookup: { from: 'libraries', localField: 'library', foreignField: 'id', as: 'library' } },
				{ $lookup: { from: 'users', localField: 'owners', foreignField: 'id', as: 'owners' } },
				{ $lookup: { from: 'tags', localField: 'tags', foreignField: 'id', as: 'tags' } },
				{ $addFields: { library: { $arrayElemAt: ['$library.name', 0] }, tags: '$tags.name', owners: { $map: { input: '$owners', as: 'owner', in: userProject } } } },
			])
			.toArray();
	}

	getBotWithFields(id, fields, userFields) {
		const project = {};

		for (let i = 0; i < fields.length; i++) {
			project[fields[i]] = '$' + fields[i];
		}

		const userProject = {};

		for (let i = 0; i < userFields.length; i++) {
			userProject[userFields[i]] = '$$owner.' + userFields[i];
		}

		return this.db
			.collection('bots')
			.aggregate([
				{ $match: { id } },
				{ $project: { _id: 0, ...project } },
				{ $lookup: { from: 'libraries', localField: 'library', foreignField: 'id', as: 'library' } },
				{ $lookup: { from: 'users', localField: 'owners', foreignField: 'id', as: 'owners' } },
				{ $lookup: { from: 'tags', localField: 'tags', foreignField: 'id', as: 'tags' } },
				{ $addFields: { library: { $arrayElemAt: ['$library.name', 0] }, tags: '$tags.name', owners: { $map: { input: '$owners', as: 'owner', in: userProject } } } },
			])
			.limit(1)
			.next();
	}

	getAllBotUpvotes(id, userFields) {
		const userProject = {};

		for (let i = 0; i < userFields.length; i++) {
			userProject[userFields[i]] = '$user.' + userFields[i];
		}

		return this.db
			.collection('bots')
			.aggregate([
				{ $match: { id } },
				{ $unwind: '$upvotes' },
				{ $lookup: { from: 'users', localField: 'upvotes.id', foreignField: 'id', as: 'user' } },
				{ $addFields: { user: { $arrayElemAt: ['$user', 0] }, timestamp: '$upvotes.timestamp' } },
				{ $project: { _id: 0, user: userProject, timestamp: 1 } }
			])
			.toArray();
	}

	getAllBotsApprovedCount() {
		return this.db
			.collection('bots')
			.find({ approved: true })
			.count();
	}

	getAllBotsUnpprovedCount() {
		return this.db
			.collection('bots')
			.find({ approved: false })
			.count();
	}

	getTopBotsByUpvotesPaginated(skip, limit) {
		return this.db
			.collection('bots')
			.aggregate([
				{ $match: { approved: true } },
				{ $addFields: { upvotes: { $size: '$upvotes' } } }
			])
			.sort({ upvotes: -1 })
			.skip(skip)
			.limit(limit)
			.toArray();
	}

	getTopBotsByTimestampPaginated(skip, limit) {
		return this.db
			.collection('bots')
			.find({ approved: true })
			.sort({ created_at: -1 })
			.skip(skip)
			.limit(limit)
			.toArray();
	}

	getCertifiedBotsCount() {
		return this.db
			.collection('bots')
			.find({ certified: true })
			.count();
	}

	getCertifiedBotsByIDPaginated(skip, limit) {
		return this.db
			.collection('bots')
			.find({ certified: true })
			.sort({ id: 1 })
			.skip(skip)
			.limit(limit)
			.toArray();
	}

	getApprovedBotsByTagCount(tag) {
		return this.db
			.collection('bots')
			.find({ approved: true, tags: { $in: [tag] } })
			.count();
	}

	getApprovedBotsByLibraryCount(library) {
		return this.db
			.collection('bots')
			.find({ approved: true, library })
			.count();
	}

	getApprovedBotsByTagPaginated(tag, skip, limit) {
		return this.db
			.collection('bots')
			.aggregate([
				{ $match: { approved: true, tags: { $in: [tag] } } },
				{ $addFields: { upvotes: { $size: '$upvotes' } } }
			])
			.sort({ upvotes: -1 })
			.skip(skip)
			.limit(limit)
			.toArray();
	}

	getApprovedBotsByLibraryPaginated(library, skip, limit) {
		return this.db
			.collection('bots')
			.aggregate([
				{ $match: { approved: true, library } },
				{ $addFields: { upvotes: { $arrayElemAt: ['$upvotes', 0] } } }
			])
			.sort({ upvotes: -1 })
			.skip(skip)
			.limit(limit)
			.toArray();
	}

	getAllTagsCount() {
		return this.db
			.collection('tags')
			.countDocuments();
	}

	getAllBotsWithUptime() {
		return this.db
			.collection('bots')
			.aggregate([
				{ $lookup: { from: 'uptime', localField: 'id', foreignField: 'id', as: 'uptime' } },
				{ $addFields: { uptime: { $arrayElemAt: ['$uptime', 0] } } }
			])
			.toArray();
	}

	getAllBotsWithTags() {
		return this.db
			.collection('bots')
			.aggregate([
				{ $lookup: { from: 'tags', localField: 'tags', foreignField: 'id', as: 'tags' } }
			])
			.toArray();
	}

	updateAllBots(props) {
		return this.db
			.collection('bots')
			.updateMany({}, { $set: props });
	}

	updateAllUsersRaw(props) {
		return this.db
			.collection('users')
			.updateMany({}, props);
	}

	getBotsByOwnerWithFields(id, fields, userFields) {
		const project = {};

		for (let i = 0; i < fields.length; i++) {
			project[fields[i]] = '$' + fields[i];
		}

		const userProject = {};

		for (let i = 0; i < userFields.length; i++) {
			userProject[userFields[i]] = '$$owner.' + userFields[i];
		}

		return this.db
			.collection('bots')
			.aggregate([
				{ $match: { owners: { $in: [id] } } },
				{ $lookup: { from: 'libraries', localField: 'library', foreignField: 'id', as: 'library' } },
				{ $lookup: { from: 'users', localField: 'owners', foreignField: 'id', as: 'owners' } },
				{ $lookup: { from: 'tags', localField: 'tags', foreignField: 'id', as: 'tags' } },
				{ $addFields: { library: { $arrayElemAt: ['$library.name', 0] }, tags: '$tags.name', owners: { $map: { input: '$owners', as: 'owner', in: userProject } } } },
				{ $project: { _id: 0, ...project } }
			])
			.toArray();
	}

	getBotsByOwnerCount(id) {
		return this.db
			.collection('bots')
			.find({ owners: { $in: [id] } })
			.count();
	}

	getServersByOwner(id) {
		return this.db
			.collection('servers')
			.find({ owners: { $in: [id] } })
			.toArray();
	}

	getCertificationApplication(id) {
		return this.db
			.collection('certification')
			.findOne({ id });
	}

	insertCertificationApplication(document) {
		return this.db
			.collection('certification')
			.insertOne(document);
	}

	getAllBotsByTokens(tokens) {
		return this.db
			.collection('bots')
			.find({ token: { $in: [tokens] } });
	}

	getStatistics(id) {
		return this.db
			.collection('statistics')
			.findOne({ id });
	}

	updateStatistics(id, properties) {
		return this.db
			.collection('statistics')
			.updateOne({ id }, { $set: properties });
	}

	getBotViewStatisticsAfter(id, timestamp) {
		return this.db
			.collection('statistics')
			.aggregate([
				{ $match: { id } },
				{ $unwind: '$views' },
				{ $match: { 'views.timestamp': { $gte: timestamp } } }
			])
			.toArray();
	}

	getBotInviteStatisticsAfter(id, timestamp) {
		return this.db
			.collection('statistics')
			.aggregate([
				{ $match: { id } },
				{ $unwind: '$invites' },
				{ $match: { 'invites.timestamp': { $gte: timestamp } } }
			])
			.toArray();
	}

	getBotUpvoteStatisticsAfter(id, timestamp) {
		return this.db
			.collection('statistics')
			.aggregate([
				{ $match: { id } },
				{ $unwind: '$upvotes' },
				{ $match: { 'upvotes.timestamp': { $gte: timestamp } } }
			])
			.toArray();
	}

	pushStatisticsField(ids, push) {
		return this.db
			.collection('statistics')
			.updateMany({ id: { $in: ids } }, { $push: push });
	}

	pushStatisticField(id, push) {
		return this.db
			.collection('statistics')
			.updateMany({ id }, { $push: push });
	}
}

module.exports = Database;