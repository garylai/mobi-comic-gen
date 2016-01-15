'use strict';

const vm = require('vm');
const fs = require('fs');
const path = require('path');

const srcScript = fs.readFileSync(
    path.resolve(__dirname, '../node_modules/js-beautify/js/lib/unpackers/javascriptobfuscator_unpacker.js'),
    'utf8');

const obfuscatorUnpackerSript = new vm.Script(srcScript);
obfuscatorUnpackerSript.runInThisContext();
module.exports  = JavascriptObfuscator;
