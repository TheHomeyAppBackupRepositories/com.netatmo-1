'use strict';

const NetatmoDevice = require('../../lib/NetatmoDevice');

module.exports = class HomeCoachDevice extends NetatmoDevice {

  static SYNC_INTERVAL = 1000 * 60 * 10; // 10 min

  async onOAuth2Init() {
    await super.onOAuth2Init();

    this.sync = this.sync.bind(this);
    this.sync();
    this.syncInterval = setInterval(this.sync, this.constructor.SYNC_INTERVAL);
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
      } = this.getData();

      const { devices } = await this.oAuth2Client.getHomeCoachsData({ deviceId });
      if (!Array.isArray(devices) || !devices.length) {
        await this.setUnavailable(this.homey.__('common.unavailable'));
        return;
      }

      const device = devices[0];
      if (!device || !device.dashboard_data) {
        await this.setUnavailable(this.homey.__('common.unavailable'));
        return;
      }

      const measurements = device.dashboard_data;
      for (const netatmoId of Object.keys(measurements)) {
        const value = this.driver.constructor.mapCapabilityValue(netatmoId, measurements[netatmoId]);
        const capabilityId = this.driver.constructor.getCapability(netatmoId);
        if (capabilityId === null) continue;
        if (value === null) continue;

        if (!this.hasCapability(capabilityId)) continue;

        if (capabilityId === 'health_idx') {
          const currentValue = this.getCapabilityValue('health_idx');
          const index = measurements[netatmoId];
          const label = this.homey.__(`health.${value}`);
          this.setCapabilityValue(capabilityId, label).catch(this.error);

          if (currentValue !== value) {
            this.homey.flow.getDeviceTriggerCard('homecoach_health_idx_changed').trigger(this, {
              index,
              label,
            }).catch(this.error);
          }
        } else {
          this.setCapabilityValue(capabilityId, value).catch(this.error);
        }
      }

      await this.setAvailable();
    }).catch(this.error);
  }

};
