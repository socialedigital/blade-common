/**
 * Authentication.js
 */
module.exports = {
    autoPK: false,
    tableName: 'authentication',
    attributes: {
        id: {
            type: 'integer',
            primaryKey: true,
            autoIncrement: true
        },
        serviceName: {
            type: 'string'
        },
        bladeToken: {
            type: 'string'
        },
        clientID: {
            type: 'string'
        },
        email: {
            type: 'string'
        },
        mobile: {
            type: 'string'
        },
        authToken: {
            type: 'string',
            index: true
        },
        requestToken: {
            type: 'string',
            index: true
        },
        acctBlocked: {
            type: 'boolean'
        },
        failedPassword: {
            type: 'boolean'
        },
        authCode: {
            type: 'string'
        },
        failedCode: {
            type: 'string'
        },
        url: {
            type: 'string'
        },
        authMethod: {
            type: 'string',
            enum: ['sms', 'mail', 'authy', 'google']
        },
        externalAuthCode: {
            type: 'string'
        }
    }
};

