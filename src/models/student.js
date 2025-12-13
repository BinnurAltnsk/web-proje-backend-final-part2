const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Student extends Model {
    static associate(models) {
      // User ile ilişki
      Student.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
      // Bölüm ile ilişki
      Student.belongsTo(models.Department, { foreignKey: 'departmentId', as: 'department' });
    }
  }

  Student.init({
    student_number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    gpa: {
      type: DataTypes.FLOAT,
      defaultValue: 0.0
    },
    cgpa: {
      type: DataTypes.FLOAT,
      defaultValue: 0.0
    },
    current_semester: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    }
  }, {
    sequelize,
    modelName: 'Student',
    tableName: 'students',
    underscored: true
  });

  return Student;
};