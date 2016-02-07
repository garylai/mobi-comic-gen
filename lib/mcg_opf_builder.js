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

const xmlbuilder = require('xmlbuilder');
const util = require('util');
const uuid = require('node-uuid');
const executeFile = require('child_process').execFile;

const PAGE_WIDTH = 800;
const PAGE_HEIGHT = 1280;
const OPF_FILE_NAME = 'content.opf';
const COVER_IMAGE_ID = 'cover-image';
const APP_OUTPUT_FOLDER_NAME = 'mcgcomic';

class ImageInfo {
    constructor(path, width, height) {
        this.path = path;
        this.width = width;
        this.height = height;
    }
}

class MCGOPFBuilder {
    constructor(title, rawPagePaths) {
        this._title = title;
        this._rawPagePaths = rawPagePaths;

        this._appOutputPath = path.join(os.homedir(), APP_OUTPUT_FOLDER_NAME);
        this._mobiFileName = title + '.mobi';

        this._bookRoot = null;
        this._htmlRoot = null;
        this._preparedImageRoot = null;
    }
    
    buildBookAsync(imageQuality) {
        return co(function *(){
            this._bookRoot = yield this._createEmptyBookFolderAsync();
            this._htmlRoot = path.join(this._bookRoot, 'html');
            this._preparedImageRoot = path.join(this._htmlRoot, 'images');

            var outputPath = null;
            try {
                yield mcgFS.mkdirAsync(this._preparedImageRoot);
                const preparedImageInfos = yield this._prepareImagesAsync(imageQuality);
                const pageHTMLPaths = yield this._makePageHtmlsAsync(preparedImageInfos);
                yield this._makeOPFAsync(preparedImageInfos[0].path, pageHTMLPaths);
                process.stdout.write('Generating .mobi\n');
                const mobiPath = yield this._makeMOBIAsync();

                outputPath = path.join(this._appOutputPath, this._mobiFileName);
                yield fs.renameAsync(mobiPath, outputPath);
            } finally {
                yield rimrafAsync(this._bookRoot);
            }
            
            return outputPath;
        }.bind(this));
    }

    _makeMOBIAsync() {
        // ./kindlegen (PATH) -c2 -o (OURFILENAME)
        const binaryPath = path.resolve(__dirname, '../bin/kindlegen');
        const opfFilePath = path.join(this._bookRoot, OPF_FILE_NAME);
        return new Promise(function(res, rej) {
            executeFile(binaryPath, [opfFilePath, '-c1', '-o', this._mobiFileName], (error, stdout, stderr) => {
                if(error != null) {
                    rej(error);
                }
                res(path.join(this._bookRoot, this._mobiFileName));
            });
        }.bind(this));
    }
    
    _makeOPFAsync(coverImagePath, pageHTMLPaths) {
        const firstImageRelativePath = path.relative(this._bookRoot, coverImagePath);
        const manifestItems = [
            { '@href': firstImageRelativePath, '@id': COVER_IMAGE_ID, '@media-type': 'image/jpg' }
        ];
        const spineItems = [];
        for(var i = 0; i < pageHTMLPaths.length; i++) {
            const relativePath = path.relative(this._bookRoot, pageHTMLPaths[i]);
            const itemId = 'item-' + i.toString();
            manifestItems.push(
                { '@href': relativePath, '@id': itemId, '@media-type': 'application/xhtml+xml' }
            );
            spineItems.push(
                { '@idref': itemId, '@linear': 'yes' }
            );
        }

        const doc = xmlbuilder.create('doc');
        const rootAsObj = {
            'package': {
                '@version': '2.0',
                '@xlms': 'http://www.idpf.org/2007/opf',
                '@unique-identifier': util.format('{%s}', uuid.v4()),
                'metadata': {
                    '@xmlns:opf': 'http://www.idpf.org/2007/opf',
                    '@xmlns:dc': 'http://purl.org/dc/elements/1.1/',
                    'meta': [
                        { '@content': 'comic', '@name': 'book-type' },
                        { '@content': 'true', '@name': 'zero-gutter' },
                        { '@content': 'true', '@name': 'zero-margin' },
                        { '@content': 'true', '@name': 'fixed-layout' },
                        { '@content': 'none', '@name': 'orientation-lock' },
                        { '@content': 'horizontal-rl', '@name': 'primary-writing-mode' },
                        { '@content': util.format('%dx%d', PAGE_WIDTH, PAGE_HEIGHT), '@name': 'original-resolution' },
                        { '@content': 'false', '@name': 'region-mag' },
                        { '@content': COVER_IMAGE_ID, '@name': 'cover' }
                    ],
                    'dc:title': { '#text': this._title },
                    'dc:language': { '#text': 'zh' },
                    'dc:creator': { '#text': ''},
                    'dc:publisher': { '#text': ''}
                },
                'manifest': {
                    'item': manifestItems
                },
                'spine': {
                    'itemref': spineItems
                }
            }
        };
        const root = doc.ele(rootAsObj);
        return fs.writeFileAsync(
            path.join(this._bookRoot, OPF_FILE_NAME),
            root.toString({ pretty: true })
        );
    }
    _makePageHtmlsAsync(preparedImageInfos) {
        return co(function *() {
            const pageHTMLPaths = [];
            for(var i = 0; i < preparedImageInfos.length; i ++) {
                const pageImageInfo = preparedImageInfos[i];
                const relativeFilePath = path.relative(this._htmlRoot, pageImageInfo.path);
                const hMargin = Math.floor((PAGE_WIDTH - pageImageInfo.width) * 0.5);
                const vMargin = Math.floor((PAGE_HEIGHT - pageImageInfo.height) * 0.5);

                const styleStr = util.format(
                    "width:%dpx;height:%dpx;margin-left:%dpx;margin-top:%dpx;margin-right:%dpx;margin-bottom:%dpx;",
                    pageImageInfo.width,
                    pageImageInfo.height,
                    hMargin,
                    vMargin,
                    hMargin,
                    vMargin);

                
                const pageNumber = i + 1;
                const htmlFilePath = path.join(this._htmlRoot, 'Page-' + pageNumber + '.html');

                const html = xmlbuilder.create('html', { headless: true })
                          .dtd().up();
                
                html.ele('head')
                    .ele('title', i.toString());
                html.ele('body')
                    .ele('div')
                    .ele('img', {
                        style: styleStr,
                        src: relativeFilePath
                    });

                const doc = html.end({ pretty: true });
                
                yield fs.writeFileAsync(htmlFilePath, doc);
                pageHTMLPaths.push(htmlFilePath);
            }
            return pageHTMLPaths;
        }.bind(this));
    }
    
