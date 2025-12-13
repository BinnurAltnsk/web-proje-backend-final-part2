const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AttendanceSession extends Model {
    static associate(models) {
      AttendanceSession.belongsTo(models.CourseSection, { foreignKey: 'sectionId', as: 'section' });
      AttendanceSession.belongsTo(models.Faculty, { foreignKey: 'instructorId', as: 'instructor' });
      AttendanceSession.hasMany(models.AttendanceRecord, { foreignKey: 'sessionId', as: 'records' });
    }
  }

  AttendanceSession.init({
    // Tarih ve Saat bilgileri
    date: {
      type: DataTypes.DATEONLY, // Sadece tarih (YYYY-MM-DD)
      allowNull: false
    },
    start_time: {
      type: DataTypes.TIME,
      allowNull: false
    },
    end_time: {
      type: DataTypes.TIME,
      allowNull: false
    },
    // Konum Bilgileri (Oturum açıldığında classroom'dan kopyalanır veya hoca konumu alınır)
    latitude: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    longitude: {
      type: DataTypes.FLOAT,
      allowNull: false
    },
    geofence_radius: {
      type: DataTypes.INTEGER,
      defaultValue: 15 // Metre cinsinden
    },
    // Güvenlik
    qr_code: {
      type: DataTypes.STRING, // Dinamik üretilen QR kod içeriği
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('active', 'closed', 'expired'),
      defaultValue: 'active'
    }
  }, {
    sequelize,
    modelName: 'AttendanceSession',
    tableName: 'attendance_sessions',
    underscored: true
  });

  return AttendanceSession;
};