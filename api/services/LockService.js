/**
 * Lock Service
 *
 * @description :: provides creation, management, and release of distributed locks
 */

var errors = require('../../lib/lock/errors');
var Promise = require('bluebird');
var uuid = require('node-uuid');

var LockAcquisitionError = errors.LockAcquisitionError;
var LockReleaseError = errors.LockReleaseError;
var LockExtendError = errors.LockExtendError;

var lockDuration = 10000;
var delay = 100;
var lockAttempts = 10;

function attemptLock(key, id, retries) {
//console.log('Attempt #', (lockAttempts + 1) - retries, 'to acquire a lock for', key, '(' + id + ')');
    return CacheService.setNX(key, id, lockDuration)
    .then(function(value) {
//         if (!value && !retries) {
// console.log('FAILED to acquire lock for', key, '(' + id + ')');
//             throw new LockAcquisitionError('Could not acquire lock on "' + key + '"');
//         }
//         else if (value) {
// console.log('Lock acquired for', key, '(' + id + ')');
//             return new Lock(key, id);
//         }
        if (value) {
            console.log('Lock acquired for', key, '(' + id + ')');
            return new Lock(key, id);
        }
        // Try the lock again after the configured delay
        return Promise.delay(delay).then(function() {
            return attemptLock(key, id, retries - 1);
        });
    })
}


function Lock(key, id) {
    this.key = key;
    this.id = id;
}

Lock.prototype.release = function() {
    return Promise.bind(this).then(function() {
        return CacheService.ttl(this.key);
    })
    .then(function(ttl) {
console.log('TTL for', this.key, ttl);
        return CacheService.get(this.key);
    })
    .then(function(value) {
        if (value) {
            if (value != this.id) {
                throw new LockReleaseError('Lock on "' + this.key + '" is not held by ' + this.id);
            }
            else {
                return CacheService.deleteTimedKey(this.key);
            }
        }
        else {
            throw new LockReleaseError('Lock on "' + this.key + '" is not held by ' + this.id);
        }
    })
    .then(function(value) {
console.log('Lock for key', this.key, 'has been released');
    })
}

module.exports = {
    acquireLock: function(key, id) {
        id = (!id ? uuid.v4() : id);
        return attemptLock(key, id, lockAttempts)
    },
    
    LockAcquisitionError: LockAcquisitionError,
    LockReleaseError: LockReleaseError,
    LockExtendError: LockExtendError

}