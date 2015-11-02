var EventEmitter = require('events').EventEmitter;
var util = require('util');
var _ = require('lodash');
var path = require('path');
var Promise = require('bluebird');
var url = require('url');
var portfinder = Promise.promisifyAll(require('portfinder'));
var UDPServiceDiscovery = require('node-discover');
var RedisServiceDiscovery = require('./redis-discovery.js');
var request = require('./request.js');
var moment = require('moment');
var fs = require('fs');
var ServiceError = require('./errors/ServiceError.js');

var sails;
var mocks = {};
var nodes = {};
var nodeID;
var serviceName;
var serviceType;
var startTime;

function createDiscoveryService(sails) {
    return new Promise(function(resolve, reject) {
        if (process.env.NODE_ENV == 'test') {
            //we don't want to start auto-discovery when tests are being run
            var err = new Error('auto-discovery is not started during tests');
            err.inTesting = true;
            return reject(err);
        }
        var service = new RedisServiceDiscovery(sails, function(err, service) {
            if (err) {
                sails.log.warn(err.message);
                sails.log.warn('Unable to use REDIS for auto-discovery. Falling back to UDP discovery method.');
                return resolve(new UDPServiceDiscovery());
            }
            else {
                return resolve(service);
            }
        });
    })
}

function Discovery() {
    EventEmitter.call(this);
}

util.inherits(Discovery, EventEmitter);

var discoveryInstance = new Discovery();

function loadSeedData(options) {
    if (options.loadData) {
        return Promise.all(_.reduce(sails.models, function (seeding, model, key) {
            if (model.seedData) {
                seeding.push(model.seed());
            }
            return seeding;
        }, []));
    }
    else {
        return Promise.resolve([]);
    }
}

function mockService(requestedService){
    if(mocks.hasOwnProperty(requestedService)){
        mocks[requestedService]();
        return {
            id: "someRandomId",
            host: requestedService,
            port: 80,
        }
    } else {
        return null;
    }
}

function addDiscoveryInfo(nodeName, info) {
    result = false;     //modified an existing node in the list
    if (!nodes.hasOwnProperty(info.host)) {
        nodes[info.host] = {};
    }
    if (!nodes[info.host].hasOwnProperty(nodeName)) {
        nodes[info.host][nodeName] = {
            instances: 0
        };
    }
    if (!_.isEqual(nodes[info.host][nodeName][info.id], info)) {
        nodes[info.host][nodeName][info.id] = info;
        nodes[info.host][nodeName].instances += 1;

        result = true;  //added a new node in the list
    }
    return result;
}

function removeDiscoveryInfo(nodeName, info) {
    var result = false; //there wasn't a node to remove
    if (nodes.hasOwnProperty(info.host)) {
        if (nodes[info.host].hasOwnProperty(nodeName)) {
            if (nodes[info.host][nodeName].hasOwnProperty(info.id)) {
                delete nodes[info.host][nodeName][info.id];
                nodes[info.host][nodeName].instances -= 1;
                result = true;  //successfully removed the node
            }
            if (_.keys(nodes[info.host][nodeName]).length == 0) {
                delete nodes[info.host][nodeName];
            }
            if (_.keys(nodes[info.host]).length == 0) {
                delete nodes[info.host];
            }
        }
    }
    return result;
}

function getDiscoveryInfo(nodeName, info) {
    var result;
    if (nodes.hasOwnProperty(info.host)) {
        if (nodes[info.host].hasOwnProperty(nodeName)) {
            if (nodes[info.host][nodeName].hasOwnProperty(info.id)) {
                result = nodes[info.host][nodeName][info.id];
            }
        }
    }
    return result;
}

function getService(serviceName) {
    var result = null;

}

