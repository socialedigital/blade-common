/**
 * ClientStatus.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/#!documentation/models
 */

module.exports = {
    autoPK: false,
    tableName: 'clients_statuses',
    attributes: {
        status: {
            type: 'string',
            size: 3,
            required: true,
            unique: true,
            primaryKey: true
        },
        label: {
            type: 'string',
            required: true
        },
        description: {
            type: 'string',
            required: true
        }
    },

    seedData: __dirname + '/../../lib/data/clientStatuses.json'
};

