'use strict';

const NetatmoDevice = require('../../lib/NetatmoDevice');

const SYNC_INTERVAL = 1000 * 60 * 10; // 10 min
const CAPABILITIES_MAP = {
  Temperature: 'measure_temperature',
  Humidity: 'measure_humidity',
  CO2: 'measure_co2',
  Noise: 'measure_noise',
  Pressure: 'measure_pressure',
  Rain: 'measure_rain',
  WindAngle: 'measure_wind_angle',
  WindStrength: 'measure_wind_strength',
  GustAngle: 'measure_gust_angle',
  GustStrength: 'measure_gust_strength',
  sum_rain_24: 'measure_rain.24h',
  sum_rain_1: 'measure_rain.1h',
};

module.exports = class WeatherStationDevice extends NetatmoDevice {

  async onOAuth2Init() {
    await super.onOAuth2Init();

    this.sync = this.sync.bind(this);
    this.sync();
    this.syncInterval = setInterval(this.sync, SYNC_INTERVAL);
  }

  async onOAuth2Deleted() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }

  sync() {
    this.log('Synchronizing...');
    Promise.resolve().then(async () => {
      const {
        deviceId,
        moduleId,
      } = this.getData();

      const { devices } = await this.oAuth2Client.getStationsData({ deviceId });
      if (!Array.isArray(devices) || !devices.length) {
        await this.setUnavailable(this.homey.__('common.unavailable'));
        return;
      }

      let device;
      if (moduleId === null) {
        device = devices[0];
      } else {
        device = devices[0].modules.find(module => {
          return module._id === moduleId;
        });
      }

      if (device && typeof device.battery_percent === 'number' && this.hasCapability('measure_battery')) {
        this.setCapabilityValue('measure_battery', device.battery_percent).catch(this.error);
      }

      if (!device || !device.dashboard_data) {
        this.setUnavailable(this.homey.__('common.unavailable')).catch(this.error);
        return;
      }

      const measurements = device.dashboard_data;
      for (const netatmoId of Object.keys(measurements)) {
        const capabilityId = CAPABILITIES_MAP[netatmoId];
        if (!capabilityId) continue;

        let value = measurements[netatmoId];
        if (typeof value !== 'number') {
          value = null;
        }

        if (this.hasCapability(capabilityId)) {
          this.setCapabilityValue(capabilityId, value).catch(this.error);
        }
      }

      this.setAvailable().catch(this.error);
    }).catch(this.error);
  }

};
