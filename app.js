/**
 * app.js
 *
 * Use `app.js` to run your app without `sails lift`.
 */

const path = require('path');

// Cargar variables del archivo .env
require('dotenv').config({
  path: path.resolve(__dirname, '.env')
});

// Ensure we're in the project directory
process.chdir(__dirname);

// Attempt to import `sails` dependency
var sails;
var rc;

try {

  sails = require('sails');
  rc = require('sails/accessible/rc');

} catch (err) {

  console.error('Encountered an error when attempting to require(\'sails\'):');
  console.error(err.stack);
  console.error('--');
  console.error('To run an app using `node app.js`, you need to have Sails installed');
  console.error('locally (`./node_modules/sails`).');
  return;

}

// Start server
var config = rc('sails');
config.port = process.env.PORT || 1337;

sails.lift(config);