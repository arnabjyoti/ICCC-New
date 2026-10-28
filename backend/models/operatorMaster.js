'use strict';

module.exports = (sequelize, DataTypes) => {

    const OperatorMaster = sequelize.define('operatorMaster', {

        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },

        operator_id: {
            type: DataTypes.STRING,
            unique: true
        },

        operator_name: DataTypes.STRING,
        designation: DataTypes.STRING,
        contact_no: DataTypes.STRING,

        aadhaar: DataTypes.STRING,
        pan: DataTypes.STRING,
        voter: DataTypes.STRING,

        license_no: DataTypes.STRING,
        license_expiry: DataTypes.STRING,

        address: DataTypes.STRING,
        photo: DataTypes.STRING,

        status: DataTypes.STRING

    }, {
        timestamps: true,
        tableName: "operator_master"
    });


    OperatorMaster.associate = function (models) {

        OperatorMaster.hasMany(models.vehicleMaster, {
            foreignKey: "operator_id",
            as: "vehicles"
        });

        OperatorMaster.hasMany(models.dailyUpdates, {
            foreignKey: "operatorId",
            as: "dailyUpdates"
        });

    };

    return OperatorMaster;

};