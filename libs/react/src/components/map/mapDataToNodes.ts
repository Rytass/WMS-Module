import { transformApiDataToNodes } from '@rytass/wms-map-react-components';
import type { FlowNode } from '@rytass/wms-map-react-components';
import type { MapDataFragment } from '../../graphql/generated/.graphql';

type ApiMapData = Parameters<typeof transformApiDataToNodes>[0];

/**
 * Converts the `MapData` fragment into the React Flow nodes the map package
 * renders. Pure: the GraphQL `__typename` fields and the `location` relation
 * are dropped, since the package only knows the stored map shape.
 */
export function mapDataToNodes(
  mapData: MapDataFragment | null | undefined,
): FlowNode[] {
  if (!mapData) return [];

  const apiData = {
    id: mapData.id,
    backgrounds: mapData.backgrounds.map((bg) => ({
      id: bg.id,
      filename: bg.filename,
      x: bg.x,
      y: bg.y,
      width: bg.width,
      height: bg.height,
    })),
    ranges: mapData.ranges.map((range) =>
      'x' in range
        ? {
            id: range.id,
            type: range.type as string,
            color: range.color,
            x: range.x,
            y: range.y,
            width: range.width,
            height: range.height,
          }
        : {
            id: range.id,
            type: range.type as string,
            color: range.color,
            points: range.points.map((p) => ({ x: p.x, y: p.y })),
          },
    ),
  };

  return transformApiDataToNodes(apiData as ApiMapData) as FlowNode[];
}
