var sails = require('sails');
var Promise = require('bluebird');

before(function (done) {
    var configs = {
        log        : {
            level: 'info'
        },
        connections: {
            memory: {
                adapter: 'sails-memory'
            }
        },
        models     : {
            connection: 'memory',
            migrate: 'safe'
        },
        hooks: {
            grunt: false
        },
    };

    sails.load(configs, function(err, sails) {
        if (err) {
            return done(err);
        }
        //dummy data
        Promise.join([
            Currency.create({"code": "BTC", "symbol": "BTC", "name": "Bitcoin", "decimal_digits": 10}),
            Currency.create({"code": "LTC", "symbol": "LTC", "name": "Litecoin", "decimal_digits": 10}),
            Currency.create({"code": "PPC", "symbol": "PPC", "name": "Peercoin", "decimal_digits": 10}),
            Currency.create({"code": "DOG", "symbol": "DOGE", "name": "Dogecoin", "decimal_digits": 10})
            ])
        .then(function(results){
            done();
        })
    });
});

// Global after hook
after(function (done) {
    console.log(); // Skip a line before displaying Sails lowering logs
    Sails.lower(done);
});