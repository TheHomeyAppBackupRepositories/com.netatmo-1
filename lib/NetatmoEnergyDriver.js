'use strict';

const NetatmoDriver = require('./NetatmoDriver');

module.exports = class NetatmoEnergyDriver extends NetatmoDriver {

  getBatteryLevel() {
    return null;
  }

};
