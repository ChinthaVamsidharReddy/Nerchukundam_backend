import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

class Material extends Model {
  public id!: number;
  public title!: string;
  public description!: string;
  public file_path!: string;
  public file_type!: string;
  public category!: string;
  public subcategory?: string;
  public tags?: string[];
  public mentor_id!: number;
  public downloads!: number;
  public views!: number;
  static associate: (models: any) => void;

  // Implement static methods using Sequelize
  static async findById(id: number) {
    return await this.findByPk(id);
  }

  static async find(options = {}) {
    return await this.findAll(options);
  }
}

Material.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  file_path: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  file_type: {
    type: DataTypes.ENUM('pdf', 'image', 'document', 'video', 'audio', 'other'),
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  subcategory: {
    type: DataTypes.STRING(50),
  },
  tags: {
    type: DataTypes.JSON,
    defaultValue: [],
  },
  mentor_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  downloads: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  views: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.ENUM('active', 'archived'),
    defaultValue: 'active',
  },
  upload_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  }
}, {
  sequelize,
  tableName: 'materials',
  timestamps: true,
  createdAt: 'upload_date',
  updatedAt: 'updated_at',
});

// Add associations
Material.associate = (models: any) => {
  Material.belongsTo(models.User, {
    foreignKey: 'mentor_id',
    as: 'mentor'
  });
};

export default Material;