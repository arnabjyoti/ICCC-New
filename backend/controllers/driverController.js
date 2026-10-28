const driverMasterModel = require("../models").driverMaster;
const models = require("../models");
const Op = require('sequelize').Op;
const { sequelize } = require("../models");
const { Sequelize, fn, literal } = require("sequelize");
const bcrypt = require("bcrypt");
const ensureDriverAppCredential = require("../services/ensureDriverAppCredential");

const multer = require("multer");
const fs = require("fs");
const path = require("path");
const env = process.env.NODE_ENV || "development";
const config = require(__dirname + "/../config/config.json")[env];

module.exports = {
  upload_driver_image: multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        const dest = path.join(config.FILE_UPLOAD_PATH, "image", "driver");
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        cb(null, dest);
      },
      filename: (req, file, cb) => {
        cb(null, "driver_" + Date.now() + path.extname(file.originalname));
      },
    }),
  }),

  upload_conductor_image: multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        const dest = path.join(config.FILE_UPLOAD_PATH, "image", "conductor");
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        cb(null, dest);
      },
      filename: (req, file, cb) => {
        cb(null, "conductor_" + Date.now() + path.extname(file.originalname));
      },
    }),
  }),



  async saveDriver(req, res) {
    console.log("reqqqqqqqqqqq", req.body);

    try {
      const { driver_id, driver_name, contact_no } = req.body;

      if (!driver_id || !driver_id.trim()) {
        return res.status(400).send({ message: "Driver ID is required." });
      }

      if (!driver_name || !driver_name.trim()) {
        return res.status(400).send({ message: "Driver Full Name is required." });
      }

      const trimmedContact = (contact_no || "").trim();
      if (!trimmedContact) {
        return res.status(400).send({ message: "Contact Number is required." });
      }

      if (!/^\d{10}$/.test(trimmedContact)) {
        return res.status(400).send({ message: "Contact Number must be exactly 10 digits." });
      }

      // Check unique contact number
      const existingContact = await driverMasterModel.findOne({
        where: { contact_no: trimmedContact }
      });
      if (existingContact) {
        return res.status(400).send({ message: "Contact number already registered with another driver." });
      }

      // Check unique driver_id
      const existingDriverId = await driverMasterModel.findOne({
        where: { driver_id: driver_id.trim() }
      });
      if (existingDriverId) {
        return res.status(400).send({ message: "Driver ID already exists." });
      }

      const data = {
        driver_id: driver_id.trim(),
        driver_name: driver_name.trim(),
        contact_no: trimmedContact,
        aadhaar: req.body.aadhaar,
        pan: req.body.pan,
        voter: req.body.voter,
        dl: req.body.dl,
        address: req.body.address,
        status: "Active",
        photo: req.file ? `image/driver/${req.file.filename}` : null,
      };
      const pinHash = await bcrypt.hash("1234", 12);
      await sequelize.transaction(async (transaction) => {
        const driver = await driverMasterModel.create(data, { transaction });
        await ensureDriverAppCredential(models, driver, transaction, pinHash);
      });
      return res.status(200).send({ message: "Success" });
    } catch (err) {
      console.log("Server error:", err);
      res.status(500).send({ message: "Server error" });
    }
  },

  async updateDriver(req, res) {
    try {
      const {
        id,
        driver_id,
        driver_name,
        contact_no,
        aadhaar,
        pan,
        voter,
        dl,
        address,
        old_photo,
      } = req.body;

      if (!id) {
        return res.status(400).send({ message: "Driver ID is required" });
      }

      if (!driver_name || !driver_name.trim()) {
        return res.status(400).send({ message: "Driver Full Name is required." });
      }

      let trimmedContact = (contact_no || "").trim();
      if (trimmedContact) {
        if (!/^\d{10}$/.test(trimmedContact)) {
          return res.status(400).send({ message: "Contact Number must be exactly 10 digits." });
        }
        const existingContact = await driverMasterModel.findOne({
          where: {
            contact_no: trimmedContact,
            id: { [Op.ne]: id }
          }
        });
        if (existingContact) {
          return res.status(400).send({ message: "Contact number already registered with another driver." });
        }
      }

      // keep old photo by default
      let photoPath = old_photo;

      // if new photo uploaded
      if (req.file) {
        photoPath = `image/driver/${req.file.filename}`;

        // delete old photo
        if (old_photo) {
          const fullOldPath = path.join(config.FILE_UPLOAD_PATH, old_photo);

          if (fs.existsSync(fullOldPath)) {
            fs.unlinkSync(fullOldPath);
          }
        }
      }

      const updateData = {
        driver_id,
        driver_name,
        contact_no: trimmedContact,
        aadhaar,
        pan,
        voter,
        dl,
        address,
        photo: photoPath,
      };

      driverMasterModel
        .update(updateData, { where: { id } })
        .then(() => {
          return res
            .status(200)
            .send({ message: "Driver updated successfully" });
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

  deleteDriver(req, res) {
    let data = req.body.requestObject;
    driverMasterModel
      .update({ status: "Inactive" }, { where: { id: data.id } })
      .then((response) => {
        return res.status(200).send({ message: "Success" });
      })
      .catch((err) => {
        console.log("err", err);
      });
  },

  getDriver(req, res) {
    console.log("here");

    driverMasterModel.findAll({
      where: { status: "Active" },
      attributes: [
        "id",
        "driver_id",
        "driver_name",
        "contact_no",
        "aadhaar",
        "pan",
        "voter",
        "dl",
        "address",
        "photo",
        "status",
      ],
      order: [["driver_name", "ASC"]],
      raw: true
    })
      .then((drivers) => {
        return res.status(200).send(drivers);
      })
      .catch((error) => {
        console.log(error);
        return res.status(400).send(error);
      });
  },


}