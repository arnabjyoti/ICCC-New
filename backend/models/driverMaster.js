'use strict';

module.exports = (sequelize, DataTypes) => {

    const DriverMaster = sequelize.define('driverMaster', {

        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },

        driver_id: {
            type: DataTypes.STRING,
            unique: true
        },

        driver_name: DataTypes.STRING,
        contact_no: DataTypes.STRING,

        aadhaar: DataTypes.STRING,
        pan: DataTypes.STRING,
        voter: DataTypes.STRING,

        dl: DataTypes.STRING,
        licenseExpiryDriver: DataTypes.STRING,

        address: DataTypes.STRING,
        photo: DataTypes.STRING,

        status: DataTypes.STRING

    }, {
        timestamps: true,
        tableName: "driver_master"
    });


    DriverMaster.associate = function (models) {

        DriverMaster.hasMany(models.vehicleMaster, {
            foreignKey: "driver_id",
            as: "vehicles"
        });

        DriverMaster.hasMany(models.dailyUpdates, {
            foreignKey: "driverId",
            as: "dailyUpdates"
        });

    };

    return DriverMaster;

};