/**
 * CardStatus.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/#!documentation/models
 */

module.exports = {

    autoPK: false,

    attributes: {
        code: {
            type: 'string',
            size: 6,
            required: true,
            unique: true,
            primaryKey: true
        },
        name: {
            type: 'string',
            required: true
        },
        description: {
            type: 'string',
            required: true
        }
    }
};

