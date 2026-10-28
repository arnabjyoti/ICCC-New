'use strict';
const express = require('express');
const { DriverApiError, driverDto } = require('../services/driverAppValidation');
const createService = require('../services/driverAppService');

// The factory permits isolated API tests without starting telemetry workers or the production DB.
module.exports = function createDriverRouter(db) {
  const router = express.Router();
  const service = createService(db);
  const attempts = new Map();
  function respondError(error, res) {
    if (error instanceof DriverApiError) return res.status(error.status).json({ message: error.message });
    if (error.name === 'SequelizeUniqueConstraintError' || ['ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT'].includes(error.original && error.original.code)) return res.status(409).json({ message: 'Assignment changed or is busy. Refresh the vehicle and retry.' });
    console.error('[Driver API]', {
      name: error.name,
      message: error.original && error.original.message || error.message,
      code: error.original && error.original.code,
    }); // Exclude SQL, request bodies, PINs, and tokens.
    return res.status(500).json({ message: 'Unable to complete this request. Please retry.' });
  }
  const route = handler => (req, res, next) => Promise.resolve().then(() => handler(req, res, next)).catch(error => respondError(error, res));
  const auth = route(async (req, res, next) => {
    const match = /^Bearer ([a-f0-9]{64})$/.exec(req.get('authorization') || '');
    req.driverAuth = await service.authenticate(match && match[1]);
    next();
  });
  const requireChangedPin = (req, res, next) => {
    if (req.driverAuth.mustChangePin) return res.status(403).json({ message: 'Change your temporary PIN before continuing.' });
    next();
  };
  const noCache = (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); };
  function loginLimit(req, res, next) {
    const now = Date.now();
    for (const [key, entry] of attempts) if (entry.expires <= now) attempts.delete(key);
    const key = req.ip;
    let entry = attempts.get(key);
    if (!entry) {
      if (attempts.size >= 10000) return res.status(429).json({ message: 'Login service is busy. Try again later.' });
      entry = { count: 0, expires: now + 15 * 60 * 1000 }; attempts.set(key, entry);
    }
    if (++entry.count > 30) { res.set('Retry-After', String(Math.ceil((entry.expires - now) / 1000))); return res.status(429).json({ message: 'Too many login requests. Try again later.' }); }
    next();
  }
  const body = req => {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) throw new DriverApiError(400, 'A JSON object is required.');
    return req.body;
  };
  router.post('/auth/login', noCache, loginLimit, route(async (req, res) => res.json(await service.login(body(req)))));
  router.post('/auth/change-pin', noCache, auth, route(async (req, res) => res.json(await service.changePin(req.driverAuth, body(req)))));
  router.get('/auth/me', noCache, auth, requireChangedPin, route(async (req, res) => res.json({ driver: driverDto(req.driverAuth.driver) })));
  router.post('/auth/logout', noCache, auth, requireChangedPin, route(async (req, res) => { await service.logout(req.driverAuth); res.sendStatus(204); }));
  router.get('/vehicles', noCache, auth, requireChangedPin, route(async (req, res) => res.json(await service.search(req.query))));
  router.get('/vehicles/:identifier', noCache, auth, requireChangedPin, route(async (req, res) => res.json(await service.vehicle(req.params.identifier))));
  router.get('/duties/current', noCache, auth, requireChangedPin, route(async (req, res) => res.json(await service.current(req.driverAuth))));
  router.get('/duties/history', noCache, auth, requireChangedPin, route(async (req, res) => res.json(await service.history(req.driverAuth, req.query))));
  router.post('/duties', noCache, auth, requireChangedPin, route(async (req, res) => res.json(await service.start(req.driverAuth, body(req)))));
  router.post('/duties/:id/end', noCache, auth, requireChangedPin, route(async (req, res) => { await service.end(req.driverAuth, req.params.id, body(req)); res.sendStatus(204); }));
  return router;
};
