'use strict';
module.exports = {
    up: (queryInterface, type) => {
        return queryInterface.createTable('users', {
            id: {
                type: type.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            name: type.STRING,
            email: type.STRING,
            phone_no: type.STRING,
            avatar: {
                type: type.STRING,
                default: 'storage/default.png'
            },
            password: type.STRING,
            temp_password: type.STRING,
            role: type.STRING,
            active: {
                type: type.BOOLEAN,
                default: true
            },
            rememberToken: type.STRING,
            createdAt: {
                allowNull: false,
                type: type.DATE
            },
            updatedAt: {
                allowNull: false,
                type: type.DATE
            }
        });
    },
    down: (queryInterface, Sequelize) => {
        return queryInterface.dropTable('users');
    }
};