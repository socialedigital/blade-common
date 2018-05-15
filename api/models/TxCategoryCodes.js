/**
 * Transaction Category Codes
 */

module.exports = {
    autoPK: false,
    autoCreatedAt: false,
    autoUpdatedAt: false,
    tableName: 'lib_txCategoryCodes',
    attributes: {
        code: {
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

    seedData: __dirname + '/../../lib/data/txCategoryCodes.json'
};