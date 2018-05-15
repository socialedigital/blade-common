/**
 * CardProgramAssociation.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/#!documentation/models
 */

module.exports = {
    autoPK: false,
    autoCreatedAt: false,
    autoUpdatedAt: false,
    tableName: 'lib_associations',
    attributes: {
        association: {
            type: 'string',
            required: true,
            unique: true,
            primaryKey: true
        },
        label: {
            type: 'string',
            required: true
        }
    },

    seedData: __dirname + '/../../lib/data/associations.json'

};

