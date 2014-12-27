'use strict';

var util = require('util');
var bcrypt = require('bcrypt');
var TokenStore = require('passwordless-tokenstore');
var Datastore = require('nedb');
/**
 * Constructor of NeStore
 * @param {String} path URI as defined by the NeDB specification. Please
 * check the documentation for details:
 * https://github.com/louischatriot/nedb
 * @constructor
 */
function NeStore(path, options) {
	if (!this._uri) {
		if (arguments.length === 0 || typeof arguments[0] !== 'string') {
			throw new Error('A valid path string has to be provided');
		}

		TokenStore.call(this);

		this._uri = path;
		this._db = null;
	}
}

util.inherits(NeStore, TokenStore);

/**
 * Checks if the provided token / user id combination exists and is
 * valid in terms of time-to-live. If yes, the method provides the
 * the stored referrer URL if any.
 * @param  {String}   token to be authenticated
 * @param  {String}   uid Unique identifier of an user
 * @param  {Function} callback in the format (error, valid, referrer).
 * In case of error, error will provide details, valid will be false and
 * referrer will be null. If the token / uid combination was not found
 * found, valid will be false and all else null. Otherwise, valid will
 * be true, referrer will (if provided when the token was stored) the
 * original URL requested and error will be null.
 */
NeStore.prototype.authenticate = function(token, uid, callback) {
	if (!token || !uid || !callback) {
		throw new Error('TokenStore:authenticate called with invalid parameters');
	}

	this._get_db(function(db) {
		db.findOne({
				uid: uid,
				ttl: {
					$gt: new Date()
				}
			},
			function(err, item) {
				if (err) {
					callback(err, false, null);
				} else if (item) {
					bcrypt.compare(token, item.hashedToken, function(err, res) {
						if (err) {
							callback(err, false, null);
						} else if (res) {
							callback(null, true, item.originUrl);
						} else {
							callback(null, false, null);
						}
					});

				} else {
					callback(null, false, null);
				}
			}
		);
	});
};

/**
 * Stores a new token / user ID combination or updates the token of an
 * existing user ID if that ID already exists. Hence, a user can only
 * have one valid token at a time
 * @param  {String}   token Token that allows authentication of _uid_
 * @param  {String}   uid Unique identifier of an user
 * @param  {Number}   msToLive Validity of the token in ms
 * @param  {String}   originUrl Originally requested URL or null
 * @param  {Function} callback Called with callback(error) in case of an
 * error or as callback() if the token was successully stored / updated
 */
NeStore.prototype.storeOrUpdate = function(token, uid, msToLive, originUrl, callback) {
	if (!token || !uid || !msToLive || !callback) {
		throw new Error('TokenStore:storeOrUpdate called with invalid parameters');
	}
	this._get_db(function(db) {
		bcrypt.hash(token, 10, function(err, hashedToken) {
			if (err) {
				return callback(err);
			}

			var newRecord = {
				'hashedToken': hashedToken,
				'uid': uid,
				'ttl': new Date(Date.now() + msToLive),
				'originUrl': originUrl
			};

			// Insert or update
			db.update({
				'uid': uid
			}, newRecord, {
				upsert: true
			}, function(err, result) {
				if (err) {
					callback(err);
				} else {
					callback();
				}
			});
		});
	});
};

/**
 * Invalidates and removes a user and the linked token
 * @param  {String}   user ID
 * @param  {Function} callback called with callback(error) in case of an
 * error or as callback() if the uid was successully invalidated
 */
NeStore.prototype.invalidateUser = function(uid, callback) {
	if (!uid || !callback) {
		throw new Error('TokenStore:invalidateUser called with invalid parameters');
	}
	this._get_db(function(db) {
		db.remove({
			'uid': uid
		}, {}, function(err, result) {
			if (err) {
				callback(err);
			} else {
				callback();
			}
		});
	});
};

/**
 * Removes and invalidates all token
 * @param  {Function} callback Called with callback(error) in case of an
 * error or as callback() if the token was successully stored / updated
 */
NeStore.prototype.clear = function(callback) {
	if (!callback) {
		throw new Error('TokenStore:clear called with invalid parameters');
	}
	this._get_db(function(db) {
		db.remove({}, {
			multi: true
		}, function(err, result) {
			if (err) {
				callback(err);
			} else {
				callback();
			}
		});
	});
};

/**
 * Number of tokens stored (no matter the validity)
 * @param  {Function} callback Called with callback(null, count) in case
 * of success or with callback(error) in case of an error
 */
NeStore.prototype.length = function(callback) {
	this._get_db(function(db) {
		db.count({}, callback);
	});
};

/**
 * Private method to connect to the database
 * @private
 */
NeStore.prototype._connect = function(callback) {
	var self = this;
	if (self._db) {
		callback(self._db);
	} else {
		self._db = new Datastore({
			filename: this._uri,
			autoload: true
		});
		callback(self._db);
	}
};

/**
 * Private method to connect to the right db
 * @private
 */
NeStore.prototype._get_db = function(callback) {
	var self = this;
	if (self._db) {
		callback(self._db);
	} else {
		self._connect(function(db) {
			self._set_index(db, callback);

		});
	}
};

/**
 * Private method build up the indexes of the db if needed
 * @private
 */
NeStore.prototype._set_index = function(db, callback) {
	var self = this;
	db.ensureIndex({
		fieldName: 'uid',
		unique: true
	}, function(err) {
		if (err) {
			throw new Error('Error creating index on uid: ' + err);
		}
		db.ensureIndex({
			fieldName: 'ttl',
			expireAfterSeconds: 0
		}, function(err) {
			if (err) {
				throw new Error('Error creating ttl index on ttl: ' + err);
			}
			self._db = db;
			callback(db);
		});
	});
};

module.exports = NeStore;