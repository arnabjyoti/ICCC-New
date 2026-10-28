'use strict';
module.exports = {
    up: (queryInterface, type) => {
        return queryInterface.createTable('roles', {
            id: {
                type: type.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            role: type.STRING,
            privilege_id: type.INTEGER,
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
        return queryInterface.dropTable('roles');
    }
};