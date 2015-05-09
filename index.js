var _ = require('lodash');
var path = require('path');
var util = require('sails-util');
var buildDictionary = require('sails-build-dictionary');
var fs = require('fs');
var Promise = require('bluebird');

module.exports = function(sails) {
    var apiDirectory = path.join(__dirname, 'api');
    var libDirectory = path.join(__dirname, 'lib');

    return {
        /**
         * TODO add suport to plugin initialize functions
         *
         * @param  {Function} cb  callback
         */
        initialize: function(cb) {
            this.getModelNames(apiDirectory, function(err, modelNames) {
                if (err) return cb(err);

                sails.log.info('models found: ', modelNames);
                cb();
            })
            //this.getPluginsNames(apiDirectory, function (err, pluginsNames) {
            //    if (err) return cb(err);
            //
            //    sails.log.info('plugins found :', pluginsNames);
            //    // todo add suport to initialize function on npm modules
            //    cb();
            //})
        },

        /**
         * TODO add suport to services, and polices in plugins
         *
         * @param  {Function} cb  callback
         */
        loadModules: function(cb) {
            var self = this;
            var modelDirectory = path.join(apiDirectory, 'models');

            self.loadModels(modelDirectory, function(err, models) {
                if (err) sails.log.error(err);
                sails.models = _.extend(sails.models || {}, models);
                cb();
            });
        },

        getModelNames: function getModelNames(folder, cb) {
            var modelNames = [];
            var modelDirectory = path.join(folder, 'models');
            fs.readdir(modelDirectory, function(err, files) {
                if (err) {
                    //do something with the error
                    return cb(err);
                }
                else {
                    for (var i = files.length - 1; i >= 0; i--) {
                        //wondering if I need to check to see if the file is really a waterline model or not?
                        modelNames.push(files[i]);
                    }
                    return cb(null, modelNames);
                }
            })
        },

        /**
         * Load npm module model definitions
         *
         * @param {Object} options
         * @param {Function} cb
         */
        loadModels: function (path, cb) {
            // Get the main model files
            buildDictionary.optional({
                dirname: path,
                filter: /^([^.]+)\.(js)$/,
                replaceExpr: /^.*\//,
                flattenDirectories: true
            }, function(err, models) {
                if (err) {return cb(err);}
                // Get any supplemental files
                buildDictionary.optional({
                    dirname: path,
                    filter: /(.+)\.attributes.json$/ ,
                    replaceExpr: /^.*\// ,
                    flattenDirectories: true
                }, function(err, supplements) {
                    if (err) {return cb(err);}
                    return cb(null, sails.util.merge(models, supplements));
                });
            });
        },
        Service: function() {
            var discover = require(libDirectory + '/discovery.js');
            discover.setSails(sails);
            return discover.Service;
        }
    }

};