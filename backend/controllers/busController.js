const async = require("async");
const bcrypt = require("bcrypt");
var request = require("request");
const Op = require("sequelize").Op;
const { col, where } = require('sequelize');
const { Sequelize, fn, literal } = require("sequelize");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const env = process.env.NODE_ENV || "development";
const config = require(__dirname + "/../config/config.json")[env];
// const { Sequelize, Model } = require('sequelize');
const { sequelize } = require("../models");
const { log } = require("console");
const e = require("express");
const dailyUpdatesModel = require("../models").dailyUpdates;


const vehicleMasterModel = require("../models").vehicleMaster;

module.exports = {
getBusList(req, res) {
    const reqDate = req.query.date;
    let filterDate;

    if (reqDate) {
      const [yyyy, mm, dd] = reqDate.split("-");
      filterDate = `${yyyy}-${mm}-${dd}`;
    } else {
      filterDate = null;
    }

    console.log("filterDate", filterDate);

    const sql = `
SELECT 
    vm.id,
    vm.vehicle_no,
    vm.vehicle_type,
    vm.division,
    vm.capacity,
    vm.owner_name,
    vm.status,
    vm.createdAt,
    vm.updatedAt,

    -- Driver
    dm.id AS driver_actual_id,
    dm.driver_name,
    dm.contact_no AS driver_contact_no,
    dm.driver_id,

    -- Operator
    om.id AS operator_actual_id,
    om.operator_name,
    om.contact_no AS operator_contact_no,

    -- Route
    vr.id AS routeId,
    vr.routeNo,
    vr.routeName,
    vr.depot,
    vr.start,
    vr.end,
    vr.via,
    vr.routeDistance,

    -- Latest Daily Update
    du.id AS dailyUpdateId,
    du.currentStatus,
    du.noOfTrip,
    du.createdAt AS lastUpdatedAt

FROM vehicle_master vm

-- Route Join
LEFT JOIN vehicle_routes_master vr 
    ON vm.route_id = vr.id
    AND vr.status = 'Active'

-- Driver Join
LEFT JOIN driver_master dm 
    ON vm.driver_id = dm.id

-- Operator Join
LEFT JOIN operator_master om 
    ON vm.operator_id = om.id

-- Latest Daily Update Join
LEFT JOIN daily_updates du 
    ON du.id = (
        SELECT d1.id
        FROM daily_updates d1
        WHERE d1.vehicleId = vm.id
        ORDER BY d1.createdAt DESC
        LIMIT 1
    )


ORDER BY vm.id DESC;
`;

    const replacements = filterDate ? [filterDate, filterDate] : [];

    sequelize
      .query(sql, {
        replacements,
        type: sequelize.QueryTypes.SELECT,
      })
      .then((bus) => {
        return res.status(200).send(bus);
      })
      .catch((error) => {
        console.log(error);
        return res.status(400).send(error);
      });
  },


  getBusData(req, res) {
    const busId = req.body.busId;

    const sql = `
    SELECT 
    vm.id,
    vm.vehicle_no,
    vm.route_id,
    vm.division,
    vm.vehicle_type,
    vm.capacity,
    vm.owner_name,
    vm.status,
    vm.createdAt,
    vm.updatedAt,

    -- Driver
    dm.driver_name AS driverName,
    dm.contact_no AS driverContactNo,
    dm.driver_id AS driverId,
    dm.id AS driver_actual_id,

    -- Operator
    om.operator_name AS operatorName,
    om.contact_no AS operatorContactNo,
    om.id AS operator_actual_id,

    -- Route
    vr.routeNo,
    vr.start AS routeStart,
    vr.end AS routeEnd,
    vr.via AS routeVia,
    vr.depot AS routeDepot,
    vr.routeName,
    vr.routeDistance,
    vr.estimated_collection,

    -- Last CMR
    COALESCE(
        (
            SELECT du.cmr
            FROM daily_updates du
            WHERE du.vehicleId = vm.id
            ORDER BY du.createdAt DESC
            LIMIT 1
        ),
        0
    ) AS lastCmr

FROM vehicle_master vm

LEFT JOIN vehicle_routes_master vr 
    ON vm.route_id = vr.id

LEFT JOIN driver_master dm 
    ON vm.driver_id = dm.id

LEFT JOIN operator_master om 
    ON vm.operator_id = om.id

WHERE vm.id = :busId

LIMIT 1;

    `;

    sequelize
      .query(sql, {
        replacements: { busId },
        type: sequelize.QueryTypes.SELECT,
      })
      .then((bus) => {
        return res.status(200).send(bus.length ? bus[0] : {});
      })
      .catch((error) => {
        console.log(error);
        return res.status(400).send(error);
      });
  },


  async saveDailyUpdates(req, res) {
    log("saveDailyUpdates req.body");
    try {
      let data = req.body.requestObject;
      console.log("data", data);
      
      data.status = "Active";

      // 1️⃣ Get last timesheetNo
      const lastRecord = await dailyUpdatesModel.findOne({
        where: {
          timesheetNo: { [require('sequelize').Op.ne]: null }
        },
        order: [['id', 'DESC']],
        attributes: ['timesheetNo']
      });

      let nextNumber = 1;
      const prefix = 'ICCC-SKAP-';

      if (lastRecord && lastRecord.timesheetNo) {
        const lastNo = lastRecord.timesheetNo;   // ICCC-SKAP-7
        const parts = lastNo.split('-');
        const num = parseInt(parts[parts.length - 1], 10);

        if (!isNaN(num)) {
          nextNumber = num + 1;
        }
      }

      // 2️⃣ Set new timesheet number
      data.timesheetNo = prefix + nextNumber;

      // 3️⃣ Insert record
      const response = await dailyUpdatesModel.create(data);

      return res.status(200).send({
        message: "Success",
        id: response.id,
        timesheetNo: data.timesheetNo
      });

    } catch (err) {
      console.log("err", err);
      return res.status(500).send({ message: "Error saving data" });
    }
  },


  updateDailyUpdates(req, res) {
    let { requestObject, id } = req.body;

    console.log("requestObject", requestObject);
    console.log("id", id);

    let data = requestObject;

    dailyUpdatesModel
      .update(requestObject, { where: { id: id } })
      .then((response) => {
        return res.status(200).send({ message: "Success" });
      })
      .catch((err) => {
        console.log("err", err);
      });

    // dailyUpdatesModel
    //   .create(data)
    //   .then((response) => {
    //     return res.status(200).send({ message: "Success" });
    //   })
    //   .catch((err) => {
    //     console.log("err", err);
    //   });
  },

  async getOneTripDetails(req, res) {
    let { id } = req.body;

    console.log("id===>>", id);

    let sqlQuery = `
        SELECT  
    vm.id AS vehicleId,
    vm.driver_id AS driver_actual_id,
    vm.operator_id AS operator_actual_id,
    vm.*,

    vr.id AS routeId,
    vr.*,

    du.id AS dailyUpdateId,
    du.*,

    -- Driver details
    dm.driver_id AS driverId,
    dm.driver_name AS driverName,
    

    -- Operator details (replaces conductor)
    om.id AS operatorId,
    om.operator_name AS operatorName,
    om.contact_no AS operatorContactNo

FROM daily_updates AS du

INNER JOIN vehicle_master AS vm 
    ON vm.id = du.vehicleId

INNER JOIN vehicle_routes_master AS vr 
    ON vr.routeNo = du.routeNo

LEFT JOIN driver_master dm 
    ON vm.driver_id = dm.id

LEFT JOIN operator_master om 
    ON vm.operator_id = om.id

WHERE du.id = ?;
    `;

    try {
      const [results] = await sequelize.query(sqlQuery, {
        replacements: [id],
      });

      console.log("res =>", results);
      res.send(results);
    } catch (error) {
      console.error("Error executing query:", error);
      res.status(500).send({ error: "Failed to fetch data" });
    }
  },



}