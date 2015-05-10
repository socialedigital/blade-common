var ServiceDiscovery = require('node-discover');
var Promise = require('bluebird');
var portfinder = Promise.promisifyAll(require('portfinder'));
var sails = require('sails');

var nodes = {};

module.exports.Service = {
    register: function(serviceOptions) {
        var isMaster = false;

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

            var options = {};
            if (fullName == 'service.core') {
                options.server = true;
                options.weight = 1;
            }
            else {
                options.client = true;
            }
            options.reuseAddr = true;

            var service = new ServiceDiscovery(options);
            service.advertise({
                name : fullName,
                port: sails.config.port
            });

            service.on('promotion', function () {
                isMaster = true;
                console.log('I was promoted to a master.');
            });

            service.on('demotion', function () {
                isMaster = false;
                console.log('I was demoted from being a master.');
            });

            service.on('master', function (obj) {
                console.log('A new master is in control');
            });

            service.on("added", function (obj) {
                if (isMaster) {
                    var name = obj.advertisement.name;
                    if (!nodes.hasOwnProperty(name)) {
                        nodes[name] = [];
                    }
                    nodes[name].push(obj);
                    console.log('Node added');
                    console.log(JSON.stringify(nodes, null, 4));

                }
            });

            service.on("removed", function (obj) {
                if (isMaster) {
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
                }
            });
        })
    }
};

