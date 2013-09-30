require('mootools');

var pathUtils = require('path');
	fs = require('fs')

/** Cross-platform user’s `$HOME` (i.e. `~`).
*@type	{String}
*@private
*/
var USER_HOME = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];	// thanks http://stackoverflow.com/questions/9080085

/** Node 0.6 compatibility.
*@private
*/
var existsSync = fs.existsSync || pathUtils.existsSync;



var ConfigLoader = new Class( /** @lends ConfigLoader# */ {
	Implements: Options,

	/** These options can be set either by passing them to the constructor, or by later calling `setOptions` and passing a hash with the ones to override.
	*
	*@namespace
	*/
	options: {

		/** The directory from which to start looking for configuration files.
		*
		*@type	{String}
		*@default	cwd
		*/
		from:	process.cwd(),

		/** The directory at which to end looking for configuration files.
		*
		*@type	{String}
		*@default	User’s home directory.
		*/
		to:		USER_HOME,

		/** The directory in which to look for user-specific configuration files.
		*
		*@type	{String}
		*@default	User’s home directory.
		*/
		user:	USER_HOME,

		/** Name of the directory in which to look for application-specific configuration files.
		* See step 2 of the lookup algorithm.
		*
		*@type	{String}
		*@default	Base name of the executing script.
		*/
		appName:	pathUtils.basename(process.argv[1], '.js'),

		/** Directories paths to visit additionally, after the standard lookup algorithm is done.
		*
		*@type	{Array.<String>}
		*/
		visitAlso:	[],

		/** Programmatically set some values.
		* If different files can be looked up by this ConfigLoader, this can be a hash of default hashes, whose keys are names of the files that will be looked up.
		*
		*@example
		*	{ 'config': {
		*		// override values when calling load('config')
		*	}, 'database': {
		*		// override values when calling load('database')
		*	} }
		*@type	{Object}
		*@default	Empty hash.
		*/
		override:	null,

		/** If set to a function, will call it for each encountered directory, with two parameters:
		* 1. The visited directory.
		* 2. The parsed data (all since the beginning, not only the new one from the given directory).
		* Especially useful for quick debugging with `observer: console.error`, but could be used with Winston loggers or any event-driven trigger.
		*
		*@type	{Function}
		*@default	false
		*/
		observer:	false,

		/** If set to a function, will call it each time data is about to be added, storing the returned value instead of the original data.
		* Called with the following parameters:
		* 1. The data that is about to be added.
		* 2. The data that is already stored.
		* The return type must be an object, so that it can be stored.
		*
		*@type	{Function}
		*@default	false
		*/
		transform:	false
	},

	/** Storage for in-progress parsing.
	*
	*@type	{Object}
	*@private
	*/
	result:	{},

	/** @class	Loads a configuration with cascading overrides.
	* The lookup algorithm is as follows:
	* 1. Start looking in the given directory (default to `cwd`), all the way up to another directory (default to user’s `$HOME`).
	* 2. Look in `$HOME/.<appname>/` (user config).
	* 3. Look in app default (`dirname($0)`).
	*
	*@constructs
	*/
	initialize: function init(options) {
		this.setOptions(options);

		if (this.options.observer && typeof this.options.observer != 'function')
			throw new TypeError('The "observer" option must be either `false` or a function');

		if (this.options.transform && typeof this.options.transform != 'function')
			throw new TypeError('The "transform" option must be either `false` or a function');

		if (typeof this.options.visitAlso == 'string')
			this.options.visitAlso = [ this.options.visitAlso ];	// shortcut
	},

	/** Loads all config to be found for the given filename, across all search domains.
	*
	*@returns	{Hash}	A hash with all loaded values.
	*/
	load: function load(filename) {
		this.file = filename;

		this.result = {};

		if (this.options.override)
			this.loadData(this.options.override[this.file] || this.options.override);

		this.loadAllWithin(this.options.from, this.options.to)
			.loadFromDirectory(pathUtils.join(USER_HOME, '.' + this.options.appName))
			.loadFromDirectory(pathUtils.dirname(process.argv[1]));

		this.options.visitAlso.each(this.loadFromDirectory, this);

		return this.result;
	},

	/** Adds the given data to the loaded config.
	*
	*@param		{Hash}	data	The values to load.
	*@returns	{Hash}	A hash with all loaded values.
	*@private
	*/
	loadData: function loadData(data) {
		if (this.options.transform)
			data = this.options.transform(data, this.result);

		this.result = Object.merge(data, this.result);

		return this.result;
	},

	/** Adds to the result all config files found between the two given directories.
	*
	*@returns	{ConfigLoader}	this, for chainability.
	*@private
	*/
	loadAllWithin: function loadAllWithin(from, to) {
		var cwd	= fs.realpathSync(from),
			to	= fs.realpathSync(to),
			prevCwd;

		do {
			this.loadFromDirectory(cwd);
			prevCwd	= cwd;	// used to check whether the root was reached (dirname('/') == '/', but has to be cross-platform)
			cwd		= pathUtils.dirname(cwd);
		} while (cwd != prevCwd
				 && cwd.indexOf(to) === 0);	// go up the directory tree only as long as we're above the limit directory

		return this;
	},

	/** Merges the current config with the one to be found in the given directory.
	* If no file is found, the config is not changed.
	*
	*@returns	{ConfigLoader}	this, for chainability.
	*@see	result
	*@private
	*/
	loadFromDirectory: function loadFromDirectory(dir) {
		var newData = this.parseBestMatch(pathUtils.join(dir, this.file));

		this.loadData(newData);

		if (this.options.observer)
			this.options.observer(dir, this.result);

		return this;
	},

	/** The files to look for may avoid specifying an extension, and let users specify configuration in whichever supported language they want. This method parses the best matching file from a possibly incomplete file path.
	* If the given file is an exact match, the parser to use is determined from its extension.
	* Otherwise, all extensions defined in the static `parsers` hash will be attempted, until there is a match.
	*
	*@param		{String}	file	A path to a specific file, or to a file without an extension.
	*@returns	{Hash}		The parsed contents of the best matching file, or an empty hash if any error arises or no file matches.
	*@private
	*/
	parseBestMatch: function parseBestMatch(file) {
		if (existsSync(file) && fs.statSync(file).isFile())
			return this.parse(file, pathUtils.extname(file).slice(1).toLowerCase());

		var result = {};

		for (var extension in ConfigLoader.parsers) {
			if (Object.prototype.hasOwnProperty.call(ConfigLoader.parsers, extension)) {
				var tentativeName = file + '.' + extension;
				if (existsSync(tentativeName) && fs.statSync(tentativeName).isFile())	//TODO: what about case sensitivity?
					result = Object.merge(result, this.parse(tentativeName, extension));
			}
		}

		return result;
	},

	/** Returns the contents of the given file.
	*
	*@param		{String}	file	The path to the file to be parsed.
	*@param		{String}	type	File extension declared in the `parsers` hash.
	*@returns	{Object}	The parsed contents of the given file.
	*@throws	{Error}		Throws the parser's error if the file could not be parsed properly.
	*@private
	*/
	parse: function parse(file, type) {
		return ConfigLoader.parsers[type](fs.readFileSync(file, 'utf-8'), file);
	}
});

/** Parsing functions for file types.
* A hash mapping file extensions to functions that transform the file’s contents to a Hash.
* The functions will be called with the following parameters:
* 1. file content;
* 2. file path.
*/
ConfigLoader.parsers = {
	'json'	: JSON.parse,
	'js'	: function(contents, path) { return require(path); }
}

module.exports = ConfigLoader;	// CommonJS export
