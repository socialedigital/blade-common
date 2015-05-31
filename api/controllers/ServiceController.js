/**
 * ServiceController.js - handles common service level endpoints
 * @type {{info: Function}}
 */

module.exports = {
    info: function (req, res){

        if (!sails.config.service.routes) {
            //format routes
            var rawRoutes = sails.config.routes;
            var routes = _(_.keys(rawRoutes)).reduce(function (result, route) {
                var parts = route.split(' ');
                var verb = parts[0];
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

        return res.json(sails.config.service);
    }
};