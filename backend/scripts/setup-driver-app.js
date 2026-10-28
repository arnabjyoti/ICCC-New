'use strict';
// Additive setup only. Never alter/drop existing fleet tables.
const db = require('../models');
(async () => {
  try {
    for (const name of ['driverAppCredential', 'driverAppSession', 'driverDuty', 'driverAssignmentLock']) await db[name].sync();
    const credentialColumns = await db.sequelize.getQueryInterface().describeTable('driver_app_credentials');
    if (!credentialColumns.mustChangePin) {
      await db.sequelize.getQueryInterface().addColumn('driver_app_credentials', 'mustChangePin', {
        type: db.Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }
    await db.driverAssignmentLock.findOrCreate({ where: { id: 1 } });
    console.log('Driver app tables are ready. Existing fleet records were not changed.');
  } catch (error) { console.error('Setup failed:', error.name, error.original && error.original.code); process.exitCode = 1; }
  finally { await db.sequelize.close(); }
})();
