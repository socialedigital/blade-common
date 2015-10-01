
var _ = require('lodash');
var Promise = require('bluebird');
var qs = require('querystring');

function addServiceFunctions(name, target, info) {
    if ((info.hasOwnProperty('routes')) && (info.routes.hasOwnProperty('funcs'))) {
        var sName = name.split('.')[1];
        if (!target.hasOwnProperty(sName)) {
            target[sName] = {};
        }
        _.forEach(info.routes.funcs, addControllerFuncs, { target: target, fullName: name, sName: sName, info: info });
    }
}

function addControllerFuncs(funcs, controllerName) {
    if (!this.target[this.sName].hasOwnProperty(controllerName)) {
        this.target[this.sName][controllerName] = {};
    }
    this.controllerName = controllerName;
    _.forEach(funcs, addFunc, this);
}

function funcCaller(req, res, options) {
    var matchData = {
        verb: 'get',
        infoRoutes: this.funcRoutes,
        reqRoute: '',
        match: false,
        req: req,
        options: _.merge({}, options, req.bladeOptions)
    };
    var rteArr = (_.isArray(matchData.infoRoutes)) ? matchData.infoRoutes : [matchData.infoRoutes];

    if (rteArr.length === 1) {
        matchData.match = true;
    }
    _.forEach(rteArr, matchRoute, matchData);

    if (matchData.match) {
        // var pq = req.originalUrl.split('?');
        // if (pq.length > 1) {
        if(req.query){
            matchData.reqRoute += "?" + qs.stringify(req.query);
            // matchData.reqRoute += '?' + pq[1];
        }
        return Service.request(this.fullName)[matchData.verb](matchData.reqRoute, req.body)
            // .then(function (results) {
            //     // switch (matchData.verb) {
            //     //     // case 'post':
            //     //     //     res.created(results);
            //     //     //     break;
            //     //     // case 'put':
            //     //     //     res.accepted(results);
            //     //     //     break;
            //     //     case 'get':
            //     //         if (!_.isEmpty(results.links)) {
            //     //             _.forEach(results.links, function(links, member) {
            //     //                 var isp = results.links[member].split('?');
            //     //                 results.links[member] = (isp.length > 1) ? pq[0] + '?' + isp[1] : pq[0];
            //     //             })
            //     //         }
            //     //         if (!_.isEmpty(results.uri)) {
            //     //             var usp = results.uri.split('?');
            //     //             results.uri = (usp.length > 1) ? pq[0] + '?' + usp[1] : pq[0] ;
            //     //         }
            //     //         return results;
            //     //         break;
            //     //     // case 'delete':
            //     //     //     res.accepted(results);
            //     //     //     break;
            //     //     default:
            //     //         return results;
            //     //         break;
            //     // }
            //     return results;
            // })
            // .catch(function (err) {
            //     res.negotiate(err);
            // });
    } else {
        // res.badRequest('Service wrapper cannot find route with correct parameters.');
        throw 'Service wrapper cannot find route with correct parameters.';
    }
}

function addFunc(routes, functionName) {
    if (!this.target[this.sName][this.controllerName].hasOwnProperty(functionName)) {
        this.functionName = functionName;
        this.target[this.sName][this.controllerName][this.functionName] =
            funcCaller.bind({ fullName: this.fullName,
                funcRoutes: this.info.routes.funcs[this.controllerName][this.functionName] });
    }
}

function matchRoute(route) {
    // split info Routes with space
    var iSp = route.split(' ');
    this.verb = iSp[0].toLowerCase();
    var rSp = iSp[1].split('/');
    _.forEach(rSp, findRouteMatch, this);
    if (this.match) {
        this.reqRoute = iSp[1];
        _.forEach(rSp, setRouteMatch, this);
        return false;
    }
}

function findRouteMatch(item) {
    if ((!this.match) && (_.startsWith(item, ':'))) {
        if (!_.endsWith(item, '?')) {
            var vr = item.replace(':', '');
            this.match = this.req.param(vr);
            if (!this.match) {
                this.match = ((this.options) && (this.options[vr])) ? this.options[vr] : null;
                if (this.match) {
                    return false;
                }
            } else {
                return false;
            }
        }
    }
}

function setRouteMatch(item) {
    if (_.startsWith(item, ':')) {
        var vr = item.replace(':', '').replace('?', '');
        var myVal = '';
        if (this.req.param(vr)) {
            myVal = this.req.param(vr);
        } else {
            if (this.options[vr]) {
                myVal = this.options[vr];
            }
        }
        this.reqRoute = this.reqRoute.replace(item, myVal);
    }
}

module.exports = {
    serviceSetup: addServiceFunctions
};