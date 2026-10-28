'use strict';

module.exports = (sequelize, DataTypes) => {
    const FuelAlert = sequelize.define('fuelAlert', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        vehicle_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        alert_type: {
            type: DataTypes.STRING,
            allowNull: false
        },
        severity: {
            type: DataTypes.STRING,
            defaultValue: 'MEDIUM'
        },
        liters_wasted: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true
        },
        estimated_loss_cost: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true
        },
        location: {
            type: DataTypes.STRING,
            allowNull: true
        },
        latitude: {
            type: DataTypes.DECIMAL(10, 6),
            allowNull: true
        },
        longitude: {
            type: DataTypes.DECIMAL(10, 6),
            allowNull: true
        },
        details: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        status: {
            type: DataTypes.STRING,
            defaultValue: 'OPEN'
        },
        resolved_by: {
            type: DataTypes.STRING,
            allowNull: true
        },
        resolution_notes: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        event_time: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        }
    }, {
        timestamps: true,
        tableName: 'fuel_alerts'
    });

    FuelAlert.associate = function(models) {
        FuelAlert.belongsTo(models.vehicleMaster, {
            foreignKey: 'vehicle_id',
            as: 'vehicle'
        });
    };

    return FuelAlert;
};
