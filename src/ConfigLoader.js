require('mootools');

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
		from:	process.cwd(),
		to:		userHome,	// thanks http://stackoverflow.com/questions/9080085
		user:	userHome,

		appName:	pathUtils.basename(process.argv[1], '.js'),

		defaults:	Object.create(null)	// a simple Hash, with none Object methods
	},

	initialize: function init(options) {
		this.setOptions(options);
	},

	/** Loads all config to be found for the given filename, across all search domains.
	*
	*@see	README
	*/
	load: function load(filename) {
		this.file = filename;

		this.result = this.options.defaults[filename] || this.options.defaults;

		this.loadAllWithin(this.options.from, this.options.to)
			.loadFromDirectory(pathUtils.join(userHome, '.' + this.options.appName))
			.loadFromDirectory(process.argv[1]);

		return this.result;
	},

	/** Adds to the result all config files found between the two given directories.
	*
	*@return	{ConfigLoader}	this, for chainability.
	*@private
	*/
	loadAllWithin: function loadAllWithin(from, to) {
		var cwd = fs.realpathSync(from),
			prevCwd,
			to = fs.realpathSync(to);

		do {
			this.loadFromDirectory(cwd);
			prevCwd = cwd;	// used to check whether the root was reached (dirname('/') == '/', but has to be cross-platform)
			cwd = pathUtils.dirname(cwd);
		} while (cwd != prevCwd
				 && cwd.indexOf(to) === 0);	// go up the directory tree only as long as we're above the limit directory

		return this;
	},

	/** Merges the current config with the one to be found in the given directory.
	* If no file is found, the config is not changed.
	*
	*@return	{ConfigLoader}	this, for chainability.
	*@see	#result
	*@private
	*/
	loadFromDirectory: function loadFromDirectory(dir) {
		var newData = this.parse(pathUtils.join(dir, this.file));
		this.result = Object.merge(newData, this.result);
		return this;
	},

	/** Returns the contents of the given file, or an empty hash if none is found.
	*
	*@return	{Object}	The parsed contents of the given file.
	*@private
	*/
	parse: function parse(file) {
		try {
			return require(file);	//TODO: support YAML
		} catch (e) {
			return Object.create(null);	// a simple Hash, with none Object methods
		}
	}
});

module.exports = ConfigLoader;	// CommonJS export
