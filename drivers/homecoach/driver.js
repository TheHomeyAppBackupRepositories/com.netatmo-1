'use strict';

const NetatmoDriver = require('../../lib/NetatmoDriver');

module.exports = class HomeCoachDriver extends NetatmoDriver {

  static TYPES_MAP = {
    Temperature: 'measure_temperature',
    CO2: 'measure_co2',
    Noise: 'measure_noise',
    Humidity: 'measure_humidity',
    Pressure: 'measure_pressure',
    health_idx: 'health_idx',
  };

  async onPairListDevices({ oAuth2Client }) {
    const { devices } = await oAuth2Client.getHomeCoachsData();

    const result = [];
    devices.forEach(device => {
      result.push({
        name: `${device.station_name}`,
        capabilities: this.constructor.getCapabilities(device.data_type),
        data: {
          deviceId: device._id,
        },
      });
    });
    return result;
  }

  static getCapabilities(types = []) {
    return types.map(type => {
      return this.getCapability(type);
    }).filter(capabilityId => !!capabilityId);
  }

  static getCapability(type) {
    return this.TYPES_MAP[type] || null;
  }

  static mapCapabilityValue(type, value) {
    if (type === 'health_idx') {
      return String(value);
    }

    return value;
  }

};
