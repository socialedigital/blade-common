if (process.env['NODE_ENV'] == 'test') {
    process.env['USE_MOCKS'] = true;
}

module.exports = function (sails) {
    var loader = require("sails-util-mvcsloader")(sails);
    var responses = require("./lib/responses")(sails);
    var discovery = require("./lib/discovery.js");

    /**
     * inject the policies and config first before returning this next link in the hook startup chain
     * need to be in place before sails binding
     */
    sails.log.info('Loading Blade Policies and Configuration');
    loader.injectAll({
        policies : __dirname + '/api/policies',
        config   : __dirname + '/config'
    });
    return {

        initialize: function(cb) {
            sails.log.info('Loading Blade Standard Responses');
            responses.initialize(function(err) {
                if (err) {
                    return cb(err);
                };
                sails.log.info('Loading Blade Controllers, Models, and Services');
                loader.injectAll({
                    controllers: __dirname + '/api/controllers',
                    models     : __dirname + '/api/models',
                    services   : __dirname + '/api/services'
                }, function (err) {
                    if (err) {
                        return cb(err);
                    }
                    //initialize discovery
                    discovery.initialize(sails)
                    return cb();
                });
            })
        },

        loadModules: responses.loadModules,

        routes: responses.routes
    }
};
