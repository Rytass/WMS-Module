import { ArgsType, Field, Float, ID, InputType } from '@nestjs/graphql';
import { MapRangeType } from '../dto/warehouse-map.dto';

@InputType()
export class MapBackgroundInput {
  @Field(() => ID)
  id: string;

  @Field()
  filename: string;

  @Field(() => Float)
  x: number;

  @Field(() => Float)
  y: number;

  @Field(() => Float)
  height: number;

  @Field(() => Float)
  width: number;
}

@InputType()
export class MapPolygonRangePointInput {
  @Field(() => Float)
  x: number;

  @Field(() => Float)
  y: number;
}
@InputType()
export class MapRangeInput {
  @Field(() => ID)
  id: string;

  @Field(() => MapRangeType)
  type: MapRangeType;

  @Field(() => String)
  color: string;

  @Field(() => Float)
  x?: number;

  @Field(() => Float)
  y?: number;

  @Field(() => Float)
  width?: number;

  @Field(() => Float)
  height?: number;

  @Field(() => [MapPolygonRangePointInput])
  points?: MapPolygonRangePointInput[];
}

@ArgsType()
export class UpdateWarehouseMapArgs {
  @Field(() => ID)
  locationKey!: string;

  @Field(() => [MapBackgroundInput])
  backgrounds!: MapBackgroundInput[];

  @Field(() => [MapRangeInput])
  ranges!: MapRangeInput[];
}
