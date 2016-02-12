'use strict';
const url = require('url');
const util = require('util');
const co = require('co');
const unpacker = require('./mcg_p_a_c_k_e_r_unpacker_wrapper.js');
const request = require('request');
const os = require('os');
const uuid = require('node-uuid');
const path = require('path');
const fs = require('fs');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');
const readline = require('readline');

const protocol = 'http';
const host = 'www.dm5.com';

class MCGDM5ComicDownloader {
    constructor(bookId) {
        switch(typeof bookId) {
        case 'string':
            const matches = /^m([0-9]+)$/.exec(bookId);
            console.log(matches);
            if(!matches || matches.length > 2) throw new Error('Incrrect book id format');
            this._bookIdInt = matches[1];
            this._bookId = bookId;
            break;
        case 'number':
            this._bookIdInt = Math.floor(bookId);
            if(this.bookIdInt !== bookId) throw new Error('Incorrect book id format');
            this.bookId = 'm' + bookId.toString();
            break;
        default:
            throw new Error('Unsupported format');
        }
        
        this._cookieJar = request.jar();
        const cookie = request.cookie('isAdult=1');
        this._cookieJar.setCookie(
            cookie,
            this._getUrl()
        );
        
        this._getObfuscatedPageInfoHTTPRequestHeader = {
            'Accept': '*/*',
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': this._getUrl(this._bookId),
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36',
            'Accept-Language': 'en',
            'host': host,
            'Connection': 'keep-alive'
        };
        this._getPageInfoScriptRegex = new RegExp(util.format('function dm5imagefun\\(\\){var cid=%d;var key=\'(\\w+)\';var pix="(http[\\S:./-]+)";var pvalue=(\\[.+\\]);for\\(var i=0;i<pvalue\\.length;i\\+\\+\\){pvalue\\[i\\]=pix\\+pvalue\\[i\\]\\+\'\\?cid=%d&key=.+\'}return pvalue}var d;d=dm5imagefun\\(\\);', this._bookIdInt, this._bookIdInt));
    }

    getPageImagesAsync() {
        return co(function* (){
            const title = yield this._getComicTitleAsync();
            process.stdout.write('Title: ' + title + '\n');
            const imageUrls =  yield this._getPageInfoAsync();
            process.stdout.write('Total number of pages: ' + imageUrls.length + '\n');
            const images =  yield this._downloadImagesToTmpFolderAsync(imageUrls);

            return {
                title: title,
                imagePaths: images
            };
        }.bind(this));
    }

    _getUrl(relativePath, query) {
        return url.format(
            {
                protocol: protocol,
                host: host,
                pathname: relativePath,
                query: query
            }
        );
            
    }
    _getImageHeader(targetUrl) {
        return {
            'Accept': 'image/webp,image/*,*/*;q=0.8',
            'Accept-Language': 'en',
            'Connection': 'keep-alive',
            'Host': url.parse(targetUrl).host,
            'Referer': this._getUrl(this._bookId),
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36'
        };
    }

    _getComicTitleAsync() {
        return new Promise(function(res, rej) {
            const targetUrl = this._getUrl(this._bookId);
            request({
                method: 'GET',
                url: targetUrl,
                jar: this._cookieJar,
                timeout: 5000,
                encoding: null
            }, function(err, response, body) {
                if(err != null) rej(err);
                else if(response.statusCode >= 300) rej(util.format('HTTP Error: %d', response.statusCode));
                else {
                    const $ = cheerio.load(body.toString(), {
                        decodeEntities: false
                    });
                    const comicTitle = $('.view_bt h1').html();
                    if(comicTitle === null) rej('Cannot get comic information');
                    res(comicTitle);
                }
            });
        }.bind(this));
    }
    
    _getPageInfoAsync() {
        const pagePaths = [];
        return co(function* () {
            while(true) {
                const content = yield this._getObfuscatedPageInfoAsync(pagePaths.length + 1);
                let unpackedScript = unpacker.unpack(content);
                const regex = this._getPageInfoScriptRegex;
                const matches = regex.exec(unpackedScript);
                if(matches && matches.length >= 3) {
                    const pvaluesStr = matches[3];
                    var pageMatch = null;
                    const jpgRegex = /"(\/[\d_]+.(jpg|png))"/g;
                    var allRepeated = true;
                    while(pageMatch = jpgRegex.exec(pvaluesStr)){
                        const nextPage = util.format('%s%s?cid=%d&key=%s',
                                                     matches[2],
                                                     pageMatch[1],
                                                     this._bookIdInt,
                                                     matches[1]);
                        if(pagePaths.indexOf(nextPage) > -1) continue;
                        allRepeated &= false;
                        pagePaths.push(nextPage);
                    }
                    if(allRepeated) return pagePaths;
                } else {
                    throw new Error('cannot parse page info');
                }
            }
        }.bind(this));
    };

    _getObfuscatedPageInfoAsync(startingPage) {
        const targetUrl = this._getUrl(
            'chapterfun.ashx',
            {
                cid: this._bookIdInt,
                page: startingPage,
                key: null,
                language: 1,
                gtk: 6
            });
        return new Promise(function(res, rej) {
            request({
                method: 'GET',
                // http://www.dm5.com/chapterfun.ashx?cid=%d&page=%d&key=&language=1&gtk=6
                url: targetUrl,
                jar: this._cookieJar,
                gzip: true,
                headers: this._getObfuscatedPageInfoHTTPRequestHeader,
                timeout: 5000
            }, function(err, response, body){
                if(err != null) rej(err);
                else if(response.statusCode >= 300) rej(util.format('HTTP Error: %d', response.statusCode));
                else res(body);
            });
        }.bind(this));
    };

    _downloadImagesToTmpFolderAsync(imageUrls) {
        return co(function* (){
            const promises = [];
            const filePaths = [];
            const tmpFolder = os.tmpdir();

            const total = imageUrls.length;
            var downloaded = 0;
            process.stdout.write('Downloaded 0/' + total.toString());
            for(var i = 0; i < imageUrls.length; i++) {
                const parsedUrl = url.parse(imageUrls[i]);
                const ext = path.extname(parsedUrl.pathname);
                const targetPath = path.resolve(tmpFolder,'./' + uuid.v4() + ext);

                parsedUrl.pathname = parsedUrl.pathname.split('/').map(function(segment) {
                    return encodeURIComponent(segment);
                }).join('/');
                const encodedUrl = url.format(parsedUrl);
                
                const promise = new Promise(function(res, rej) {
                    const stream = request({
                        method: 'GET',
                        url: encodedUrl,
                        jar: this._cookieJar,
                        gzip: true,
                        headers: this._getImageHeader(encodedUrl),
                        timeout: 10000
                    }).on('error', function(err) {
                        rej(err);
                    }).pipe(fs.createWriteStream(targetPath));

                    stream.once('finish', function() {
                        downloaded++;
                        process.stdout.clearLine();
                        process.stdout.cursorTo(0);
                        process.stdout.write('Downloaded ' + downloaded.toString() + '/' + total.toString());
                        if(downloaded === total) process.stdout.write('\n');
                        res();
                    });
                    stream.once('error', function(err) {
                        rej(err);
                    });
                }.bind(this));
                promises.push(promise);
                filePaths.push(targetPath);
            }
            yield Promise.all(promises);
            return filePaths;
        }.bind(this));
    };

}

module.exports = MCGDM5ComicDownloader;
