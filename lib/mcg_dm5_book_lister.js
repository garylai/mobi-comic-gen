'user strict';

const request = require('request');
const cheerio = require('cheerio');
const util = require('util');
const url = require('url');

const domain = 'www.dm5.com';
const protocol = 'http';

const cookieJar = request.jar();
cookieJar.setCookie(
    request.cookie('isAdult=1'),
    url.format({ protocol: protocol, host: domain })
);

function getBookList(relativeUrl) {
    return new Promise(function(res, rej) {
        const targetUrl = url.format({
            protocol: protocol,
            host: domain,
            pathname: relativeUrl
        });

        request({
            method: 'GET',
            url: targetUrl,
            jar: cookieJar,
            timeout: 5000,
            encoding: null
        }, function(err, response, body) {
            if(err != null) rej(err);
            else if(response.statusCode >= 300) rej(util.format('HTTP Error: %d', response.statusCode));
            else {
                const $ = cheerio.load(body.toString(), {
                    decodeEntities: false
                });
                const bookATags = $('#tempc .tg');
                const booklist = bookATags.map(function(i, e) {
                    return {
                        title: $(e).attr('title'),
                        relativeUrl: $(e).attr('href')
                    };
                });
                res(booklist.get());
            }
        });
    }.bind(this));
}

exports.getBookList = getBookList;



