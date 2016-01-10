"use strict";
const MCGComicManager = require('./lib/mcg_comic_manager');
const jsdom = require('jsdom');
const request = require('request');
const logger = require('./lib/logger.js');
const util = require('util');
const vm = require('vm');
var beautify = require('js-beautify').js_beautify;
var fs = require('fs');

// var manager = new MCGComicManager();
// manager.getPages('http://www.dm5.com/chapterfun.ashx?cid=230392&page=2&key=&language=1&gtk=6', function(content) {
//     console.log(content);
//     fs.appendFile('mcg.txt', content, 'utf8');
//     fs.readFile('mcg.txt', 'utf8', function (err, data) {
//         if (err) {
//             throw err;
//         }
//         console.log(beautify(data, { indent_size: 2 }));
//     });
//     // console.log(beautify(content));
// });
var sandbox = {
    a: null
};
var script = new vm.Script('var a = 1');
var context = vm.createContext(sandbox);
console.log(script);
console.log(context);
script.runInThisContext(context);
console.log(a);
// var cookieJar = request.jar();
// var p1 = new Promise(function(res, rej){
//     request({
//         url: 'http://www.dm5.com/m230392/',
//         method: 'HEAD'//,
//         // jar: cookieJar
//     }, function(error, response, body){
//         // logger.debug('error: ', error);
//         // logger.debug('response.status: %d', response.statusCode);
//         // logger.debug('cookieJar: ', cookieJar);
//         if(error){
//             rej(error);
//         } else if(response.statusCode >= 300){
//             rej(new Error('HTTP error', response.statusCode));
//         } else {
//             res(body);
//         }       
//     });
// });
// p1.then(function(){
//     cookieJar.setCookie(request.cookie('fastRead=true'), 'http://www.dm5.com');
//     request({
//         url: 'http://www.dm5.com/chapterfun.ashx?cid=230392&page=2&key=&language=1&gtk=6',
//         method: 'GET',
//         // jar: cookieJar,
//         headers: {
//             'Accept': '*/*',
//             'X-Requested-With': 'XMLHttpRequest',
//             'Referer': 'http://www.dm5.com/m230392/',
//             'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36',
//             'Accept-Language': 'en',
//             'host': 'www.dm5.com',
//             'accept-encoding': 'gzip',
//             'Connection': 'keep-alive'
//         }
//     }, function(error, response, body){
//         // logger.debug('error: ', error);
//         // logger.debug('response.status: %d', response.statusCode);
//         // logger.debug('response.header: ', response.headers);
//         // logger.debug('cookieJar: ', cookieJar);
//         logger.debug('body: %s', body);
//     });
// });
    
// mcg_http.get('http://www.dm5.com/m230392/', function(){
//     mcg_http.get('http://www.dm5.com/chapterfun.ashx?cid=230392&page=2&key=&language=1&gtk=6', function(content){
//         console.log(content);
//     });
// });

/*>*.
 var content = '';
 var p = new Promise(function(res, rej){
 jsdom.env(
 "http://www.dm5.com/m230392/",
 ["http://code.jquery.com/jquery.js"],
 // {
 //     features: {
 //         FetchExternalResources : ["script"],
 //         ProcessExternalResources: ["script"]
 //     }
 // },
 function (err, window) {
 // console.log("there have been", window.$("a").length - 4, "io.js releases!");
 console.log(window.ajaxloadimage);
 var mkey = "";
 var $ = window.$;
 if ($("#dm5_key").length > 0) {
 mkey = $("#dm5_key").val()
 }
 $.ajax({
 url: "chapterfun.ashx",
 data: {
 cid: 230392,
 page: 1,
 key: '',
 language: 1,
 gtk: 6
 },
 type: "GET",
 error: function(msg) {},
 success: function(msg) {
 //console.log(msg);
 // console.log(d)
 content = msg;
 console.log('set');
 res();
 }
 });
 }
 );
 });
 p.then(function(){
 console.log(content);
 });
 */
