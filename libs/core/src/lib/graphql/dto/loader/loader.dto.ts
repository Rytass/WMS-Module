import { Field, Float, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class LoaderDto {
  @Field(() => ID)
  id!: string;

  @Field(() => String, { description: '編碼前綴' })
  prefix!: string;

  @Field(() => Int, { description: '數量' })
  quantity!: number;

  @Field(() => Float, { nullable: true, description: '長度' })
  length!: number | null;

  @Field(() => Float, { nullable: true, description: '寬度' })
  width!: number | null;

  @Field(() => Float, { nullable: true, description: '高度' })
  height!: number | null;

  @Field(() => String, { nullable: true, description: '尺寸單位' })
  sizeUnit!: string | null;

  @Field(() => Float, { nullable: true, description: '體積' })
  volume!: number | null;

  @Field(() => String, { nullable: true, description: '體積單位' })
  volumeUnit!: string | null;

  @Field(() => Date, { description: '建立時間' })
  createdAt!: Date;

  @Field(() => Date, { description: '更新時間' })
  updatedAt!: Date;
}
