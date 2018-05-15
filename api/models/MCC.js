/**
* MCC.js
*
* @description :: TODO: You might write a short summary of how this model works and what it represents here.
* @docs        :: http://sailsjs.org/#!documentation/models
*/

module.exports = {

    autoPK: false,
    tableName: 'lib_mccs',
    attributes: {
        code: {
            type: 'integer',
            required: true,
            unique: true,
            primaryKey: true
        },
        description: {
            type: 'string',
            required: true
        },
        edited: 'string',
        combined: 'string',
        usda: 'string',
        irs: 'string',
        reportable: 'string'
    },

    seedData: __dirname + '/../../lib/data/mcc.json'
};

