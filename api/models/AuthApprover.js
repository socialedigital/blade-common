
module.exports = {
    autoPK: false,
    tableName: 'lib_authApprovers',
    attributes: {
        code: {
            type: 'string',
            required: true,
            unique: true,
            primaryKey: true
        },
        name: {
            type: 'string',
            required: true
        }
    },

    seedData: __dirname + '/../../lib/data/authApprover.json'

};