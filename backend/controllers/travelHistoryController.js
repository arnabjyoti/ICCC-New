const Models = require('../models');
const { Op } = require('sequelize');
const travelApi = require('../utils/travelHistoryApi');

// 1. Fetch from Database using BoxId and Date (for Route Replay)
exports.getVehicleHistoryByDate = async (req, res) => {
  try {
    const { box_id, date } = req.query;

    if (!box_id || !date) {
      return res.status(400).json({
        status: false,
        message: "box_id and date (YYYY-MM-DD) are required"
      });
    }

    const startDate = new Date(`${date}T00:00:00.000Z`);
    const endDate = new Date(`${date}T23:59:59.999Z`);

    const history = await Models.travelHistory.findAll({
      attributes: ['box_id', 'vehicle_name', 'latitude', 'longitude', 'speed', 'vehicle_status', 'location', 'recorded_at'],
      where: {
        box_id: box_id,
        recorded_at: {
          [Op.between]: [startDate, endDate]
        }
      },
      order: [['recorded_at', 'ASC']],
      raw: true
    });

    // Smart GPS Downsampling: retain all movement points while thinning repetitive stationary pings
    const formattedData = [];
    let consecutiveStopped = 0;

    for (let i = 0; i < history.length; i++) {
      const item = history[i];
      const isStopped = item.speed === 0 || item.vehicle_status === 'Stopped';

      if (isStopped) {
        consecutiveStopped++;
        // Retain start of stop, periodic status check (every 20th ping), and end of stop
        if (consecutiveStopped === 1 || consecutiveStopped % 20 === 0 || i === history.length - 1) {
          formattedData.push({
            BoxId: item.box_id,
            VehName: item.vehicle_name,
            Latitude: item.latitude,
            Longitude: item.longitude,
            Speed: item.speed,
            VehicleStatus: item.vehicle_status,
            Location: item.location,
            Lastdate: item.recorded_at
          });
        }
      } else {
        consecutiveStopped = 0;
        formattedData.push({
          BoxId: item.box_id,
          VehName: item.vehicle_name,
          Latitude: item.latitude,
          Longitude: item.longitude,
          Speed: item.speed,
          VehicleStatus: item.vehicle_status,
          Location: item.location,
          Lastdate: item.recorded_at
        });
      }
    }

    return res.status(200).json({
      status: true,
      data: formattedData
    });
  } catch (error) {
    console.error("fetchHistory Error:", error);
    return res.status(500).json({
      status: false,
      message: error.message
    });
  }
};

// 2. Existing Utility function
exports.fetchTravelHistory = async (req, res) => {
  try {
    const { imei_nos } = req.body;

    if (!imei_nos || !Array.isArray(imei_nos)) {
      return res.status(400).json({
        status: false,
        message: "imei_nos array is required"
      });
    }

    const data = await travelApi.getTravelHistory(imei_nos);

    return res.status(200).json({
      status: true,
      data: data
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message
    });
  }
};