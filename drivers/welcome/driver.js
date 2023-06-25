'use strict';

const NetatmoSecurityDriver = require('../../lib/NetatmoSecurityDriver');

module.exports = class WelcomeDriver extends NetatmoSecurityDriver {

  static TYPE = 'NACamera';

};
