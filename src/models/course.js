const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Course extends Model {
    static associate(models) {
      // Bir dersin bir bölümü vardır
      Course.belongsTo(models.Department, { foreignKey: 'departmentId', as: 'department' });
      
      // YENİ: Bir dersin "Ön Koşul" dersi olabilir (Self Reference)
      // Course (İleri Java) -> belongsTo -> Course (Prog Giriş)
      Course.belongsTo(models.Course, { foreignKey: 'prerequisiteId', as: 'prerequisite' });
    }
  }

  Course.init({
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    credits: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    ects: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    departmentId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    // YENİ ALAN: Ön Koşul Dersi ID'si
    prerequisiteId: {
      type: DataTypes.INTEGER,
      allowNull: true, // Her dersin ön koşulu olmak zorunda değil
      references: {
        model: 'courses', // Tablo adı
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'Course',
    tableName: 'courses',
    underscored: true // prerequisite_id olarak veritabanına yazar
  });

  return Course;
};