var pathUtils = require('path');
	fs = require('fs')

var userHome = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];

/** 
*
* Supported formats are JSON and YAML.
*/
var ConfigLoader = new Class({
	Implements: Options,

	options: {
		file: 'config.json',

		directories: {
			from:	process.cwd(),
			to:		userHome,	// thanks http://stackoverflow.com/questions/9080085
			user:	userHome
		},

		appName:	pathUtils.basename(process.argv[1], '.js'),

		defaults:	Object.create(null)	// a simple Hash, with none Object methods
	},

	initialize: function init(options) {
		this.setOptions(options);
		this.result = this.options.defaults;
	},

	findInDirectories: function findInDirectories() {
		var cwd = fs.realpathSync(this.options.from),
			prevCwd,
			to = fs.realpathSync(this.options.to);

		do {
			prevCwd = cwd;	// used to check whether the root was reached (dirname('/') == '/', but has to be cross-platform)
			if ()
				this.add()

			cwd = pathUtils.dirname(cwd);
		} while (cwd != prevCwd
				 && cwd.indexOf(to) === 0);	// go up the directory tree only as long as we're above the limit directory
	},

	loadFromDirectory: function loadFromDirectory(dir) {
		var newData = this.load(pathUtils.join(dir, this.options.file));
		this.result = Object.merge(newData, this.result);
		return this.result;
	},

	load: function load(file) {
		try {
			return require(file);	//TODO: support YAML
		} catch (e) {
			return Object.create(null);	// a simple Hash, with none Object methods
		}
	}
});

module.exports = ConfigLoader;	// CommonJS export
