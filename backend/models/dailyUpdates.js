'use strict';

module.exports = (sequelize, DataTypes) => {

    const DailyUpdates = sequelize.define('dailyUpdates', {

        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },

        vehicleId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        routeNo: DataTypes.STRING,

        driverId: {
            type: DataTypes.INTEGER
        },

        operatorId: {
            type: DataTypes.INTEGER
        },

        date: DataTypes.STRING,
        timesheetNo: DataTypes.STRING,

        omr: DataTypes.STRING,
        cmr: DataTypes.STRING,

        totalOperated: DataTypes.STRING,
        totalOperatedAtBreakdown: DataTypes.STRING,

        osoc: DataTypes.STRING,
        csoc: DataTypes.STRING,
        consumedSoc: DataTypes.STRING,

        targetedTrip: DataTypes.STRING,
        noOfTrip: DataTypes.STRING,

        currentStatus: DataTypes.STRING,
        startTime: DataTypes.STRING,
        stopTime: DataTypes.STRING,

        placeOfBreakdown: DataTypes.STRING,
        causeOfBreakdown: DataTypes.STRING,

        remarks: DataTypes.STRING,
        status: DataTypes.STRING

    }, {
        timestamps: true,
        tableName: "daily_updates"
    });


    DailyUpdates.associate = function (models) {

        DailyUpdates.belongsTo(models.vehicleMaster, {
            foreignKey: "vehicleId",
            as: "vehicle"
        });

        DailyUpdates.belongsTo(models.vehicleRoutesMaster, {
            foreignKey: "routeNo",
            targetKey: "routeNo",
            as: "route"
        });

        DailyUpdates.belongsTo(models.driverMaster, {
            foreignKey: "driverId",
            as: "driver"
        });

        DailyUpdates.belongsTo(models.operatorMaster, {
            foreignKey: "operatorId",
            as: "operator"
        });

    };

    return DailyUpdates;

};