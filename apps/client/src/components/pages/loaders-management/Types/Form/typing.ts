export enum ActiveValue {
  active = 'active',
  notActive = 'notActive',
}

export type FormValues = {
  description: string;
  serial: string;
  isActive: ActiveValue;
};
