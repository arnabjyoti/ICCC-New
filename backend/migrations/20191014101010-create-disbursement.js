'use strict';
module.exports = {
    up: (queryInterface, type) => {
        return queryInterface.createTable('disbursement', {
            id: {
                type: type.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            project_id: type.STRING,
            disburse_date: type.DATE,

            // amount: type.DECIMAL(10, 2),

            amount: type.STRING,
            note: type.STRING,
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
        return queryInterface.dropTable('disbursement');
    }
};