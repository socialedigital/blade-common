var _ = require('lodash');
var ServiceDiscovery = require('node-discover');
var Promise = require('bluebird');
var portfinder = Promise.promisifyAll(require('portfinder'));
var sails = require('sails');
var request = require('../request.js');

var nodes = {};
var nodeID;

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

                    request({
                        method: 'GET',
                        host: info.ip,
                        port: info.port,
                        path: '/info',
                    }).then(function(result) {
                        info.routes = result.body;
                        if (!nodes.hasOwnProperty(host)) {
                            nodes[host] = {};
                        }
                        if (!nodes[host].hasOwnProperty(name)) {
                            nodes[host][name] = [];
                        }
                        nodes[host][name].push(info);
                        console.log('Node added');
                        console.log(JSON.stringify(nodes, null, 4));
                    });
                });

                service.on("removed", function (obj) {
                    var host = obj.hostName;
                    var name = obj.advertisement.name;

                    if (nodes.hasOwnProperty(host)) {
                        if (nodes[host].hasOwnProperty(name)) {
                            var removedObj = _.remove(nodes[host][name], function(item) {
                                return item.id == obj.id;
                            });
                            if (!removedObj)  {
                                console.log("Couldn't remove object id: " + obj.id);
                            }
                            if (nodes[host][name].length == 0) {
                                delete nodes[host][name];
                            }
                            if (_.keys(nodes[host]).length == 0) {
                                delete nodes[host];
                            }
                        }
                    }
                    console.log(JSON.stringify(nodes, null, 4));
                });
            })
    }
};

