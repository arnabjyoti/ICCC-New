'use strict';
// PIN is read from stdin so it never appears in process arguments or shell history.
const bcrypt = require('bcrypt');
const db = require('../models');
(async () => {
  try {
    const identifier = process.argv[2];
    if (!identifier || process.stdin.isTTY) throw new Error('Pipe a PIN on stdin and pass the existing driver ID as the only argument. See docs/driver-app-api.md.');
    let input = '';
    for await (const chunk of process.stdin) { input += chunk; if (input.length > 32) throw new Error('PIN must contain 4 to 8 digits.'); }
    const pin = input.trim();
    if (!/^\d{4,8}$/.test(pin)) throw new Error('PIN must contain 4 to 8 digits.');
    const driver = await db.driverMaster.findOne({ where: { driver_id: identifier } });
    if (!driver || String(driver.status).toLowerCase() !== 'active') throw new Error('Active driver not found. Create/activate the driver in the existing admin portal first.');
    const pinHash = await bcrypt.hash(pin, 12);
    await db.sequelize.transaction(async transaction => {
      await db.driverAppCredential.upsert({ driverId: driver.id, pinHash, mustChangePin: true, failedAttempts: 0, lockedUntil: null }, { transaction });
      await db.driverAppSession.destroy({ where: { driverId: driver.id }, transaction });
    });
    console.log('Temporary PIN saved. Driver must change it at next login; previous mobile login sessions were revoked.');
  } catch (error) { console.error(error.name.startsWith('Sequelize') ? 'Database operation failed. Run driver-app:setup first.' : error.message); process.exitCode = 1; }
  finally { await db.sequelize.close(); }
})();
