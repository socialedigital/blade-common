/**
 * ServiceController.js - handles common service level endpoints
 * @type {{info: Function}}
 */

module.exports = {
    info: function (req, res) {
        if (Service.getType() == 'service') {
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
                    return result;
                }, {get: [], post: [], put: [], delete: []});
                _.each(routes, function (route) {
                    route.sort();
                });
                Service.addInfo('routes', routes);
            }

            var info = sails.config.service;
            info.started = Service.getStartTime() + ' (' + Service.getElapsedTime() + ')';
            sails.config.metrics.httpResponseCounter.increment({method: req.method, url: req.url, code: 200});
            return res.status(200).json(sails.config.service);
        }
        else {
            sails.config.metrics.httpResponseCounter.increment({method: req.method, url: req.url, code: 404});
            return res.status(404).send();
        }
    },

    metrics: function (req, res) {
        if (Service.getType() == 'service') {
            var metricsFunction = sails.config.metrics.client.metricsFunc();
            sails.config.metrics.httpResponseCounter.increment({method: req.method, url: req.url, code: 200});
            return metricsFunction(req, res);
        }
        else {
            sails.config.metrics.httpResponseCounter.increment({method: req.method, url: req.url, code: 400});
            return res.status(404).send();
        }
    }
};