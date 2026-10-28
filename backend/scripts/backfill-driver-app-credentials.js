'use strict';
const bcrypt = require('bcrypt');
const db = require('../models');
const ensureDriverAppCredential = require('../services/ensureDriverAppCredential');

(async () => {
  try {
    const drivers = await db.driverMaster.findAll({ attributes: ['id'] });
    const pinHash = await bcrypt.hash('1234', 12);
    let added = 0;
    for (const driver of drivers) {
      if (await ensureDriverAppCredential(db, driver, undefined, pinHash)) added++;
    }
    console.log(`Credential backfill complete. Added ${added} missing driver credential(s); existing credentials were unchanged.`);
  } catch (error) {
    console.error('Credential backfill failed:', error.name, error.original && error.original.code || error.message);
    process.exitCode = 1;
  } finally {
    await db.sequelize.close();
  }
})();
