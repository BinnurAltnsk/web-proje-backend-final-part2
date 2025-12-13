const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CourseSection extends Model {
    static associate(models) {
      CourseSection.belongsTo(models.Course, { foreignKey: 'courseId', as: 'course' });
      CourseSection.belongsTo(models.Faculty, { foreignKey: 'instructorId', as: 'instructor' });
      CourseSection.hasMany(models.Enrollment, { foreignKey: 'sectionId', as: 'enrollments' });
      CourseSection.belongsTo(models.Classroom, { foreignKey: 'classroomId', as: 'classroom' });
    }
  }

  CourseSection.init({
    section_number: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    semester: {
      type: DataTypes.ENUM('Fall', 'Spring', 'Summer'),
      allowNull: false
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    capacity: {
      type: DataTypes.INTEGER,
      defaultValue: 50
    },
    enrolled_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    // Basitlik için ders programını JSON tutuyoruz: 
    // Örn: [{ day: "Monday", start: "09:00", end: "12:00" }]
    schedule_json: {
      type: DataTypes.JSONB, 
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'CourseSection',
    tableName: 'course_sections',
    underscored: true
  });

  return CourseSection;
};