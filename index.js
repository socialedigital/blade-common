if (process.env['NODE_ENV'] == 'test') {
    process.env['USE_MOCKS'] = true;
}

module.exports = function(sails) {
    return {
        initialize : function (next)
        {
            //initialize discovery
            var discovery = require("./lib/discovery.js");
            discovery.initialize(sails);

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
        }
    };
};
