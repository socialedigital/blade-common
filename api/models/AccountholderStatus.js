
module.exports = {
    autoPK: false,
    tableName: 'accountholders_statuses',
    identity: 'accountholders_statuses',
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

    seedData: __dirname + '/../../lib/data/accountholderStatus.json'
};