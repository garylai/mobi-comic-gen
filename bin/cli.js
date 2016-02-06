#! /usr/bin/env node

'use strict';
const commandLineArgs = require('command-line-args');
const logger = require('../lib/mcg_logger.js');
const DM5Downloader = require('../app.js').DM5Downloader;
const OPFBuilder = require('../app.js').OPFBuilder;

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

logger.debug(JSON.stringify(options));

const comicId = parseInt(options.target);

const dm5Downloader = new DM5Downloader(options.target);

dm5Downloader.getPageImagesAsync()
    .then(function(mcgComic) {
        const opfBuilder = new OPFBuilder(mcgComic.title, mcgComic.imagePaths);
        opfBuilder.buildBook()
            .then(function(pathToMobi) {
                console.log('done');
                console.log('generated comic located at:');
                console.log(pathToMobi);
            })
            .catch(function(err) {
                console.log(err);
            });
    })
    .catch(function(err) {
        console.log(err.stack);
    });

