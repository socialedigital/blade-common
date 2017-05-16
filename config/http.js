/**
 * HTTP Server Settings
 * (sails.config.http)
 *
 * Configuration for the underlying HTTP server in Sails.
 * Only applies to HTTP requests (not WebSockets)
 *
 * For more information on configuration, check out:
 * http://sailsjs.org/#/documentation/reference/sails.config/sails.config.http.html
 */

var responseTime = require('response-time');
var url = require('url');
var querystring = require('querystring');
var util = require('util');
var contentType = require('content-type')

var usingSocketIO = false;

module.exports.http = {

    /****************************************************************************
     *                                                                           *
     * Express middleware to use for every Sails request. To add custom          *
     * middleware to the mix, add a function to the middleware config object and *
     * add its key to the "order" array. The $custom key is reserved for         *
     * backwards-compatibility with Sails v0.9.x apps that use the               *
     * `customMiddleware` config option.                                         *
     *                                                                           *
     ****************************************************************************/

    middleware: {

        /***************************************************************************
         *                                                                          *
         * The order in which middleware should be run for HTTP request. (the Sails *
         * router is invoked by the "router" middleware below.)                     *
         *                                                                          *
         ***************************************************************************/

        order: [
            'responseTimeLogger',
            'startRequestTimer',
            'poweredByBlade',
            'cookieParser',
            'bodyParser',
            'handleBodyParserError',
            'compress',
            'methodOverride',
            'requestLogger',
            'router',
            'www',
            '404',
            '500'
        ],

        responseTimeLogger: function (req, res, next) {
            responseTime()(req, res, next);
        },

        poweredByBlade: function (req, res, next) {
            res.header('X-Powered-By', 'Blade Payments Engine <bladepayments.com>');
            next();
        },

        handleBodyParserError: function handleBodyParserError(err, req, res, next) {
            //This is primarily here to handle the case when the request content-type is
            //application/json, but the request has sent invalid json in the request
            //some sails voodoo here:
            //  because this middleware has to run right after the bodyParser middleware,
            //  sails hasn't done it's magic to the req and res parameters yet, so
            //  we're gonna add the bits necessary so that we can use our generic
            //  response handler to deal with the parse issue in the request.
            if (!req._sails) {
                req._sails = sails;
                res.jsonx = res.json;
            }
            var Response = require('../lib/response.js');
            var response = new Response(req, res, 400);
            response.addErrors(err);
            response.send('Sent (400 BAD REQUEST)');
        },

        requestLogger: function (req, res, next) {
            sails.hooks.http.app.set('trust proxy', true);
            if (process.env.NODE_ENV != "test") {
                var showLog = true;
                //deal with socket.io requests
                var url_parts = url.parse(req.url);
                if (url_parts.pathname == '/socket.io/') {
                    if (!usingSocketIO && (sails.config.log.level != 'silly')) {
                        usingSocketIO = true;
                        sails.log.info('Suppressing incoming socket.io request logs.  (If you want to see them, up your logging level to "silly")');
                    }
                    showLog = (sails.config.log.level == 'silly');
                }
                if (showLog) {
                    var fromService = '->';
                    if (req.headers['x-blade-service']) {
                        fromService = ' [' + req.headers['x-blade-service'] + '] ->';
                    }
                    else {
                        fromService = ' [' + req.ip + '] ->';
                    }

                    var payload = "";
                    try {
                        var requestContentType = contentType.parse(req);

                        if (requestContentType.type == 'application/json') {
                            //todo: filter out personal information as well as passwords and the like
                            var body = _.cloneDeep(req.body);
                            if (body.hasOwnProperty('password')) {
                                body.password = '_elided_';
                            }
                            payload = body ? '\n' + fromService + ' ' + JSON.stringify(body) : "";
                        }
                        else {
                            payload = req.body ? '\n' + fromService + ' ' + JSON.stringify(req.body) : "";
                        }
                    }
                    catch(exception) {
                        payload = req.body ? '\n' + fromService + ' ' + req.body : "";
                    }
                    if (payload.length > 1024) {
                        payload = payload.substring(0,1024) + " [too much data to display...truncated]";
                    }

                    var unescapedUrl = querystring.unescape(req.url);
                    res.on("finish", function () {
                        var responseTime = res.get('X-Response-Time');
                        var statusCode = res.statusCode;
                        console.log("%s %s: [%s][%s] %s %s%s", fromService, new Date(), responseTime, statusCode, req.method, unescapedUrl, payload);
                        sails.config.metrics.httpRequestCounter.increment({method: req.method, url: unescapedUrl});
                    });

                    res.on("close", function () {
                        console.log("[interrupted]%s %s: %s %s%s", fromService, new Date(), req.method, unescapedUrl, payload);
                        sails.config.metrics.httpRequestCounter.increment({method: req.method, url: unescapedUrl});
                    });
                }
            }
            next();
        }


    }
};
