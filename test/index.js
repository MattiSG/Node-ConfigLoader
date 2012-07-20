require('mocha');
require('should');

var ConfigLoader = require('../src/ConfigLoader');


var loader = new ConfigLoader();

var loaded = loader.load('demo-config');

console.error(loaded);
