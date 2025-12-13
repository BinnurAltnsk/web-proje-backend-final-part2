const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Faculty extends Model {
    static associate(models) {
      // User ile ilişki
      Faculty.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
      // Bölüm ile ilişki
      Faculty.belongsTo(models.Department, { foreignKey: 'departmentId', as: 'department' });
    }
  }

  Faculty.init({
    employee_number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    title: { // Dr., Prof., Arş. Gör. vb.
      type: DataTypes.STRING,
      allowNull: false
    },
    office_location: {
      type: DataTypes.STRING
    }
  }, {
    sequelize,
    modelName: 'Faculty',
    tableName: 'faculties', // Dikkat: Sequelize çoğul yapar, tablo adı 'faculties' olur
    underscored: true
  });

  return Faculty;
};