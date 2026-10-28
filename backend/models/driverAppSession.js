'use strict';
module.exports = (sequelize, T) => sequelize.define('driverAppSession', {
  tokenHash: { type: T.STRING(64), primaryKey: true },
  driverId: { type: T.INTEGER, allowNull: false, references: { model: 'driver_master', key: 'id' } },
  expiresAt: { type: T.DATE, allowNull: false },
}, { tableName: 'driver_app_sessions', timestamps: true, indexes: [{ fields: ['driverId'] }, { fields: ['expiresAt'] }] });
