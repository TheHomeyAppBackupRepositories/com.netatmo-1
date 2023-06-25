'use strict';

const NetatmoEnergyDriver = require('../../lib/NetatmoEnergyDriver');

const BATTERY_MAX = 4100;
const BATTERY_MIN = 3000;

module.exports = class ValveDriver extends NetatmoEnergyDriver {

  static TYPE = 'NATherm1';

  static getBatteryLevel(value) {
    let result = ((value - BATTERY_MIN) / (BATTERY_MAX - BATTERY_MIN)) * 100;
    result = Math.min(result, 100);
    result = Math.max(result, 0);
    return result;
  }

};
