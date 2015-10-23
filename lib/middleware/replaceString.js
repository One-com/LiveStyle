var hijackResponse = require('hijackresponse');
var escapeStringRegexp = require('escape-string-regexp');

module.exports = function (replacements) {
    replacements = replacements || {};

    return function injectLiveStyleScriptIncludeIntoHtml(req, res, next) {

        if (req.get('X-Requested-With') !== 'XMLHttpRequest' && req.method === 'GET' && (req.accepts('html') || (req.headers.accept && req.headers.accept.indexOf('*/*') !== -1))) {
            // Prevent If-None-Match revalidation with the downstream middleware with ETags that aren't suffixed with "-livestyle":
            var ifNoneMatch = req.headers['if-none-match'];
            if (ifNoneMatch) {
                var validIfNoneMatchTokens = ifNoneMatch.split(" ").filter(function (etag) {
                    return /-(?:livestyle|processimage|compiless|compile-sass)\"$/.test(etag);
                });
                if (validIfNoneMatchTokens.length > 0) {
                    req.headers['if-none-match'] = validIfNoneMatchTokens.join(" ");
                } else {
                    delete req.headers['if-none-match'];
                }
            }
            delete req.headers['if-modified-since'];
            delete req.headers['content-length'];
            delete req.headers['accept-encoding'];

            hijackResponse(res, function (err, res) {
                if (err) {
                    return res.unhijack(function () {
                        next(err);
                    });
                }
                var contentType = res.getHeader('content-type');
                if (!contentType || !contentType.match(/^text\/html(?:;\s*charset=('|"|)([^'"]+)\1)?$/i)) {
                    res.unhijack(true);
                } else {

                    res.removeHeader('content-length');
                    res.removeHeader('last-modified');
                    res.writeHead(res.statusCode);

                    var injected = false,
                        state = 0;

                    function injectScriptAtIndex(chunk, i) {
                        if (i > 0) {
                            res.write(chunk.slice(0, i));
                        }
                        res.write('<script src="/socket.io/socket.io.js"></script>' +
                                  '<script src="/__livestyle/livestyle-client.js"></script>');
                        if (chunk.length > i) {
                            res.write(chunk.slice(i));
                        }
                        injected = true;
                    }

                    var chunks = [];
                    res.on('data', function (chunk) {
                        chunks.push(chunk);
                    }).on('end', function () {
                        var htmlStr = Object.keys(replacements).reduce(function (html, needle) {
                            return html.replace(new RegExp(escapeStringRegexp(needle), 'gi'), replacements[needle]);
                        }, chunks.join(''));

                        res.end(htmlStr);
                    });
                }
            });
        }
        next();
    };
};
