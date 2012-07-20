ConfigLoader
============

A configuration loader for Node that “just works”, focused on handling overrides cascades.

Specificities
-------------

There are already tons of config loaders for Node, but I couldn't find any that used the following algorithm:

1. Start looking in the given directory (default to `cwd`), all the way up to another directory (default to user’s `$HOME`).
2. Look in `$HOME/.<appname>/` (user config).
3. Look in app default (`dirname($0)/config`).
