/**
 * Limit Types
 */

module.exports = {
    autoPK: false,
    autoCreatedAt: false,
    autoUpdatedAt: false,
    tableName: 'lib_limitTypes',
    attributes: {
        type: {
            type: 'string',
            required: true,
            unique: true,
            primaryKey: true
        },
        description: {
            type: 'string',
            required: true
        }
    },

    seedData: __dirname + '/../../lib/data/limitTypes.json'
};