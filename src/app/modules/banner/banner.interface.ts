export type IBanner = {
  name: string;
  image: string;
  type: 'HOST' | 'USER';
  status: 'active' | 'delete';
};
