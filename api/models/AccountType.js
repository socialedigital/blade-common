/**
 * Account Types
 *
 */

module.exports = {
    autoPK: false,
    autoCreatedAt: false,
    autoUpdatedAt: false,
    tableName: 'lib_accountTypes',
    attributes: {
        type: {
            type: 'string',
            required: true,
            unique: true,
            primaryKey: true
        },
        label: {
            type: 'string',
            unique: true,
            required: true
        },
        description: {
            type: 'string',
            required: true
        }
    },

    seedData: __dirname + '/../../lib/data/accountTypes.json'
};