ConfigLoader
============

A configuration loader for Node that “just works”, focused on handling overrides cascades.

Specificities
-------------

### Paths ###

There are already tons of config loaders for Node, but I couldn't find any that used the following algorithm:

1. Start looking in the given directory (default to `cwd`), all the way up to another directory (default to user’s `$HOME`).
2. Look in `$HOME/.<appname>/` (user config).
3. Look in app default (`dirname($0)/config`).

The above gives the order of priority between properties: app defaults are of course overridden by the more specific directories.

### Formats ###

Many formats can be used, and are determined in a fuzzy manner (i.e. you don't have to expect your user to define config files in any specific format, as long as one version is readable it will be loaded). You can add any format you want at runtime.

Currently, JSON and CommonJS-style Javascript (i.e. a hash as `module.exports`) are supported out-of-the-box.

Usage
-----

	var ConfigLoader = require('mattisg.configloader');
	var loader = new ConfigLoader();	// options can be passed as a hash, see beneath
	var config = loader.load('config');	// pass the name of the file to be looked up. It can include an extension if you want to enforce a specific format

### Adding formats ###

	// let's add support for YAML
	ConfigLoader.parsers['yaml'] = function(content) { return require('my-yaml-parser').parse(contents); }

	config = loader.load('config');	// reload the same config as above, but YAML files will now be parsed too

You can restrict the folders hierarchy navigation algorithm to whichever subset you want, by passing options to the constructor. For the moment, please look at the code documentation.

Fuzzy matching warning
----------------------

If several files in the same format are available at the same depth (i.e. you have `config.js` and `config.json` in the same folder), **the precedence is unspecified**. There is no way to know for sure whether values from the `.js` will override the ones from the `.json`, or if it will be the other way around. The only certain thing is that will take precedence for _all_ keys, i.e. the precedence is unspecified at file level, not at individual properties level.

Beyond this overriding specificity, non-conflicting values will all be loaded.
