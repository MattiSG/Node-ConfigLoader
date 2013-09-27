Contributing to ConfigLoader
============================

First of all, thanks for wanting to contribute to this project!  :)

This is a rather small codebase, so getting to work with it should be simple. You'll just have to make sure your changes are properly tested.

For that, start by installing developer dependencies:

	cd Node-ConfigLoader
	npm install --dev

Then, write tests for your changes, and run them with:

	npm test

Make sure everything is properly tested by checking code coverage:

	npm test --coverage

Documentation has to be written with the [JSdoc syntax](http://code.google.com/p/jsdoc-toolkit/wiki/TagReference). Please make sure your code is properly documented with:

	node_modules/.bin/jsdoc --private src --destination doc

If your code has been properly tested and documented, simply open a pull request and I'll do my best to review and merge it promptly  :)
