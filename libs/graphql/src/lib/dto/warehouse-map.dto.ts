import {
  Field,
  Float,
  ID,
  InterfaceType,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';

export enum MapRangeType {
  RECTANGLE = 'RECTANGLE',
  POLYGON = 'POLYGON',
}

registerEnumType(MapRangeType, {
  name: 'MapRangeType',
  description: 'The type of map range',
});

@ObjectType()
export class MapPolygonRangePointDto {
  @Field(() => Float)
  x!: number;

  @Field(() => Float)
  y!: number;
}

@ObjectType()
export class MapBackgroundDto {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  filename!: string;

  @Field(() => Float)
  x!: number;

  @Field(() => Float)
  y!: number;

  @Field(() => Float)
  height!: number;

  @Field(() => Float)
  width!: number;
}

@InterfaceType({
  resolveType: (value) => {
    if (value.type === MapRangeType.RECTANGLE) {
      return MapRectangleRangeDto;
    }
    if (value.type === MapRangeType.POLYGON) {
      return MapPolygonRangeDto;
    }
    return null;
  },
})
export abstract class MapRangeDto {
  id: string;
}

@ObjectType({ implements: [MapRangeDto] })
export class MapRectangleRangeDto {
  @Field(() => ID)
  id!: string;

  @Field(() => MapRangeType)
  type!: MapRangeType;

  @Field(() => String)
  color!: string;

  @Field(() => Float)
  x!: number;

  @Field(() => Float)
  y!: number;

  @Field(() => Float)
  width!: number;

  @Field(() => Float)
  height!: number;
}

@ObjectType({ implements: [MapRangeDto] })
export class MapPolygonRangeDto {
  @Field(() => ID)
  id!: string;

  @Field(() => MapRangeType)
  type!: MapRangeType;

  @Field(() => String)
  color!: string;

  @Field(() => [MapPolygonRangePointDto])
  points!: MapPolygonRangePointDto[];
}

@ObjectType()
export class MapDataDto {
  @Field(() => ID)
  id!: string;

  @Field(() => [MapBackgroundDto])
  backgrounds!: MapBackgroundDto[];

  @Field(() => [MapRangeDto])
  ranges!: MapRangeDto[];
}
