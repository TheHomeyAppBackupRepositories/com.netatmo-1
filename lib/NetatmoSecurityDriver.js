'use strict';

const NetatmoDriver = require('./NetatmoDriver');

module.exports = class NetatmoSecurityDriver extends NetatmoDriver {

  async onPairListDevices({ oAuth2Client }) {
    const { homes } = await oAuth2Client.getHomeData();
    const result = [];

    homes.forEach(home => {
      if (!Array.isArray(home.cameras)) return;
      home.cameras.forEach(camera => {
        if (camera.type !== this.constructor.TYPE) return;
        result.push({
          name: `${home.name} — ${camera.name}`,
          data: {
            cameraId: camera.id,
          },
          store: {
            homeId: home.id,
          },
        });
      });
    });

    return result;
  }

  getBatteryLevel() {
    return null;
  }

};
