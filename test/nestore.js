'use strict';

var expect = require('chai').expect;
var uuid = require('node-uuid');
var chance = new require('chance')();
var Datastore = require('nedb');
var NeStore = require('../');

var Datastore = require('nedb');

var standardTests = require('passwordless-tokenstore-test');

var fs = require('fs');

var testUri = './passwordless-token.db';

var tokenStore = new NeStore(testUri);
function TokenStoreFactory() {
	return tokenStore;
}

var dbcon = null;

var beforeEachTest = function(done) {
	// erase the nedb persistent file
	if (fs.existsSync(testUri)) {
		fs.unlink(testUri, function(err) {
			if (err) {
				console.log(err);
			}
		});
	}
	new NeStore(testUri);
	done();
};

var afterEachTest = function(done) {
	if (dbcon) {
		dbcon.close(function() {
			done();
		});
		return;
	}
	done();
};

// Call all standard tests
standardTests(TokenStoreFactory, beforeEachTest, afterEachTest);

describe('Specific tests', function() {

	beforeEach(function(done) {
		beforeEachTest(done);
	});

	afterEach(function(done) {
		afterEachTest(done);
	});

	it('should not allow the instantiation with an empty constructor', function() {
		expect(function() {
			new NeStore()
		}).to.throw(Error);
	});

	it('should not allow the instantiation with an empty constructor', function() {
		expect(function() {
			new NeStore(123)
		}).to.throw(Error);
	});

	it('should allow proper instantiation', function() {
		expect(function() {
			TokenStoreFactory()
		}).to.not.throw;
	});

	it('should allow proper instantiation with options', function() {
		//		expect(function() { new NeStore(testUri, { db: {numberOfRetries:2}}) }).to.not.throw;
		expect(function() {
			new NeStore(testUri, {})
		}).to.not.throw;
	});

	it('should store tokens only in their hashed form', function(done) {
		var store = new TokenStoreFactory();
		var token = uuid.v4();
		var uid = chance.email();
		store.storeOrUpdate(token, uid,
			1000 * 60, 'http://' + chance.domain() + '/page.html',
			function() {
				var db = new Datastore({filename:testUri});
				db.loadDatabase();
				db.findOne({
					uid: uid
				}, function(err, item) {
					expect(item.uid).to.equal(uid);
					expect(item.hashedToken).to.not.equal(token);
					done();
				});
			});
	});

	it('should store tokens not only hashed but also salted', function(done) {
		var store = TokenStoreFactory();
		var token = uuid.v4();
		var uid = chance.email();
		store.storeOrUpdate(token, uid,
			1000 * 60, 'http://' + chance.domain() + '/page.html',
			function() {
				var db = new Datastore({filename:testUri, autoload:true});
				db.findOne({
					uid: uid
				}, function(err, item) {
					var hashedToken1 = item.hashedToken;
					store.clear(function() {
						store.storeOrUpdate(token, uid,
							1000 * 60, 'http://' + chance.domain() + '/page.html',
							function() {
								var db2 = new Datastore({filename:testUri, autoload:true});

								db2.findOne({
									uid: uid
								}, function(err, item) {
									var hashedToken2 = item.hashedToken;
									expect(hashedToken2).to.not.equal(hashedToken1);
									done();
								});
							});
					});
				});
			});
	});
});