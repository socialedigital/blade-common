var path = require('path');
var Promise = require('bluebird');
var path = require('path');

//We have to do the following because there is a bug in npm install when it installs packages.
//Specifically, because the project that is using blade-common has a dependency on the sails package,
//when npm installs the blade-common package, it won't intall sails in blade-common/node_modules which
//which means we can't find the WLValidationError object.  Further, if we are running in a local environment
//there's a good chance that we have a symlink to the blade-common package, but when this gets deployed
//there won't be a symlink; so, we have to check to see if we can find the WLValidtionError module
//relative to the blade-common package -- we will find it if we have installed it locally, but it won't
//be found when deployed because of the npm install bug.  So, we have to try to find it in two places.
//
//If we are running locally without a sym-link to the blade-common package, then this should work as expected.
var WLValidationError;
try {
    //try to find WLValidationError module in the enclosing project's node_modules first.
    //this will succeed if we are running this in a deployed environment,
    //but if we are running locally with a sym-link to the blade-common package, this will fail
    WLValidationError = require('../../sails/node_modules/waterline/lib/waterline/error/WLValidationError.js');
}
catch(error) {
    if ( error.code === 'MODULE_NOT_FOUND' ) {
        //however, if we are running locally with a sym-link to blade-common, then, presumably
        //we've done an npm install on the sym-linked project and sails will have been installed there
        //so this shouldn't fail
        WLValidationError = require('../node_modules/sails/node_modules/waterline/lib/waterline/error/WLValidationError.js');
    }
}


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

    validationError: function(model, invalidAttributes, status, message) {
        return new WLValidationError({
            invalidAttributes: invalidAttributes,
            model: model,
            status: status,
            message: message
        }
    );
}

};