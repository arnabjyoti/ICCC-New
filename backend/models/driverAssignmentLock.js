'use strict';
// A database row lock serializes mobile assignment mutations across server processes.
module.exports = (sequelize, T) => sequelize.define('driverAssignmentLock', {
  id: { type: T.INTEGER, primaryKey: true },
}, { tableName: 'driver_assignment_lock', timestamps: false });
