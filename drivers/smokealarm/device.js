'use strict';

const NetatmoDevice = require('../../lib/NetatmoDevice');

module.exports = class SmokeAlarmDevice extends NetatmoDevice {

  async onOAuth2Init() {
    await super.onOAuth2Init();

    this.oAuth2Client.enableWebhook();
    this.oAuth2Client.on('webhook:smoke', this.onWebhookSmoke.bind(this));
    this.oAuth2Client.on('webhook:tampered', this.onWebhookTampered.bind(this));

    this.registerCapabilityListener('button.resetSmokeAlarm', () => {
      this.setCapabilityValue('alarm_smoke', false).catch(this.error);
    });
    this.registerCapabilityListener('button.resetTamperAlarm', () => {
      this.setCapabilityValue('alarm_tamper', false).catch(this.error);
    });
  }

  onWebhookSmoke(data) {
    // 0: Cleared
    // 1: Detected

    const { moduleId } = this.getData();
    if (data.deviceId && data.deviceId === moduleId) {
      this.setCapabilityValue('alarm_smoke', data.subType === 1)
        .catch(this.error);
    }
  }

  onWebhookTampered(data) {
    // 0: Ready
    // 1: Tampered

    const { moduleId } = this.getData();
    if (data.deviceId && data.deviceId === moduleId) {
      this.setCapabilityValue('alarm_tamper', data.subType === 1)
        .catch(this.error);
    }
  }

};
