#! /usr/bin/env node

'use strict';
const commandLineArgs = require('command-line-args');
const logger = require('../lib/mcg_logger.js');
const DM5Downloader = require('../app.js').DM5Downloader;
const OPFBuilder = require('../app.js').OPFBuilder;
const DM5DownloaderEvents = require('../app.js').DM5DownloaderEvents;
const OPFBuilderEvents = require('../app.js').OPFBuilderEvents;
const co = require('co');
const fs = require('fs');

const cli = commandLineArgs([
    {name: 'target', alias: 't', type: String, description: 'target comic\'s id' },
    {name: 'imageQuality', alias: 'q', type: Number, description: 'quality of the images: 1-100', defaultValue: 90 }
]);

let options = {};
try {
    options = cli.parse();
} catch (e) {
    options = {};
}

if(!options.target || options.imageQuality < 1 || options.imageQuality > 100) {
    console.log(cli.getUsage());
    process.exit();
}

let totalNumberOfPages = null;
const dm5Downloader = new DM5Downloader(options.target);
dm5Downloader.on(DM5DownloaderEvents.Title, function(title) {
    process.stdout.write('Title: ' + title + '\n');
});
dm5Downloader.on(DM5DownloaderEvents.TotalNumberOfPage, function(total) {
    totalNumberOfPages = total;
    process.stdout.write('Total number of pages: ' + totalNumberOfPages + '\n');
});
dm5Downloader.on(DM5DownloaderEvents.Downloaded, function(downloaded) {
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write('Downloaded ' + downloaded.toString() + '/' + totalNumberOfPages.toString());
    if(downloaded === totalNumberOfPages) process.stdout.write('\n');
});
var mcgComic = null;
var pathToMobi = null;

co(function *(){
    try{
        mcgComic = yield dm5Downloader.getPageImagesAsync();
        const opfBuilder = new OPFBuilder(mcgComic.title, mcgComic.imagePaths);
        opfBuilder.on(OPFBuilderEvents.GenerateMobi, function() {
            process.stdout.write('Start generating .mobi\n');
        });
        opfBuilder.on(OPFBuilderEvents.Processed, function(totalProcessed) {
            process.stdout.clearLine();
            process.stdout.cursorTo(0);
            process.stdout.write('Resized ' + totalProcessed.toString() + '/' + totalNumberOfPages.toString());
            if(totalProcessed === totalNumberOfPages) {
                process.stdout.write('\n');
            }
        });
        pathToMobi = yield opfBuilder.buildBookAsync(options.imageQuality);
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
    console.log('generated comic located at:');
    console.log(pathToMobi);
}).catch(function(err) {
    console.log(err);
    console.log(err.stack);
});


