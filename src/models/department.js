const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Department extends Model {
    static associate(models) {
      // Bir bölümün birçok öğrencisi olur
      Department.hasMany(models.Student, { foreignKey: 'departmentId', as: 'students' });
      // Bir bölümün birçok öğretim üyesi olur
      Department.hasMany(models.Faculty, { foreignKey: 'departmentId', as: 'facultyMembers' });
    }
  }

  Department.init({
    // id varsayılan olarak integer gelir, UUID istenirse değiştirilebilir ama genelde bölüm id'leri sabittir.
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true // örn: CENG, EEE
    },
    faculty_name: { // "Mühendislik Fakültesi" gibi
      type: DataTypes.STRING,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'Department',
    tableName: 'departments',
    underscored: true
  });

  return Department;
};