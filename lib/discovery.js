var ServiceDiscovery = require('node-discover');
var Promise = require('bluebird');
var portfinder = Promise.promisifyAll(require('portfinder'));
var sails = require('sails');
var _ = require('lodash');

var nodes = {};

module.exports.Service = {
    register: function(serviceOptions) {

        return portfinder.getPortAsync({port: sails.config.port})
            .then(function (port) {
                if (port != sails.config.port) {
                    sails.config.port = port;
                    sails.log.warn('There was a port conflict! (changing to new port:' + port + ')');
                }
            }).catch(function (error) {
                sail.log.error(error);
            }).then(function () {
                //parse serviceOptions
                var name = serviceOptions.name.toLowerCase();
                var type = serviceOptions.type.toLowerCase();
                var fullName = type + '.' + name;

                var service = new ServiceDiscovery();

                //format routes for advertisement to other services
                var rawRoutes = sails.config.routes;
                //var routes = { get: [], post: [], put: [], delete: [] };
                var routes = _(_.keys(rawRoutes)).reduce(function(result, route) {
                    var parts = route.split(' ');
                    var verb = parts[0];
                    console.log(verb)
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
                _.each(routes, function(route) {
                    route.sort();
                });

                service.advertise({
                    name : fullName,
                    port: sails.config.port,
                    routes: routes
                });

                service.on("added", function (obj) {
                    var host = obj.hostName;
                    var name = obj.advertisement.name;
                    var info = {
                        id: obj.id,
                        ip: obj.address,
                        port:obj.advertisement.port,
                        routes: obj.advertisement.routes
                    }

                    if (!nodes.hasOwnProperty(host)) {
                        nodes[host] = [];
                    }
                    if (!nodes[host].hasOwnProperty(name)) {
                        nodes[host][name] = [];
                    }
                    nodes[host][name].push(obj);
                    console.log('Node added');
                    console.log(JSON.stringify(nodes, null, 4));
                });

                service.on("removed", function (obj) {
                    var name = obj.advertisement.name;
                    if (nodes.hasOwnProperty(name)) {
                        var removedObj = _.remove(nodes[name], function(item) {
                            return item.id == obj.id;
                        });
                        if (removedObj) {
                            console.log(removedObj);
                        }
                        else {
                            console.log("Didn't find object id: " + obj.id);
                        }
                    }
                    console.log("Node lost from the network.");
                    console.log(JSON.stringify(nodes, null, 4));
                });
            })
    }
};

