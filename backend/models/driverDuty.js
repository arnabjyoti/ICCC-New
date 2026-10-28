'use strict';
module.exports = (sequelize, T) => sequelize.define('driverDuty', {
  id: { type: T.UUID, primaryKey: true },
  driverId: { type: T.INTEGER, allowNull: false, references: { model: 'driver_master', key: 'id' } },
  vehicleId: { type: T.INTEGER, allowNull: false, references: { model: 'vehicle_master', key: 'id' } },
  // MySQL allows multiple NULLs in a unique index: only active rows carry these IDs.
  activeDriverId: { type: T.INTEGER, allowNull: true, unique: true },
  activeVehicleId: { type: T.INTEGER, allowNull: true, unique: true },
  driverSnapshot: { type: T.JSON, allowNull: false },
  vehicleSnapshot: { type: T.JSON, allowNull: false },
  startedAt: { type: T.DATE, allowNull: false },
  endedAt: T.DATE,
  startLocation: { type: T.JSON, allowNull: false },
  endLocation: T.JSON,
  endReason: T.STRING,
}, { tableName: 'driver_duties', timestamps: true, indexes: [{ fields: ['driverId', 'startedAt'] }, { fields: ['vehicleId', 'startedAt'] }] });
