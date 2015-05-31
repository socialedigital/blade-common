if (process.env['NODE_ENV'] == 'test') {
    process.env['USE_MOCKS'] = true;
}

module.exports = function(sails) {
    var loader = require("sails-util-mvcsloader")(sails);
    /**
     * inject the policies and config first before returning this next link in the hook startup chain
     * need to be in place before sails binding
     */
    loader.injectAll({
        policies : __dirname + '/api/policies',
        config   : __dirname + '/config'
    });
    return {
        initialize : function (next)
        {
            //initialize discovery
            var discovery = require("./lib/discovery.js");
            discovery.initialize(sails);

            loader.injectAll({
                controllers : __dirname + '/api/controllers',
                models      : __dirname + '/api/models',
                services : __dirname + '/api/services'
            }, function (err)
            {
                return next(err);
            });
        }
    };
};
