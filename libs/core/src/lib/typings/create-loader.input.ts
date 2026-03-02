export type CreateLoaderInput = {
  typeId: string;
  locationId: string;
  quantity: number;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  sizeUnit?: string | null;
  volume?: number | null;
  volumeUnit?: string | null;
  note?: string | null;
};

export type UpdateLoaderInput = Partial<
  Omit<CreateLoaderInput, 'locationId' | 'typeId'>
> & {
  id: string;
};
