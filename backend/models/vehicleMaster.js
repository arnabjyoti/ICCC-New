'use strict';

module.exports = (sequelize, DataTypes) => {

    const VehicleMaster = sequelize.define('vehicleMaster', {

        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },

        vehicle_no: DataTypes.STRING,

        box_id: {
            type: DataTypes.STRING,
            allowNull: true
        },

        division: DataTypes.STRING,

        vehicle_type: DataTypes.STRING,
        capacity: DataTypes.INTEGER,
        owner_name: DataTypes.STRING,

        driver_id: {
            type: DataTypes.INTEGER
        },

        operator_id: {
            type: DataTypes.INTEGER
        },

        route_id: {
            type: DataTypes.INTEGER
        },

        vehicle_image_front: {
            type: DataTypes.STRING,
            defaultValue: "storage/default_vehicle.png"
        },

        vehicle_image_back: {
            type: DataTypes.STRING,
            defaultValue: "storage/default_vehicle.png"
        },

        gps_enabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },

        tracking_source: {
            type: DataTypes.STRING,
            defaultValue: "MANUAL"
        },

        status: DataTypes.STRING,

        fuel_type: {
            type: DataTypes.STRING,
            defaultValue: "Diesel"
        },

        tank_capacity: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 150.00
        },

        expected_mileage: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 4.50
        }

    }, {
        timestamps: true,
        tableName: "vehicle_master"
    });


    VehicleMaster.associate = function (models) {

        VehicleMaster.belongsTo(models.vehicleRoutesMaster, {
            foreignKey: "route_id",
            as: "route"
        });

        VehicleMaster.belongsTo(models.driverMaster, {
            foreignKey: "driver_id",
            as: "driver"
        });

        VehicleMaster.hasMany(models.dailyUpdates, {
            foreignKey: "vehicleId",
            as: "dailyUpdates"
        });
        VehicleMaster.belongsTo(models.operatorMaster, {
            foreignKey: "operator_id",
            as: "operator"
        });

        VehicleMaster.hasMany(models.fuelLog, {
            foreignKey: "vehicle_id",
            as: "fuelLogs"
        });

        VehicleMaster.hasMany(models.fuelAlert, {
            foreignKey: "vehicle_id",
            as: "fuelAlerts"
        });

    };

    return VehicleMaster;

};