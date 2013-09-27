ConfigLoader changelog
======================

v0.2
----

### v0.2.0

#### Possibly breaking changes

- Unparsable config files now let parsers throw instead of silently parsing no data.
- Returned objects now have `Object` prototype instead of being pure hashes. If you don't understand what that means, it probably won't change anything to you.

v0.1
----

### v0.1.5

- Added `visitAlso` option.

### v0.1.4

- Added `transform` option.

### v0.1.3

- Allow undefined `override` option.

### v0.1.2

First official release.
