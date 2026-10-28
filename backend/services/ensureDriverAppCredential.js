'use strict';
const bcrypt = require('bcrypt');

module.exports = async function ensureDriverAppCredential(db, driver, transaction, pinHash) {
  const options = transaction ? { transaction } : {};
  const existing = await db.driverAppCredential.findByPk(driver.id, options);
  if (existing) return false;

  const defaults = {
    driverId: driver.id,
    pinHash: pinHash || await bcrypt.hash('1234', 12),
    mustChangePin: true,
    failedAttempts: 0,
    lockedUntil: null,
  };
  const [, created] = await db.driverAppCredential.findOrCreate({
    where: { driverId: driver.id },
    defaults,
    ...options,
  });
  return created;
};
