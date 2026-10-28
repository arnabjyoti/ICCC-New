const operatorMasterModel = require("../models").operatorMaster;
const Op = require("sequelize").Op;
const { sequelize } = require("../models");
const { Sequelize, fn, literal } = require("sequelize");

const multer = require("multer");
const fs = require("fs");
const path = require("path");

const env = process.env.NODE_ENV || "development";
const config = require(__dirname + "/../config/config.json")[env];

module.exports = {

  upload_operator_image: multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        const dest = path.join(config.FILE_UPLOAD_PATH, "image", "operator");
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        cb(null, dest);
      },
      filename: (req, file, cb) => {
        cb(null, "operator_" + Date.now() + path.extname(file.originalname));
      },
    }),
  }),

  saveOperator(req, res) {
    try {
      const { operator_id, operator_name, designation } = req.body;
      if (!operator_id || !operator_name || !designation) {
        return res.status(400).send({
          message: "Supervisor ID, Full Name, and Designation are required fields."
        });
      }

      const data = {
        operator_id: req.body.operator_id,
        operator_name: req.body.operator_name,
        designation: req.body.designation,
        contact_no: req.body.contact_no,
        aadhaar: req.body.aadhaar,
        pan: req.body.pan,
        voter: req.body.voter,
        license_no: req.body.license_no,
        address: req.body.address,
        status: "Active",
        photo: req.file ? `image/operator/${req.file.filename}` : null,
      };

      operatorMasterModel
        .create(data)
        .then(() => {
          res.status(200).send({ message: "Success" });
        })
        .catch((err) => {
          console.log("DB error:", err);
          res.status(500).send({ message: "Database error" });
        });

    } catch (err) {
      console.log("Server error:", err);
      res.status(500).send({ message: "Server error" });
    }
  },

  updateOperator(req, res) {
    try {

      const {
        id,
        operator_id,
        operator_name,
        designation,
        contact_no,
        aadhaar,
        pan,
        voter,
        license_no,
        address,
        old_photo,
      } = req.body;

      if (!id) {
        return res.status(400).send({ message: "Operator ID is required" });
      }

      if (!operator_id || !operator_name || !designation) {
        return res.status(400).send({
          message: "Supervisor ID, Full Name, and Designation are required fields."
        });
      }

      let photoPath = old_photo;

      if (req.file) {

        photoPath = `image/operator/${req.file.filename}`;

        if (old_photo) {

          const fullOldPath = path.join(config.FILE_UPLOAD_PATH, old_photo);

          if (fs.existsSync(fullOldPath)) {
            fs.unlinkSync(fullOldPath);
          }

        }
      }

      const updateData = {
        operator_id,
        operator_name,
        designation,
        contact_no,
        aadhaar,
        pan,
        voter,
        license_no,
        address,
        photo: photoPath,
      };

      operatorMasterModel
        .update(updateData, { where: { id } })
        .then(() => {
          return res
            .status(200)
            .send({ message: "Operator updated successfully" });
        })
        .catch((err) => {
          console.log("DB error:", err);
          res.status(500).send({ message: "Database error" });
        });

    } catch (err) {
      console.log("Server error:", err);
      res.status(500).send({ message: "Server error" });
    }
  },

  deleteOperator(req, res) {

    let data = req.body.requestObject;

    operatorMasterModel
      .update({ status: "Inactive" }, { where: { id: data.id } })
      .then(() => {
        return res.status(200).send({ message: "Success" });
      })
      .catch((err) => {
        console.log("err", err);
      });

  },

  getOperator(req, res) {

    operatorMasterModel
      .findAll({
        where: { status: "Active" },
        attributes: [
          "id",
          "operator_id",
          "operator_name",
          "designation",
          "contact_no",
          "aadhaar",
          "pan",
          "voter",
          "license_no",
          "address",
          "photo",
          "status",
        ],
        order: [["operator_name", "ASC"]],
        raw: true,
      })
      .then((operators) => {
        return res.status(200).send(operators);
      })
      .catch((error) => {
        console.log(error);
        return res.status(400).send(error);
      });

  },

};