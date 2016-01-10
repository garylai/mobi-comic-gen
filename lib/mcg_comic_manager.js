'use strict';
//const request = require('request');
const url = require('url');
const http = require('http');

class MCGComicManager {
    getPages(targetUrl, successCallback){
        const urlComponents = url.parse(targetUrl);
        const request = http.get({
            protocol: urlComponents.protocol,
            hostname: urlComponents.hostname,
            path: urlComponents.path,
            headers:  {
            'Accept': '*/*',
            'X-Requested-With': 'XMLHttpRequest',
            'Referer': 'http://www.dm5.com/m230392/',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/47.0.2526.106 Safari/537.36',
            'Accept-Language': 'en',
            'host': 'www.dm5.com',
            'accept-encoding': 'gzip',
            'Connection': 'keep-alive'
        }
            },function (res) {
                if (res.statusCode < 300) {
                    console.log('statua < 300');
                    console.log('status:' + res.statusCode);
                    console.log('headers:' + JSON.stringify(res.headers));
		            let content = '';
		            res.on('error', function (error) {
			            console.log('error');
                        console.log(error);
		            });
		            res.on('data', function (chunk) {
                        // console.log('data');
			            content += chunk;
		            });
		            res.on('end', function () {
                        console.log('end');
	                    // console.log(content);
                        successCallback(content);
		            });
	            } else {
                    console.log('status > 300');
                    console.log(res.statusCode);
	            }
            }).on('error', function (e) {
	            console.log('error 2');
                console.log(e);
            });
        request.setTimeout(5000/* in milisec */, function () {
	        request.abort();
            console.log('timeout');
        });
        console.log('request.headers.cookies');
        console.log(request.getHeader('Cookie'));
    }
}

module.exports = MCGComicManager;
