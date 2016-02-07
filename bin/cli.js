#! /usr/bin/env node

'use strict';
const commandLineArgs = require('command-line-args');
const logger = require('../lib/mcg_logger.js');
const DM5Downloader = require('../app.js').DM5Downloader;
const OPFBuilder = require('../app.js').OPFBuilder;
const co = require('co');
const fs = require('fs');

const cli = commandLineArgs([
    {name: 'target', alias: 't', type: String, description: 'target comic\'s id' }
]);

let options = {};
try {
    options = cli.parse();
} catch (e) {
    options = {};
}

if(!options.target) {
    console.log(cli.getUsage());
    process.exit();
}

const dm5Downloader = new DM5Downloader(options.target);
var mcgComic = null;
var pathToMobi = null;

co(function *(){
    try{
        mcgComic = yield dm5Downloader.getPageImagesAsync();
        const opfBuilder = new OPFBuilder(mcgComic.title, mcgComic.imagePaths);
        pathToMobi = yield opfBuilder.buildBookAsync();
    } finally {
        if(mcgComic !== null) {
            const promises = [];
            for(var i = 0; i < mcgComic.imagePaths.length; i++) {
                const promise = fs.unlinkAsync(mcgComic.imagePaths[i]);
                promises.push(promise);
            }
            yield Promise.all(promises);
        }
    }
}).then(function(status) {
    console.log('done');
    console.log('generated comic located at:');
    console.log(pathToMobi);
}).catch(function(err) {
    console.log(err);
    console.log(err.stack);
});


