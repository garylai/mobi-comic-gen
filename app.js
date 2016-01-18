"use strict";
const mcgManager = require('./lib/mcg_comic_manager');

mcgManager.getPageInfoAsync(230392)
    .then(function(val) {
        console.log(val);
    }).catch(function(err) {
        console.log(err);
    });
