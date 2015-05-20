module.exports = function() {
    return {
        initialize : function (next)
        {
            var sails = require('sails');
            var loader = require("sails-util-mvcsloader")(sails);
            loader.injectAll({
                //policies : __dirname + '/api/policies',
                controllers : __dirname + '/api/controllers',
                config   : __dirname + '/config',
                models      : __dirname + '/api/models',
                services : __dirname + '/api/services'
            }, function (err)
            {
                return next(err);
            });
        },
        routes: {
            before: {
                // provide other services with a means to discover this service's capabilities
                'get /info': 'ServiceController.info'
            }
        },
        Service: require(__dirname + '/lib/discovery.js').Service
    };
};
