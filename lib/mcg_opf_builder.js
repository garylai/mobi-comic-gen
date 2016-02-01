'use strict';
const os = require('os');
const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf');
const mcgFS = require('../util/mcg_fs.js');
const co = require('co');
const BlueBird = require('Bluebird');
const rimrafAsync = BlueBird.promisify(rimraf);
const lwip = require('lwip');
BlueBird.promisifyAll(fs);
BlueBird.promisifyAll(lwip);
BlueBird.promisifyAll(require('lwip/lib/Image').prototype);

const PAGE_WIDTH = 800;
const PAGE_HEIGHT = 1280;

class MCGOPFBuilder {
    constructor(mcgComic) {
        this._mcgComic = mcgComic;
        this._resized = [];
    }
    
    buildBook() {
        return co(function *(){
            const bookRoot = yield this._createEmptyBookFolder();
            const resizedImageRoot = path.join(bookRoot, 'images');
            yield fs.mkdirAsync(resizedImageRoot);
            // TODO: resize/rotate images
            for(var i = 0; i < this._mcgComic.pages.length; i++){
                const filename = path.parse(this._mcgComic.pages[i]).base;
                const image = yield lwip.openAsync(this._mcgComic.pages[i]);
                const imageWidth = image.width();
                const imageHeight = image.height();
                let img = null;
                if(imageWidth > imageHeight) {
                    // landscape
                    if(image.width > PAGE_HEIGHT) {
                        // assume it is double paged, break into 2
                        img = image;
                    } else {
                        img = yield this._resizeImage(image);
                    }
                } else {
                    // protrait
                    img = yield this._resizeImage(image);
                }
                yield img.writeFileAsync(path.join(resizedImageRoot, filename));
            }
            // TODO: create xmls
        }.bind(this));
    }

    _resizeImage(image) {
        let resultImage = image;
        return co(function *(){
            if(image.width() > image.height()){
                resultImage = yield image.rotateAsync(90);
            }
            const widthScale = PAGE_WIDTH / resultImage.width();
            const heightScale = PAGE_HEIGHT / resultImage.height();
            const targetScale = Math.min(widthScale, heightScale);
            if(targetScale < 1) {
                resultImage = yield resultImage.scaleAsync(targetScale);
            }
            return resultImage;
        });
    }

    _createEmptyBookFolder() {
        return co(function *(){
            const targetFolder = path.join(os.homedir(), 'mcgcomic', this._mcgComic.title);
            yield mcgFS.mkdirAsync(targetFolder);
            yield rimrafAsync(path.join(targetFolder, path.sep, '*'));
            return targetFolder;
        }.bind(this));
    }
}

module.exports = MCGOPFBuilder;
