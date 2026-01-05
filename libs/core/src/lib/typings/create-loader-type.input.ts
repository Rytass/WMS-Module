export type CreateLoaderTypeInput = {
  id: string;
  description: string;
  serial: string;
};

export type UpdateLoaderTypeInput = Partial<
  Omit<CreateLoaderTypeInput, 'serial'>
> & {
  id: string;
};
