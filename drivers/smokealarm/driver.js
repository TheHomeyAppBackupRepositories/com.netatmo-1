'use strict';

const NetatmoDriver = require('../../lib/NetatmoDriver');

module.exports = class SmokeAlarmDriver extends NetatmoDriver {

  static TYPE = 'NSD';

};
