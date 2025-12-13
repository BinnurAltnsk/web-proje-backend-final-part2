const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AttendanceRecord extends Model {
    static associate(models) {
      AttendanceRecord.belongsTo(models.AttendanceSession, { foreignKey: 'sessionId', as: 'session' });
      AttendanceRecord.belongsTo(models.Student, { foreignKey: 'studentId', as: 'student' });
    }
  }

  AttendanceRecord.init({
    check_in_time: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    // Öğrencinin ilettiği konum
    latitude: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    longitude: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    // Hesaplanan mesafe (Kanıt niteliğinde saklanır)
    distance_from_center: {
      type: DataTypes.FLOAT, // Metre
      allowNull: false
    },
    // Sahtekarlık tespiti
    is_flagged: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    flag_reason: {
      type: DataTypes.STRING, // "Distance mismatch", "Mock location detected" vb.
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'AttendanceRecord',
    tableName: 'attendance_records',
    underscored: true
  });

  return AttendanceRecord;
};