'use strict';

const NetatmoEnergyDevice = require('../../lib/NetatmoEnergyDevice');

module.exports = class ModulatingThermostateDevice extends NetatmoEnergyDevice {

  async onCapabilityTargetTemperature(value) {
    const body = {
      home: {
        id: this.homeId,
        rooms: [
          {
            id: this.roomId,
            therm_setpoint_mode: 'manual',
            therm_setpoint_temperature: value,
          },
        ],
      },
    };
    await this.oAuth2Client.setState(body);
    this.setCapabilityValue('netatmo_modulating_thermostat_mode', 'manual').catch(this.error);
  }

  async onCapabilityNetatmoThermostatMode(value) {
    const body = {
      home: {
        id: this.homeId,
        rooms: [
          {
            id: this.roomId,
            therm_setpoint_mode: value,
          },
        ],
      },
    };
    await this.oAuth2Client.setState(body);
  }

};
