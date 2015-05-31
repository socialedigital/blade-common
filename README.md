Blade Common
-------------

contains common models, etc. that can be used across all blade services

###Service Mocks

This package, using [nock.js](https://github.com/pgte/nock) allows you to mock other services within the Blade system.

The nock library intercepts outgoing http requests and responds with the values you set. You create these in a `mocks.js` file.

A typical `mocks.js` file looks like this:

```javascript
//mocks.js
var nock = require('nock');
nock.enableNetConnect();

module.exports = {
    'service.client': function() {
        return nock("http://service.client")
            .get("/foo")
            .reply(200, {
                "client": "foo",
                "account": "bar"
            })
            .get("/baz")
            .reply(200, {
                .replyWithFile(200, __dirname + '/replies/bazResponse.json')
            })
    },
    'service.fx': function() {
        return nock("http://service.fx")
            .get("/foo/bar/xyz")
            .reply(200, {
                foo: 1,
                bar: 0
            });
    }
}
```

The keys in the exposed object correspond to the service name used in discovery. This allows you to make requests to other services as you would normally, when other services are actually running.

```javascript
Service.request('service.client')
.get('/foo')
```

The values are functions that return nock interceptors. Our convention for the mocked host url is `http://service.name`.

For complete documentation on nock, check out their [github](https://github.com/pgte/nock)

####In Test

To create mocks for testing, create your `mocks.js` in `/test/serviceMocks/` and write them using the format above.

Mocks will be used automatically when you run the testing suite.

These are committed into version control.

####In Development

To create mocks for use while the service is running in development, create your `mocks.js` file in `/config/`.

You must lift the service with the USE_MOCKS environment variable set, like so:

`USE_MOCKS=true sails lift`

This file is not kept in version control.
