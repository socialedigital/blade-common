/**
 * Account Card Statuses
 *
 */

module.exports = {
    autoPK: false,
    tableName: 'accountsCards_statuses',
    attributes: {
        status: {
            type: 'string',
            size: 6,
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

    seedData: __dirname + '/../../lib/data/accountsCardsStatuses.json'
};