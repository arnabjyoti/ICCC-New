'use strict';

module.exports = {
    up: (queryInterface, type) => {
        return queryInterface.createTable('privilege', {
            id: {
                type: type.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            slug: {
                type: type.STRING,
                uniqueKey: true
            },
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
        return queryInterface.dropTable('privilege');
    }
};