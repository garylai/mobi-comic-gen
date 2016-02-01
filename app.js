"use strict";
const MCGManager = require('./lib/mcg_comic_manager');

const mcgManager = new MCGManager(182036);
mcgManager.getPageImagesAsync()
    .then(function(mcgComic) {
        console.log(mcgComic);
    })
    .catch(function(err) {
        console.log(err.stack);
    });
         

