'use strict';

const NetatmoDriver = require('../../lib/NetatmoDriver');

module.exports = class WeatherStationDriver extends NetatmoDriver {

  async onPairListDevices({ oAuth2Client }) {
    const { devices } = await oAuth2Client.getStationsData();
    const result = [];
    devices.forEach(device => {
      // add main module
      result.push({
        capabilities: [
          'measure_temperature',
          'measure_humidity',
          'measure_co2',
          'measure_noise',
          'measure_pressure',
        ],
        name: `${device.station_name} — ${device.module_name}`,
        data: {
          deviceId: device._id,
          moduleId: null,
        },
      });

      // add sub-modules
      if (Array.isArray(device.modules)) {
        device.modules.forEach(module => {
          const capabilities = [];

          if (module.data_type.includes('Temperature')) {
            capabilities.push('measure_temperature');
          }

          if (module.data_type.includes('Humidity')) {
            capabilities.push('measure_humidity');
          }

          if (module.data_type.includes('CO2')) {
            capabilities.push('measure_co2');
          }

          if (module.data_type.includes('Noise')) {
            capabilities.push('measure_noise');
          }

          if (module.data_type.includes('Pressure')) {
            capabilities.push('measure_pressure');
          }

          if (module.data_type.includes('Wind')) {
            capabilities.push('measure_wind_angle');
            capabilities.push('measure_wind_strength');
            capabilities.push('measure_gust_angle');
            capabilities.push('measure_gust_strength');
          }

          if (module.data_type.includes('Rain')) {
            capabilities.push('measure_rain');
            capabilities.push('measure_rain.1h');
            capabilities.push('measure_rain.24h');
          }

          if (typeof module.battery_percent === 'number') {
            capabilities.push('measure_battery');
          }

          result.push({
            capabilities,
            name: `${device.station_name} — ${module.module_name}`,
            data: {
              deviceId: device._id,
              moduleId: module._id,
            },
          });
        });
      }
    });
    return result;
  }

};
