import {
  MapRangeType,
  type MapDataFragment,
} from '../../graphql/generated/.graphql';
import { mapDataToNodes } from './mapDataToNodes';

// The package root also pulls in its React Flow components and CSS, which the
// node test environment cannot load. The transform itself is used for real.
jest.mock('@rytass/wms-map-react-components', () =>
  jest.requireActual(
    '@rytass/wms-map-react-components/utils/api-data-transform',
  ),
);

const location = (
  key: string,
): MapDataFragment['ranges'][number]['location'] => ({
  __typename: 'LocationDto',
  id: `loc-${key}`,
  key,
  isActive: true,
});

const fixture: MapDataFragment = {
  __typename: 'MapDataDto',
  id: 'A',
  backgrounds: [
    {
      __typename: 'MapBackgroundDto',
      id: 'bg-1',
      filename: '/api/files/get/abc',
      x: 0,
      y: 10,
      width: 800,
      height: 600,
    },
  ],
  ranges: [
    {
      __typename: 'MapRectangleRangeDto',
      id: 'A-01',
      type: MapRangeType.RECTANGLE,
      color: 'RED',
      x: 20,
      y: 30,
      width: 40,
      height: 50,
      location: location('A-01'),
    },
    {
      __typename: 'MapPolygonRangeDto',
      id: 'A-02',
      type: MapRangeType.POLYGON,
      color: 'BLUE',
      points: [
        { __typename: 'MapPolygonRangePointDto', x: 100, y: 120 },
        { __typename: 'MapPolygonRangePointDto', x: 90, y: 200 },
        { __typename: 'MapPolygonRangePointDto', x: 150, y: 140 },
      ],
      location: null,
    },
  ],
};

describe('mapDataToNodes', () => {
  it('returns no nodes for missing map data', () => {
    expect(mapDataToNodes(null)).toEqual([]);
    expect(mapDataToNodes(undefined)).toEqual([]);
  });

  it('turns backgrounds into image nodes that keep the stored filename', () => {
    const [background] = mapDataToNodes(fixture);

    expect(background).toMatchObject({
      id: 'bg-1',
      type: 'imageNode',
      position: { x: 0, y: 10 },
      data: {
        imageUrl: '/api/files/get/abc',
        fileName: '/api/files/get/abc',
        width: 800,
        height: 600,
      },
    });
  });

  it('keeps the range id (the location key) as the node id', () => {
    const nodes = mapDataToNodes(fixture);

    expect(nodes.map((node) => [node.id, node.type])).toEqual([
      ['bg-1', 'imageNode'],
      ['A-01', 'rectangleNode'],
      ['A-02', 'pathNode'],
    ]);
  });

  it('carries rectangle geometry and places a polygon at its top-left point', () => {
    const [, rectangle, polygon] = mapDataToNodes(fixture);

    expect(rectangle).toMatchObject({
      position: { x: 20, y: 30 },
      data: { width: 40, height: 50, color: 'RED' },
    });
    expect(polygon).toMatchObject({
      position: { x: 90, y: 120 },
      data: {
        color: 'BLUE',
        points: [
          { x: 100, y: 120 },
          { x: 90, y: 200 },
          { x: 150, y: 140 },
        ],
      },
    });
  });

  it('drops GraphQL-only fields before handing data to the map package', () => {
    const [, rectangle] = mapDataToNodes(fixture);

    expect(JSON.stringify(rectangle)).not.toContain('__typename');
    expect(JSON.stringify(rectangle)).not.toContain('loc-A-01');
  });
});
