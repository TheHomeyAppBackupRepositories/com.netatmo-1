'use strict';

const NetatmoDevice = require('../../lib/NetatmoDevice');

module.exports = class SmokeAlarmDevice extends NetatmoDevice {

  async onOAuth2Init() {
    await super.onOAuth2Init();

    this.oAuth2Client.enableWebhook();
    this.oAuth2Client.on('webhook:co_detected', this.onWebhookCO.bind(this));

    this.registerCapabilityListener('button.resetCOAlarm', () => {
      this.setCapabilityValue('alarm_co', false).catch(this.error);
    });
  }

  onWebhookCO(data) {
    // 0: Ok
    // 1: Pre-alarm
    // 2: Alarm

    const { moduleId } = this.getData();
    if (data.deviceId && data.deviceId === moduleId) {
      this.setCapabilityValue('alarm_co', data.subType === 2)
        .catch(this.error);
    }
  }

};