function getRandomService(requestedService) {
    //this will either return a random node from the nodes list that corresponds
    //to the requestedService provided, or will return null if no service matching the
    //requestedService was found in the nodes list
    //todo: I'm thinking that it might be useful to prefer a service that is running on the
    //      same host where the request is coming from, but this might only be useful when
    //      working on a development machine where all services are running locally.  This
    //      probably doesn't make sense in a production environemnt -- more thought is needed.
    var result = null;
    //find all nodes that match the service name
    // (can't cache these because the list of services can change at any time)
    var serviceList = _.reduce(nodes, function (list, host, hostName) {
        _.each(host, function (service, name) {
            if (name == requestedService) {
                _.each(service, function (item, id) {
                    if (item.hasOwnProperty('status')) {
                        if (item.status == 'online') {
                            list.push(item);
                        }
                        else {
                            sails.log.debug(requestedService + ' is offline');
                            console.trace(requestedService + item.status);
                        }
                    }
                })
            }
        });
        return list;
    }, []);
    if (serviceList.length > 0 && process.env.NODE_ENV != 'test') {     //never select a running service when running tests
        result = _.sample(serviceList);
    }
    else if (process.env.USE_MOCKS) {
        result = mockService(requestedService)
    }
    return result;
}

var serviceCall = function(requestedService) {
    var service = getRandomService(requestedService);

    function serviceUnavailable(context, request) {
        console.trace({
            error: 'ServiceUnavailable',
            service: requestService,
            request: request
        });
        var error = new ServiceUnavailable(requestedService, request);
        error.setContext(context);
        sails.log.error(requestedService);
        sails.log.error(request);
        throw error;
    }

    return {
        get   : function (path) {
            if (service) {
                sails.config.metrics.serviceCallCounter.increment({ service: requestedService, method: 'GET', url: path });
                return request(requestedService, arguments.callee, {
                    method: 'GET',
                    host  : service.host,
                    port  : service.port,
                    path  : path,
                    service: serviceName
                });
            }
            else {
                serviceUnavailable(arguments.callee, 'GET ' + path);
            }
        },
        put   : function (path, data) {
            if (service) {
                sails.config.metrics.serviceCallCounter.increment({ service: requestedService, method: 'PUT', url: path });
                return request(requestedService, arguments.callee, {
                    method: 'PUT',
                    host  : service.host,
                    port  : service.port,
                    path  : path,
                    data  : data,
                    service: serviceName
                });
            }
            else {
                serviceUnavailable(arguments.callee,  'PUT ' + path);
            }
        },
        post  : function (path, data) {
            if (service) {
                sails.config.metrics.serviceCallCounter.increment({ service: requestedService, method: 'POST', url: path });
                return request(requestedService, arguments.callee, {
                    method: 'POST',
                    host  : service.host,
                    port  : service.port,
                    path  : path,
                    data  : data,
                    service: serviceName
                });
            }
            else {
                serviceUnavailable(arguments.callee,  'POST ' + path);
            }
        },
        delete: function (path) {
            if (service) {
                sails.config.metrics.serviceCallCounter.increment({ service: requestedService, method: 'DELETE', url: path });
                return request(requestedService, arguments.callee, {
                    method: 'DELETE',
                    host  : service.host,
                    port  : service.port,
                    path  : path,
                    service: serviceName
                });
            }
            else {
                serviceUnavailable(arguments.callee,  'DELETE ' + path);
            }
        }
    }
}

