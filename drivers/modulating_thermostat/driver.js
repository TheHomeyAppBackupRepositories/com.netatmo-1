'use strict';

const NetatmoEnergyDriver = require('../../lib/NetatmoEnergyDriver');

// mV
const BATTERY_MAX = 3 * 1500;
const BATTERY_MIN = 3000;

module.exports = class ModulatingThermostatDriver extends NetatmoEnergyDriver {

  static TYPE = 'OTM';

  static getBatteryLevel(value) {
    let result = ((value - BATTERY_MIN) / (BATTERY_MAX - BATTERY_MIN)) * 100;
    result = Math.min(result, 100);
    result = Math.max(result, 0);
    return result;
  }

};
