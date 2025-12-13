const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Enrollment extends Model {
    static associate(models) {
      Enrollment.belongsTo(models.Student, { foreignKey: 'studentId', as: 'student' });
      Enrollment.belongsTo(models.CourseSection, { foreignKey: 'sectionId', as: 'section' });
    }
  }

  Enrollment.init({
    status: {
      type: DataTypes.ENUM('enrolled', 'dropped', 'passed', 'failed'),
      defaultValue: 'enrolled'
    },
    midterm_grade: DataTypes.FLOAT,
    final_grade: DataTypes.FLOAT,
    letter_grade: DataTypes.STRING, // AA, BA, BB vb.
    grade_point: DataTypes.FLOAT    // 4.0, 3.5 vb.
  }, {
    sequelize,
    modelName: 'Enrollment',
    tableName: 'enrollments',
    underscored: true
  });

  return Enrollment;
};