Discovery.prototype.initialize = function (sailsInstance) {
    sails = sailsInstance;

    startTime = moment();

    var mockPath;
    var configMockPath;
    if (sails.config.hasOwnProperty('mocks') && process.env.NODE_ENV != 'test') {
        if (sails.config.mocks == true) {
            configMockPath = path.resolve('config/mocks.js');
            try {
                fs.statSync(configMockPath);
                mockPath = configMockPath;
                process.env['USE_MOCKS'] = true;
            }
            catch (exception) {
                sails.log.warn(configMockPath + " doesn't exist");
            }
        }
        else {
            if (sails.config.mocks == false) {
                delete process.env['USE_MOCKS']
            }
            else {
                if (sails.config.mocks.hasOwnProperty('path')) {
                    mockPath = path.normalize(sails.config.mocks.path);
                    try {
                        fs.statSync(mockPath);
                        process.env['USE_MOCKS'] = true;
                    }
                    catch (exception) {
                        //if the file that sails.config.mocks.path doesn't exist, then we won't use it
                        sails.log.warn(mockPath + " doesn't exist");
                        mockPath == undefined;
                    }
                }
            }
        }
    }

    if (process.env.USE_MOCKS) {
        if (sails.config.hasOwnProperty('mocks')) {
            //determine if this is the actual mocks or a path to a .js file that defines the mocks
            if (sails.config.mocks.hasOwnProperty('path')) {
                mockPath = path.normalize(sails.config.mocks.path);
                try {
                    fs.statSync(mockPath);
                    sails.log.info('Using mocks defined in: ' + mockPath);
                    mocks = require(mockPath);
                }
                catch (exception) {
                    sails.log.warn(mockPath + " doesn't exist");
                }
            }
            else {
                //if there are mocks defined in config/mocks.js, don't load them if we are testing
                if (process.env.NODE_ENV == 'test' && sails.config.mocks == true && configMockPath) {
                    sails.log.warn('NOT Using service mocks defined in config/mocks.js because we are TESTING');
                }
                else {
                    if (mockPath) {
                        try {
                            fs.statSync(mockPath);
                            sails.log.info('Using mocks defined in ' + mockPath);
                            mocks = require(mockPath);
                        }
                        catch (exception) {
                            sails.log.warn(mockPath + "doesn't exist");
                        }
                    }
                }
            }
        }
        var mockedServices = _.keys(mocks);
        var message = mockedServices.length > 1 ? mockedServices.join(', ') : 'none';
        sails.log.info('Mocked Services: ' + message);

    }
};

