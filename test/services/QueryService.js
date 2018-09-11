/*
var expect = require('chai').expect;
var path = require("path");
var Promise = require("bluebird");

var mockRequestObject = function(criteria){ //takes an object literal representing GET params
    this.__parsedUrl = "/test/";
    this.mockParams = criteria;
}
mockRequestObject.prototype.allParams = function(){
    return this.mockParams;
}

describe("The Query Service", function () {
    //dummy data is using currency model, fixture creation here
    before(function(done){
       Promise.all([
        Currency.create({"code": "BTC", "symbol": "BTC", "name": "Bitcoin", "decimal_digits": 10}),
        Currency.create({"code": "LTC", "symbol": "LTC", "name": "Litecoin", "decimal_digits": 10}),
        Currency.create({"code": "PPC", "symbol": "PPC", "name": "Peercoin", "decimal_digits": 10}),
        Currency.create({"code": "DOG", "symbol": "DOGE", "name": "Dogecoin", "decimal_digits": 10})
        ]).then(function(results){
            done()
        })
    })
    describe("QueryService.criteria", function () {

        it("should return a 'where' parameter when provided", function (done) {
            var criteria = QueryService.criteria({"where": "{\"id\": 1}"});
            expect(criteria).to.have.property("where");
            expect(criteria.where).to.have.property("id");
            done();
        });
        it("should return an empty object where value when where parameter is not provided", function (done) {
            var criteria = QueryService.criteria({});
            expect(criteria).to.have.property("where");
            expect(criteria.where).to.be.empty;
            done();
        });
        it("should throw an error if the where parameter is not valid JSON", function (done) {
            try{
                var criteria = QueryService.criteria({"where": "{'id': 1}"});
            }
            catch(err){
                expect(err).to.exist;
            }
            done();
        });
        it("should return a 'limit' parameter when provided", function (done) {
            var criteria = QueryService.criteria({"limit": 25});
            expect(criteria).to.have.property("limit");
            expect(criteria.limit).to.equal(25);
            done();
        });
        it("should set a default to limit if parameter is not provided", function (done) {
            var criteria = QueryService.criteria({});
            expect(criteria).to.have.property("limit");
            expect(criteria.limit).to.exist;
            done();
        });
        it("should return a 'skip' parameter when provided", function (done) {
            var criteria = QueryService.criteria({"skip": 20});
            expect(criteria).to.have.property("skip");
            expect(criteria.skip).to.equal(20);
            done();
        });
        it("should set skip to zero if parameter is not provided", function (done) {
            var criteria = QueryService.criteria({});
            expect(criteria).to.have.property("skip");
            expect(criteria.skip).to.equal(0);
            done();
        });
        it("should return a 'sort' parameter when provided", function (done) {
            var criteria = QueryService.criteria({"sort": "id"});
            expect(criteria).to.have.property("sort");
            expect(criteria.sort).to.equal("id");
            done();
        });
        it("should not return a 'sort' parameter when not provided", function (done) {
            var criteria = QueryService.criteria({});
            expect(criteria).not.to.have.property("sort");
            done();
        });
        it("should return a 'select' keys array when parameter is provided as comma delimited string", function (done) {
            var criteria = QueryService.criteria({"select": "foo,bar,baz"});
            expect(criteria).to.have.property("select");
            expect(criteria.select).to.be.instanceof(Array);
            done();
        });
        it("should not return a 'select' parameter when not provided", function (done) {
            var criteria = QueryService.criteria({});
            expect(criteria).not.to.have.property("select");
            done();
        });
        it("should return a 'populate' keys array when parameter is provided as comma delimited string", function (done) {
            var criteria = QueryService.criteria({"populate": "foo,bar,baz"});
            expect(criteria).to.have.property("populate");
            expect(criteria.populate).to.be.instanceof(Array);
            done();
        });
        it("should return a 'populate' keys array containing only 'all' if 'all' is provided", function (done) {
            var criteria = QueryService.criteria({"populate": "foo,bar,all"});
            expect(criteria).to.have.property("populate");
            expect(criteria.populate).to.be.instanceof(Array);
            expect(criteria.populate[0]).to.equal('all');
            done();
        });
        it("should not return a 'populate' parameter when not provided", function (done) {
            var criteria = QueryService.criteria({});
            expect(criteria).not.to.have.property("populate");
            done();
        });
    });

    describe("QueryService.findOne", function () {
        it("should find a record when the primary key is provided", function (done) {
            var req = new mockRequestObject({"code": "BTC"})
            QueryService.findOne(Currency, req, {pkParamName: "code"})
            .then(function(results){
                expect(results).to.exist
                expect(results.name).to.equal("Bitcoin")
                done();
            })
            .catch(function(err){
                done(err)
            })
        });
        it("should find a record when the primary key is provided in the request, but not in the findOne options", function (done) {
            var req = new mockRequestObject({"code": "BTC"})
            QueryService.findOne(Currency, req)
            .then(function(results){
                expect(results).to.exist
                expect(results.name).to.equal("Bitcoin")
                done();
            })
            .catch(function(err){
                done(err)
            })
        });
        it("should find a record when getBy matching the request params is provided and result is unique", function (done) {
            var req = new mockRequestObject({"name": "Bitcoin"})
            QueryService.findOne(Currency, req, {getBy: "name"})
            .then(function(results){
                expect(results).to.exist
                expect(results.code).to.equal("BTC")
                done();
            })
            .catch(function(err){
                done(err)
            })
        });
        it("should find a record when getBy object matches the request params provided and result is unique", function (done) {
            var req = new mockRequestObject({"cryptoCurrency": "Bitcoin"})
            QueryService.findOne(Currency, req, {getBy: {"name": "cryptoCurrency"}})
            .then(function(results){
                expect(results).to.exist
                expect(results.code).to.equal("BTC")
                done();
            })
            .catch(function(err){
                done(err)
            })
        });
        it("should throw an error when more than one result can be returned", function (done) {
            var req = new mockRequestObject({"decimal_digits": 10})
            QueryService.findOne(Currency, req, {getBy: "decimal_digits"})
            .then(function(results){
                done("Should throw error when more than one result can be returned");
            })
            .catch(function(err){
                expect(err).to.exist
                done()
            })
        });
        it("should throw an error when no result is found", function (done) {
            var req = new mockRequestObject({"code": "GREG"})
            QueryService.findOne(Currency, req)
            .then(function(results){
                done("Should throw not found error");
            })
            .catch(function(err){
                expect(err).to.exist
                done()
            })
        });
        it("should throw a not found when key is provided and record exists but WHERE criteria does not match", function (done) {
            var req = new mockRequestObject({"code": "BTC", "where":{"name":"Barcoin"}})
            QueryService.findOne(Currency, req)
            .then(function(results){
                done("Should throw not found error");
            })
            .catch(function(err){
                expect(err).to.exist
                done()
            })
        });
    })
    describe("QueryService.find", function () {
        it("should return one page of records with no criteria", function (done) {
            var req = new mockRequestObject({})
            QueryService.find(Currency, req)
            .then(function(results){
                expect(results).to.exist
                expect(results.data).to.exist
                expect(results.data.length).to.equal(4)
                expect(results.total).to.exist
                expect(results.total).to.equal(4)
                done();
            })
            .catch(function(err){
                done(err)
            })
        });
        it("should find records using WHERE criteria", function (done) {
            var req = new mockRequestObject({"where":{"name":"Bitcoin"}})
            QueryService.findOne(Currency, req)
            .then(function(results){
                expect(results).to.exist
                expect(results.code).to.equal("BTC")
                done();
            })
            .catch(function(err){
                done(err)
            })
        });
        it("should return a collection even when only one record is found", function (done) {
            var req = new mockRequestObject({"code": "BTC"})
            QueryService.find(Currency, req, {getBy: "code"})
            .then(function(results){
                expect(results).to.exist
                expect(results.data).to.exist
                expect(results.data.length).to.equal(1)
                expect(results.total).to.exist
                expect(results.total).to.equal(1)
                done();
            })
            .catch(function(err){
                done(err)
            })
        });
        it("should find records when getBy partially matches the incoming GET params", function (done) {
            var req = new mockRequestObject({"name": "Bitcoin", "foo":"bar"})
            QueryService.find(Currency, req, {getBy: ["name", "code"]})
            .then(function(results){
                expect(results).to.exist
                expect(results.data).to.exist
                expect(results.data.length).to.equal(1)
                expect(results.total).to.exist
                expect(results.total).to.equal(1)
                done();
            })
            .catch(function(err){
                done(err)
            })
        });

        it("should return an empty result when no result is found", function (done) {
            var req = new mockRequestObject({"code": "INVALID_CURRENCY"})
            QueryService.find(Currency, req, {getBy: "code"})
            .then(function(results){
                expect(results).to.exist
                expect(results.data).to.exist
                expect(results.data.length).to.equal(0)
                expect(results.total).to.exist
                expect(results.total).to.equal(0)
                done();
            })
            .catch(function(err){
                done(err)
            })
        });
    })
})

*/
