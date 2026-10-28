'use strict';
module.exports = (sequelize, T) => sequelize.define('driverAppCredential', {
  driverId: { type: T.INTEGER, primaryKey: true, references: { model: 'driver_master', key: 'id' } },
  pinHash: { type: T.STRING, allowNull: false },
  mustChangePin: { type: T.BOOLEAN, allowNull: false, defaultValue: false },
  failedAttempts: { type: T.INTEGER, allowNull: false, defaultValue: 0 },
  lockedUntil: T.DATE,
}, { tableName: 'driver_app_credentials', timestamps: true });
