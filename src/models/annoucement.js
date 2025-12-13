const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Announcement extends Model {}

  Announcement.init({
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    // Hedef Kitle: Herkes, Sadece Öğrenciler, Sadece Hocalar
    target_role: {
      type: DataTypes.ENUM('all', 'student', 'faculty'),
      defaultValue: 'all'
    },
    // Önem Derecesi: Normal, Yüksek (Acil)
    priority: {
      type: DataTypes.ENUM('normal', 'high'),
      defaultValue: 'normal'
    }
  }, {
    sequelize,
    modelName: 'Announcement',
    tableName: 'announcements',
    underscored: true
  });

  return Announcement;
};