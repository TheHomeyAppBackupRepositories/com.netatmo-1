'use strict';

const { OAuth2App } = require('homey-oauth2app');
const NetatmoOAuth2Client = require('./NetatmoOAuth2Client');

module.exports = class NetatmoApp extends OAuth2App {

  static OAUTH2_CLIENT = NetatmoOAuth2Client;
  static OAUTH2_DEBUG = true;

  async onOAuth2Init() {
    await super.onOAuth2Init();

    this.homey.flow.getActionCard('thermostat_set_mode')
      .registerRunListener(({ device, mode }) => {
        return device.setThermMode({ mode });
      });

    this.homey.flow.getActionCard('modulating_thermostat_set_mode')
      .registerRunListener(({ device, mode }) => {
        return device.triggerCapabilityListener('netatmo_modulating_thermostat_mode', mode);
      });

    this.homey.flow.getActionCard('thermostat_set_schedule')
      .registerRunListener(({ device, schedule }) => {
        return device.setSchedule({
          scheduleId: schedule.id,
        });
      })
      .getArgument('schedule')
      .registerAutocompleteListener(async (query, { device }) => {
        const schedules = await device.getSchedules();
        return schedules.map(schedule => {
          return {
            id: schedule.id,
            name: schedule.name || this.homey.__('energy.default_schedule'),
          };
        }).filter(schedule => {
          return schedule.name.toLowerCase().includes(query.toLowerCase());
        });
      });
  }

};
