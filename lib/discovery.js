var ServiceDiscovery = require('node-discover');
var Promise = require('bluebird');
var portfinder = Promise.promisifyAll(require('portfinder'));
var sails = require('sails');

module.exports.Service = function() {
    return {
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
                var name = serviceOptions.name;
                var type = serviceOptions.type;
                var fullName = type + '.' + name;

                var service = new ServiceDiscovery();
                service.advertise({
                    name : fullName,
                    ready: false
                });

                service.on('ready', function () {
                    service.advertise({
                        name : fullName,
                        ready: true
                    });
                });

                service.on('promotion', function () {
                    console.log('I was promoted to a master.');
                });

                service.on('demotion', function () {
                    console.log('I was demoted from being a master.');
                });

                service.on('master', function (obj) {
                    console.log('A new master is in control');
                });

                service.on("added", function (obj) {
                    console.log('Node added');
                    console.log(obj);
                    //console.log("Node added; here are all the nodes:");
                    //service.eachNode(function (node) {
                    //    console.log(node);
                    //});
                });

                service.on("removed", function (obj) {
                    console.log("Node lost from the network.");
                    console.log(obj);
                });
            })
        }
    }
};

