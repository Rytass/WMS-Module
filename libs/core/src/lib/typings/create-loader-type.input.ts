import { EntityManager } from 'typeorm';

export type CreateLoaderTypeInput = {
  description: string;
  key: string;
  manager?: EntityManager;
};

export type UpdateLoaderTypeInput = Partial<
  Omit<CreateLoaderTypeInput, 'key'>
> & {
  id: string;
};
