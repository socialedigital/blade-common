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
            'startRequestTimer',
            'cookieParser',
            'bodyParser',
            'handleBodyParserError',
            'compress',
            'methodOverride',
            'poweredByBlade',
            'requestLogger',
            'router',
            'www',
            '404',
            '500'
        ],

        requestLogger: function (req, res, next) {
            var fromService = '';
            if (req.headers['x-blade-service']) {
                fromService = '[from: ' + req.headers['x-blade-service'] + ']';
            }
            sails.log.verbose("Requested :: :%s:", new Date(), req.method, req.url, fromService);
            sails.config.metrics.httpRequestCounter.increment({method: req.method, url: req.url});
            return next();
        },

        poweredByBlade: function (req, res, next) {
            res.header('X-Powered-By', 'Blade Payments Engine <bladepayments.com>');
            next();
        }
    }
};
