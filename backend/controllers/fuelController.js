'use strict';

const Models = require('../models');
const { Op } = require('sequelize');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];

// Multer storage for fuel bill / receipt photos and odometer photos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const subfolder = file.fieldname === 'odometer_image' ? 'fuel_odometers' : 'fuel_receipts';
    let uploadDir;
    if (config.FILE_UPLOAD_PATH && fs.existsSync(config.FILE_UPLOAD_PATH)) {
      uploadDir = path.join(config.FILE_UPLOAD_PATH, 'image', subfolder);
    } else {
      uploadDir = path.join(__dirname, '..', 'uploads', subfolder);
    }
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const prefix = file.fieldname === 'odometer_image' ? 'odo_' : 'fuel_';
    cb(null, prefix + Date.now() + path.extname(file.originalname));
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
  uploadFuelImages: upload.fields([
    { name: 'odometer_image', maxCount: 1 },
    { name: 'receipt', maxCount: 1 }
  ]),
  uploadReceipt: upload.single('receipt'),

  // Get Last Refueling Info & Calibration for a specific vehicle
  getLastRefuelInfo: async (req, res) => {
    try {
      const { vehicle_id } = req.query;
      if (!vehicle_id) {
        return res.status(400).json({ success: false, message: 'Vehicle ID required' });
      }

      const vehicle = await Models.vehicleMaster.findByPk(vehicle_id);
      if (!vehicle) {
        return res.status(404).json({ success: false, message: 'Vehicle not found' });
      }

      const lastLog = await Models.fuelLog.findOne({
        where: { vehicle_id },
        order: [['fill_date', 'DESC'], ['id', 'DESC']]
      });

      return res.status(200).json({
        success: true,
        data: {
          vehicle_id: vehicle.id,
          vehicle_no: vehicle.vehicle_no,
          tank_capacity: parseFloat(vehicle.tank_capacity) || 150,
          expected_mileage: parseFloat(vehicle.expected_mileage) || 4.5,
          fuel_type: vehicle.fuel_type || 'Diesel',
          last_odometer_km: lastLog && lastLog.odometer_km ? parseFloat(lastLog.odometer_km) : null,
          last_fill_date: lastLog ? lastLog.fill_date : null
        }
      });
    } catch (error) {
      console.error('getLastRefuelInfo Error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

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

      const limitNum = (limit === 'all' || limit === '-1' || limit === '0') ? null : parseInt(limit, 10);
      const queryOptions = {
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
        order: [['fill_date', 'DESC']]
      };
      if (limitNum) {
        queryOptions.limit = limitNum;
        queryOptions.offset = parseInt(offset, 10) || 0;
      }

      const logs = await Models.fuelLog.findAndCountAll(queryOptions);

      const processedLogs = logs.rows.map(row => {
        const item = row.toJSON ? row.toJSON() : { ...row };
        const currOdo = item.odometer_km !== null && item.odometer_km !== undefined ? parseFloat(item.odometer_km) : null;
        const prevOdo = item.previous_odometer_km !== null && item.previous_odometer_km !== undefined ? parseFloat(item.previous_odometer_km) : null;
        
        // Ensure odometer_distance_km is calculated
        if (item.odometer_distance_km !== null && item.odometer_distance_km !== undefined) {
          item.odometer_distance_km = parseFloat(item.odometer_distance_km);
        } else if (currOdo !== null && prevOdo !== null && currOdo >= prevOdo) {
          item.odometer_distance_km = Math.round((currOdo - prevOdo) * 10) / 10;
        } else {
          item.odometer_distance_km = null;
        }

        if (item.gps_distance_km !== null && item.gps_distance_km !== undefined) {
          item.gps_distance_km = parseFloat(item.gps_distance_km);
        } else {
          item.gps_distance_km = null;
        }

        return item;
      });

      return res.status(200).json({
        success: true,
        total: logs.count,
        data: processedLogs
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
        return res.status(400).json({ success: false, message: 'Missing required fuel fields (vehicle, liters filled, rate)' });
      }

      // 1. Mandatory Odometer Image Check
      let odometerImage = null;
      let receiptImage = null;

      if (req.files) {
        if (req.files['odometer_image'] && req.files['odometer_image'][0]) {
          odometerImage = req.files['odometer_image'][0].filename;
        }
        if (req.files['receipt'] && req.files['receipt'][0]) {
          receiptImage = req.files['receipt'][0].filename;
        }
      } else if (req.file) {
        if (req.file.fieldname === 'odometer_image') {
          odometerImage = req.file.filename;
        } else {
          receiptImage = req.file.filename;
        }
      }

      if (!odometerImage) {
        return res.status(400).json({
          success: false,
          message: 'Odometer image is mandatory. Please upload an odometer photo.'
        });
      }

      // 2. Current Odometer Validation
      if (odometer_km === undefined || odometer_km === null || odometer_km === '' || isNaN(parseFloat(odometer_km))) {
        return res.status(400).json({
          success: false,
          message: 'Current odometer reading is mandatory.'
        });
      }

      const currentOdo = parseFloat(odometer_km);
      if (currentOdo < 0) {
        return res.status(400).json({
          success: false,
          message: 'Current odometer reading must be a positive value.'
        });
      }

      const vehicle = await Models.vehicleMaster.findByPk(vehicle_id);
      if (!vehicle) {
        return res.status(404).json({ success: false, message: 'Vehicle not found' });
      }

      const litersNum = parseFloat(liters_filled);
      const rateNum = parseFloat(rate_per_liter);
      const totalCostNum = total_cost ? parseFloat(total_cost) : litersNum * rateNum;
      const currentFillDate = fill_date ? new Date(fill_date) : new Date();

      const expectedMileage = parseFloat(vehicle.expected_mileage) || 4.5;
      const tankCapacity = parseFloat(vehicle.tank_capacity) || 150;

      // 3. Validation: Liters Filled cannot exceed Tank Capacity
      if (litersNum > tankCapacity) {
        return res.status(400).json({
          success: false,
          message: `Liters filled (${litersNum} L) cannot be greater than the vehicle tank capacity (${tankCapacity} L).`
        });
      }

      // Find previous fuel log for this vehicle
      const previousLog = await Models.fuelLog.findOne({
        where: { vehicle_id },
        order: [['fill_date', 'DESC'], ['id', 'DESC']]
      });

      let prevOdo = null;
      let gpsDistanceKm = 0;
      let calculatedMileage = null;
      let mileageVariance = null;
      let auditStatus = 'VERIFIED';
      let auditFlagReason = null;

      // 4. Validation: Current Odometer cannot be lower than previous reading
      if (previousLog && previousLog.odometer_km !== null && previousLog.odometer_km !== undefined) {
        prevOdo = parseFloat(previousLog.odometer_km);
        if (!isNaN(prevOdo) && currentOdo < prevOdo) {
          return res.status(400).json({
            success: false,
            message: `Current Odometer (${currentOdo} km) cannot be lower than the previous odometer reading (${prevOdo} km).`
          });
        }
      }

      // Calculate distance from previous fill-up
      let odometerDistanceKm = null;
      if (prevOdo !== null && currentOdo >= prevOdo) {
        odometerDistanceKm = Math.round((currentOdo - prevOdo) * 10) / 10;
      }

      if (previousLog) {
        // Calculate ground GPS distance from travel_histories
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

        // Distance used for calculating mileage:
        // Use odometer distance if available, otherwise GPS distance
        const distanceForMileage = (odometerDistanceKm !== null && odometerDistanceKm > 0)
          ? odometerDistanceKm
          : (gpsDistanceKm > 0 ? gpsDistanceKm : 0);

        if (distanceForMileage > 0 && litersNum > 0) {
          calculatedMileage = Math.round((distanceForMileage / litersNum) * 100) / 100;
          mileageVariance = Math.round(((calculatedMileage - expectedMileage) / expectedMileage) * 1000) / 10;
        }
      }

      const finalGpsDistanceKm = gpsDistanceKm > 0 ? gpsDistanceKm : null;

      // ⭐ AUDIT CHECKS:
      // 1. High Consumption / Siphoning Theft Check (Over 30% drop below expected mileage)
      if (calculatedMileage !== null && calculatedMileage < expectedMileage * 0.7) {
        auditStatus = 'FLAGGED_SUSPICIOUS';
        const effectiveDist = odometerDistanceKm || finalGpsDistanceKm || 0;
        const expectedLiters = effectiveDist / expectedMileage;
        const wastedLiters = Math.max(0, Math.round((litersNum - expectedLiters) * 10) / 10);
        const financialLoss = Math.round(wastedLiters * rateNum);

        auditFlagReason = `Abnormal mileage: ${calculatedMileage} km/L vs benchmark ${expectedMileage} km/L (${Math.abs(mileageVariance)}% drop). Suspected fuel siphoning or fake claim.`;

        await Models.fuelAlert.create({
          vehicle_id,
          alert_type: 'SUSPECTED_THEFT',
          severity: 'HIGH',
          liters_wasted: wastedLiters,
          estimated_loss_cost: financialLoss,
          details: `Vehicle ${vehicle.vehicle_no} traveled ${effectiveDist} km on ${litersNum}L (yielded ${calculatedMileage} km/L vs expected ${expectedMileage} km/L). Estimated loss: ₹${financialLoss}.`,
          status: 'OPEN',
          event_time: currentFillDate
        });
      }

      // 2. Odometer vs GPS Distance Mismatch Audit (Tampering check)
      if (auditStatus === 'VERIFIED' && odometerDistanceKm && finalGpsDistanceKm) {
        const diff = Math.abs(odometerDistanceKm - finalGpsDistanceKm);
        const maxDist = Math.max(odometerDistanceKm, finalGpsDistanceKm);
        if (diff > 35 && (diff / maxDist) > 0.35) {
          auditStatus = 'FLAGGED_SUSPICIOUS';
          auditFlagReason = `Distance Discrepancy: Odometer indicated ${odometerDistanceKm} km, but GPS recorded ${finalGpsDistanceKm} km (${Math.round(diff)} km discrepancy).`;
        }
      }

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
        odometer_distance_km: odometerDistanceKm,
        gps_distance_km: finalGpsDistanceKm,
        calculated_mileage: calculatedMileage,
        expected_mileage: expectedMileage,
        mileage_variance_percent: mileageVariance,
        audit_status: auditStatus,
        audit_flag_reason: auditFlagReason,
        receipt_image: receiptImage,
        odometer_image: odometerImage,
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
      const { vehicle_id, id, vehicle_no, box_id, fuel_type, tank_capacity, expected_mileage } = req.body;
      const targetId = vehicle_id || id;

      let vehicle = null;
      if (targetId) {
        vehicle = await Models.vehicleMaster.findByPk(targetId);
      }
      if (!vehicle && vehicle_no) {
        vehicle = await Models.vehicleMaster.findOne({ where: { vehicle_no } });
      }
      if (!vehicle && box_id) {
        vehicle = await Models.vehicleMaster.findOne({ where: { box_id } });
      }

      const parsedTank = (tank_capacity !== undefined && tank_capacity !== null && !isNaN(parseFloat(tank_capacity)) && parseFloat(tank_capacity) > 0)
        ? parseFloat(tank_capacity)
        : (vehicle && parseFloat(vehicle.tank_capacity) ? parseFloat(vehicle.tank_capacity) : 150);

      const parsedMileage = (expected_mileage !== undefined && expected_mileage !== null && !isNaN(parseFloat(expected_mileage)) && parseFloat(expected_mileage) > 0)
        ? parseFloat(expected_mileage)
        : (vehicle && parseFloat(vehicle.expected_mileage) ? parseFloat(vehicle.expected_mileage) : 4.5);

      if (!vehicle) {
        // If record does not exist in vehicle_master yet (e.g. GPS-telemetry vehicle), create it
        if (vehicle_no) {
          vehicle = await Models.vehicleMaster.create({
            vehicle_no,
            box_id: box_id || null,
            fuel_type: fuel_type || 'Diesel',
            tank_capacity: parsedTank,
            expected_mileage: parsedMileage,
            status: 'Active'
          });
          return res.status(200).json({
            success: true,
            message: 'Vehicle fuel profile calibrated successfully',
            data: vehicle
          });
        }
        return res.status(404).json({ success: false, message: 'Vehicle not found. Please provide vehicle_id or vehicle_no' });
      }

      await vehicle.update({
        fuel_type: fuel_type || vehicle.fuel_type || 'Diesel',
        tank_capacity: parsedTank,
        expected_mileage: parsedMileage
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
