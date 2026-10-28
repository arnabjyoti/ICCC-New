'use strict';
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { Op, fn, col, where } = require('sequelize');
const { DriverApiError, text, location, pagination, identifier, driverDto } = require('./driverAppValidation');
const hash = token => crypto.createHash('sha256').update(token).digest('hex');
const active = driver => driver && String(driver.status).toLowerCase() === 'active';
const vehicleAvailable = row => row && !['inactive', 'deleted', 'disabled'].includes(String(row.status).toLowerCase());
const normalizedNumber = () => fn('REPLACE', fn('REPLACE', fn('UPPER', col('vehicle_no')), ' ', ''), '-', '');

module.exports = function createDriverAppService(db, options = {}) {
  const ttl = Number(options.sessionDays || process.env.DRIVER_SESSION_DAYS || 30);
  if (!Number.isInteger(ttl) || ttl < 1 || ttl > 90) throw new Error('DRIVER_SESSION_DAYS must be between 1 and 90.');
  const opts = transaction => transaction ? { transaction } : {};
  async function serialized(work) {
    await db.driverAssignmentLock.findOrCreate({ where: { id: 1 } });
    return db.sequelize.transaction(async transaction => {
      await db.driverAssignmentLock.findByPk(1, { transaction, lock: transaction.LOCK.UPDATE });
      return work(transaction);
    });
  }
  async function requireDriver(id, transaction) {
    const driver = await db.driverMaster.findByPk(id, { ...opts(transaction), ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}) });
    if (!active(driver)) throw new DriverApiError(401, 'Driver account is inactive. Please contact your administrator.');
    return driver;
  }
  async function vehicleDto(row, transaction) {
    const driver = row.driver_id ? await db.driverMaster.findByPk(row.driver_id, opts(transaction)) : null;
    const duty = await db.driverDuty.findOne({ where: { activeVehicleId: row.id }, ...opts(transaction) });
    const latest = row.box_id ? await db.travelHistory.findOne({ where: { box_id: row.box_id }, order: [['recorded_at', 'DESC']], ...opts(transaction) }) : null;
    const telemetryAge = latest ? Date.now() - new Date(latest.recorded_at).getTime() : Infinity;
    return {
      id: String(row.id), number: row.vehicle_no, type: row.vehicle_type || 'Bus',
      gpsOnline: Boolean(row.gps_enabled && telemetryAge >= 0 && telemetryAge <= 5 * 60 * 1000),
      currentDriver: driver ? driverDto(driver) : null,
      assignmentVersion: hash(`${row.id}:${row.driver_id || ''}:${new Date(row.updatedAt).toISOString()}:${duty ? duty.id : ''}`),
      qrValue: `BUS-${row.id}`, division: row.division || null,
    };
  }
  const dutyDto = row => ({
    id: row.id, driver: row.driverSnapshot, vehicle: row.vehicleSnapshot,
    startedAt: new Date(row.startedAt).toISOString(), location: row.startLocation,
    status: row.endedAt ? 'ENDED' : 'ACTIVE',
    ...(row.endedAt ? { endedAt: new Date(row.endedAt).toISOString(), endLocation: row.endLocation, endReason: row.endReason } : {}),
  });
  async function closeDuty(row, reason, coordinates, transaction) {
    await row.update({ activeDriverId: null, activeVehicleId: null, endedAt: new Date(), endLocation: coordinates, endReason: reason }, { transaction });
  }
  async function findVehicle(raw, transaction) {
    const value = identifier(raw);
    const numericId = /^(?:BUS-)?([1-9]\d*)$/.exec(value);
    const criteria = numericId ? { id: Number(numericId[1]) } : where(normalizedNumber(), value.replace(/[ -]/g, ''));
    const rows = await db.vehicleMaster.findAll({ where: criteria, limit: 2, ...opts(transaction), ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}) });
    if (!rows.length || !vehicleAvailable(rows[0])) throw new DriverApiError(404, 'Vehicle not found or unavailable.');
    if (rows.length > 1) throw new DriverApiError(409, 'Duplicate vehicle registration. Scan the bus ID QR or contact your administrator.');
    return rows[0];
  }
  return {
    async login(body) {
      const value = text(body.identifier, 'Driver ID or mobile number', 80);
      const pin = text(body.pin, 'PIN', 8);
      if (!/^\d{4,8}$/.test(pin)) throw new DriverApiError(400, 'PIN must contain 4 to 8 digits.');
      const drivers = await db.driverMaster.findAll({ where: { [Op.or]: [{ driver_id: value }, { contact_no: value }] }, limit: 2 });
      if (drivers.length !== 1 || !active(drivers[0])) throw new DriverApiError(401, 'Invalid driver ID/mobile or PIN.');
      const driver = drivers[0];
      // Return errors after commit so failed-attempt counters are persisted.
      const result = await db.sequelize.transaction(async transaction => {
        const credential = await db.driverAppCredential.findByPk(driver.id, { transaction, lock: transaction.LOCK.UPDATE });
        if (!credential) return { error: new DriverApiError(401, 'Invalid driver ID/mobile or PIN.') };
        if (credential.lockedUntil && new Date(credential.lockedUntil).getTime() > Date.now()) return { error: new DriverApiError(429, 'Too many attempts. Try again in 15 minutes.') };
        if (!(await bcrypt.compare(pin, credential.pinHash))) {
          const attempts = credential.lockedUntil ? 1 : credential.failedAttempts + 1;
          await credential.update({ failedAttempts: attempts, lockedUntil: attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null }, { transaction });
          return { error: new DriverApiError(401, 'Invalid driver ID/mobile or PIN.') };
        }
        await credential.update({ failedAttempts: 0, lockedUntil: null }, { transaction });
        await db.driverAppSession.destroy({ where: { driverId: driver.id, expiresAt: { [Op.lte]: new Date() } }, transaction });
        const token = crypto.randomBytes(32).toString('hex');
        await db.driverAppSession.create({ tokenHash: hash(token), driverId: driver.id, expiresAt: new Date(Date.now() + ttl * 86400000) }, { transaction });
        return { token, driver: driverDto(driver), mustChangePin: Boolean(credential.mustChangePin) };
      });
      if (result.error) throw result.error;
      return result;
    },
    async authenticate(token) {
      if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw new DriverApiError(401, 'Please log in.');
      const session = await db.driverAppSession.findByPk(hash(token));
      if (!session || new Date(session.expiresAt).getTime() <= Date.now()) throw new DriverApiError(401, 'Your session has expired. Please log in again.');
      const [driver, credential] = await Promise.all([
        requireDriver(session.driverId),
        db.driverAppCredential.findByPk(session.driverId),
      ]);
      if (!credential) throw new DriverApiError(401, 'Please log in.');
      return { driver, tokenHash: session.tokenHash, mustChangePin: Boolean(credential.mustChangePin) };
    },
    async changePin(auth, body) {
      const newPin = body.newPin;
      if (typeof newPin !== 'string' || !/^\d{4,8}$/.test(newPin)) throw new DriverApiError(400, 'New PIN must contain 4 to 8 digits.');
      const currentPin = body.currentPin;
      if (currentPin !== undefined && (typeof currentPin !== 'string' || !/^\d{4,8}$/.test(currentPin))) {
        throw new DriverApiError(400, 'Current PIN must contain 4 to 8 digits.');
      }
      const pinHash = await bcrypt.hash(newPin, 12);
      return db.sequelize.transaction(async transaction => {
        const credential = await db.driverAppCredential.findByPk(auth.driver.id, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (!credential) throw new DriverApiError(401, 'Please log in.');
        if (!credential.mustChangePin && currentPin === undefined) {
          throw new DriverApiError(400, 'Current PIN is required to change your PIN.');
        }
        if (currentPin !== undefined && !(await bcrypt.compare(currentPin, credential.pinHash))) {
          throw new DriverApiError(401, 'Current PIN is incorrect.');
        }
        await credential.update({ pinHash, mustChangePin: false, failedAttempts: 0, lockedUntil: null }, { transaction });
        return { mustChangePin: false };
      });
    },
    async logout(auth) { await db.driverAppSession.destroy({ where: { tokenHash: auth.tokenHash } }); },
    async vehicle(raw) { return vehicleDto(await findVehicle(raw)); },
    async search(query) {
      const page = pagination(query);
      const q = query.q === undefined || query.q === '' ? '' : identifier(query.q).replace(/[ -]/g, '');
      const rows = await db.vehicleMaster.findAndCountAll({
        where: { [Op.and]: [q ? where(normalizedNumber(), { [Op.like]: `%${q}%` }) : {}, { [Op.or]: [{ status: null }, { status: { [Op.notIn]: ['Inactive', 'Deleted', 'Disabled'] } }] }] },
        order: [['vehicle_no', 'ASC'], ['id', 'ASC']], ...page,
      });
      return { items: await Promise.all(rows.rows.map(row => vehicleDto(row))), total: rows.count, ...page };
    },
    async current(auth) {
      return serialized(async transaction => {
        const row = await db.driverDuty.findOne({ where: { activeDriverId: auth.driver.id }, transaction });
        if (!row) return null;
        const bus = await db.vehicleMaster.findByPk(row.vehicleId, { transaction, lock: transaction.LOCK.UPDATE });
        // An older admin endpoint can change assignments independently; never report stale ownership.
        if (!vehicleAvailable(bus) || bus.driver_id !== auth.driver.id) { await closeDuty(row, 'ASSIGNMENT_CHANGED', null, transaction); return null; }
        return dutyDto(row);
      });
    },
    async history(auth, query) {
      const page = pagination(query);
      const result = await db.driverDuty.findAndCountAll({ where: { driverId: auth.driver.id }, order: [['startedAt', 'DESC'], ['id', 'DESC']], ...page });
      return { items: result.rows.map(dutyDto), total: result.count, ...page };
    },
    async start(auth, body) {
      const id = text(body.vehicleId, 'Vehicle ID', 40);
      const coordinates = location(body.location, true);
      if (typeof body.replaceExistingDriver !== 'boolean') throw new DriverApiError(400, 'replaceExistingDriver must be a boolean.');
      const version = text(body.assignmentVersion, 'Assignment version', 64);
      return serialized(async transaction => {
        const driver = await requireDriver(auth.driver.id, transaction);
        const bus = await findVehicle(id, transaction);
        let ownDuty = await db.driverDuty.findOne({ where: { activeDriverId: driver.id }, transaction });
        if (ownDuty) {
          const ownBus = await db.vehicleMaster.findByPk(ownDuty.vehicleId, { transaction, lock: transaction.LOCK.UPDATE });
          if (ownBus && ownBus.driver_id === driver.id && vehicleAvailable(ownBus)) {
            if (ownDuty.vehicleId === bus.id) return dutyDto(ownDuty); // retry after lost response
            throw new DriverApiError(409, 'End your current duty before choosing another vehicle.');
          }
          await closeDuty(ownDuty, 'ASSIGNMENT_CHANGED', null, transaction);
        }
        const before = await vehicleDto(bus, transaction);
        if (before.assignmentVersion !== version) throw new DriverApiError(409, 'Vehicle assignment changed. Find the vehicle again and confirm its current driver.');
        if (bus.driver_id && bus.driver_id !== driver.id && !body.replaceExistingDriver) throw new DriverApiError(409, 'This vehicle is assigned. Confirm driver replacement first.');
        const previous = await db.driverDuty.findOne({ where: { activeVehicleId: bus.id }, transaction });
        if (previous) await closeDuty(previous, 'REPLACED', null, transaction);
        // Remove any legacy assignments of this driver to other buses.
        await db.vehicleMaster.update({ driver_id: null }, { where: { driver_id: driver.id, id: { [Op.ne]: bus.id } }, transaction });
        await bus.update({ driver_id: driver.id }, { transaction });
        const row = await db.driverDuty.create({ id: crypto.randomUUID(), driverId: driver.id, vehicleId: bus.id, activeDriverId: driver.id, activeVehicleId: bus.id, driverSnapshot: driverDto(driver), vehicleSnapshot: { ...before, currentDriver: driverDto(driver) }, startedAt: new Date(), startLocation: coordinates }, { transaction });
        return dutyDto(row);
      });
    },
    async end(auth, dutyId, body) {
      const coordinates = location(body.location);
      const id = text(dutyId, 'Duty ID', 36);
      return serialized(async transaction => {
        const duty = await db.driverDuty.findOne({ where: { id, driverId: auth.driver.id }, transaction });
        if (!duty) throw new DriverApiError(404, 'Duty not found.');
        if (duty.endedAt) return; // retry, including a duty replaced by another driver
        await closeDuty(duty, 'ENDED', coordinates, transaction);
        // Never remove another driver's newer assignment.
        await db.vehicleMaster.update({ driver_id: null }, { where: { id: duty.vehicleId, driver_id: auth.driver.id }, transaction });
      });
    },
  };
};
