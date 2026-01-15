import {
  createUnionType,
  Field,
  Float,
  ID,
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

@ObjectType()
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

@ObjectType()
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

export const MapRangeUnion = createUnionType({
  name: 'MapRange',
  types: () => [MapRectangleRangeDto, MapPolygonRangeDto] as const,
  resolveType(value) {
    if (value.type === MapRangeType.RECTANGLE) {
      return MapRectangleRangeDto;
    }
    if (value.type === MapRangeType.POLYGON) {
      return MapPolygonRangeDto;
    }
    return null;
  },
});

@ObjectType()
export class MapDataDto {
  @Field(() => ID)
  id!: string;

  @Field(() => [MapBackgroundDto])
  backgrounds!: MapBackgroundDto[];

  @Field(() => [MapRangeUnion])
  ranges!: (MapRectangleRangeDto | MapPolygonRangeDto)[];
}
