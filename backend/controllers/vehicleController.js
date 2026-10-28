const vehicleMasterModel = require("../models").vehicleMaster;
const Op = require("sequelize").Op;
const { route } = require("../app");
const { sequelize } = require("../models");
const { Sequelize, fn, literal } = require("sequelize");

module.exports = {

  saveVehicle(req, res) {
    console.log("vehicle data", req.body);

    try {

      const data = {
        vehicle_no: req.body.vehicle_no,
        division: req.body.division,
        vehicle_type: req.body.vehicle_type,
        capacity: req.body.capacity,
        owner_name: req.body.owner_name,
        route_id: req.body.route_id,
        operator_id: req.body.operator_id,
        driver_id: req.body.driver_id,
        box_id: req.body.box_id,
        speed: req.body.speed,
        status: req.body.status,
        location: req.body.location,
        distance: req.body.distance,
        last_update: req.body.last_update,
        status_flag: "Active"
      };

      vehicleMasterModel
        .create(data)
        .then((vehicle) => {

          console.log("vehicle saved", vehicle);

          return res.status(200).send({
            message: "Success"
          });

        })
        .catch((err) => {

          console.log("DB error:", err);

          res.status(500).send({
            message: "Database error"
          });

        });

    } catch (err) {

      console.log("Server error:", err);

      res.status(500).send({
        message: "Server error"
      });

    }

  },


  updateVehicle(req, res) {

    try {

      const {
        id,
        division,
        vehicle_type,
        capacity,
        owner_name,
        route_id,
        operator_name,
        driver_name,
        box_id,
        speed,
        status,
        location,
        distance,
        last_update
      } = req.body;

      if (!id) {

        return res.status(400).send({
          message: "Vehicle ID is required"
        });

      }

      const updateData = {
        division,
        vehicle_type,
        capacity,
        owner_name,
        route_id,
        operator_name,
        driver_name,
        box_id,
        speed,
        status,
        location,
        distance,
        last_update
      };

      vehicleMasterModel
        .update(updateData, { where: { id } })
        .then(() => {

          return res.status(200).send({
            message: "Vehicle updated successfully"
          });

        })
        .catch((err) => {

          console.log("DB error:", err);

          res.status(500).send({
            message: "Database error"
          });

        });

    } catch (err) {

      console.log("Server error:", err);

      res.status(500).send({
        message: "Server error"
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
      "capacity",
      "owner_name",
      "route_id",
      "operator_id",
      "driver_id"
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