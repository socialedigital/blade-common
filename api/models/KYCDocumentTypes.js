


module.exports = {
    autoPK: false,
    autoCreatedAt: false,
    autoUpdatedAt: false,
    tableName: 'lib_kycDocumentTypes',
    attributes: {
        type: {
            type: 'string',
            required: true,
            unique: true,
            primaryKey: true
        },
        label: {
            type: 'string',
            required: true
        }
    },

    seedData: __dirname + '/../../lib/data/kycDocumentTypes.json'

};
