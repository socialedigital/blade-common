/**
 * Currency.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/#!documentation/models
 */
var accounting = require('accounting');

module.exports = {
    autoPK: false,
    autoCreatedAt: false,
    autoUpdatedAt: false,
    tableName: 'lib_currencies',
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
        name_plural: 'string',

        //instance methods
        format: function(amount) {
            return parseFloat(amount).toFixed(this.decimal_digits);
        },

        formatMoney: function(amount) {
            return accounting.formatMoney(parseFloat(amount), this.symbol, this.decimal_digits)
        }
    },
    seedData: __dirname + '/../../lib/data/currencies.json'
};

