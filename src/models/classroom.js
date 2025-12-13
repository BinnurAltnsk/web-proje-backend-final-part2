const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Classroom extends Model {
    static associate(models) {
      Classroom.hasMany(models.CourseSection, { foreignKey: 'classroomId', as: 'sections' });
    }
  }

  Classroom.init({
    building: {
      type: DataTypes.STRING,
      allowNull: false
    },
    room_number: {
      type: DataTypes.STRING,
      allowNull: false
    },
    capacity: DataTypes.INTEGER,
    // GPS Koordinatları
    latitude: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    longitude: {
      type: DataTypes.FLOAT,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Classroom',
    tableName: 'classrooms',
    underscored: true
  });

  return Classroom;
};