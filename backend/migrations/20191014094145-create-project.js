'use strict';
module.exports = {
    up: (queryInterface, type) => {
        return queryInterface.createTable('projects', {
            id: {
                type: type.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            code: type.STRING,
            name: type.STRING,
            description: type.STRING,
            assigned_to: type.STRING,
            initial_amount: type.DECIMAL(10, 2),
            total_disbursed_amount: type.DECIMAL(10, 2),
            avatar: {
                type: type.STRING,
                default: 'storage/default.png'
            },
            status: {
                type: type.BOOLEAN,
                default: true
            },
            planned_start: { type: 'DATETIME' },
            planned_end: { type: 'DATETIME' },
            actual_start: { type: 'DATETIME' },
            actual_end: { type: 'DATETIME' },
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
        return queryInterface.dropTable('projects');
    }
};