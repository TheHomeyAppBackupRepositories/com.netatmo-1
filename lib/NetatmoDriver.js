'use strict';

const {
  OAuth2Driver,
} = require('homey-oauth2app');

module.exports = class NetatmoDriver extends OAuth2Driver {

  async onPairListDevices({ oAuth2Client }) {
    const { homes } = await oAuth2Client.getHomesData();
    const result = [];

    if (!Array.isArray(homes)) {
      return result;
    }

    homes.forEach(home => {
      if (!Array.isArray(home.modules)) return;
      home.modules.forEach(module => {
        if (module.type !== this.constructor.TYPE) return;
        result.push({
          name: `${home.name} — ${module.name}`,
          data: {
            moduleId: module.id,
          },
          store: {
            homeId: home.id,
            roomId: module.room_id,
          },
        });
      });
    });

    return result;
  }

};
