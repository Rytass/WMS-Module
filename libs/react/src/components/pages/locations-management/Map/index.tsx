import { useCallback } from 'react';
import { Message } from '@mezzanine-ui/react';
import { MapRangeType } from '../../../../graphql/generated/.graphql';
import { Map } from '@rytass/wms-map-react-components';
import type {
  MapPolygonRange,
  MapRectangleRange,
} from '@rytass/wms-map-react-components';
import SectionWrapper from '../../../SectionWrapper';
import MapContent from '../../../map/MapContent';
import { useUpdateMapData } from '../useApi';

const LocationsManagementMap: FC = () => {
  const { updateMapData } = useUpdateMapData();

  const onSave = useCallback(
    async (mapData: Map, currentMapKey: string) => {
      try {
        const { data } = await updateMapData({
          variables: {
            locationKey: currentMapKey,
            backgrounds: mapData.backgrounds,
            ranges: mapData.ranges.map((r) => {
              const range = r as MapPolygonRange | MapRectangleRange;

              if (range.type === 'POLYGON') {
                return {
                  id: range.id,
                  type: MapRangeType.POLYGON,
                  color: range.color,
                  points: range.points,
                };
              }

              return {
                id: range.id,
                type: MapRangeType.RECTANGLE,
                color: range.color,
                x: range.x,
                y: range.y,
                width: range.width,
                height: range.height,
              };
            }),
          },
        });

        if (data?.updateWarehouseMap.id) {
          Message.success('儲存成功');
        }
      } catch (error) {
        console.error(error);
      }
    },
    [updateMapData],
  );

  return (
    <SectionWrapper>
      <MapContent onSave={onSave} />
    </SectionWrapper>
  );
};

export default LocationsManagementMap;
