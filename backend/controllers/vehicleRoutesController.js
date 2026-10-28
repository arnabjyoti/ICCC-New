const vehicleRoutesModel = require("../models").vehicleRoutesMaster;
const Op = require("sequelize").Op;
const { sequelize } = require("../models");
const { Sequelize, fn, literal } = require("sequelize");

module.exports = {

  saveRoute(req, res) {

    console.log("route data", req.body);

    try {

      const data = {

        depot: req.body.depot,
        start: req.body.start,
        end: req.body.end,
        via: req.body.via,

        routeNo: req.body.routeNo,
        routeName: req.body.routeName,

        routeDistance: req.body.routeDistance,

        depot_to_start_distance: req.body.depot_to_start_distance,
        end_to_depot_distance: req.body.end_to_depot_distance,

        estimated_collection: req.body.estimated_collection,

        status: req.body.status

      };

      vehicleRoutesModel
        .create(data)
        .then((route) => {

          console.log("route saved", route);

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


  updateRoute(req, res) {

    try {

      const {

        id,
        depot,
        start,
        end,
        via,
        routeNo,
        routeName,
        routeDistance,
        depot_to_start_distance,
        end_to_depot_distance,
        estimated_collection,
        status

      } = req.body;


      if (!id) {

        return res.status(400).send({
          message: "Route ID is required"
        });

      }


      const updateData = {

        depot,
        start,
        end,
        via,
        routeNo,
        routeName,
        routeDistance,
        depot_to_start_distance,
        end_to_depot_distance,
        estimated_collection,
        status

      };


      vehicleRoutesModel
        .update(updateData, { where: { id } })
        .then(() => {

          return res.status(200).send({
            message: "Route updated successfully"
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


  deleteRoute(req, res) {

    let data = req.body.requestObject;

    vehicleRoutesModel
      .destroy({ where: { id: data.id } })
      .then(() => {

        return res.status(200).send({
          message: "Success"
        });

      })
      .catch((err) => {

        console.log("err", err);

        res.status(500).send({
          message: "Database error"
        });

      });

  },


  getVehicleRoutes(req, res) {

    vehicleRoutesModel
      .findAll({

        attributes: [
          "id",
          "depot",
          "start",
          "end",
          "via",
          "routeNo",
          "routeName",
          "routeDistance",
          "depot_to_start_distance",
          "end_to_depot_distance",
          "status"
        ],

        order: [["routeNo", "ASC"]],

        raw: true

      })

      .then((routes) => {

        return res.status(200).send(routes);

      })

      .catch((error) => {

        console.log(error);

        return res.status(400).send(error);

      });

  }

};