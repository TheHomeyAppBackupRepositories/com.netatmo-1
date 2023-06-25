'use strict';

const NetatmoSecurityDevice = require('../../lib/NetatmoSecurityDevice');

module.exports = class DoorbellDevice extends NetatmoSecurityDevice {

  static IMAGE = false;

  async onOAuth2Init() {
    await super.onOAuth2Init();

    this.oAuth2Client.on('webhook:incoming_call', this.onWebhookIncomingCall.bind(this));
  }

  async onOAuth2Deleted() {
    await super.onOAuth2Deleted();
  }

  onWebhookIncomingCall({
    homeId,
    deviceId,
    snapshotUrl = 'https://etc.athom.com/app/com.netatmo/noise.png',
  }) {
    if (homeId !== this.homeId) return;
    if (deviceId !== this.cameraId) return;

    Promise.resolve().then(async () => {
      const snapshot = await this.homey.images.createImage();
      snapshot.setUrl(snapshotUrl);
      this.homey.setTimeout(() => {
        this.homey.images.unregisterImage(snapshot).catch(this.error);
      }, this.constructor.IMAGE_KEEPALIVE);

      await this.homey.flow.getDeviceTriggerCard('ring').trigger(this, { snapshot });
    }).catch(this.error);
  }

};
