import { Field, ID, ObjectType } from '@nestjs/graphql';
import { PaginatedResponse } from './pagination.dto';

@ObjectType()
export class BatchDto {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  key!: string;
}

@ObjectType()
export class Batches extends PaginatedResponse(BatchDto) {}
