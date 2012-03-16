Livestyle
=========

Livestyle is a small web server that refreshes the stylesheets on your
web sites live as you edit them.

It does so by injecting a small JavaScript client on each html page,
which subscribes to changes on the served css files through a
WebSocket (via [socket.io](https://github.com/LearnBoost/socket.io)).

The server then notifies the client to reload specific stylesheets
when they are updated on the file system.

The livestyle client also falls back to active polling, which means
you can use the client as a standalone script on your normal web
server.

Use livestyle to get live feedback while staying in your favorite
editor. Effective use cases spotted so far:

* Styling parts of web applications that require several clicks to
  get to the state you are working on.
* Getting instant feedback from many browsers at the same time.
* Testing several media queries at the same time with different
  devices or browser window sizes.

Usage
=====
Livestyle installs an executable script on your system called `livestyle`.

To get started quickly just change the directory to where your
document root is and run the `livestyle` command. The server will now
listen on port 3000.

Here's the full set of command line options:

#### --root|-r &lt;dir&gt;

The directory to serve static files from. Unless `--proxy` is
specified, it defaults to the current working directory. If you want
to serve static files in `--proxy` mode, `--root` must be specified
explicitly.

#### --host|-h &lt;hostNameOrIp&gt;

The local hostname or IP-address to listen on. Defaults to `0.0.0.0`.

#### --port|-p &lt;portNumber&gt;

The local post number to listen on. Defaults to `3000`.

#### --proxy http://&lt;hostname&gt;[:port]/

Instructs livestyle to proxy requests for everything but CSS files to
a remote server, as determined by the `Accept` request header.

#### --map|-m &lt;sourcePathPrefix&gt;=&lt;targetPathPrefix&gt;

Translate the paths of incoming requests. Think of it as a very
primitive mod_rewrite that only works on request path prefixes.  For
example, to translate all requests for `/foo/*` to `/bar/*`, use this
switch: `--map /foo/=/bar/`

Multiple --map switches are allowed. When used in conjunction with
`--proxy`, the mappings are applied before proxying the request.

#### --debug|-d

Outputs a bunch of debugging information on both the server and the
client.

#### --watchfile=true

If set, will use fs.watchFile instead of fs.watch. 
If you experience problems that the server stops watching a file
after the first time you save a file, this method will help.

Installing livestyle
====================
Livestyle requires NodeJS and npm to be installed. See this page for
installation instructions:
https://github.com/joyent/node/wiki/Installation

When the prerequisites are in place, run the following command:

    npm install -g livestyle

And you are done.


Supported platforms
===================
Livestyle uses pure web technologies. It uses WebSockets if possible,
but falls back to polling via XHRs. This means that every non-ancient,
JavaScript-enabled browser should be supported, also on mobile.

Currently there are some troubles with updating stylesheets using
@import in IE, which you want to avoid anyway
http://www.stevesouders.com/blog/2009/04/09/dont-use-import/


CSS preprocessors
=================
Since livestyle watches the css files that are actually served to the
browser, livestyle work with any CSS preprocessor that runs on the
server out of the box.

If you want live updates you will of course need to enable your
preprocessor's option to automatically build a new CSS files for each
file update. livestyle will then detect the update in the built file
and push it to the client.

There are two CSS preprocessors that run in the browser, which is a
bit of a special case:

Prefixfree
----------
[Prefixfree](http://leaverou.github.com/prefixfree/) inserts vendor
prefixes for the style properties that need them. It does this runtime
in the browser by fetchin the stylesheet content thourhg XHR and
replace the link tags with a style block with prefixed CSS. Livestyle
now supports prefixfree.

Less.js
-------
[Less.js](https://github.com/cloudhead/less.js) injects preprocessed
style into the page by loading .less files and reworking the content
to real CSS. Livestyle supports live updates using Less.js by
refreshing all less stylesheets on the page.