    _prepareImagesAsync(imageQuality) {
        return co(function *() {
            const preparedImageInfos = [];
            const promises = [];
            const total = this._rawPagePaths.length;
            var prepared = 0;
            for(var i = 0; i < total; i++) {
                const filename = path.parse(this._rawPagePaths[i]).base;
                const image = yield lwip.openAsync(this._rawPagePaths[i]);
                let imgs = null;
                let outputImageInfos = null;
                if(image.width() > image.height() &&
                   image.width() > PAGE_HEIGHT) {
                    // landscape
                    // assume double pages
                    outputImageInfos = [
                        new ImageInfo(path.join(this._preparedImageRoot, filename.replace('.', '-' + 1 + '.')), 0, 0),
                        new ImageInfo(path.join(this._preparedImageRoot, filename.replace('.', '-' + 2 + '.')), 0, 0)
                    ];
                } else {
                    outputImageInfos = [new ImageInfo(path.join(this._preparedImageRoot, filename), 0, 0)];
                }
                Array.prototype.push.apply(preparedImageInfos, outputImageInfos);
                const promise = this._prepareImageAsync(image, outputImageInfos, imageQuality);;
                promises.push(promise.then(function() {
                    prepared++;
                    process.stdout.clearLine();
                    process.stdout.cursorTo(0);
                    process.stdout.write('Resized ' + prepared.toString() + '/' + total.toString());
                    if(prepared === total) {
                        process.stdout.write('\n');
                    }
                }));
            }
            yield Promise.all(promises);
            return preparedImageInfos;
        }.bind(this));
    }

    _prepareImageAsync(image, outputImageInfos, imageQuality) {
        return co(function *() {
            var imgs = [];
            if(outputImageInfos.length > 1) {
                imgs = yield this._breakLanscapeImageAsync(image);
            } else {
                imgs = [image];
            }
            for(var j = 0; j < imgs.length && j < outputImageInfos.length; j++){
                const outputFilePath = outputImageInfos[j].path;
                const resizedImg = yield this._resizeImageAsync(imgs[j]);
                resizedImg.setMetadata(null);
                yield resizedImg.writeFileAsync(outputFilePath, {quality: imageQuality});

                outputImageInfos[j].width = resizedImg.width();
                outputImageInfos[j].height = resizedImg.height();
            }
        }.bind(this));
    }
    _breakLanscapeImageAsync(image) {
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

    _resizeImageAsync(image) {
        return co(function *(){
            let resultImage = yield image.cloneAsync();
            if(resultImage.width() > resultImage.height()){
                resultImage = yield resultImage.rotateAsync(90);
            }
            const widthScale = PAGE_WIDTH / resultImage.width();
            const heightScale = PAGE_HEIGHT / resultImage.height();
            const targetScale = Math.min(widthScale, heightScale);
    
            return yield resultImage.scaleAsync(targetScale);
        });
    }

    _createEmptyBookFolderAsync() {
        return co(function *(){
            const targetFolder = path.join(this._appOutputPath, uuid.v4());
            yield mcgFS.mkdirAsync(targetFolder);
            yield rimrafAsync(path.join(targetFolder, path.sep, '*'));
            return targetFolder;
        }.bind(this));
    }
}

module.exports = MCGOPFBuilder;
