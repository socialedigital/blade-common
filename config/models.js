var path = require('path');
var Promise = require('bluebird');

module.exports.models = {

    /**
     * This method adds records to the database
     *
     * To use add a variable 'seedData' in your model and the data
     * will be loaded when you call register on the Service object
     */
    seed: function() {
        var self = this;
        var modelName = self.globalId;

        if (self.seedData) {
            return self.count()
            .then(function (count) {
                if (count == 0) {
                    var dataPath = path.normalize(self.seedData);
                    self.seedData = require(dataPath);
                    sails.log.debug('Seeding ' + modelName + ' with data from "' + dataPath + '"');
                    if (self.seedData instanceof Array) {
                        return self.createEach(self.seedData);
                    }
                    else {
                        return self.create(self.seedData);
                    }
                }
                else {
                    return count;
                }
            }).then(function(results) {
                var info = {};
                if (results instanceof Array) {
                    info[modelName] = results.length;
                }
                else {
                    info[modelName] = results;
                }
                return info;
            })
        }
        else {
            return Promise.reject('"seedData" property not specified in ' + modelName + ' model definition');
        }
    },

    /**
     * This method checks an error to see if it contains validation
     * error information for a particular model
     *
     */

    isValidationError: function(error) {
        var validationErrors = [];

        if (error && error instanceof Error) {

        }

        return validationErrors;
    }

};