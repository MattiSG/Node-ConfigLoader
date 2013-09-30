require('mocha');
var assert		= require('assert'),	// no point in using should, as config objects have no prototype, hence no “should” augmentation
	pathUtils	= require('path'),
	fs			= require('fs');

var ConfigLoader = require('../src/ConfigLoader');

var CONFIG_FILE				= 'demo-config',
	OUTER_FOLDER			= pathUtils.join(__dirname, 'outer'),
	MIDDLE_FOLDER			= pathUtils.join(OUTER_FOLDER, 'middle'),
	INNER_FOLDER			= pathUtils.join(MIDDLE_FOLDER, 'inner'),
	EMPTY_FOLDER			= pathUtils.join(INNER_FOLDER, 'empty'),
	OUTER_FOLDER_JS			= pathUtils.join(__dirname, 'outer-js'),
	MIDDLE_FOLDER_JS		= pathUtils.join(OUTER_FOLDER_JS, 'middle'),
	INNER_FOLDER_JS			= pathUtils.join(MIDDLE_FOLDER_JS, 'inner'),
	OUTER_MALFORMED_FOLDER	= pathUtils.join(__dirname, 'malformed'),
	MIDDLE_MALFORMED_FOLDER	= pathUtils.join(OUTER_MALFORMED_FOLDER, 'middle'),
	APP_ROOT_FOLDER			= pathUtils.dirname(process.argv[1]),
	ADDITIONAL_DIR			= pathUtils.join(__dirname, 'additional'),
	WITH_FOLDERS_FOLDER		= pathUtils.join(__dirname, 'with-folders');

assert.undefined = function(value, message) {
	assert.equal(typeof value, 'undefined' , message);
}


function middleToOuterTest(loaded) {
	it('should find the middle value', function() {
		assert.equal(loaded.from, 'middle');
	});

	it('should visit the outer directories', function() {
		assert(loaded.middle);
		assert(loaded.outer, 'Outer folder was not visited');
	});

	it('should not visit the inner directories', function() {
		assert.undefined(loaded.inner, 'Inner folder was visited');
	});
}


describe('Loading', function() {
	it('should not find anything from the package root', function() {
		var loader = new ConfigLoader();

		for (var k in loader.load(CONFIG_FILE))
			assert.fail('Found "' + k + '" while no property should have been loaded!');
	});

	describe('when given the middle folder', function() {
		var loader = new ConfigLoader({ from: MIDDLE_FOLDER });
		var loaded = loader.load(CONFIG_FILE);

		middleToOuterTest(loaded);
	});

	describe('when given the inner folders only', function() {
		var loader = new ConfigLoader({
			from: INNER_FOLDER,
			to	: MIDDLE_FOLDER
		});
		var loaded = loader.load(CONFIG_FILE);

		it('should find the inner value', function() {
			assert.equal(loaded.from, 'inner');
		});

		it('should visit the middle directory', function() {
			assert(loaded.inner);
			assert(loaded.middle, 'Middle folder was not visited');
		});

		it('should not visit the outer directory', function() {
			assert.undefined(loaded.outer, 'Outer folder was visited');
		});
	});

	describe('when given the inner folders and a config file starting with "../"', function() {
		var loader = new ConfigLoader({
			from: INNER_FOLDER,
			to	: MIDDLE_FOLDER
		});
		var loaded = loader.load(pathUtils.join('..', CONFIG_FILE));

		middleToOuterTest(loaded);
	});

	describe('of the middle folder with JS module.exports config', function() {
		var loader = new ConfigLoader({
			from: MIDDLE_FOLDER_JS,
			to	: OUTER_FOLDER_JS
		});
		var loaded = loader.load(CONFIG_FILE);

		middleToOuterTest(loaded);

		it('should execute Javascript', function() {
			assert.strictEqual(loaded['2+2'], 4);
		});

		it('should have magic variables', function() {
			assert.equal(loaded.filename, pathUtils.join(MIDDLE_FOLDER_JS, CONFIG_FILE + '.js'));
		});
	});

	describe('from the application root', function() {
		var loader	= new ConfigLoader(),
			file	= pathUtils.join(APP_ROOT_FOLDER, CONFIG_FILE + '.json'),
			loaded;

		before(function() {
			fs.writeFileSync(file, '{"found": true}');
			loaded = loader.load(CONFIG_FILE);
		});

		after(function() {
			fs.unlinkSync(file);
		});

		it('should load defaults from the executable file directory', function() {
			assert(loaded.found, 'The default value was not loaded.');
		});
	});
});

