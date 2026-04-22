export type CreateLocationInput = {
  key: string;
  description: string;
  parentId?: string;
  isActive?: boolean;
};

export type UpdateLocationInput = {
  id: string;
  description?: string | null;
  isActive?: boolean | null;
  parentId?: string | null;
};
