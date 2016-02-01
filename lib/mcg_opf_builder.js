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

            const outputFilanames = [];
            for(var i = 0; i < this._mcgComic.pages.length; i++){
                const filename = path.parse(this._mcgComic.pages[i]).base;
                const image = yield lwip.openAsync(this._mcgComic.pages[i]);
                const imageWidth = image.width();
                const imageHeight = image.height();
                let imgs = [];
                if(imageWidth > imageHeight &&
                   imageWidth > PAGE_HEIGHT) {
                    // landscape
                    // assume double pages
                    imgs = yield this._breakLanscapeImage(image);
                } else {
                    imgs = [image];
                }
                for(var j = 0; j < imgs.length; j++){
                    const outputFileName = filename.replace('.', '-' + j + '.');
                    const resizedImg = yield this._resizeImage(imgs[j]);
                    yield resizedImg.writeFileAsync(path.join(resizedImageRoot, outputFileName));
                    outputFilanames.push(outputFileName);
                }
            }
            console.log(outputFilanames);
            // TODO: create xmls
        }.bind(this));
    }

    _breakLanscapeImage(image) {
        const fullWidth = image.width();
        const halfWidth = fullWidth * 0.5;
        const height = image.height();
        return co(function *() {
            const leftClone = yield image.cloneAsync();
            const leftHalf = yield leftClone.cropAsync(0, 0, halfWidth, height);

            const rightClone = yield image.cloneAsync();
            const rightHalf = yield rightClone.cropAsync(halfWidth, 0, fullWidth, height);

            return [rightHalf, leftHalf];
        });
    }

    _resizeImage(image) {
        return co(function *(){
            let resultImage = yield image.cloneAsync();
            if(resultImage.width() > resultImage.height()){
                resultImage = yield resultImage.rotateAsync(90);
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
