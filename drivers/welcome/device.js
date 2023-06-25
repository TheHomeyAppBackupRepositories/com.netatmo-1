'use strict';

const NetatmoSecurityDevice = require('../../lib/NetatmoSecurityDevice');

module.exports = class WelcomeDevice extends NetatmoSecurityDevice {

  async onOAuth2Init() {
    await super.onOAuth2Init();

    this.onWebhookMovement = this.onWebhookMovement.bind(this);
    this.onWebhookPerson = this.onWebhookPerson.bind(this);

    this.oAuth2Client.on('webhook:movement', this.onWebhookMovement);
    this.oAuth2Client.on('webhook:person', this.onWebhookPerson);
    this.oAuth2Client.on('webhook:animal', this.onWebhookAnimal);
  }

  async onOAuth2Deleted() {
    await super.onOAuth2Deleted();

    this.oAuth2Client.removeListener('webhook:movement', this.onWebhookMovement);
    this.oAuth2Client.removeListener('webhook:person', this.onWebhookPerson);
    this.oAuth2Client.removeListener('webhook:animal', this.onWebhookAnimal);
  }

  onWebhookMovement({ homeId, cameraId }) {
    if (homeId !== this.homeId) return;
    if (cameraId !== this.cameraId) return;

    const flowCard = this.homey.flow.getDeviceTriggerCard(`${this.driver.id}_motion`);
    if (!flowCard) return;

    flowCard.trigger(this).catch(this.error);
  }

  onWebhookAnimal({
    homeId, cameraId, snapshotUrl, message,
  }) {

  }

  onWebhookPerson({
    homeId, cameraId, persons, snapshotUrl, message,
  }) {
    if (homeId !== this.homeId) return;
    if (cameraId !== this.cameraId) return;
    if (!Array.isArray(persons)) return;
    if (!persons.length) return;

    const isKnown = !!persons.find(person => person.is_known);

    const flowCard = this.homey.flow.getDeviceTriggerCard(`${this.driver.id}_${isKnown ? 'known' : 'unknown'}_face`);
    if (!flowCard) return;

    Promise.resolve().then(async () => {
      const snapshot = await this.homey.images.createImage();
      snapshot.setUrl(snapshotUrl);
      this.homey.setTimeout(() => {
        this.homey.images.unregisterImage(snapshot).catch(this.error);
      }, this.constructor.IMAGE_KEEPALIVE);

      const tokens = { snapshot };
      if (isKnown) {
        tokens.who = '?';

        if (message) {
          if (message.includes(': ')) {
            message = message.split(': ', 2)[1].trim();
          }

          const name = message.split(' ')[0];
          if (name) tokens.who = name;
        }
      }

      await flowCard.trigger(this, tokens);
    }).catch(this.error);
  }

};