describe('Fuzzy file matching', function() {
	it('should load an explicitly given .JSON file', function() {
		var loader = new ConfigLoader({
			from: OUTER_FOLDER_JS
		});
		var loaded = loader.load(CONFIG_FILE + '.json');

		assert.equal(loaded.from, 'outer-json');
		assert(loaded.json);
		assert.undefined(loaded.outer, 'Outer JS file was loaded while only the JSON file should have been loaded.');
	});

	it('should load an explicitly given .JS file', function() {
		var loader = new ConfigLoader({
			from: OUTER_FOLDER_JS
		});
		var loaded = loader.load(CONFIG_FILE + '.js');

		assert.equal(loaded.from, 'outer');
		assert(loaded.outer);
		assert.undefined(loaded.json, 'Outer JSON file was loaded while only the JS file should have been loaded.');
	});

	it('should load all config files when no extension is given', function() {
		var loader = new ConfigLoader({
			from: OUTER_FOLDER_JS
		});
		var loaded = loader.load(CONFIG_FILE);

		assert(loaded.outer);
		assert(loaded.json);
	});
});

describe('Malformed files', function() {
	it('should throw', function() {
		var loader = new ConfigLoader({
			from: MIDDLE_MALFORMED_FOLDER
		});
		assert.throws(loader.load.bind(loader, CONFIG_FILE), SyntaxError);
	});
});

describe('Empty directories', function() {
	it('should be ignored', function() {
		var loader = new ConfigLoader({
			from: EMPTY_FOLDER
		});
		var loaded = loader.load(CONFIG_FILE);

		assert(loaded.inner);
		assert(loaded.middle);
		assert(loaded.outer);
	});
});

describe('Directories with name of the requested file', function() {
	it('should be ignored', function() {
		var loader = new ConfigLoader({
			from: WITH_FOLDERS_FOLDER
		});
		var loaded = loader.load(CONFIG_FILE);

		assert.equal(loaded.from, 'with-folders');
	});
});

describe('Overrides', function() {
	it('should ignore loaded values when applied globally', function() {
		var loader = new ConfigLoader({
			from: INNER_FOLDER,
			to: MIDDLE_FOLDER,
			override: {
				from	: 'middle',
				outer	: true,
				inner	: undefined
			}
		});
		var loaded = loader.load(CONFIG_FILE);

		middleToOuterTest(loaded);
	});

	it('should load values in missing files when applied globally', function() {
		var loader = new ConfigLoader({
			from: INNER_FOLDER,
			to: MIDDLE_FOLDER,
			override: {
				from	: 'middle',
				outer	: true,
				middle	: true,
				inner	: undefined
			}
		});
		var loaded = loader.load('no-file-with-such-name');

		middleToOuterTest(loaded);
	});

	it('should load values only specifically', function() {
		var loader = new ConfigLoader({
			override: {
				'toto': {
					inToto: true
				},
				'titi': {
					inToto: false
				}
			}
		});

		assert.strictEqual(loader.load('toto').inToto, true);
		assert.strictEqual(loader.load('titi').inToto, false);
		assert.undefined(loader.load('tutu').inToto);
	});

	it('should not do anything with undefined override option', function() {
		var override;
		var loader = new ConfigLoader({
			from	: MIDDLE_FOLDER,
			override: override
		});
		var loaded = loader.load(CONFIG_FILE);

		middleToOuterTest(loaded);
	});
});

describe('Observer option', function() {
	it('should be called', function() {
		var visited = false;

		new ConfigLoader({
			observer: function(filename, data) {
				assert.equal(typeof filename, 'string');
				assert.equal(typeof data, 'object');
				visited = true;
			}
		}).load(CONFIG_FILE);

		assert(visited, 'Nothing was logged in debug mode!');
	})
});

describe('Transform option', function() {
	it('should be called', function(done) {
		var called = false,	// avoid multiple calls to done
			loader = new ConfigLoader({
				from: INNER_FOLDER,
				to	: MIDDLE_FOLDER,
				transform	: function() {
					if (! called) {
						called = true;
						done();
					}
				}
			});

		loader.load(CONFIG_FILE);
	});

	it('should store only its result', function() {
		var returned = { transformed: true };

		var loader = new ConfigLoader({
			transform	: function() {
				return returned;
			}
		});

		var loaded = loader.load(CONFIG_FILE);

		assert.deepEqual(loaded, returned);
	})
});

describe('visitAlso option', function() {
	it('should be respected', function() {
		var loader = new ConfigLoader({
			from		: OUTER_FOLDER,
			visitAlso	: [ ADDITIONAL_DIR ]
		});

		var loaded = loader.load(CONFIG_FILE);

		assert(loaded.additional, 'The additional folder specified with visitAlso was not loaded');
		assert.notEqual(loaded.from, 'additional');
	});

	it('should be able to be specified with a String only', function() {
		var loader = new ConfigLoader({
			from		: OUTER_FOLDER,
			visitAlso	: ADDITIONAL_DIR
		});

		var loaded = loader.load(CONFIG_FILE);

		assert(loaded.additional, 'The additional folder specified with visitAlso was not loaded');
		assert.notEqual(loaded.from, 'additional');
	});
});
