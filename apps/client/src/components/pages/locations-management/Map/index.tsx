import { useMemo } from 'react';
import { transformApiDataToNodes } from '@rytass/wms-map-react-components';
import type { FlowNode } from '@rytass/wms-map-react-components';
import SectionWrapper from '../../../SectionWrapper';
import MapContent from '../../../map/MapContent';
import { useQueryLocations } from '../useApi';

const LocationsManagementMap: FC = () => {
  const { data } = useQueryLocations();

  const initialNodes = useMemo((): FlowNode[] => {
    const items = data?.locations.items ?? [];

    return items.flatMap((location) => {
      const mapData = location.mapData;
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
        ranges: mapData.ranges.map((range) => {
          if ('x' in range) {
            return {
              id: range.id,
              type: range.type as string,
              color: range.color,
              x: range.x,
              y: range.y,
              width: range.width,
              height: range.height,
            };
          }

          return {
            id: range.id,
            type: range.type as string,
            color: range.color,
            points: range.points.map((p) => ({ x: p.x, y: p.y })),
          };
        }),
      };

      return transformApiDataToNodes(
        apiData as Parameters<typeof transformApiDataToNodes>[0],
      ) as FlowNode[];
    });
  }, [data?.locations.items]);

  console.log('initialNodes', initialNodes);

  return (
    <SectionWrapper>
      <MapContent initialNodes={initialNodes} />
    </SectionWrapper>
  );
};

export default LocationsManagementMap;
