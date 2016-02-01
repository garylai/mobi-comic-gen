#! /usr/bin/env node

'use strict';
const commandLineArgs = require('command-line-args');
const logger = require('../lib/mcg_logger.js');

const cli = commandLineArgs([
    {name: 'target', alias: 't', type: String}
]);

let options = {};
try {
    options = cli.parse();
} catch (e) {
    options = {};
}

if(!options.target) {
    process.stdout.write(cli.getUsage());
    process.exit();
} 

logger.debug(JSON.stringify(options));