Discovery.prototype.register = function (serviceOptions) {
    var self = this;

    //before we do anything, check to see if we need to load any data first
    //this might seem like an odd place to do this, but this must happen after
    //sails has been lifted so it can't be done in the hook initialization.
    //since every service or adapter calls register, this seems like a good place
    //to do it.
    var loadOptions = {
        loadData: true
    }
    if (serviceOptions.hasOwnProperty('seed')) {
        loadOptions.loadData = serviceOptions.seed;
    }
    return loadSeedData(loadOptions)
    .error(function(error) {
        //todo: I would like to be able to determine exactly why the call failed, but Waterline has buried the error code in their WLError object and I hae no idea how to get it out without a lot of really ugly stuff :( :( :(
        sails.log.error('Unable to connect to databse:');
        sails.log.error(error);
        throw error;
    }).then(function(results) {
        return Promise.all(results);
    }).then(function(results) {
        return portfinder.getPortAsync({port: sails.config.port});
    }).then(function (port) {
        if (port != sails.config.port) {
            sails.config.port = port;
            sails.log.warn('There was a port conflict! (changing to new port:' + port + ')');
        }

        //parse serviceOptions
        var name = serviceOptions.name.toLowerCase();
        var type = serviceOptions.type.toLowerCase();
        serviceName = type + '.' + name;
        serviceType = type;

        self.addInfo('name', serviceName);
        self.addInfo('port', sails.config.port);

        return createDiscoveryService(sails)
    }).then(function(service) {
        var advertisement = {
            name: serviceName,
            port: sails.config.port
        };
        if (process.env.LB_NAME) {
            advertisement.loadBalancer = process.env.LB_NAME;
        }
        service.advertise(advertisement);

        nodeID = service.broadcast.instanceUuid;

        service.on("added", function (obj) {
            //todo:  The following condition was added to prevent something that just started happening
            //       specifically, it was causing an error when obj.advertisement didn't exist.
            //       this was previously working correctly without causing an error -- the "added" event
            //       was only being fired if an actual service had been added.  Now, this event is getting
            //       fired in response to something else -- maybe there is something on my system that
            //       uses the same UDP library?  Maybe I should change the discovery PORT from 12345 to
            //       something else?
            //       In any case, putting the following condition here fixes the problem, and doesn't
            //       seem to affect adapter / service discovery at all.
            if (!obj.advertisement) {
                return;
            }

            var name = obj.advertisement.name;  //<type>.<name>
            var type = name.split('.')[0];

            var info = {
                id     : obj.id,
                host   : obj.advertisement.loadBalancer || obj.hostName,
                address: obj.address,
                type   : type,
                status : 'online'
            }
            if (!obj.advertisement.loadBalancer) {
                info.port = obj.advertisement.port;
            }

            //only call /info for services - not for any other type
            return ((type == 'service')
                ? request('discovery', null, {
                    method : 'GET',
                    host   : info.host,
                    port   : info.port,
                    service: serviceName,
                    path   : '/info'
                }).then(function (result) {
                    sails.config.metrics.serviceCallCounter.increment({service: name, method: 'GET', url: '/info'});
                    if (result.json) {
                        if (result.json.hasOwnProperty('routes')) {
                            info.routes = result.json.routes;
                        }
                        else {
                            //todo: send a notification that the newly added service hasn't exposed any routes to auto-discovery
                            sails.log.error('Unable to get routes from ' + info.host + ':' + name + '(' + info.id + ')');
                            info.routes = 'unavailable';
                        }
                        //if (result.json.hasOwnProperty('interfaces')) {
                        //    info.interfaces = result.json.interfaces;
                        //}
                    }
                    return info;
                })
                : Promise.resolve(info))
            .then(function(info) {
                return (addDiscoveryInfo(name, info))
            }).catch(function (error) {
                //the service isn't accepting REST requests for some reason
                //todo: send a notification that the newly added service isn't accepting REST requests
                info.status = 'unavailable';
                info.reason = error.message;
                var wasAdded = false;
                if (addDiscoveryInfo(name, info)) {
                    sails.log.silly(name + ' (' + info.host + ':' + info.port + ') is unavailable [' + error.message + ']');
                    wasAdded = true;
                }
                return wasAdded;
            }).then(function(wasAdded) {
                if (wasAdded) {
                    RouteForward.serviceSetup(name, self, info);
                    sails.log.silly(JSON.stringify(nodes, null, 4));
                    self.emit("added", {name: name, info: info});
                }
            });
        });

        service.on("removed", function (obj) {
            var name = obj.advertisement.name;
            var info = {
                id  : obj.id,
                host: obj.hostName,
                address: obj.address,
                port: obj.advertisement.port
            }

            var message = '';
            var currentNodeInfo = getDiscoveryInfo(name, info);
            if (currentNodeInfo) {
                if (currentNodeInfo.status && currentNodeInfo.status == 'unavailable') {
                    message = ' was unavailable';
                }
            }

            if (removeDiscoveryInfo(name, info)) {
                if (message.length > 0) {
                    message += ' and';
                }
                message += ' has been removed from the auto-discovery list';
                if (currentNodeInfo && currentNodeInfo.reason) {
                    message += ' because [' + currentNodeInfo.reason + ']';
                }
                sails.log.silly(name + ' at ' + info.host + ':' + info.port + message);
                sails.log.silly(JSON.stringify(nodes, null, 4));
                self.emit("removed", {name: name, info: info});
            }
        });

        return serviceName;
    }).catch(function(err) {
        if (!err.inTesting) {
            sails.log.error(err);
        }
    });
};

Discovery.prototype.request = serviceCall;

Discovery.prototype.addMock = function (requestedService, mockDefinition) {
    //ensure that we can only call this if the environment variable USE_MOCKS has been set to 'true'
    if (!process.env.USE_MOCKS) {
        throw new Error('Unable to add mock definition unless environment variable "USE_MOCKS" has been set to "true"');
    }
    mocks[requestedService] = mockDefinition;
}

Discovery.prototype.getName = function () {
    return serviceName;
};

Discovery.prototype.getType = function() {
    return serviceType;
}

Discovery.prototype.addInfo = function(key, value) {
    if (!sails.config.service) {
        sails.config.service = {};
    }
    sails.config.service[key] = value;
}

Discovery.prototype.getInfo = function(key) {
    var result = undefined;
    if (sails.config.service[key]) {
        result = sails.config.service[key];
    }
    return result;
}

Discovery.prototype.getStartTime = function() {
    return startTime.format();
}

Discovery.prototype.getElapsedTime = function() {
    return startTime.fromNow();
}

Discovery.prototype.getService = function(name) {
    return getRandomService(name);
}

module.exports = discoveryInstance;

