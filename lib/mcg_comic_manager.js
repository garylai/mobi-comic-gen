'use strict';
//const request = require('request');
const url = require('url');
const http = require('http');
const util = require('util');
const co = require('co');
const unpacker = require('./mcg_p_a_c_k_e_r_unpacker_wrapper.js');

const getObfuscatedPageInfoUrlFormat = '/chapterfun.ashx?cid=%d&page=%d&key=&language=1&gtk=6';
const getObfuscatedPageInfoProtocol = 'http:';
const getObfuscatedPageInfoHostname = 'www.dm5.com';

const getObfuscatedPageInfoHTTPRequestHeader = function (comicId) {
    return {
        'Accept': '*/*',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': 'http://www.dm5.com/m' + comicId + '/',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36',
        'Accept-Language': 'en',
        'host': 'www.dm5.com',
        'accept-encoding': 'gzip',
        'Connection': 'keep-alive'
    };
};

const getPageInfoScriptRegex = function(comicId) {
    const regexStr = util.format('function dm5imagefun\\(\\){var cid=%d;var key=\'(\\w+)\';var pix="(http[\\w:./-]+)";var pvalue=(\\[.+\\]);for\\(var i=0;i<pvalue\\.length;i\\+\\+\\){pvalue\\[i\\]=pix\\+pvalue\\[i\\]\\+\'\\?cid=%d&key=.+\'}return pvalue}var d;d=dm5imagefun\\(\\);', comicId, comicId);
    return new RegExp(regexStr);
};

const getPagePath = function(prefix, relativePath, comicId, key) {
    return util.format('%s%s?cid=%d&key=%s', prefix, relativePath, comicId, key);
};

const getPageInfoAsync = function(comicId) {
    const pagePaths = [];
    return co(function* () {
        while(true) {
            const content = yield getObfuscatedPageInfoAsync(comicId, pagePaths.length + 1);
            let unpackedScript = unpacker.unpack(content);
            const regex = getPageInfoScriptRegex(comicId);
            const matches = regex.exec(unpackedScript);
            if(matches && matches.length >= 3) {
                const pvaluesStr = matches[3];
                var pageMatch = null;
                const jpgRegex = /"(\/[\d_]+.jpg)"/g;
                while(pageMatch = jpgRegex.exec(pvaluesStr)){
                    const nextPage = getPagePath(matches[2], pageMatch[1], comicId, matches[1]);
                    if(pagePaths.indexOf(nextPage) > -1) return pagePaths;
                    pagePaths.push(nextPage);
                }
            } else {
                throw new Error('cannot parse page info');
            }
        }
    });
};

const getObfuscatedPageInfoAsync = function(comicId, startingPage) {
    let promise = new Promise(function(res, rej){
        const request = http.get({
            protocol: getObfuscatedPageInfoProtocol,
            hostname: getObfuscatedPageInfoHostname,
            path: util.format(getObfuscatedPageInfoUrlFormat, comicId, startingPage),
            headers: getObfuscatedPageInfoHTTPRequestHeader(comicId)
        },function (response) {
            if (response.statusCode < 300) {
		        let content = '';
		        response.on('error', function (error) {
                    rej(error);
		        });
		        response.on('data', function (chunk) {
			        content += chunk;
		        });
		        response.on('end', function () {
                    res(content);
		        });
	        } else {
                rej(new Error(util.format('HTTP error: %d', response.statusCode)));
	        }
        }).on('error', function (e) {
            rej(e);
        });
        request.setTimeout(5000/* in milisec */, function () {
	        request.abort();
            rej(new Error('timeed out'));
        });
    });
    return promise;
};

exports.getPageInfoAsync = getPageInfoAsync;
