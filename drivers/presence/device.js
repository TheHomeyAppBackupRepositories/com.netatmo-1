'use strict';

const NetatmoSecurityDevice = require('../../lib/NetatmoSecurityDevice');

module.exports = class PresenceDevice extends NetatmoSecurityDevice {

  async onOAuth2Init() {
    await super.onOAuth2Init();

    this.onWebhookOutdoor = this.onWebhookOutdoor.bind(this);
    this.onWebhookVehicle = this.onWebhookVehicle.bind(this);
    this.onWebhookHuman = this.onWebhookHuman.bind(this);
    this.onWebhookAnimal = this.onWebhookAnimal.bind(this);

    this.oAuth2Client.on('webhook:vehicle', this.onWebhookVehicle);
    this.oAuth2Client.on('webhook:human', this.onWebhookHuman);
    this.oAuth2Client.on('webhook:animal', this.onWebhookAnimal);
  }

  async onOAuth2Deleted() {
    await super.onOAuth2Deleted();

    this.oAuth2Client.removeListener('webhook:vehicle', this.onWebhookVehicle);
    this.oAuth2Client.removeListener('webhook:human', this.onWebhookHuman);
    this.oAuth2Client.removeListener('webhook:animal', this.onWebhookAnimal);
  }

  onWebhookVehicle({ homeId, cameraId, snapshotUrl }) {
    return this.onWebhookOutdoor({
      homeId,
      cameraId,
      snapshotUrl,
      type: 'car',
    });
  }

  onWebhookHuman({ homeId, cameraId, snapshotUrl }) {
    return this.onWebhookOutdoor({
      homeId,
      cameraId,
      snapshotUrl,
      type: 'human',
    });
  }

  onWebhookAnimal({ homeId, cameraId, snapshotUrl }) {
    return this.onWebhookOutdoor({
      homeId,
      cameraId,
      snapshotUrl,
      type: 'animal',
    });
  }

  onWebhookOutdoor({
    homeId, cameraId, snapshotUrl, type,
  }) {
    if (homeId !== this.homeId) return;
    if (cameraId !== this.cameraId) return;

    const flowCard = this.homey.flow.getDeviceTriggerCard(`${this.driver.id}_${type}`);
    if (!flowCard) return;

    Promise.resolve().then(async () => {
      const snapshot = await this.homey.images.createImage();
      snapshot.setUrl(snapshotUrl);
      this.homey.setTimeout(() => {
        this.homey.images.unregisterImage(snapshot).catch(this.error);
      }, this.constructor.IMAGE_KEEPALIVE);

      await flowCard.trigger(this, { snapshot });
    }).catch(this.error);
  }

};
