const vehicleMasterModel = require("../models").vehicleMaster;
const Op = require("sequelize").Op;
const { sequelize } = require("../models");
const { Sequelize, fn, literal } = require("sequelize");

const parseIntegerOrNull = (val) => {
  if (val === undefined || val === null || val === "" || isNaN(parseInt(val, 10))) return null;
  return parseInt(val, 10);
};

const parseFloatOrNull = (val) => {
  if (val === undefined || val === null || val === "" || isNaN(parseFloat(val))) return null;
  return parseFloat(val);
};

module.exports = {

  saveVehicle(req, res) {
    console.log("vehicle data", req.body);

    try {

      const data = {
        vehicle_no: req.body.vehicle_no ? String(req.body.vehicle_no).trim() : null,
        division: req.body.division,
        vehicle_type: req.body.vehicle_type,
        operates_on: req.body.operates_on || "Fuel",
        capacity: parseIntegerOrNull(req.body.capacity),
        owner_name: req.body.owner_name,
        route_id: parseIntegerOrNull(req.body.route_id),
        operator_id: parseIntegerOrNull(req.body.operator_id),
        driver_id: parseIntegerOrNull(req.body.driver_id),
        box_id: req.body.box_id,
        speed: req.body.speed,
        status: req.body.status,
        location: req.body.location,
        distance: req.body.distance,
        last_update: req.body.last_update,
        status_flag: "Active"
      };

      if (req.body.fuel_type !== undefined) data.fuel_type = req.body.fuel_type;
      if (req.body.tank_capacity !== undefined) data.tank_capacity = parseFloatOrNull(req.body.tank_capacity);
      if (req.body.expected_mileage !== undefined) data.expected_mileage = parseFloatOrNull(req.body.expected_mileage);

      vehicleMasterModel
        .create(data)
        .then((vehicle) => {

          console.log("vehicle saved", vehicle);

          return res.status(200).send({
            message: "Success",
            vehicle
          });

        })
        .catch((err) => {

          console.log("DB error:", err);

          res.status(500).send({
            message: "Database error",
            error: err.message
          });

        });

    } catch (err) {

      console.log("Server error:", err);

      res.status(500).send({
        message: "Server error",
        error: err.message
      });

    }

  },


  async updateVehicle(req, res) {

    try {

      const {
        id,
        vehicle_id,
        vehicle_no,
        division,
        vehicle_type,
        operates_on,
        capacity,
        owner_name,
        route_id,
        operator_id,
        driver_id,
        box_id,
        speed,
        status,
        location,
        distance,
        last_update,
        fuel_type,
        tank_capacity,
        expected_mileage
      } = req.body;

      const targetId = parseIntegerOrNull(id || vehicle_id);
      const targetVehicleNo = vehicle_no ? String(vehicle_no).trim() : null;
      const targetBoxId = box_id ? String(box_id).trim() : null;

      let vehicle = null;
      if (targetId) {
        vehicle = await vehicleMasterModel.findByPk(targetId);
      }
      if (!vehicle && targetVehicleNo) {
        vehicle = await vehicleMasterModel.findOne({ where: { vehicle_no: targetVehicleNo } });
      }
      if (!vehicle && targetBoxId) {
        vehicle = await vehicleMasterModel.findOne({ where: { box_id: targetBoxId } });
      }

      const updateData = {};

      if (division !== undefined) updateData.division = division;
      if (vehicle_type !== undefined) updateData.vehicle_type = vehicle_type;
      if (operates_on !== undefined) updateData.operates_on = operates_on || "Fuel";
      if (capacity !== undefined) updateData.capacity = parseIntegerOrNull(capacity);
      if (owner_name !== undefined) updateData.owner_name = owner_name;

      if (route_id !== undefined) updateData.route_id = parseIntegerOrNull(route_id);
      if (operator_id !== undefined) updateData.operator_id = parseIntegerOrNull(operator_id);
      if (driver_id !== undefined) updateData.driver_id = parseIntegerOrNull(driver_id);

      if (box_id !== undefined) updateData.box_id = box_id;
      if (speed !== undefined) updateData.speed = speed;
      if (status !== undefined) updateData.status = status;
      if (location !== undefined) updateData.location = location;
      if (distance !== undefined) updateData.distance = distance;
      if (last_update !== undefined) updateData.last_update = last_update;

      if (fuel_type !== undefined) updateData.fuel_type = fuel_type;
      if (tank_capacity !== undefined) updateData.tank_capacity = parseFloatOrNull(tank_capacity);
      if (expected_mileage !== undefined) updateData.expected_mileage = parseFloatOrNull(expected_mileage);

      if (vehicle) {
        await vehicle.update(updateData);
        return res.status(200).send({
          message: "Vehicle updated successfully",
          vehicle
        });
      } else {
        if (!targetVehicleNo) {
          return res.status(400).send({
            message: "Vehicle ID or Vehicle Number is required"
          });
        }
        updateData.vehicle_no = targetVehicleNo;
        updateData.status_flag = "Active";
        const newVehicle = await vehicleMasterModel.create(updateData);
        return res.status(200).send({
          message: "Vehicle updated successfully",
          vehicle: newVehicle
        });
      }

    } catch (err) {

      console.log("DB error in updateVehicle:", err);

      res.status(500).send({
        message: "Database error",
        error: err.message
      });

    }

  },


  deleteVehicle(req, res) {

    let data = req.body.requestObject;

    vehicleMasterModel
      .update({ status_flag: "Inactive" }, { where: { id: data.id } })
      .then(() => {

        return res.status(200).send({
          message: "Success"
        });

      })
      .catch((err) => {

        console.log("err", err);

      });

  },


  getVehicleMaster(req, res) {

  vehicleMasterModel.findAll({

    // where: { status: "Active" },

    attributes: [
      "id",
      "vehicle_no",
      "box_id",
      "division",
      "vehicle_type",
      "operates_on",
      "capacity",
      "owner_name",
      "route_id",
      "operator_id",
      "driver_id",
      "fuel_type",
      "tank_capacity",
      "expected_mileage"
    ],

    include: [

      {
        model: require("../models").operatorMaster,
        as: "operator",
        attributes: ["id", "operator_id", "operator_name", "contact_no"]
      },

      {
        model: require("../models").driverMaster,
        as: "driver",
        attributes: ["id", "driver_id", "driver_name", "contact_no"]
      },

      {
        model: require("../models").vehicleRoutesMaster,
        as: "route",
        attributes: ["id", "routeNo", "routeName"]
      }

    ],

    order: [["vehicle_no", "ASC"]],
    raw: true,
    nest: true

  })
  .then((vehicles) => {

    return res.status(200).send(vehicles);

  })
  .catch((error) => {

    console.log(error);
    return res.status(400).send(error);

  });

}

};