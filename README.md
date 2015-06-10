Blade Common [![Circle CI](https://circleci.com/gh/bladesystem/blade-common.svg?style=svg)](https://circleci.com/gh/bladesystem/blade-common)
-------------
###Getting Started
The blade-common package is a Sails add-on that, when installed in another Sails application, will add common models, routes, controllers, and services that you will have available to you in your Blade Sails service or adapter.

###Install
Normally, you would just npm install this from Blade's private npm registry, but, as this package is still under development, installing in this way will only get you what has been committed to the 'master' branch of the git repo.  If this is what you want, then:

```npm install https://github.com/bladesystem/blade-common.git```

######Note: (blade-common will eventually reside in the Blade private npm repository, but not until we have a version 1.0 release)

However, if you want to take advantage of what's being developed in the `development` branch of the repo, then you'll need to create a symbolic link from your project's `node_modules` directory to the `development` branch of this package:

1. Checkout the `development` branch of `blade-common` somewhere on your local machine.
2. `cd` into the `root directory` of your project (the project where you want to include `blade-common`) and do an npm install of this package (as above).
3. `cd` into the `node_modules` directory of your project and delete the `blade-common` directory that was just created there.
4. Create a symlink in the `node_modules` directory that refers to the `root directory` of the `blade-common` source that you created in step 1.

######Note: If you do an `npm update` or `npm install`, it will replace the symlink that you created with source from the `master` branch and you'll have to create the symlink again.

###Service Object
Within a Blade service, you can call out to other blade services by using the Service object provided in this package.  The Service object is a Sails service object, and, as such will be available to you anywhere.  You don't have to `require` anything, it's just there waiting for you to use it.

One of the first things that you want to do (in your `/config/bootstrap.js` file is to register your service.  You use the `Service` object to do this:

```
module.exports.bootstrap = function (cb) {

    Service.register({name: 'reporting', type: 'service'})
    .then(function() {
    	cb();
    });
};
```

Valid types are `service` and `adapter` (although there could be more types in the future).

If you register a `service`, then the auto-discovery mechanism starts.  The `Service` object uses the auto-discovery facility to find other Blade services without you having to provide any additional information in your source.

You use the Service object to make requests on other services:

```
Service.request('service.client').get('/clients/1234);
```

`Service.request()` returns a request object with HTTP methods that you can call if the service is available, or a rejected promise if the service is not available.

You can use the `.get()`, `.put()`, `.post()`, or `.delete()` methods on the request object to make HTTP requests on the service that was specified in the `Service.request()` call.  The request object returns a promise with the result.

#######more documentation about the Service object here!


###Service Mocks
In order to allow for automated testing (and continuous integration / continuous deployment), other services will not be running when your test code is executed.  A Service mocking facility is available to you for just this purpose.

This facility is very flexible in how it allows you to define your Service Mock objects.  You can use whatever mocking library that you want as long as it provides a mechanism to mock http requests.

We suggest using [nock.js](https://github.com/pgte/nock) as it has been tested with and works very well with the blade-common Service Mock facility.

The `nock` library intercepts outgoing http requests and responds with the values you set. 

###Using Mocks in Testing

There are several ways to use the Service Mocks facility in your testing code.  The first is to simply add it in-line to your test code:

####Using Service Mocks in-line in your tests

```javascript
var expect = require('chai').expect;
var supertest = require('supertest');
var nock = require('nock');
var Promise = require('bluebird');
var sails = require('sails');

nock.enableNetConnect();

describe("Controller Test", function () {
    describe("POST /doit", function () {
		it("should do it!", function (done) {
			//set up the mock for the client service
			Service.addMock('service.client', function() {
				return nock("http://service.client")
				.get("/client/1234")
				.reply(200, {
					data: 'the data'
				});
			
			//test it
			supertest(sails.hooks.http.app)
			.post('/doit')
			.send({
				client: 1234,
				thingToDo: 'foo'
			})
			.expect(201, done);
		});
	});
});
		
```

The first parameter to the `Service.addMock` call is the name of the service that needs to be mocked for the test.  In this case, we're testing code that contains a request to the client service, so we use `'service.client'` as the service name that we are mocking.  This will create a mocked object that will be used instead of trying to make a request on the client service that won't be running when our tests are being run.

The second parameter to the `Service.addMock` call is a function that returns the object that will be mocking the client service (in this case, a `nock` interceptor, but, again, it could be an object from another mocking library as long as it allows you to define what should be returned from a specific http request).

Our convention for the mocked host url is `http://service.name`.  This is just a convention - it doesn't correspond to anything in the 'real' world, and, if you wanted to use a different url, that would be fine.

For complete documentation on nock, check out their documentation on [github](https://github.com/pgte/nock).

####Re-using your mocks in multiple tests
If you want to reuse your mocks in other tests, then you can create a file called `mocks.js` where you would define your service mocks.

A typical `mocks.js` file looks like this:

```javascript
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
            .replyWithFile(200, __dirname + '/serviceMocks/replies/bazResponse.json');
    },
    'service.foo': function() {
        return nock("http://service.foo")
            .get("/bar/xyz")
            .reply(200, {
                foo: 1,
                bar: 0
            });
    }
}
```

In order to use the `mocks.js` file in your tests, you need to add a `mocks` property in the `configs` section of your `test/bootstrap.test.js` file:

```javascript
	.
	.
	.
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
	            connection: 'memory'
	        },
	        hooks: {
	            grunt: false
	        },
	        mocks: {
	            path: __dirname + '/serviceMocks/mocks.js'
	        }
	    };
	    .
	    .
	    .
```

This particular configuration indicates that the `mocks.js` file is in a directory called `serviceMocks` under the `test` directory.  Notice that the `mocks.js` file defined above uses that same directory to contain the responses to various mocked endpoints.

####Note

If you create a `mocks.js` file (and any corresponding response files), you should check them into your project's git repo as they are part of your test suite and will be used when automated tests are run for continuous integration and deployment.

###Using Mocks During Development
The Blade service you are writing probably will need to collaborate with one or more other Blade services in order to fulfill it's particular functional responsiblity.  While we have tried to make collaborating with other Blade Services as easy as possible during local development, there may be times where you need more control over a specific service's response to a particular route, or you may be writing functionality that depends on a service that hasn't even been written yet! 

You can use Service Mocks outside of the testing environment to facilitate these kinds of local development scenarios.

####Configuration
The simplest way to use mocks in your local development is to create a `mocks.js` file in your project's `config` directory.  It should be constructed in exactly the same way as the `mocks.js` file described above for use in your tests.  *You should add this file to your .gitignore file so that it won't be checked into your project's repo.  __It should only be present in your local development environment.__*

In order to enable the `mocks.js` file, you need to add a `mocks` configuration element in your `config/local.js` configuration file and set it to `true`.

```javascript
module.exports = {

	log: { level: 'info' },
	
	mocks: true,
	
		.
		.
		.
	  
```

####Alternate Configurations
If you don't want to put your `mocks.js` in your project's `config` directory (say you want to use the one that you already have in your `test` directory), then you can specify the path to the `mocks.js` file that you want to use (exactly like you would in the `bootstrap.text.js` file for tests).

```javascript
	mocks: { path: __dirname + '/../test/serviceMocks/mocks.js' }
```

####Service Mock Behavior During Development
Service Mocks in use during development will work exactly as they do during testing by replacing the external service requests with the mocked results __as long as the mocked service is NOT actually running in your local environment!__  If you actually run the service that is being mocked in your local environment, this will __override__ the mocked service and any calls to `Service.request()` on the mocked service will make an actual request to the locally running service.

This is useful so that you can easily switch from using a mocked service to the actual running service without ever having to shutdown and restart your service or change your configuration by simply starting and stopping the service that you are mocking.



###USE_MOCKS Environment Variable
In order for Service mocks to work in your tests or during development, the USE_MOCKS environment variable must be set.  This is done automatically when you use the `npm test` script on *nix systems, or when you set the `mocks` configuration property to `true` or assign it a valid path to a javascript file with your mock definitions.

The `npm test` script sets the `NODE_ENV` environment variable to `test`, and, as a result, the `USE_MOCKS` environment variable is automatically set to `true` when the `npm test` script is run from the command line, so you don't have to set the `USE_MOCKS` environment variable directly.

Unfortunately, the `npm test` script does not work on Windows systems and testing must be performed another way.  If you are using the JetBrains WebStorm IDE, you can set the `NODE_ENV` to `test` in a run-configuration and run your tests that way and everything will work as expected.  
#######If anyone can figure out how to set the `NODE_ENV` environment variable in the npm test script so that it works correctly on Windows Systems, please do so!

Setting the `mock` configuration property in your `config/local.js` file will also set this environment variable if and only if there there is either a `mocks.js` file in your `config` directory, or you have provided a path to a valid file with valid service mock definitions.

Under normal circumstances, you should never have to set or modify the `USE_MOCKS` environment variable directly.


