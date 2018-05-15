/**
 * Fee Type
 */

module.exports = {
    autoPK: false,
    autoCreatedAt: false,
    autoUpdatedAt: false,
    tableName: 'lib_feeTypes',
    attributes: {
        type: {
            type: 'string',
            required: true,
            unique: true,
            primaryKey: true
        },
        label: {
            type: 'string',
            require: true
        },
        description: {
            type: 'string',
            required: true
        },
        category: {
            type: 'string'
        }
    },

    seedData: __dirname + '/../../lib/data/feeTypes.json'
};