'use strict';

const NetatmoDevice = require('./NetatmoDevice');

const SYNC_INTERVAL = 1000 * 60 * 15; // 15 min

module.exports = class NetatmoEnergyDevice extends NetatmoDevice {

  async onOAuth2Init() {
    await super.onOAuth2Init();

    this.onWebhookSetpoint = this.onWebhookSetpoint.bind(this);

    const {
      moduleId,
    } = this.getData();

    this.moduleId = moduleId;

    const {
      homeId,
      roomId,
    } = this.getStore();
    this.homeId = homeId;
    this.roomId = roomId;

    this.oAuth2Client.enableWebhook();
    this.oAuth2Client.on('webhook:set_point', this.onWebhookSetpoint);

    this.sync = this.sync.bind(this);
    this.sync();
    this.syncInterval = setInterval(this.sync, SYNC_INTERVAL);

    if (this.hasCapability('target_temperature')) {
      this.registerCapabilityListener('target_temperature', this.onCapabilityTargetTemperature.bind(this));
    }

    if (this.hasCapability('netatmo_thermostat_mode')) {
      this.registerCapabilityListener('netatmo_thermostat_mode', this.onCapabilityNetatmoThermostatMode.bind(this));
    }
  }

  async onOAuth2Deleted() {
    this.oAuth2Client.removeListener('webhook:set_point', this.onWebhookSetpoint);

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }

  onWebhookSetpoint({ homeId, roomId, temperature }) {
    if (homeId !== this.homeId) return;
    if (roomId !== this.roomId) return;

    if (this.hasCapability('target_temperature')) {
      this.setCapabilityValue('target_temperature', temperature).catch(this.error);
    }
  }

  async onCapabilityTargetTemperature(value) {
    return this.oAuth2Client.setRoomThermpoint({
      homeId: this.homeId,
      roomId: this.roomId,
      mode: 'manual',
      temp: value,
    });
  }

  async onCapabilityNetatmoThermostatMode(value) {
    return this.setThermMode({ mode: value });
  }

  async setThermMode({ mode }) {
    return this.oAuth2Client.setThermMode({
      mode,
      homeId: this.homeId,
    });
  }

  async setSchedule({ scheduleId }) {
    return this.oAuth2Client.switchHomeSchedule({
      scheduleId,
      homeId: this.homeId,
    });
  }

  async getSchedules() {
    const { homes } = await this.oAuth2Client.getHomesData({
      homeId: this.homeId,
    });
    const [home] = homes;
    const { schedules } = home;
    return schedules;
  }

  sync() {
    Promise.resolve().then(async () => {
      // update device topology
      const { homes } = await this.oAuth2Client.getHomesData();
      if (!Array.isArray(homes)) return;
      homes.forEach(home => {
        if (!Array.isArray(home.modules)) return;
        home.modules.forEach(module => {
          if (module.id !== this.moduleId) return;

          if (home.id !== this.homeId) {
            this.log('Home ID changed');
            this.setStoreValue('homeId', home.id);
            this.homeId = home.id;
          }

          if (module.room_id !== this.roomId) {
            this.log('Room ID changed');
            this.setStoreValue('roomId', module.room_id);
            this.roomId = module.room_id;
          }
        });
      });

      // update device state
      const { home } = await this.oAuth2Client.getHomeStatus({
        homeId: this.homeId,
      });
      if (!home
        || !Array.isArray(home.modules)
        || !home.modules.length
        || !Array.isArray(home.rooms)
        || !home.rooms.length) {
        await this.setUnavailable(this.homey.__('common.unavailable'));
        return;
      }

      const module = home.modules.find(module => {
        return module.id === this.moduleId;
      });
      if (!module) {
        await this.setUnavailable(this.homey.__('common.unavailable'));
        return;
      }

      if (!module.reachable) {
        await this.setUnavailable(this.homey.__('energy.unreachable'));
        return;
      }

      if (typeof module.battery_level === 'number'
       && this.hasCapability('measure_battery')
       && typeof this.driver.constructor.getBatteryLevel === 'function') {
        const batteryValue = this.driver.constructor.getBatteryLevel(module.battery_level);
        this.setCapabilityValue('measure_battery', batteryValue).catch(this.error);
      }

      const room = home.rooms.find(({ id }) => id === this.roomId);
      if (!room) {
        await this.setUnavailable(this.homey.__('energy.no_room'));
        return;
      }

      if (this.hasCapability('measure_temperature')) {
        this.setCapabilityValue('measure_temperature', room.therm_measured_temperature).catch(this.error);
      }

      if (this.hasCapability('target_temperature')) {
        this.setCapabilityValue('target_temperature', room.therm_setpoint_temperature).catch(this.error);
      }

      if (typeof room.open_window === 'boolean' && this.hasCapability('alarm_contact.window')) {
        this.setCapabilityValue('alarm_contact.window', room.open_window).catch(this.error);
      }

      if (typeof room.therm_setpoint_mode === 'string' && this.hasCapability('netatmo_thermostat_mode')) {
        this.setCapabilityValue('netatmo_thermostat_mode', room.therm_setpoint_mode).catch(this.error);
      }

      await this.setAvailable();
    }).catch(this.error);
  }

};
