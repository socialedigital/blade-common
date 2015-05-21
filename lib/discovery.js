var _ = require('lodash');
var ServiceDiscovery = require('node-discover');
var sails = require('sails');
var path = require('path');

var mocks = {}
var nodes = {};
var nodeID;

if (process.env.USE_MOCKS) {
    if (sails.config.hasOwnProperty('mocks')) {
        mockPath = path.normalize(sails.config.mocks);
        sails.log.info('Using service mocks defined in: ' + mockPath);
        mocks = require(mockPath);
    }
}

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
