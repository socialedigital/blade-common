
module.exports = {

    autoPK: false,
    attributes: {
        code: {
            type: 'string',
            size: 2,
            required: true,
            unique: true,
            primaryKey: true
        },
        name: {
            type: 'string',
            required: true
        }
    },

    seedData: __dirname + '/../../lib/data/usStates.json'

}