import { Model, DataTypes } from 'sequelize';
import sequelize from '../config/database';

class Doubt extends Model {
  public id!: number;
  public title!: string;
  public description!: string;
  public status!: 'pending' | 'answered';
  public answer?: string;
  public student_id!: number;
  public mentor_id?: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

Doubt.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'answered'),
    defaultValue: 'pending',
  },
  answer: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  student_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  mentor_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'Doubt',
  tableName: 'doubts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

export default Doubt;