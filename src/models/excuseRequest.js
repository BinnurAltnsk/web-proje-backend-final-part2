const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ExcuseRequest extends Model {
    static associate(models) {
      ExcuseRequest.belongsTo(models.Student, { foreignKey: 'studentId', as: 'student' });
      // Mazeret, belirli bir yoklama oturumuna (ders saatine) bağlıdır
      ExcuseRequest.belongsTo(models.AttendanceSession, { foreignKey: 'sessionId', as: 'session' });
      // Onaylayan hoca
      ExcuseRequest.belongsTo(models.Faculty, { foreignKey: 'reviewedBy', as: 'reviewer' });
    }
  }

  ExcuseRequest.init({
    reason: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    document_url: {
      type: DataTypes.STRING, // Cloudinary URL
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending'
    },
    reviewed_at: {
      type: DataTypes.DATE
    },
    notes: {
      type: DataTypes.TEXT // Hoca reddederse nedenini yazabilir
    }
  }, {
    sequelize,
    modelName: 'ExcuseRequest',
    tableName: 'excuse_requests',
    underscored: true
  });

  return ExcuseRequest;
};