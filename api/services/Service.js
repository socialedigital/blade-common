var Promise = require('bluebird');
var portfinder = Promise.promisifyAll(require('portfinder'));
var discovery = require('../../lib/discovery.js');
var request = require('../../request.js');
var sails = require('sails');


var serviceCall = function(serviceName) {
    var service = discovery(serviceName);

    var serviceNotAvailable = function() {
        return Promise.reject('Service ' + serviceName + ' is not available.');
    }
    return {
        get   : function (path) {
            if (service) {
                return request({
                    method: 'GET',
                    host: service.ip,
                    port: service.port,
                    path: path
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
                    host: service.ip,
                    port: service.port,
                    path: path,
                    data: data
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
                    host: service.ip,
                    port: service.port,
                    path: path,
                    data: data
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
                    host: service.ip,
                    port: service.port,
                    path: path
                });
            }
            else {
                return serviceNotAvailable();
            }
        }
    }
}

module.exports = {
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

    request: function(serviceName) {
        return serviceCall(serviceName);
    },

    mocks: {
        add: discovery.addMock
    }
};