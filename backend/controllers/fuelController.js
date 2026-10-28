'use strict';

const Models = require('../models');
const { Op } = require('sequelize');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];

// Multer storage for fuel bill / receipt photos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadDir;
    if (config.FILE_UPLOAD_PATH && fs.existsSync(config.FILE_UPLOAD_PATH)) {
      uploadDir = path.join(config.FILE_UPLOAD_PATH, 'image', 'fuel_receipts');
    } else {
      uploadDir = path.join(__dirname, '..', 'uploads', 'fuel_receipts');
    }
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, 'fuel_' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Helper: Haversine distance in KM
function getHaversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

module.exports = {
  uploadReceipt: upload.single('receipt'),

  // 1. Fleet-wide KPI Fuel Summary & Loss Statistics
  getFuelSummary: async (req, res) => {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const logs = await Models.fuelLog.findAll({
        where: {
          fill_date: { [Op.gte]: thirtyDaysAgo }
        },
        raw: true
      });

      let totalFuelCost = 0;
      let totalLitersFilled = 0;
      let mileageSum = 0;
      let mileageCount = 0;
      let verifiedCount = 0;
      let flaggedCount = 0;

      for (const log of logs) {
        totalFuelCost += parseFloat(log.total_cost || 0);
        totalLitersFilled += parseFloat(log.liters_filled || 0);
        if (log.calculated_mileage && parseFloat(log.calculated_mileage) > 0) {
          mileageSum += parseFloat(log.calculated_mileage);
          mileageCount++;
        }
        if (log.audit_status === 'VERIFIED') verifiedCount++;
        if (log.audit_status === 'FLAGGED_SUSPICIOUS') flaggedCount++;
      }

      const averageMileage = mileageCount > 0 ? (mileageSum / mileageCount).toFixed(2) : 0;

      // Fuel alerts stats
      const alerts = await Models.fuelAlert.findAll({
        where: { status: 'OPEN' },
        raw: true
      });

      let suspectedLossCost = 0;
      let suspectedLitersWasted = 0;
      for (const a of alerts) {
        suspectedLossCost += parseFloat(a.estimated_loss_cost || 0);
        suspectedLitersWasted += parseFloat(a.liters_wasted || 0);
      }

      // Total vehicles with fuel tracking
      const totalVehicles = await Models.vehicleMaster.count();

      return res.status(200).json({
        success: true,
        summary: {
          totalFuelCost: Math.round(totalFuelCost),
          totalLitersFilled: Math.round(totalLitersFilled * 10) / 10,
          averageFleetMileage: parseFloat(averageMileage),
          suspectedLossCost: Math.round(suspectedLossCost),
          suspectedLitersWasted: Math.round(suspectedLitersWasted * 10) / 10,
          activeAlertsCount: alerts.length,
          verifiedLogsCount: verifiedCount,
          flaggedLogsCount: flaggedCount,
          totalVehicles
        }
      });
    } catch (error) {
      console.error('getFuelSummary Error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // 2. Fetch fuel logs with filtering (vehicle, date range, audit status)
  getFuelLogs: async (req, res) => {
    try {
      const { vehicle_id, audit_status, startDate, endDate, limit = 50, offset = 0 } = req.query;
      const where = {};

      if (vehicle_id) where.vehicle_id = vehicle_id;
      if (audit_status) where.audit_status = audit_status;
      if (startDate && endDate) {
        where.fill_date = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }

      const logs = await Models.fuelLog.findAndCountAll({
        where,
        include: [
          {
            model: Models.vehicleMaster,
            as: 'vehicle',
            attributes: ['id', 'vehicle_no', 'box_id', 'fuel_type', 'tank_capacity', 'expected_mileage']
          },
          {
            model: Models.driverMaster,
            as: 'driver',
            attributes: ['id', 'driver_name', 'contact_no'],
            required: false
          }
        ],
        order: [['fill_date', 'DESC']],
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10)
      });

      return res.status(200).json({
        success: true,
        total: logs.count,
        data: logs.rows
      });
    } catch (error) {
      console.error('getFuelLogs Error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // 3. Save a new fuel log entry with Automated Anti-Theft GPS Audit
  saveFuelLog: async (req, res) => {
    try {
      const {
        vehicle_id,
        driver_id,
        fill_date,
        liters_filled,
        rate_per_liter,
        total_cost,
        fuel_station,
        odometer_km,
        created_by,
        remarks
      } = req.body;

      if (!vehicle_id || !liters_filled || !rate_per_liter) {
        return res.status(400).json({ success: false, message: 'Missing required fuel fields' });
      }

      const vehicle = await Models.vehicleMaster.findByPk(vehicle_id);
      if (!vehicle) {
        return res.status(404).json({ success: false, message: 'Vehicle not found' });
      }

      const litersNum = parseFloat(liters_filled);
      const rateNum = parseFloat(rate_per_liter);
      const totalCostNum = total_cost ? parseFloat(total_cost) : litersNum * rateNum;
      const currentFillDate = fill_date ? new Date(fill_date) : new Date();
      const currentOdo = odometer_km ? parseFloat(odometer_km) : null;

      // Find previous fuel log for this vehicle
      const previousLog = await Models.fuelLog.findOne({
        where: { vehicle_id },
        order: [['fill_date', 'DESC']]
      });

      let prevOdo = null;
      let gpsDistanceKm = 0;
      let calculatedMileage = null;
      let mileageVariance = null;
      let auditStatus = 'VERIFIED';
      let auditFlagReason = null;

      const expectedMileage = parseFloat(vehicle.expected_mileage) || 4.5;
      const tankCapacity = parseFloat(vehicle.tank_capacity) || 150;

      // Calculate distance from previous fill-up
      if (previousLog) {
        prevOdo = previousLog.odometer_km ? parseFloat(previousLog.odometer_km) : null;

        // Try GPS distance first from travel_histories
        if (vehicle.box_id && Models.travelHistory) {
          const gpsPoints = await Models.travelHistory.findAll({
            attributes: ['latitude', 'longitude'],
            where: {
              box_id: vehicle.box_id,
              recorded_at: {
                [Op.gte]: previousLog.fill_date,
                [Op.lte]: currentFillDate
              }
            },
            order: [['recorded_at', 'ASC']],
            raw: true
          });

          if (gpsPoints.length > 1) {
            for (let i = 1; i < gpsPoints.length; i++) {
              gpsDistanceKm += getHaversineDistanceKm(
                gpsPoints[i - 1].latitude,
                gpsPoints[i - 1].longitude,
                gpsPoints[i].latitude,
                gpsPoints[i].longitude
              );
            }
            gpsDistanceKm = Math.round(gpsDistanceKm * 10) / 10;
          }
        }

        // Use odometer distance if GPS points are unavailable
        let distanceTraveled = gpsDistanceKm;
        if (distanceTraveled <= 0 && currentOdo && prevOdo && currentOdo > prevOdo) {
          distanceTraveled = currentOdo - prevOdo;
        }

        if (distanceTraveled > 0 && litersNum > 0) {
          calculatedMileage = Math.round((distanceTraveled / litersNum) * 100) / 100;
          mileageVariance = Math.round(((calculatedMileage - expectedMileage) / expectedMileage) * 1000) / 10;
        }
      }

      // ⭐ AUDIT CHECKS:
      // 1. Tank Overflow / Fake Invoice Check
      if (litersNum > tankCapacity * 1.05) {
        auditStatus = 'FLAGGED_SUSPICIOUS';
        auditFlagReason = `Filled ${litersNum}L exceeds vehicle tank capacity of ${tankCapacity}L!`;

        await Models.fuelAlert.create({
          vehicle_id,
          alert_type: 'TANK_OVERFLOW_SUSPECT',
          severity: 'HIGH',
          liters_wasted: litersNum - tankCapacity,
          estimated_loss_cost: Math.round((litersNum - tankCapacity) * rateNum),
          details: `Bill of ${litersNum}L submitted for vehicle ${vehicle.vehicle_no} having max capacity ${tankCapacity}L.`,
          status: 'OPEN',
          event_time: currentFillDate
        });
      }
      // 2. High Consumption / Siphoning Theft Check (Over 30% drop below expected mileage)
      else if (calculatedMileage !== null && calculatedMileage < expectedMileage * 0.7) {
        auditStatus = 'FLAGGED_SUSPICIOUS';
        const expectedLiters = (gpsDistanceKm || (currentOdo - prevOdo)) / expectedMileage;
        const wastedLiters = Math.max(0, Math.round((litersNum - expectedLiters) * 10) / 10);
        const financialLoss = Math.round(wastedLiters * rateNum);

        auditFlagReason = `Abnormal mileage: ${calculatedMileage} km/L vs benchmark ${expectedMileage} km/L (${Math.abs(mileageVariance)}% drop). Suspected fuel siphoning or fake claim.`;

        await Models.fuelAlert.create({
          vehicle_id,
          alert_type: 'SUSPECTED_THEFT',
          severity: 'HIGH',
          liters_wasted: wastedLiters,
          estimated_loss_cost: financialLoss,
          details: `Vehicle ${vehicle.vehicle_no} traveled ${gpsDistanceKm || (currentOdo - prevOdo)} km on ${litersNum}L (yielded ${calculatedMileage} km/L vs expected ${expectedMileage} km/L). Estimated loss: ₹${financialLoss}.`,
          status: 'OPEN',
          event_time: currentFillDate
        });
      }

      const receiptImage = req.file ? req.file.filename : null;

      const newLog = await Models.fuelLog.create({
        vehicle_id,
        driver_id: driver_id || null,
        fill_date: currentFillDate,
        liters_filled: litersNum,
        rate_per_liter: rateNum,
        total_cost: totalCostNum,
        fuel_station: fuel_station || 'Unknown Pump',
        odometer_km: currentOdo,
        previous_odometer_km: prevOdo,
        gps_distance_km: gpsDistanceKm > 0 ? gpsDistanceKm : null,
        calculated_mileage: calculatedMileage,
        expected_mileage: expectedMileage,
        mileage_variance_percent: mileageVariance,
        audit_status: auditStatus,
        audit_flag_reason: auditFlagReason,
        receipt_image: receiptImage,
        created_by: created_by || 'Admin',
        remarks: remarks || ''
      });

      return res.status(201).json({
        success: true,
        message: 'Fuel log saved successfully',
        data: newLog
      });
    } catch (error) {
      console.error('saveFuelLog Error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // 4. Fetch Fuel Alerts (Theft, Excess Idling, Fake Invoices)
  getFuelAlerts: async (req, res) => {
    try {
      const { status = 'OPEN', vehicle_id } = req.query;
      const where = {};
      if (status && status !== 'ALL') where.status = status;
      if (vehicle_id) where.vehicle_id = vehicle_id;

      const alerts = await Models.fuelAlert.findAll({
        where,
        include: [
          {
            model: Models.vehicleMaster,
            as: 'vehicle',
            attributes: ['id', 'vehicle_no', 'box_id', 'fuel_type', 'owner_name']
          }
        ],
        order: [['event_time', 'DESC']]
      });

      return res.status(200).json({
        success: true,
        data: alerts
      });
    } catch (error) {
      console.error('getFuelAlerts Error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // 5. Resolve or Dismiss an Alert
  resolveFuelAlert: async (req, res) => {
    try {
      const { id, status, resolved_by, resolution_notes } = req.body;
      if (!id || !status) {
        return res.status(400).json({ success: false, message: 'Alert ID and status are required' });
      }

      const alert = await Models.fuelAlert.findByPk(id);
      if (!alert) {
        return res.status(404).json({ success: false, message: 'Alert not found' });
      }

      await alert.update({
        status,
        resolved_by: resolved_by || 'Admin',
        resolution_notes: resolution_notes || ''
      });

      return res.status(200).json({
        success: true,
        message: `Alert marked as ${status}`,
        data: alert
      });
    } catch (error) {
      console.error('resolveFuelAlert Error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // 6. Delete fuel log
  deleteFuelLog: async (req, res) => {
    try {
      const { id } = req.body;
      if (!id) return res.status(400).json({ success: false, message: 'Log ID required' });

      await Models.fuelLog.destroy({ where: { id } });
      return res.status(200).json({ success: true, message: 'Fuel record deleted' });
    } catch (error) {
      console.error('deleteFuelLog Error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  // 7. Update Vehicle Fuel Calibration Profile (Capacity, Benchmark Mileage)
  updateVehicleFuelProfile: async (req, res) => {
    try {
      const { vehicle_id, fuel_type, tank_capacity, expected_mileage } = req.body;
      if (!vehicle_id) return res.status(400).json({ success: false, message: 'Vehicle ID required' });

      const vehicle = await Models.vehicleMaster.findByPk(vehicle_id);
      if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });

      await vehicle.update({
        fuel_type: fuel_type || vehicle.fuel_type,
        tank_capacity: tank_capacity || vehicle.tank_capacity,
        expected_mileage: expected_mileage || vehicle.expected_mileage
      });

      return res.status(200).json({
        success: true,
        message: 'Vehicle fuel profile updated successfully',
        data: vehicle
      });
    } catch (error) {
      console.error('updateVehicleFuelProfile Error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  }
};
