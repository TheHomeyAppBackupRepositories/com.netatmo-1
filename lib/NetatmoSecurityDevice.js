'use strict';

const { fetch } = require('homey-oauth2app');
const NetatmoDevice = require('./NetatmoDevice');

const VPN_URL_TIMEOUT = 1000 * 60 * 60 * 2.5; // 2.5h

module.exports = class NetatmoEnergyDevice extends NetatmoDevice {

  static IMAGE = true;
  static IMAGE_KEEPALIVE = 1000 * 60 * 5; // 5 min

  async onOAuth2Init() {
    await super.onOAuth2Init();

    this.onWebhookConnection = this.onWebhookConnection.bind(this);
    this.onWebhookDisconnection = this.onWebhookDisconnection.bind(this);

    const {
      cameraId,
    } = this.getData();
    this.cameraId = cameraId;

    const {
      homeId,
    } = this.getStore();
    this.homeId = homeId;

    this.oAuth2Client.enableWebhook();
    this.oAuth2Client.on('webhook:connection', this.onWebhookConnection);
    this.oAuth2Client.on('webhook:disconnection', this.onWebhookDisconnection);

    if (this.constructor.IMAGE) {
      this.image = await this.homey.images.createImage();
      this.image.setStream(async stream => {
        const vpnUrl = await this.getVPNUrl();
        const imageUrl = `${vpnUrl}/live/snapshot_720.jpg`;
        const res = await fetch(imageUrl);
        return res.body.pipe(stream);
      });
      await this.setCameraImage('main', 'Main', this.image);
    }
  }

  async onOAuth2Deleted() {
    this.oAuth2Client.removeListener('webhook:connection', this.onWebhookConnection);
    this.oAuth2Client.removeListener('webhook:disconnection', this.onWebhookDisconnection);

    if (this._vpnUrlTimeout) {
      clearTimeout(this._vpnUrlTimeout);
    }
  }

  onWebhookConnection({ homeId, cameraId }) {
    if (homeId !== this.homeId) return;
    if (cameraId !== this.cameraId) return;

    const flowCard = this.homey.flow.getDeviceTriggerCard(`${this.driver.id}_connected`);
    if (!flowCard) return;

    flowCard.trigger(this).catch(this.error);
  }

  onWebhookDisconnection({ homeId, cameraId }) {
    if (homeId !== this.homeId) return;
    if (cameraId !== this.cameraId) return;

    const flowCard = this.homey.flow.getDeviceTriggerCard(`${this.driver.id}_disconnected`);
    if (!flowCard) return;

    flowCard.trigger(this).catch(this.error);
  }

  async getVPNUrl() {
    if (this._vpnUrl) {
      return this._vpnUrl;
    }

    this._vpnUrlTimeout = this.homey.setTimeout(() => {
      delete this._vpnUrl;
    }, VPN_URL_TIMEOUT);

    const { homes = [] } = await this.oAuth2Client.getHomeData({
      homeId: this.homeId,
    });
    const home = homes.find(({ id }) => id === this.homeId);
    if (!home) {
      throw new Error('No Home Found');
    }

    const { cameras = [] } = home;
    const camera = cameras.find(({ id }) => id === this.cameraId);
    if (!camera) {
      throw new Error('No Camera Found');
    }

    if (!camera.vpn_url) {
      throw new Error('Could not get VPN URL, maybe the camera is offline.');
    }

    this._vpnUrl = camera.vpn_url;

    return this._vpnUrl;
  }

};
