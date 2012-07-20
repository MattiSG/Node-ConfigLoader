require('mocha');
var assert = require('assert'),	// no point in using should, as config objects have no prototype, hence no “should” augmentation
	pathUtils = require('path');

var ConfigLoader = require('../src/ConfigLoader');

var CONFIG_FILE = 'demo-config',
	OUTER_FOLDER = pathUtils.join(__dirname, 'outer'),
	MIDDLE_FOLDER = pathUtils.join(OUTER_FOLDER, 'middle'),
	INNER_FOLDER = pathUtils.join(MIDDLE_FOLDER, 'inner');


describe('Loading', function() {
	function middleToOuterTest(loaded) {
		it('should find the middle value', function() {
			assert.equal(loaded.from, 'middle');
		});

		it('should visit the outer directories', function() {
			assert(loaded.middle);
			assert(loaded.outer, 'Outer folder was not visited');
		});

		it('should not visit the inner directories', function() {
			assert.equal(typeof loaded.inner, 'undefined' , 'Inner folder was visited');
		});
	}

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
			assert.equal(typeof loaded.outer, 'undefined' , 'Outer folder was visited');
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
});
