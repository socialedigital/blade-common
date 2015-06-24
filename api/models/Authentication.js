/**
 * Authentication.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/#!documentation/models
 */
module.exports = {

    attributes: {
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
            type: 'string'
        },
        requestToken: {
            type: 'string'
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
        }
    }
};

