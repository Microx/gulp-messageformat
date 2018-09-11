const Vinyl = require('vinyl');
const PluginError = require('plugin-error');
const path = require('path');
const MessageFormat = require('messageformat');
const EOL = require('os').EOL;
const through = require('through2');

module.exports = function (options) {
	let  messages = {};
	let resultFile = null;

	options = options || {};

	if (!options.locale) {
		throw new PluginError('gulp-messageformat', 'Options `locale` is required.');
	}

	options.namespace = options.namespace || 'i18n';
	const mf = new MessageFormat(options.locale.trim());

	function parse(file, encoding, next) {

		if (file.isNull()) {
			this.push(file);
			next();
			return;
		}

		if (file.isStream()) {
			next(new PluginError('gulp-messageformat', 'Streaming not supported' ,{
				fileName: file.path,
				showStack: false
			}));
			return;
		}

		if (!resultFile) {
			resultFile = new Vinyl({
				path: path.join(file.base, options.locale + '.js'),
				base: file.base,
				cwd: file.cwd,
				contents: new Buffer('')
			});
		}

		try {
			let input = JSON.parse(file.contents.toString());
			var fileName = path.basename(file.path, path.extname(file.path));
			Object.assign(messages, { [fileName]: input });
		} catch (errs) {
			var message = '';

			if (errs.join) {
				message = errs.join('\n');
			} else {
				message = errs.name + ': ' +  errs.message + '. File: ' + file.relative;
			}

			this.emit('error', new PluginError('gulp-messageformat', message, {
				fileName: file.path,
				showStack: false
			}));
		}

		next();
	}

	function flush(cb) {
		if(!resultFile) {
			cb();
			return;
		}

		let result = mf.compile(messages).toString(options.namespace);
		resultFile.contents = new Buffer(result);

		this.push(resultFile);

		cb();
	}

	return through.obj(parse, flush);

};
