var EventEmitter = require('events').EventEmitter;
var util = require('util');
var _ = require('lodash');
var path = require('path');
var Promise = require('bluebird');
var portfinder = Promise.promisifyAll(require('portfinder'));
var ServiceDiscovery = require('node-discover');
var request = require('./request.js');

var sails;
var mocks = {}
var nodes = {};
var nodeID;
var serviceName;

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

function getRandomService(serviceName) {
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
}

var serviceCall = function(serviceName) {
    var service = getRandomService(serviceName);

    var serviceNotAvailable = function () {
        return Promise.reject('Service ' + serviceName + ' is not available.');
    }
    return {
        get   : function (path) {
            if (service) {
                return request({
                    method: 'GET',
                    host  : service.ip,
                    port  : service.port,
                    path  : path
                });
            }
            else {
                return serviceNotAvailable();
            }
        },
        put   : function (path, data) {
            if (service) {
                return request({
                    method: 'PUT',
                    host  : service.ip,
                    port  : service.port,
                    path  : path,
                    data  : data
                });
            }
            else {
                return serviceNotAvailable();
            }
        },
        post  : function (path, data) {
            if (service) {
                return request({
                    method: 'POST',
                    host  : service.ip,
                    port  : service.port,
                    path  : path,
                    data  : data
                });
            }
            else {
                return serviceNotAvailable();
            }
        },
        delete: function (path) {
            if (service) {
                return request({
                    method: 'DELETE',
                    host  : service.ip,
                    port  : service.port,
                    path  : path
                });
            }
            else {
                return serviceNotAvailable();
            }
        }
    }
}

function Discovery() {
    EventEmitter.call(this);
}

util.inherits(Discovery, EventEmitter);

Discovery.prototype.initialize = function (sailsInstance) {
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
                //if there are mocks defined in /config/mocks.js, don't load them if we are testing
                if (process.env.NODE_ENV == 'test') {
                    sails.log.warn('NOT Using service mocks defined in /config/mocks.js because we are TESTING');
                }
                else {
                    sails.log.info('Using service mocks defined in /config/mocks.js');
                    mocks = sails.config.mocks;
                }
            }
        }
    }
};

Discovery.prototype.register = function (serviceOptions) {
    var self = this;
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
        serviceName = type + '.' + name;

        var service = new ServiceDiscovery();

        service.advertise({
            name: serviceName,
            port: sails.config.port
        });

        nodeID = service.broadcast.instanceUuid;

        service.on("added", function (obj) {
            var host = obj.hostName;
            var name = obj.advertisement.name;
            var info = {
                id  : obj.id,
                ip  : obj.address,
                port: obj.advertisement.port
            }

            request({
                method: 'GET',
                host  : info.ip,
                port  : info.port,
                path  : '/info'
            })
            .then(function (result) {
                if (!nodes.hasOwnProperty(host)) {
                    nodes[host] = {};
                }
                if (!nodes[host].hasOwnProperty(name)) {
                    nodes[host][name] = {};
                }

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
                self.emit("added", {
                    name: name,
                    ip: info.ip,
                    port: info.port
                });

            }).catch(function (error) {
                //the service isn't accepting REST requrest for some reason
                //todo: send a notification that the newly added service isn't accepting REST requests
                sails.log.error(name + ' (' + info.ip + ':' + info.port + ') is unavailable [' + error.message + ']');
            });
        });

        service.on("removed", function (obj) {
            var host = obj.hostName;
            var name = obj.advertisement.name;
            var id = obj.id;

            self.emit("removed", {
                name: name,
                ip: obj.address,
                port: obj.advertisement.port
            });


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

        return serviceName;
    })
};

Discovery.prototype.request = serviceCall;

Discovery.prototype.addMock = function (serviceName, mockDefinition) {
    //ensure that we can only call this if the environment variable USE_MOCKS has been set to 'true'
    if (!process.env.USE_MOCKS) {
        throw new Error('Unable to add mock definition unless environment variable "USE_MOCKS" has been set to "true"');
    }
    mocks[serviceName] = mockDefinition;
}

Discovery.prototype.getName = function () {
    return serviceName;
};

module.exports = new Discovery();

