/**
 * ServiceController.js - handles common service level endpoints
 * @type {{info: Function}}
 */
module.exports = {
    info: function (req, res) {
        if (!sails.config.service.routes) {
            //format routes
            var rawRoutes = sails.config.routes;
            var routes = _(_.keys(rawRoutes)).reduce(function (result, route) {
                var parts = route.split(' ');
                var verb = parts[0].toLowerCase();
                switch (verb) {
                    case 'get':
                    case 'post':
                    case 'put':
                    case 'delete':
                        result[verb].push(parts[1]);
                        break;
                }

                ///////////////////////////////////////////////////////////////////////////////////
                // added by brian - 7/28/2015 - fashions a "funcs" entry with an object tree of the
                // controller functions by <controllername>.<functionname> with the routes that
                // use that function
                ///////////////////////////////////////////////////////////////////////////////////
                if ((!_.isEmpty(rawRoutes)) &&
                    (!_.isEmpty(rawRoutes[route])) &&
                    (typeof rawRoutes[route] === 'string') ) {
                    var funcSp = rawRoutes[route].split('.');
                    var cName = funcSp[0];
                    var fName = funcSp[1];
                    if (!result.funcs.hasOwnProperty(cName)) {
                        result.funcs[cName] = {};
                    }
                    if (result.funcs[cName].hasOwnProperty(fName)) {
                        if (_.isArray(result.funcs[cName][fName])) {
                            result.funcs[cName][fName].push(route);
                        } else {
                            result.funcs[cName][fName] = [ result.funcs[cName][fName], route ];
                        }
                    } else {
                        result.funcs[cName][fName] = route;
                    }
                }
                ///////////////////////////////////////////////////////////////////////////////////

                return result;
            }, {get: [], post: [], put: [], delete: [], funcs: {}});
            _.each(routes, function (route) {
                if (_.isArray(route)) {
                    route.sort();
                }
            });
            Service.addInfo('routes', routes);
        }

        var info = sails.config.service;
        info.started = Service.getStartTime() + ' (' + Service.getElapsedTime() + ')';
        sails.config.metrics.httpResponseCounter.increment({method: req.method, url: req.url, code: 200});
        res.ok(sails.config.service);
    },

    metrics: function (req, res) {
        var metricsFunction = sails.config.metrics.client.metricsFunc();
        sails.config.metrics.httpResponseCounter.increment({method: req.method, url: req.url, code: 200});
        metricsFunction(req, res);
    }
};