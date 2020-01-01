class Collection extends Map {
	constructor(args) {
		super(args);
	}

	filter(func) {
		let result = [];
		const all = Array.from(this.values());
		for (let i = 0; i < all.length; i++) {
			if (func(all[i])) result.push(all[i]);
		}
		return result;
	}

	map(func) {
		const values = Array.from(this.values());
		let result = [];
		for (let i = 0; i < values.length; i++) {
			result.push(func(values[i]));
		}
		return result;
	}
}

module.exports = Collection;