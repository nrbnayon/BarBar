export type ICategory = {
  name: string;
  image: string;
  status: 'active' | 'delete';
  createdAt?: Date;
  updatedAt?: Date;
};
