"use strict";
const MCGManager = require('./lib/mcg_comic_manager');
const MCGOPFBuilder = require('./lib/mcg_opf_builder.js');

// const mcgManager = new MCGManager(182036);
//
// mcgManager.getPageImagesAsync()
//     .then(function(mcgComic) {
//         console.log(mcgComic);
//         const opfBuilder = new MCGOPFBuilder(mcgComic);
//         opfBuilder.buildBook()
//             .then(function() {
//                 console.log('done');
//             })
//             .catch(function(err) {
//                 console.log(err);
//             });
//     })
//     .catch(function(err) {
//         console.log(err.stack);
//     });

const MCGComic = require('./model/mcg_comic.js');
const mcgComic = new MCGComic('灌篮高手全国大赛篇(全彩)64话',
                              [ '/var/folders/zv/08pz_mfn0196h6r4k6n7rt65zc12vx/T/d8639d5b-3aa7-45e4-bf28-360c173fe55b.jpg',
                                '/var/folders/zv/08pz_mfn0196h6r4k6n7rt65zc12vx/T/2abd1061-cdad-4694-8914-ed48d2a7f1a7.jpg',
                                '/var/folders/zv/08pz_mfn0196h6r4k6n7rt65zc12vx/T/c28c54a8-1dd9-4ffd-a04f-c300a4b14581.jpg',
                                '/var/folders/zv/08pz_mfn0196h6r4k6n7rt65zc12vx/T/87a73118-05ea-4211-80a5-a1caaa8df996.jpg',
                                '/var/folders/zv/08pz_mfn0196h6r4k6n7rt65zc12vx/T/a9e215ef-233b-44c0-9c37-25d8cf07275f.jpg',
                                '/var/folders/zv/08pz_mfn0196h6r4k6n7rt65zc12vx/T/9be56b20-80da-4005-b3c3-f7ef62af2f20.jpg',
                                '/var/folders/zv/08pz_mfn0196h6r4k6n7rt65zc12vx/T/9d45166f-f5bf-40e4-85f2-c14b9371359f.jpg',
                                '/var/folders/zv/08pz_mfn0196h6r4k6n7rt65zc12vx/T/9684b717-3232-4ad6-ba3b-aa17537b1494.jpg',
                                '/var/folders/zv/08pz_mfn0196h6r4k6n7rt65zc12vx/T/890cff65-1395-446e-9167-3fa7c1f0385c.jpg',
                                '/var/folders/zv/08pz_mfn0196h6r4k6n7rt65zc12vx/T/3748575e-921d-4b3d-a5a5-d84b0c1f0e1a.jpg',
                                '/var/folders/zv/08pz_mfn0196h6r4k6n7rt65zc12vx/T/a7cc3da3-e8ab-465e-b6a9-dc379c3637f6.jpg',
                                '/var/folders/zv/08pz_mfn0196h6r4k6n7rt65zc12vx/T/15c77c5b-8e9b-4405-914f-6f1f9fbc67cd.jpg',
                                '/var/folders/zv/08pz_mfn0196h6r4k6n7rt65zc12vx/T/be02f909-d27b-43dc-a21d-990ad465d5c5.jpg' ]);
const opfBuilder = new MCGOPFBuilder(mcgComic);
opfBuilder.buildBook()
    .then(function() {
        console.log('done');
    })
    .catch(function(err) {
        console.log(err);
        console.log(err.stack);
    });
