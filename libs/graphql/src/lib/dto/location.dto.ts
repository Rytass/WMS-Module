import { Field, ID, ObjectType } from '@nestjs/graphql';
import { PaginatedResponse } from './pagination.dto';

@ObjectType()
export class LocationDto {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  key!: string;

  @Field(() => String)
  description!: string;

  @Field(() => Boolean, { nullable: true })
  isActive?: boolean;
}

@ObjectType()
export class Locations extends PaginatedResponse(LocationDto) {}
