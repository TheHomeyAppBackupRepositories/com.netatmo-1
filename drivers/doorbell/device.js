'use strict';

const { fetch } = require('homey-oauth2app');
const fs = require('fs');
const path = require('path');
const NetatmoSecurityDevice = require('../../lib/NetatmoSecurityDevice');

module.exports = class DoorbellDevice extends NetatmoSecurityDevice {

  static IMAGE = false;

  events = {
    // [eventSessionId]: {
    //   image: Homey.Image,
    //   flowTriggered: Boolean|undefined,
    //   url: String|undefined,
    //   urlPromise: Promise,
    //   urlPromiseResolve: Function,
    //   urlPromiseReject: Function,
    // }
  };

  // Define a fallback image for when the image cannot be fetched.
  errorImageFilePath = path.join(__dirname, './assets/netatmo-broken-image.png');

  async onOAuth2Init() {
    await super.onOAuth2Init();

    this.oAuth2Client.on('webhook:incoming_call', this.onWebhookIncomingCall.bind(this));
  }

  async onOAuth2Deleted() {
    await super.onOAuth2Deleted();
  }

  async onWebhookIncomingCall({
    homeId,
    deviceId,
    snapshotUrl,
    sessionId,
  }) {
    if (homeId !== this.homeId || deviceId !== this.cameraId) {
      return;
    }
    if (!this.events[sessionId]) {
      // Create Event
      this.events[sessionId] = {};

      this.events[sessionId].urlPromise = new Promise((resolve, reject) => {
        this.events[sessionId].urlPromiseResolve = resolve;
        this.events[sessionId].urlPromiseReject = reject;
      });
      this.events[sessionId].urlPromise.catch(err => {
        this.error(`[Session:${sessionId}] Error Getting URL: ${err.message}`);
      }).finally(() => {
        delete this.events[sessionId].urlPromiseResolve;
        delete this.events[sessionId].urlPromiseReject;
      });
      // Create Homey.snapshot
      this.events[sessionId].snapshot = await this.homey.images.createImage();
      this.events[sessionId].snapshot.setStream(async stream => {
        try {
          // Wait for the URL, then pipe it to the image stream. Flow cards with the image tag will wait for this.
          const url = await this.events[sessionId].urlPromise;
          // Fetch the image from the resolved url.
          const res = await fetch(url);
          // Return the image stream
          return res.body.pipe(stream);
        } catch (err) {
          this.error(`[Session:${sessionId}] Using backup image ${this.errorImageFilePath}, Error Getting Image: ${err.message}`);
          const imageStream = await fs.createReadStream(this.errorImageFilePath);
          return imageStream.pipe(stream);
        }
      });

      this.events[sessionId].cleanup = () => {
        if (!this.events[sessionId]) return;

        this.log(`Cleaning Event ${sessionId}...`);

        // Unregister the Image
        if (this.events[sessionId].snapshot) {
          this.events[sessionId].snapshot
            .unregister()
            .catch(() => { });
        }

        // Delete the Event
        delete this.events[sessionId];
      };

      // Reject the URL Promise after 20 seconds
      this.homey.setTimeout(() => {
        // Reject the URL Promise
        if (this.events[sessionId].urlPromiseReject) {
          this.events[sessionId].urlPromiseReject(new Error('Timeout Getting Image URL From doorbell'));
        }
      }, 1000 * 20);

      // Cleanup the event after 2 minutes
      this.homey.setTimeout(() => {
        if (this.events[sessionId]
          && this.events[sessionId].cleanup) {
          this.events[sessionId].cleanup();
        }
      }, 1000 * 120);
    }

    if (typeof snapshotUrl !== 'undefined') {
      this.events[sessionId].url = snapshotUrl;
      if (this.events[sessionId].urlPromiseResolve) {
        this.events[sessionId].urlPromiseResolve(this.events[sessionId].url);
      }
    }

    if (this.events[sessionId] && this.events[sessionId].flowTriggered !== true) {
      const { snapshot } = this.events[sessionId];
      if (snapshot) {
        this.log(`Triggering Flow for ${sessionId}...`);
        this.events[sessionId].flowTriggered = true;
        await this.homey.flow.getDeviceTriggerCard('ring').trigger(this, { snapshot }).catch(this.error);
      }
    }
  }

};
