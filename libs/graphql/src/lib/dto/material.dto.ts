import { Field, ID, ObjectType } from '@nestjs/graphql';
import { PaginatedResponse } from './pagination.dto';

@ObjectType()
export class MaterialDto {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  description!: string;

  @Field(() => String)
  baseUnit!: string;

  @Field(() => Boolean)
  isActive!: boolean;
}

@ObjectType()
export class Materials extends PaginatedResponse(MaterialDto) {}
