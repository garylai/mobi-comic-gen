'use strict';
const path = require('path');
const co = require('co');
const fs = require('fs');

function mkdirAsync(absolutePath) {
    return co(function *(){
        if(!path.isAbsolute(absolutePath))
            throw new Error('path is not absolute');

        const parsed = path.parse(absolutePath);
        let targetPath = parsed.root;
        const segments = parsed.dir.split(path.sep);
        if(parsed.ext === '') segments.push(parsed.base);
        for(var i = 0; i < segments.length; i++) {
            if(segments[i] === '') continue;
            targetPath = path.join(targetPath, segments[i]);
            yield _mkdirAsync(targetPath);
        }
        return;
    });
}

function _mkdirAsync(path) {
    return new Promise(function(res, rej) {
        fs.mkdir(path, function(err) {
            if(err != null) {
                if(err.code === 'EEXIST') res();
                else rej(err);
            } else res();
        });
    });
}

exports.mkdirAsync = mkdirAsync;
