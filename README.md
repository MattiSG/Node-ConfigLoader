ConfigLoader
============

A configuration loader for Node that “just works”, focused on handling overrides cascades.

Specificities
-------------

### Paths ###

There are already tons of config loaders for Node, but I couldn't find any that used the following algorithm:

1. Start looking in the given directory (default to `cwd`), all the way up to another directory (default to user’s `$HOME`).
2. Look in `$HOME/.<appname>/` (user config).
3. Look in app defaults, (executable root, equivalent to `dirname($0)`).

The above gives the order of priority between properties: app defaults are of course overridden by the more specific directories.

### Formats ###

Many formats can be used, and are determined in a fuzzy manner (i.e. you don't have to expect your user to define config files in any specific format, as long as one version is readable it will be loaded). You can add any format you want at runtime.

Currently, JSON and CommonJS-style Javascript (i.e. a hash as `module.exports`) are supported out-of-the-box.

Usage
-----

	var ConfigLoader = require('mattisg.configloader');
	var loader = new ConfigLoader();	// options can be passed as a hash, see beneath
	var config = loader.load('config');	// pass the name of the file to be looked up. It can include an extension if you want to enforce a specific format

### Options ###

Options can be passed when initializing a ConfigLoader, as a hash:

	var loader = new ConfigLoader({
		option: value,
		…
	});

You can also apply those options later, by calling `setOptions({ option: value, … })` on the ConfigLoader instance.

#### `from` and `to` ####

By default, the ConfigLoader’s first pass will look for files from the current working directory (think `pwd`) all the way up to `~`. You can restrict this navigation algorithm to whichever subset you want, or redefine it entirely, with the `from` and `to` options.

Example:

	// in /usr/toto/dev/toto.js
	new ConfigLoader({
		from: __dirname + '/config/host'
		to:   __dirname
	}).load('config')

The above will load data from, in precedence order:

1. `/usr/toto/dev/config/host/config.*`
2. `/usr/toto/dev/config/config.*`
3. `/usr/toto/dev/config.*`

…plus the standard `~/.<app_name>/config.*`.

#### `user` and `appName` ####

The above `<app_name>` defaults to the name of the running script. For example, if your application is executed by `node toto.js`, `<app_name>` will be `toto`, giving a default user preference folder of `~/.toto`.

You can override this heuristic with the `appName` option.

	// in /usr/toto/dev/toto.js
	new ConfigLoader({
		appName: 'yogurt'
	}).load('config')

After the usual `/usr/toto/dev/config.*` and `/usr/toto/config.*` (see above), `/usr/toto/.yogurt/config.*` will be looked up.

You can also override the `~` in `~/.<app_name>` for user-specific preferences, with the `user` option. For example:

	new ConfigLoader({
		user: process.env.HOME + '/Library/Preferences',
		appName: 'com.dairy.yogurt'
	}).load('config')

…would give a much more OSX-like lookup, by looking in `~/Library/Preferences/com.dairy.yogurt/` for `config.*` files.

#### `visitAlso` ####

If you need to load defaults from more unusual locations, or if your module may be executed from different binaries (thus making the “executable root” heuristic non-effective), you may specify default folders to visit with this option.

You may set either a single folder path as a String, or an array of folder paths, which will be visited in the given order. In all cases, they will be loaded _after_ the places defined by the standard algorithm.

#### Programmatic `override` ####

If you want to ignore some values from the loaded configuration at runtime, simply use the `override` option. It can be thought of defaults, but in reverse: instead of being values to use if none other are specified, those will always be used, no matter what config files say.

This override can be global, or can be specific to each file if you intend to use the same ConfigLoader instance to load different config files.

Example:

	new ConfigLoader({
		override: {
			'host': '127.0.0.1'
		}
	})

…whether you `.load('config')` or `.load('database')`, all files will have their `host` value overridden. We can change this behavior with the following:

		override: {
			config: {
				'host': '127.0.0.1:80'	// in the hash returned by load('config')
			},
			database: {
				'host': '127.0.0.1:3000'	// in the hash returned by load('database')
			}
		}

#### `observer` ####

If you ever feel the need to understand how the configuration is parsed to pinpoint the source of a specific value, you could pass a logging function as the `observer` option. Its value is a function, which will be called on each visited directory, with two parameters:

1. The visited directory.
2. The parsed data (all since the beginning, not only the new one from the given directory).

Especially useful for quick debugging with `observer: console.error`, but could be used with Winston loggers or any event-driven trigger.

#### `transform` ####

You may want to support shortcuts in your config files, in order to make the specification simpler, while still supporting advanced overrides. The `transform` option is a function, which will be called each time some config data is about to be loaded, with two parameters:

1. The about-to-be-loaded data.
2. The already-stored data (all since the beginning).

What will be stored at that step is **only** the return value from the provided function.

**Example**:

Support an URL to be specified as either a string or an [URL object](http://nodejs.org/docs/v0.8.16/api/url.html), uniforming the type to an object, therefore allowing specific overrides:

	new ConfigLoader({
		transform: function objectifyUrl(data) {
			if (typeof data.url == 'string')
				data.url = require('url').parse(data.url);

			return data;	// remember to return your results, otherwise nothing will be stored!
		}
	});

The above allows any configuration file to specify either a full URL as a string, or provide only parts of it (e.g. `{ url: { port: 3000 } }`), while ensuring the previously extracted values will be kept.

#### Defaults ####

Default values should _not_ be set as options, but set in a config file distributed alongside the application, in order to make them easily editable and to support proper decoupling. Hence, there is no way to set default values from options.

If you see a correct use case for such an option, please open an issue.

### Adding formats ###

	// let's add support for YAML
	ConfigLoader.parsers['yaml'] = function(content) { return require('my-yaml-parser').parse(contents); }

	config = loader.load('config');	// reload the same config as above, but YAML files will now be parsed too

Fuzzy matching warning
----------------------

If several files in the same format are available at the same depth (i.e. you have `config.js` and `config.json` in the same folder), **the precedence is unspecified**. There is no way to know for sure whether values from the `.js` will override the ones from the `.json`, or if it will be the other way around. The only certain thing is that will take precedence for _all_ keys, i.e. the precedence is unspecified at file level, not at individual properties level.

Beyond this overriding specificity, non-conflicting values will all be loaded.
