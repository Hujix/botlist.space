const path = require('path');
const fs = require('fs').promises;
const autoprefixer = require('autoprefixer');
const postcss = require('postcss');
const uglifycss = require('uglifycss');
const uglifyjs = require('uglify-js');
const Logger = require('../src/Util/Logger');

const cssFiles = [];
const jsFiles = [];

const minifyCSS = async () => {
	for (let i = 0; i < cssFiles.length; i++) {
		const data = await fs.readFile(cssFiles[i]);

		const prefixed = await postcss([autoprefixer]).process(data, { from: null });

		const minified = uglifycss.processString(prefixed.css.toString());

		fs.writeFile(cssFiles[i].split('.').slice(0, -1).join('.') + '.min.css', minified, (error) => {
			if (error) throw error;

			Logger.info('Successfully minified ' + cssFiles[i] + '.');
		});
	}
};

const minifyJS = async () => {
	for (let i = 0; i < jsFiles.length; i++) {
		const data = await fs.readFile(jsFiles[i]);

		const minified = uglifyjs.minify(data.toString(), { output: { comments: false } });

		if (minified.error) return Logger.error(jsFiles[i], minified.error);

		fs.writeFile(jsFiles[i].split('.').slice(0, -1).join('.') + '.min.js', minified.code, (error) => {
			if (error) throw error;

			Logger.info('Successfully minified ' + cssFiles[i] + '.');
		});
	}
};

const searchFolder = async (directory) => {
	const files = await fs.readdir(directory);

	for (let i = 0; i < files.length; i++) {
		if (!files[i].includes('.min')) {
			const stat = await fs.stat(path.join(directory, files[i]));

			if (stat.isDirectory()) {
				searchFolder(path.join(directory, files[i]));
			} else if (files[i].endsWith('.css')) {
				cssFiles.push(path.join(directory, files[i]));
			} else if (files[i].endsWith('.js')) {
				jsFiles.push(path.join(directory, files[i]));
			}
		}
	}
};

searchFolder(path.join(__dirname, '..', 'src', 'Static', 'css'));
searchFolder(path.join(__dirname, '..', 'src', 'Static', 'js'));

process.once('beforeExit', () => {
	minifyCSS();
	minifyJS();
});