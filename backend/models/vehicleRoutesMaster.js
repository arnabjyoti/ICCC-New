'use strict';

module.exports = (sequelize, DataTypes) => {

    const VehicleRoutesMaster = sequelize.define('vehicleRoutesMaster', {

        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },

        depot: DataTypes.STRING,
        start: DataTypes.STRING,
        end: DataTypes.STRING,
        via: DataTypes.STRING,

        routeNo: {
            type: DataTypes.STRING,
            unique: true
        },

        routeName: DataTypes.STRING,
        routeDistance: DataTypes.STRING,

        depot_to_start_distance: DataTypes.STRING,
        end_to_depot_distance: DataTypes.STRING,

        estimated_collection: DataTypes.STRING,

        status: DataTypes.STRING

    }, {
        timestamps: true,
        tableName: "vehicle_routes_master"
    });


    VehicleRoutesMaster.associate = function (models) {

        VehicleRoutesMaster.hasMany(models.vehicleMaster, {
            foreignKey: "route_id",
            as: "vehicles"
        });

        VehicleRoutesMaster.hasMany(models.dailyUpdates, {
            foreignKey: "routeNo",
            sourceKey: "routeNo",
            as: "dailyUpdates"
        });

    };

    return VehicleRoutesMaster;

};