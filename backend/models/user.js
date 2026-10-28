'use strict';

module.exports = (sequelize, type) => {
    const users = sequelize.define('users', {
        id: {
            type: type.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false
        },
        f_name: type.STRING,
        m_name: type.STRING,
        l_name: type.STRING,
        email: type.STRING,
        phone_no: type.STRING,
        address: type.STRING,
        role: type.STRING,
        station_assigned: type.STRING,
        avatar: {
            type: type.STRING,
            default: 'storage/default.png'
        },
        password: type.STRING,
        active: type.STRING,
    }, {});
    users.associate = function(models) {
        // associations can be defined here
    };
    return users;
};