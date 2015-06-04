/**
 * Currency.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/#!documentation/models
 */

module.exports = {

    autoPK: false,

    attributes: {
        code: {
            type: 'string',
            size: 3,
            required: true,
            unique: true,
            primaryKey: true
        },
        symbol: {
            type: 'string',
            required: true
        },
        name: {
            type: 'string',
            required: true
        },
        symbol_native: 'string',
        decimal_digits: {
            type: 'integer',
            required: true
        },
        rounding: 'integer',
        name_plural: 'string'
    },

    seedData: __dirname + '/../../lib/data/currencies.json'
};

