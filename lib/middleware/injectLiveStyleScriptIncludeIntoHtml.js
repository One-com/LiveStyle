var fs = require('fs'),
    path = require('path'),
    crypto = require('crypto');

require('express-hijackresponse');

module.exports = function (config) {
    config = config || {};
    var liveStyleClientCode = fs.readFileSync(path.resolve(__dirname, '../../livestyle-client.js'), 'utf-8')
            .replace(/liveStyleOptions\s*=\s*\{\}/, 'liveStyleOptions = ' + JSON.stringify(config)),
        liveStyleClientCodeMd5Hex = crypto.createHash('md5').update(liveStyleClientCode, 'utf-8').digest('hex');
    return function injectLiveStyleScriptIncludeIntoHtml(req, res, next) {
        if (req.method === 'GET' && (req.accepts('html') || (req.headers.accept && req.headers.accept.indexOf('*/*') !== -1))) {
            // Prevent If-None-Match revalidation with the downstream middleware with ETags that aren't suffixed with "-livestyle":
            var ifNoneMatch = req.headers['if-none-match'];
            if (ifNoneMatch) {
                var validIfNoneMatchTokens = ifNoneMatch.split(' ').filter(function (etag) {
                    return /-(?:livestyle|processimage)\"$/.test(etag);
                });
                if (validIfNoneMatchTokens.length > 0) {
                    req.headers['if-none-match'] = validIfNoneMatchTokens.join(' ');
                } else {
                    delete req.headers['if-none-match'];
                }
            }
            delete req.headers['if-modified-since'];
            delete req.headers['content-length'];
            delete req.headers['accept-encoding'];

            res.hijack(function (err, res) {
                if (err) {
                    return res.unhijack(function () {
                        next(err);
                    });
                }
                var contentType = res.getHeader('content-type');
                if (!contentType || !contentType.match(/^text\/html(?:;\s*charset=('|"|)([^'"]+)\1)?$/i)) {
                    res.unhijack(true);
                } else {
                    var oldETag = res.getHeader('ETag');
                    if (oldETag) {
                        var newETag = '"' + oldETag.replace(/^"|"$/g, '') + '-' + liveStyleClientCodeMd5Hex + '-livestyle"';
                        res.setHeader('ETag', newETag);

                        if (ifNoneMatch && ifNoneMatch.indexOf(newETag) !== -1) {
                            return res.send(304);
                        }
                    }

                    res.removeHeader('content-length');
                    res.removeHeader('last-modified');
                    res.writeHead(res.statusCode);

                    var injected = false,
                        state = 0;

                    var injectScriptAtIndex = function (chunk, i) {
                        if (i > 0) {
                            res.write(chunk.slice(0, i));
                        }
                        res.write('<script src="/socket.io/socket.io.js"></script>' +
                                  '<script>' + liveStyleClientCode + '</script>');
                        if (chunk.length > i) {
                            res.write(chunk.slice(i));
                        }
                        injected = true;
                    };

                    res.on('end', function () {
                        if (!injected) {
                            injectScriptAtIndex(new Buffer([]), 0);
                        }
                        res.end();
                    }).on('data', function (chunk, encoding) {
                        if (injected) {
                            res.write(chunk, encoding);
                        } else {
                            for (var i = 0 ; i < chunk.length ; i += 1) {
                                var ch;
                                if (Buffer.isBuffer(chunk)) {
                                    ch = String.fromCharCode(chunk[i]);
                                } else {
                                    // string
                                    ch = chunk[i];
                                }
                                switch (state) {
                                case 0:
                                    if (ch === '<') {
                                        state = 1;
                                    }
                                    break;
                                case 1: // <
                                    if (ch === '/') {
                                        state = 2;
                                    } else {
                                        state = 0;
                                    }
                                    break;
                                case 2: // </
                                    if (ch === 'h' || ch === 'H') {
                                        state = 3;
                                    } else {
                                        state = 0;
                                    }
                                    break;
                                case 3: // </h
                                    if (ch === 'e' || ch === 'E') {
                                        state = 4;
                                    } else if (ch === 't' || ch === 'T') {
                                        state = 7;
                                    } else {
                                        state = 0;
                                    }
                                    break;
                                case 4: // </he
                                    if (ch === 'a' || ch === 'A') {
                                        state = 5;
                                    } else {
                                        state = 0;
                                    }
                                    break;
                                case 5: // </hea
                                    if (ch === 'd' || ch === 'D') {
                                        state = 6;
                                    } else {
                                        state = 0;
                                    }
                                    break;
                                case 6: // </head
                                    if (ch === '>' || ch === ' ') {
                                        injectScriptAtIndex(chunk, i + 1 - '</head>'.length);
                                        return;
                                    } else {
                                        state = 0;
                                    }
                                    break;
                                case 7: // </ht
                                    if (ch === 'm' || ch === 'M') {
                                        state = 8;
                                    } else {
                                        state = 0;
                                    }
                                    break;
                                case 8: // </htm
                                    if (ch === 'l' || ch === 'L') {
                                        state = 9;
                                    } else {
                                        state = 0;
                                    }
                                    break;
                                case 9: // </html
                                    if (ch === '>' || ch === ' ') {
                                        injectScriptAtIndex(chunk, i + 1 - '</html>'.length);
                                        return;
                                    } else {
                                        state = 0;
                                    }
                                    break;
                                }
                            }
                            if (!injected) {
                                res.write(chunk, encoding);
                            }
                        }
                    });
                }
            });
        }
        next();
    };
};
