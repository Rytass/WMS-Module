import { Field, Float, ID, ObjectType } from '@nestjs/graphql';
import { PaginatedResponse } from './pagination.dto';

@ObjectType()
export class LoaderDto {
  @Field(() => ID)
  id!: string;

  @Field(() => String, { description: '編碼' })
  serialId!: string;

  @Field(() => Float, { nullable: true })
  length!: number | null;

  @Field(() => Float, { nullable: true })
  width!: number | null;

  @Field(() => Float, { nullable: true })
  height!: number | null;

  @Field(() => String, { nullable: true })
  sizeUnit!: string | null;

  @Field(() => Float, { nullable: true })
  volume!: number | null;

  @Field(() => String, { nullable: true })
  volumeUnit!: string | null;

  @Field(() => String, { nullable: true })
  note!: string | null;

  @Field(() => Boolean)
  isActive!: boolean;

  @Field(() => Date)
  createdAt!: Date;
}

@ObjectType()
export class Loaders extends PaginatedResponse(LoaderDto) {}
