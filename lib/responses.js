/**
 * Dependencies
 */
var _ = require('lodash');
var util = require('util');
var path = require("path");
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require("fs"));

var bladeStandardResponses = {}

/**
 * Expose hook definition
 */

module.exports = function (sails) {
    //load in the Blade standard responses
    responsesPath = path.resolve(__dirname + '/../api/responses/');
    fs.readdirAsync(responsesPath)
    .reduce(function(responses, fileName) {
        var filePath = path.join(responsesPath, fileName);
        return fs.statAsync(filePath).then(function(stat) {
            if (!stat.isDirectory()) {
                var responseName = fileName.split('.')[0];
                try {
                    responses[responseName] = require(filePath);
                }
                catch(error) {
                    sails.log.error(error.message);
                    sails.log.debug(error);
                }
            }
            return responses;
        })
    }, {})
    .then(function(responses) {
        bladeStandardResponses = responses;
    });

    return {
        /**
         * When this hook is loaded...
         */
        initialize: function (cb) {
            // Register route syntax that allows explicit routes
            // to be bound directly to custom responses by name.
            // (e.g. {response: 'foo'})
            sails.on('route:typeUnknown', onRoute(sails));

            cb();
        },


        /**
         * Fetch relevant modules, exposing them on `sails` subglobal if necessary,
         */
        loadModules: function (cb) {
            var hook = this;

            sails.modules.loadResponses(function(err, responseDefs) {
                if (err) {
                    return cb(err);
                }

                // Ensure that required custom responses exist.
                _.defaults(responseDefs, bladeStandardResponses);

                // Check that any added standard responses don't conflict with Sails default responses
                var reservedResKeys = [
                    'view',
                    'status', 'set', 'get', 'cookie', 'clearCookie', 'redirect',
                    'location', 'charset', 'send', 'json', 'jsonp', 'type', 'format',
                    'attachment', 'sendfile', 'download', 'links', 'locals', 'render'
                ];

                _.each(Object.keys(responseDefs), function (userResponseKey) {
                    if (_.contains(reservedResKeys, userResponseKey)) {
                        sails.log.error('Cannot define Blade standard response `' + userResponseKey + '`.');
                        sails.log.error('`res.' + userResponseKey + '` has special meaning in Connect/Express/Sails.');
                        sails.log.error('Please remove the `' + userResponseKey + '.js` file from the `responses` directory.');
                        process.exit(1);
                    }
                });
                return cb();
            });

        },

        routes: {
            before: {

                /**
                 * Add Blade standard response methods to `res`.
                 *
                 * @param {Request} req
                 * @param {Response} res
                 * @param  {Function} next [description]
                 * @api private
                 */
                'all /*': function addBladeStandardResponses(req, res, next) {

                    // Attach res.jsonx to `res` object
                    _mixin_jsonx(req, res);

                    // Attach custom responses to `res` object
                    // Provide access to `req` and `res` in each of their `this` contexts.
                    _.each(bladeStandardResponses, function eachMethod(responseFn, name) {
                        res[name] = _.bind(responseFn, {
                            req: req,
                            res: res
                        });
                    });
                    next();
                }
            }
        }

    };
};

/**
 * Create a list of Blade standard responses in the api/responses directory
 *
 */
function getResponses() {
    root = path.resolve(__dirname + '/api/responses');
    return fs.readdirAsync(path.resolve(root))
        .reduce(function(responses, fileName) {
            var filePath = path.join(root, fileName);
            return fs.statAsync(filePath)
                .then(function(stat) {
                    if (!stat.isDirectory()) {
                        responses[fileName] = require(filePath);
                    }
                    return responses;
                })
        }, {})
};

/**
 * Handle route:typeUnknown events
 *
 * This allows the hook to handle routes like "get /user": {response: 'forbidden'}
 * on behalf of the router
 * @param  {object} route object
 */
function onRoute(sails) {
    return function(route) {
        // Get the route info
        var target = route.target,
            path = route.path,
            verb = route.verb,
            options = route.options;

        // If we have a matching response, use it
        if (target && target.response) {
            if (sails.middleware.responses[target.response]) {
                sails.log.silly('Binding response (' + target.response + ') to ' + verb + ' ' + path);
                sails.router.bind(path, function (req, res) {
                    res[target.response]();
                }, verb, options);
            }
            // Invalid respose?  Ignore and continue.
            else {
                sails.log.error(target.response + ' :: ' +
                    'Ignoring invalid attempt to bind route to an undefined response:',
                    'for path: ', path, verb ? ('and verb: ' + verb) : '');
                return;
            }
        }
    }
};


/**
 * [_mixin_jsonx description]
 * @param  {[type]} req [description]
 * @param  {[type]} res [description]
 * @return {[type]}     [description]
 */
function _mixin_jsonx(req, res) {

    /**
     * res.jsonx(data)
     *
     * Serve JSON (and allow JSONP if enabled in `req.options`)
     *
     * @param  {Object} data
     */
    res.jsonx = function jsonx(data) {

        // Send conventional status message if no data was provided
        // (see http://expressjs.com/api.html#res.send)
        if (_.isUndefined(data)) {
            return res.status(res.statusCode).send();
        }
        else if (typeof data !== 'object') {
            // (note that this guard includes arrays)
            return res.send(data);
        }
        else if (req.options.jsonp && !req.isSocket) {
            return res.jsonp(data);
        }
        else {
            return res.json(data);
        }
    };
}

