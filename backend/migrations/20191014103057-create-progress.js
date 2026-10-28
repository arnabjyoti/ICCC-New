'use strict';
module.exports = {
    up: (queryInterface, type) => {
        return queryInterface.createTable('progresses', {
            id: {
                type: type.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            project_id: type.STRING,
            progress_date: type.DATE,
            progress_percent: type.DECIMAL(5, 2),
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
    down: (queryInterface, type) => {
        return queryInterface.dropTable('progresses');
    }
};