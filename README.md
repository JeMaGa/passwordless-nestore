# Passwordless-NeStore

This module provides token storage for [Passwordless](https://github.com/florianheinemann/passwordless), a node.js module for express that allows website authentication without password using verification through email or other means. Visit the project's website https://passwordless.net for more details.

Tokens are stored in a [NeDB](https://github.com/louischatriot/nedb) database and are hashed and salted using [bcrypt](https://github.com/ncb000gt/node.bcrypt.js/).

This modules was developped using [passwordless-mongostore](https://github.com/florianheinemann/passwordless-mongostore) as an example.

## Usage

First, install the module:

`$ npm install passwordless-nestore --save`

Afterwards, follow the guide for [Passwordless](https://github.com/florianheinemann/passwordless). A typical implementation may look like this:

```javascript
var passwordless = require('passwordless');
var NeStore = require('passwordless-nestore');

var dbPath = './passwordless-tokenstore.db';
passwordless.init(new NeStore(dbPath));

passwordless.addDelivery(
    function(tokenToSend, uidToSend, recipient, callback) {
        // Send out a token
    });

app.use(passwordless.sessionSupport());
app.use(passwordless.acceptToken());
```

## Initialization

```javascript
new NeStore(path_to_db_file);
```
* **path_to_db_file:** *(string)* path to the DB file. See [NeDB homepage](https://github.com/louischatriot/nedb) for further details.

Example:
```javascript
var dbPath = './passwordless-tokenstore.db';
passwordless.init(new NeStore(dbPath));
```

## Hash and salt
As the tokens are equivalent to passwords (even though they do have the security advantage of only being valid for a limited time) they have to be protected in the same way. passwordless-nestore uses [bcrypt](https://github.com/ncb000gt/node.bcrypt.js/) with automatically created random salts. To generate the salt 10 rounds are used.

## Tests

`$ npm test`

## License

[MIT License](http://opensource.org/licenses/MIT)

## Author
JeMaGa
