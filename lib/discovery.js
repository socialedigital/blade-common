var EventEmitter = require('events').EventEmitter;
var util = require('util');
var _ = require('lodash');
var path = require('path');
var Promise = require('bluebird');
var portfinder = Promise.promisifyAll(require('portfinder'));
var ServiceDiscovery = require('node-discover');
var request = require('./request.js');
var moment = require('moment');
var fs = require('fs');

var sails;
var mocks = {}
var nodes = {};
var nodeID;
var serviceName;
var serviceType;
var startTime;

function loadSeedData() {
    return Promise.all(_.reduce(sails.models, function(seeding, model, key) {
        if (model.seedData) {
            seeding.push(model.seed());
        }
        return seeding;
    }, []));
}


function mockService(serviceName){
    if(mocks.hasOwnProperty(serviceName)){
        mocks[serviceName]();
        return {
            id: "someRandomId",
            host: serviceName,
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
        nodes[info.host][nodeName] = {};
    }
    if (!_.isEqual(nodes[info.host][nodeName][info.id], info)) {
        nodes[info.host][nodeName][info.id] = info;
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
                    if (item.hasOwnProperty('status')) {
                        if (item.status == 'running') {
                            if (item.hasOwnProperty('loadBalancer')) {
                                item.host = item.loadBalancer;
                            }
                            else {
                                item.host = hostName;
                            }
                            list.push(item);
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
        result = mockService(serviceName)
    }
    return result;
}

var serviceCall = function(serviceName) {
    var service = getRandomService(serviceName);

    var serviceNotAvailable = function (error) {
        //todo: send some kind of notification that the service is not available
        //we don't need to mark the service as unavailable in the discovery node list because
        //if it is 'really' unavailable, the auto-discovery mechanism will know and will remove
        //it from the discovery list.
        var reasonMessage = 'unknown';
        if (error) {
            if (error.hasOwnProperty('message')) {
                reasonMessage = error.message;
            }
        }
        else {
            error = new Error();
        }
        error.message = 'Service ' + serviceName + ' is not available. reason: ' + reasonMessage;
        return Promise.reject(error);
    }
    return {
        get   : function (path) {
            if (service) {
                sails.config.metrics.serviceCallCounter.increment({ service: serviceName, method: 'GET', url: path });
                return request({
                    method: 'GET',
                    host  : service.host,
                    port  : service.port,
                    path  : path
                }).catch(function(error) {
                    return serviceNotAvailable(error);
                });
            }
            else {
                return serviceNotAvailable();
            }
        },
        put   : function (path, data) {
            if (service) {
                sails.config.metrics.serviceCallCounter.increment({ service: serviceName, method: 'PUT', url: path });
                return request({
                    method: 'PUT',
                    host  : service.host,
                    port  : service.port,
                    path  : path,
                    data  : data,
                    headers: {
                        'Content-Type': 'application/json',
                    }
                }).catch(function(error) {
                    return serviceNotAvailable(error);
                });
            }
            else {
                return serviceNotAvailable();
            }
        },
        post  : function (path, data) {
            if (service) {
                sails.config.metrics.serviceCallCounter.increment({ service: serviceName, method: 'POST', url: path });
                return request({
                    method: 'POST',
                    host  : service.host,
                    port  : service.port,
                    path  : path,
                    data  : data,
                    headers: {
                        'Content-Type': 'application/json',
                    }
                }).catch(function(error) {
                    return serviceNotAvailable(error);
                });
            }
            else {
                return serviceNotAvailable();
            }
        },
        delete: function (path) {
            if (service) {
                sails.config.metrics.serviceCallCounter.increment({ service: serviceName, method: 'DELETE', url: path });
                return request({
                    method: 'DELETE',
                    host  : service.host,
                    port  : service.port,
                    path  : path,
                    headers: {
                        'Content-Type': 'application/json',
                    }
                }).catch(function(error) {
                    return serviceNotAvailable(error);
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
            catch(exception) {
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
                catch(exception) {
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
    return loadSeedData()
    .error(function(error) {
        //todo: I would like to be able to determine exactly why the call failed, but Waterline has buried the error code in their WLError object and I hae no idea how to get it out without a lot of really ugly stuff :( :( :(
        sails.log.error('Unable to connect to databse:');
        sails.log.error(error);
        throw error;
    }).then(function(results) {
        return portfinder.getPortAsync({port: sails.config.port})
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
        self.addInfo('name',serviceName);
        self.addInfo('port', sails.config.port);

        var service = new ServiceDiscovery();
        var advertisement = {
            name: serviceName,
            type: serviceType,
            port: sails.config.port
        };

        var loadBalancer = process.env.LB_NAME || undefined;
        if (loadBalancer) {
            self.addInfo('loadBalancer', loadBalancer);
            advertisement.loadBalancer = loadBalancer;
        }

        service.advertise(advertisement);

        nodeID = service.broadcast.instanceUuid;

        service.on("added", function (obj) {
            var name = obj.advertisement.name;
            var type = obj.advertisement.type;

            if (type == 'service') {
                var info = {
                    id     : obj.id,
                    host   : obj.hostName,
                    address: obj.address,
                    port   : obj.advertisement.port
                }
                if (obj.advertisement.hasOwnProperty('loadBalancer')) {
                    info.loadBalancer = obj.advertisement.loadBalancer;
                }

                //todo: make sure that this only gets called once for each service that gets added
                sails.config.metrics.serviceCallCounter.increment({service: name, method: 'GET', url: '/info'});
                request({
                    method: 'GET',
                    host  : info.host,
                    port  : info.port,
                    path  : '/info'
                }).then(function (result) {
                    info.status = 'running';

                    var resultJSON = JSON.parse(result.body);
                    if (resultJSON.hasOwnProperty('routes')) {
                        info.routes = resultJSON.routes;
                    }
                    else {
                        //todo: send a notification that the newly added service hasn't exposed any routes to auto-discovery
                        sails.log.error('Unable to get routes from ' + info.host + ':' + name + '(' + info.id + ')');
                        info.routes = 'unavailable';
                    }
                    if (addDiscoveryInfo(name, info)) {
                        sails.log.verbose(JSON.stringify(nodes, null, 4));
                        //todo: might want to modify this so that we emit an 'added' event when a new node is added
                        //      and a 'changed' event when a node is changed, but, for now I think this is fine.
                        self.emit("added", info);
                    }
                }).catch(function (error) {
                    //the service isn't accepting REST requrest for some reason
                    //todo: send a notification that the newly added service isn't accepting REST requests
                    info.status = 'unavailable';
                    info.reason = error.message;
                    if (addDiscoveryInfo(name, info)) {
                        sails.log.verbose(name + ' (' + info.host + ':' + info.port + ') is unavailable [' + error.message + ']');
                        sails.log.verbose(JSON.stringify(nodes, null, 4));
                        self.emit("added", info);
                    }
                });
            }
        });

        service.on("removed", function (obj) {
            var name = obj.advertisement.name;
            var info = {
                id  : obj.id,
                host: obj.hostName,
                address: obj.address,
                port: obj.advertisement.port
            }
            if (obj.advertisement.hasOwnProperty('loadBalancer')) {
                info.loadBalancer = obj.advertisement.loadBalancer;
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
                sails.log.verbose(name + ' at ' + info.host + ':' + info.port + message);
                sails.log.verbose(JSON.stringify(nodes, null, 4));
                self.emit("removed", info);
            }
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

module.exports = new Discovery();

