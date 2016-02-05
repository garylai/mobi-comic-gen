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

const PAGE_WIDTH = 800;
const PAGE_HEIGHT = 1280;

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

        this._bookRoot = null;
        this._htmlRoot = null;
        this._preparedImageRoot = null;
    }
    
    buildBook() {
        return co(function *(){
            this._bookRoot = yield this._createEmptyBookFolder();
            this._htmlRoot = path.join(this._bookRoot, 'html');
            this._preparedImageRoot = path.join(this._htmlRoot, 'images');
            yield mcgFS.mkdirAsync(this._preparedImageRoot);
            
            const preparedImageInfos = yield this._prepareImages();
            const pageHTMLPaths = yield this._makePageHtmls(preparedImageInfos);
            yield this._makeOPF(pageHTMLPaths);
        }.bind(this));
    }

    _makeOPF(pageHTMLPaths) {
        const manifestItems = [];
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
                    'metadata': [
                        { '@content': 'comic', '@name': 'book-type' },
                        { '@content': 'true', '@name': 'zero-gutter' },
                        { '@content': 'true', '@name': 'zero-margin' },
                        { '@content': 'true', '@name': 'fixed-layout' },
                        { '@content': 'none', '@name': 'orientation-lock' },
                        { '@content': 'horizontal-rl', '@name': 'primary-writing-mode' },
                        { '@content': util.format('%dx%d', PAGE_WIDTH, PAGE_HEIGHT), '@name': 'original-resolution' },
                        { '@content': 'false', '@name': 'region-mag' },
                        // { '@content': 'cover-image', '@name': 'cover' }
                    ],
                    'dc:title': { '#text': this._title },
                    'dc:language': { '#text': 'zh' },
                    'dc:creator': { '#text': ''}
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
            path.join(this._bookRoot, 'content.opf'),
            root.toString({ pretty: true })
        );
    }
    _makePageHtmls(preparedImageInfos) {
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
    
    _prepareImages() {
        return co(function *() {
            const prepareImageInfos = [];
            for(var i = 0; i < this._rawPagePaths.length; i++){
                const filename = path.parse(this._rawPagePaths[i]).base;
                const image = yield lwip.openAsync(this._rawPagePaths[i]);
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
                    const outputFilePath = path.join(this._preparedImageRoot, filename.replace('.', '-' + j + '.'));
                    const resizedImg = yield this._resizeImage(imgs[j]);
                    yield resizedImg.writeFileAsync(outputFilePath);

                    prepareImageInfos.push(new ImageInfo(outputFilePath, resizedImg.width(), resizedImg.height()));
                }
            }
            return prepareImageInfos;
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
            const targetFolder = path.join(os.homedir(), 'mcgcomic', this._title);
            yield mcgFS.mkdirAsync(targetFolder);
            yield rimrafAsync(path.join(targetFolder, path.sep, '*'));
            return targetFolder;
        }.bind(this));
    }
}

module.exports = MCGOPFBuilder;
