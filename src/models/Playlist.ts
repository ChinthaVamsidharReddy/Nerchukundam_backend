import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

class Playlist extends Model {
  public id!: number;
  public title!: string;
  public description?: string;
  public url!: string;
  public category!: string;
  public subcategory?: string;
  public mentor_id!: number;
  public views!: number;
  public upload_date!: Date;
  static associate: (models: any) => void;
}

Playlist.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  url: {
    type: DataTypes.STRING(1024),
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  subcategory: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  mentor_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  views: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  upload_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  }
}, {
  sequelize,
  tableName: 'playlists',
  timestamps: true,
  createdAt: 'upload_date',
  updatedAt: false,
});

// Define associations
Playlist.associate = (models: any) => {
  Playlist.belongsTo(models.User, {
    foreignKey: 'mentor_id',
    as: 'mentor'
  });
};

export default Playlist;