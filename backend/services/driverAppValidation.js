'use strict';
class DriverApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
function text(value, name, max = 80) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new DriverApiError(400, `${name} is invalid.`);
  return value.trim();
}
function location(value, required = false) {
  if (value == null && !required) return null;
  if (!value || typeof value !== 'object' || !Number.isFinite(value.latitude) || !Number.isFinite(value.longitude) || Math.abs(value.latitude) > 90 || Math.abs(value.longitude) > 180 || (value.accuracy != null && (!Number.isFinite(value.accuracy) || value.accuracy < 0))) {
    throw new DriverApiError(400, 'Valid GPS coordinates are required.');
  }
  return { latitude: value.latitude, longitude: value.longitude, accuracy: value.accuracy == null ? null : value.accuracy };
}
function pagination(query) {
  const limit = query.limit === undefined ? 20 : Number(query.limit);
  const offset = query.offset === undefined ? 0 : Number(query.offset);
  if (!Number.isInteger(limit) || limit < 1 || limit > 50 || !Number.isInteger(offset) || offset < 0 || offset > 100000) throw new DriverApiError(400, 'Use a limit from 1 to 50 and an offset from 0 to 100000.');
  return { limit, offset };
}
function identifier(value) {
  const raw = text(value, 'Vehicle identifier', 40).toUpperCase();
  if (!/^[A-Z0-9 -]+$/.test(raw)) throw new DriverApiError(400, 'Vehicle identifier is invalid.');
  return raw;
}
const driverDto = row => ({ id: row.driver_id || String(row.id), name: row.driver_name || 'Driver' });
module.exports = { DriverApiError, text, location, pagination, identifier, driverDto };
