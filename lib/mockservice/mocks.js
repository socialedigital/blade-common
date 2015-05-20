var nock = require('nock');
nock.enableNetConnect();

module.exports["service.client"] = function(){
    return nock("http://service.client")
        // .filteringPath(function(path){
        //     return '/cardAccounts/123'
        // })
        .get("/cardAccounts/123")
        .replyWithFile(200, __dirname + '/replies/service.client.cardAccounts123.json')
        .get("/cardAccounts/456")
        .replyWithFile(200, __dirname + '/replies/service.client.cardAccounts456.json')
        .get("/cardAccounts/789")
        .reply(200, {
            "fundingAccount": 1,
            "spendingAccount": 1
        })
}