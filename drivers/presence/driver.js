'use strict';

const NetatmoSecurityDriver = require('../../lib/NetatmoSecurityDriver');

module.exports = class PresenceDriver extends NetatmoSecurityDriver {

  static TYPE = 'NOC';

};
