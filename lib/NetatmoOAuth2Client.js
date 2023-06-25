'use strict';

const Homey = require('homey');
const {
  OAuth2Client,
  OAuth2Error,
} = require('homey-oauth2app');

module.exports = class NetatmoOAuth2Client extends OAuth2Client {

  static API_URL = 'https://api.netatmo.com/api';
  static TOKEN_URL = 'https://api.netatmo.com/oauth2/token';
  static AUTHORIZATION_URL = 'https://api.netatmo.com/oauth2/authorize';
  static SCOPES = [
    'read_station',

    'read_homecoach',

    'read_presence',

    'read_thermostat',
    'write_thermostat',

    'read_camera',
    'write_camera',

    'read_doorbell',
    // 'write_doorbell',
    // 'access_doorbell',

    'read_smokedetector',
    'read_carbonmonoxidedetector',

    // The following scopes require certification from Netatmo:
    'access_camera',
    'access_presence',
  ];

  /*
   * OAuth2Client Methods
   */

  enableWebhook() {
    if (this.webhook) return;

    this.webhook = Promise.resolve().then(async () => {
      const { user } = await this.getHomesData();
      if (!user) {
        throw new Error('Missing User');
      }

      const userId = user.id;
      if (!userId) {
        throw new Error('Missing User ID');
      }

      const url = `https://webhooks.athom.com/webhook/${Homey.env.WEBHOOK_ID}?user_id=${userId}`;
      await this.addWebhook({ url });

      const webhook = await this.homey.cloud.createWebhook(
        Homey.env.WEBHOOK_ID,
        Homey.env.WEBHOOK_SECRET,
        { userId },
      );
      webhook.on('message', ({ body }) => {
        this.log('onWebhook', JSON.stringify(body, false, 2));
        if (body && body.push_type && (body.push_type === 'NDB-incoming_call' || body.push_type === 'NDB-rtc')) {
          this.emit('webhook:incoming_call', {
            userId: body.user_id,
            homeId: body.home_id,
            deviceId: body.device_id,
            snapshotUrl: body.snapshot_url,
          });
          return;
        }

        // Smoke detector & CO detector
        if (body && body.push_type && (body.push_type.includes('NSD') || body.push_type.includes('NCO'))) {
          this.emit(`webhook:${body.event_type}`, {
            userId: body.user_id,
            homeId: body.home_id,
            deviceId: body.device_id,
            subType: body.sub_type,
          });
          return;
        }

        const eventType = body.event_type;
        this.emit(`webhook:${eventType}`, {
          homeId: body.home_id,
          eventList: body.event_list,
          subType: body.sub_type,
          pushType: body.push_type,
          message: body.message,

          // Energy
          roomId: body.room_id,
          temperature: body.temperature,

          // Security
          cameraId: body.camera_id,
          persons: body.persons,
          snapshotUrl: body.snapshot_url,
        });
      });

      return webhook;
    });
    this.webhook.catch(this.homey.error);
  }

  disableWebhook() {
    if (!this.webhook) {
      return;
    }

    this.webhook.then(webhook => {
      return webhook.unregister();
    }).catch(() => { });

    delete this.webhook;
  }

  onShouldRefreshToken({ status }) {
    return status === 401 || status === 403;
  }

  onHandleAuthorizationURLScopes({ scopes }) {
    return scopes.join(' ');
  }

  async onHandleResult({ result }) {
    if (result.status === 'ok') {
      return result.body;
    }

    throw new Error('Unknown Netatmo API Error');
  }

  async onHandleNotOK({ status, body, ...props }) {
    if (body && body.error && body.error.message) {
      throw new OAuth2Error(`Error: ${body.error.message} (Code ${status})`);
    }

    return super.onHandleNotOK({ status, body, ...props });
  }

  async onRefreshToken({ response, ...props }) {
    const { status } = response;
    const body = await response.json();

    // Known errors:
    // "Invalid access token" code 2

    if (body && body.error && body.error.message && !body.error.message.toLowerCase().includes('access token')) {
      throw new OAuth2Error(`Error: ${body.error.message} (Code ${status})`);
    }

    return super.onRefreshToken({ response, ...props });
  }

  /*
   *  Netatmo API Methods
   */

  async getStationsData({ deviceId } = {}) {
    const opts = {
      path: '/getstationsdata',
      query: {},
    };

    if (deviceId) {
      opts.query.device_id = deviceId;
    }

    return this.get(opts);
  }

  async getHomeCoachsData({ deviceId } = {}) {
    const opts = {
      path: '/gethomecoachsdata',
      query: {},
    };

    if (deviceId) {
      opts.query.device_id = deviceId;
    }

    return this.get(opts);
  }

  async getHomesData({ homeId, gatewayTypes } = {}) {
    const opts = {
      path: '/homesdata',
      query: {},
    };

    if (homeId) {
      opts.query.home_id = homeId;
    }

    if (gatewayTypes) {
      opts.query.gateway_types = gatewayTypes;
    }

    return this.get(opts);
  }

  async getHomeStatus({ homeId, deviceTypes } = {}) {
    const opts = {
      path: '/homestatus',
      query: {},
    };

    if (homeId) {
      opts.query.home_id = homeId;
    }

    if (deviceTypes) {
      opts.query.device_types = deviceTypes;
    }

    return this.get(opts);
  }

  async setRoomThermpoint({
    homeId, roomId, temp, mode = 'manual',
  }) {
    const opts = {
      path: '/setroomthermpoint',
      query: {},
    };

    if (homeId) {
      opts.query.home_id = homeId;
    }

    if (roomId) {
      opts.query.room_id = roomId;
    }

    if (mode) {
      opts.query.mode = mode;
    }

    if (temp) {
      opts.query.temp = temp;
    }

    return this.get(opts);
  }

  async setThermMode({ homeId, mode = 'schedule' }) {
    const opts = {
      path: '/setthermmode',
      query: {},
    };

    if (homeId) {
      opts.query.home_id = homeId;
    }

    if (mode) {
      opts.query.mode = mode;
    }

    return this.get(opts);
  }

  async switchHomeSchedule({ homeId, scheduleId }) {
    const opts = {
      path: '/switchhomeschedule',
      query: {},
    };

    if (homeId) {
      opts.query.home_id = homeId;
    }

    if (scheduleId) {
      opts.query.schedule_id = scheduleId;
    }

    return this.get(opts);
  }

  async getHomeData({ homeId, size } = {}) {
    const opts = {
      path: '/gethomedata',
      query: {},
    };

    if (homeId) {
      opts.query.home_id = homeId;
    }

    if (size) {
      opts.query.size = size;
    }

    return this.get(opts);
  }

  async addWebhook({ url }) {
    const opts = {
      path: '/addwebhook',
      query: {},
    };

    if (url) {
      opts.query.url = url;
    }

    return this.get(opts);
  }

  async getCameraPicture({ imageId, key }) {
    throw new Error('Not Implemented');
  }

};
