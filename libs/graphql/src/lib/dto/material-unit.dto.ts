import { Field, Float, ID, ObjectType } from '@nestjs/graphql';
import { PaginatedResponse } from './pagination.dto';

@ObjectType()
export class MaterialUnitDto {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  materialId!: string;

  @Field(() => String)
  unit!: string;

  @Field(() => Float)
  conversionFactor!: number;

  @Field(() => Boolean)
  isActive!: boolean;

  @Field(() => Date)
  createdAt!: Date;
}

@ObjectType()
export class MaterialUnits extends PaginatedResponse(MaterialUnitDto) {}
