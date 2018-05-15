/**
 * Owner.js
 *
 */

module.exports = {
    autoPK: false,
    tableName: 'lib_owners',
    attributes: {
        code: {
            type: 'string',
            size: 2,
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

    seedData: __dirname + '/../../lib/data/owners.json'
};

