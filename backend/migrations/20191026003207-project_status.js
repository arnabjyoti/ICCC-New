'use strict';

module.exports = {
    up: (queryInterface, type) => {
        return queryInterface.createTable('project_status', {
            id: {
                type: type.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            project_id: type.INTEGER,
            status: type.STRING,
            date_updated: type.STRING,
            user_updated: type.INTEGER,
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
        return queryInterface.dropTable('project_status');
    }
};