'use strict';

module.exports = (sequelize, DataTypes) => {
    const FuelLog = sequelize.define('fuelLog', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        vehicle_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        driver_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        fill_date: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        liters_filled: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        rate_per_liter: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        total_cost: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        fuel_station: {
            type: DataTypes.STRING,
            allowNull: true
        },
        odometer_km: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true
        },
        previous_odometer_km: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true
        },
        gps_distance_km: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true
        },
        calculated_mileage: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true
        },
        expected_mileage: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true
        },
        mileage_variance_percent: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true
        },
        audit_status: {
            type: DataTypes.STRING,
            defaultValue: 'VERIFIED'
        },
        audit_flag_reason: {
            type: DataTypes.STRING,
            allowNull: true
        },
        receipt_image: {
            type: DataTypes.STRING,
            allowNull: true
        },
        created_by: {
            type: DataTypes.STRING,
            allowNull: true
        },
        remarks: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        timestamps: true,
        tableName: 'fuel_logs'
    });

    FuelLog.associate = function(models) {
        FuelLog.belongsTo(models.vehicleMaster, {
            foreignKey: 'vehicle_id',
            as: 'vehicle'
        });
        FuelLog.belongsTo(models.driverMaster, {
            foreignKey: 'driver_id',
            as: 'driver'
        });
    };

    return FuelLog;
};
