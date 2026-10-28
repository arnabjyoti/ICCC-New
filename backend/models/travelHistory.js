'use strict';

module.exports = (sequelize, DataTypes) => {
  const TravelHistory = sequelize.define('travelHistory', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    box_id: {
      type: DataTypes.STRING,
      allowNull: false
    },
    vehicle_name: {
      type: DataTypes.STRING
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: false
    },
    longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: false
    },
    speed: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    vehicle_status: {
      type: DataTypes.STRING
    },
    location: {
      type: DataTypes.TEXT
    },
    recorded_at: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    tableName: 'travel_histories',
    timestamps: true,
    indexes: [
      {
        name: 'idx_travel_box_recorded',
        fields: ['box_id', 'recorded_at']
      }
    ]
  });

  return TravelHistory;
};