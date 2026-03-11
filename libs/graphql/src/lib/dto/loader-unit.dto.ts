import { Field, ID, ObjectType, registerEnumType } from '@nestjs/graphql';

export enum LoaderUnit {
  VOLUME = 'VOLUME',
  SIZE = 'SIZE',
}
registerEnumType(LoaderUnit, { name: 'LoaderUnit' });

@ObjectType()
export class LoaderUnitDto {
  @Field(() => ID)
  id!: string;
}
