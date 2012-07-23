require('mocha');
var assert = require('assert'),	// no point in using should, as config objects have no prototype, hence no “should” augmentation
	pathUtils = require('path');

var ConfigLoader = require('../' + (process.env.npm_config_coverage ? 'build' : 'src') + '/ConfigLoader');

var CONFIG_FILE = 'demo-config',
	OUTER_FOLDER = pathUtils.join(__dirname, 'outer'),
	MIDDLE_FOLDER = pathUtils.join(OUTER_FOLDER, 'middle'),
	INNER_FOLDER = pathUtils.join(MIDDLE_FOLDER, 'inner'),
	OUTER_FOLDER_JS = pathUtils.join(__dirname, 'outer-js'),
	MIDDLE_FOLDER_JS = pathUtils.join(OUTER_FOLDER_JS, 'middle'),
	INNER_FOLDER_JS = pathUtils.join(MIDDLE_FOLDER_JS, 'inner'),
	OUTER_MALFORMED_FOLDER = pathUtils.join(__dirname, 'malformed'),
	MIDDLE_MALFORMED_FOLDER = pathUtils.join(OUTER_MALFORMED_FOLDER, 'middle');

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
			to: MIDDLE_FOLDER
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
			to: MIDDLE_FOLDER
		});
		var loaded = loader.load(pathUtils.join('..', CONFIG_FILE));

		middleToOuterTest(loaded);
	});

	describe('of the middle folder with JS module.exports config', function() {
		var loader = new ConfigLoader({
			from: MIDDLE_FOLDER_JS,
			to: OUTER_FOLDER_JS
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
	it('should return an empty hash', function() {
		var loader = new ConfigLoader({
			from: OUTER_MALFORMED_FOLDER
		});
		var loaded = loader.load(CONFIG_FILE);

		for (var k in loaded)
			assert.fail('Found key "' + k + '" in the loaded hash, while it should have been empty!')
	});

	it('should not erase previously loaded values', function() {
		var loader = new ConfigLoader({
			from: MIDDLE_MALFORMED_FOLDER
		});
		var loaded = loader.load(CONFIG_FILE);

		assert.equal(loaded.from, 'middle');
		assert(loaded.middle);
		assert.undefined(loaded.outer, 'Outer folder with malformed file was visited');
	});
})

describe('Overrides', function() {
	it('should ignore loaded values when applied globally', function() {
		var loader = new ConfigLoader({
			from: INNER_FOLDER,
			to: MIDDLE_FOLDER,
			override: {
				from: 'middle',
				outer: true,
				inner: undefined
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
				from: 'middle',
				outer: true,
				middle: true,
				inner: undefined
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
});

describe('Debug logging', function() {
	it ('should log without doing anything bad', function() {
		var visited = false,
			prevLog = console.error;

		console.error = function() {
				visited = true;
		}

		new ConfigLoader({
			debug: true
		}).load(CONFIG_FILE);

		console.error = prevLog;

		assert(visited, 'Nothing was logged in debug mode!');
	})
});
