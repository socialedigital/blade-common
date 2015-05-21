var _ = require('lodash');
var path = require('path');
var Promise = require('bluebird');
var portfinder = Promise.promisifyAll(require('portfinder'));
var ServiceDiscovery = require('node-discover');

var sails;
var mocks = {}
var nodes = {};
var nodeID;

function mockService(serviceName){
    if(mocks.hasOwnProperty(serviceName)){
        mocks[serviceName]();
        return {
            id: "someRandomId",
            ip: serviceName,
            port: 80,
            host: "someRandomHost"
        }
    } else {
        return null;
    }
}

module.exports = {
    initialize: function(sailsInstance) {
        sails = sailsInstance;
        if (process.env.USE_MOCKS) {
            if (sails.config.hasOwnProperty('mocks')) {
                //determine if this is the actual mocks or a path to a .js file that defines the mocks
                if (sails.config.mocks.hasOwnProperty('path')) {
                    mockPath = path.normalize(sails.config.mocks.path);
                    sails.log.info('Using service mocks defined in: ' + mockPath);
                    mocks = require(mockPath);
                }
                else {
                    mocks = sails.config.mocks;
                }
            }
        }
    },

    register: function(serviceOptions) {
        return portfinder.getPortAsync({port: sails.config.port})
        .then(function (port) {
            if (port != sails.config.port) {
                sails.config.port = port;
                sails.log.warn('There was a port conflict! (changing to new port:' + port + ')');
            }
        }).catch(function (error) {
            sails.log.error(error);
        }).then(function () {
            //parse serviceOptions
            var name = serviceOptions.name.toLowerCase();
            var type = serviceOptions.type.toLowerCase();
            var fullName = type + '.' + name;

            var service = new ServiceDiscovery();

            service.advertise({
                name : fullName,
                port: sails.config.port
            });

            nodeID = service.broadcast.instanceUuid;

            service.on("added", function (obj) {
                var host = obj.hostName;
                var name = obj.advertisement.name;
                var info = {
                    id: obj.id,
                    ip: obj.address,
                    port:obj.advertisement.port
                }
                if (!nodes.hasOwnProperty(host)) {
                    nodes[host] = {};
                }
                if (!nodes[host].hasOwnProperty(name)) {
                    nodes[host][name] = {};
                }
                nodes[host][name][info.id] = info;

                serviceCall(name)
                    .get('/info')
                    .then(function(result) {
                        var resultJSON = JSON.parse(result.body);
                        if (resultJSON.hasOwnProperty('routes')) {
                            info.routes = resultJSON.routes;
                            nodes[host][name][info.id] = info;
                        }
                        else {
                            sails.log.error('Unable to get routes from ' + host + ':' + name + '(' + info.id + ')');
                            //todo: what to do if this happens?
                        }
                        sails.log.verbose('Node added');
                        sails.log.verbose(JSON.stringify(nodes, null, 4));
                    }).catch(function(error) {
                        //todo: handle this case - how to recover from this?
                        sails.log.error(error);
                    });
            });

            service.on("removed", function (obj) {
                var host = obj.hostName;
                var name = obj.advertisement.name;
                var id = obj.id;

                if (nodes.hasOwnProperty(host)) {
                    if (nodes[host].hasOwnProperty(name)) {
                        if (nodes[host][name].hasOwnProperty(id)) {
                            delete nodes[host][name][id];
                        }
                        if (_.keys(nodes[host][name]).length == 0) {
                            delete nodes[host][name];
                        }
                        if (_.keys(nodes[host]).length == 0) {
                            delete nodes[host];
                        }
                    }
                }
                sails.log.verbose(JSON.stringify(nodes, null, 4));
            });
        })
    },

    getService: function (serviceName) {
        //this will either return a random node from the nodes list that corresponds
        //to the serviceName provided, or will return null if no service matching the
        //serviceName was found in the nodes list
        //todo: I'm thinking that it might be useful to prefer a service that is running on the
        //      same host where the request is coming from, but this might only be useful when
        //      working on a development machine where all services are running locally.  This
        //      probably doesn't make sense in a production environemnt -- more thought is needed.
        var result = null;
        //find all nodes that match the service name
        // (can't cache these because the list of services can change at any time)
        var serviceList = _.reduce(nodes, function (list, host, hostName) {
            _.each(host, function (service, name) {
                if (name == serviceName) {
                    _.each(service, function (item, id) {
                        item.host = hostName;
                        list.push(item);
                    })
                }
            });
            return list;
        }, []);
        if (serviceList.length > 0) {
            result = _.sample(serviceList);
        }
        else if (process.env.USE_MOCKS) {
            result = mockService(serviceName)
        }
        return result;
    },
    addMock: function(serviceName, mockDefinition) {
        //ensure that we can only call this if the environment variable USE_MOCKS has been set to 'true'
        if (!process.env.USE_MOCKS) {
            throw new Error('Unable to add mock definition unless environment variable "USE_MOCKS" has been set to "true"');
        }
        mocks[serviceName] = mockDefinition;
    }
}
