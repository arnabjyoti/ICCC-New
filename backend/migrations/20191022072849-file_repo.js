'use strict';

module.exports = {
  up: (queryInterface, type) => {
    return queryInterface.createTable('file_repo', {
      id: {
        type: type.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    project_id: type.INTEGER,
    file_path: {
        type: type.STRING,
        default: 'assets/images/project_file_repo/project_preview.jpg'
    },
    description: type.STRING,
    isPreview: {
        type: type.BOOLEAN,
        default: false
    },
    isActive: type.STRING,        
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

  down: (queryInterface, type) => {
    return queryInterface.dropTable('file_repo');
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.
    
      Example:
      return queryInterface.dropTable('users');
    */
  }
};
