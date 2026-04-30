import { useMemo, useCallback, useState, useEffect } from 'react';
import { Message } from '@mezzanine-ui/react';
import { MapRangeType } from '../../../../graphql/generated/.graphql';
import {
  EditMode,
  transformApiDataToNodes,
  Map,
} from '@rytass/wms-map-react-components';
import type {
  FlowNode,
  MapPolygonRange,
  MapRectangleRange,
  WMSNodeClickInfo,
} from '@rytass/wms-map-react-components';
import SectionWrapper from '../../../SectionWrapper';
import MapContent from '../../../map/MapContent';
import {
  DEFAULT_MAP_DATA_KEY,
  DEFAULT_MAP_DATA_NAME,
} from '../../../../utils/share';
import { useLazyQueryMapData, useUpdateMapData } from '../useApi';

const LocationsManagementMap: FC = () => {
  const [currentMapKey, setCurrentMapKey] =
    useState<string>(DEFAULT_MAP_DATA_KEY);
  const [breadcrumb, setBreadcrumb] = useState<string[]>([
    DEFAULT_MAP_DATA_NAME,
  ]);
  const { fetchMapData, data, loading: queryLoading } = useLazyQueryMapData();
  const { updateMapData, loading: updateLoading } = useUpdateMapData();

  useEffect(() => {
    fetchMapData({
      variables: {
        key: currentMapKey,
      },
    });
  }, [currentMapKey, fetchMapData]);

  const initialNodes = useMemo((): FlowNode[] => {
    const mapData = data?.mapData;

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
  }, [data?.mapData]);

  const onSave = useCallback(
    async (mapData: Map) => {
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
    [currentMapKey, updateMapData],
  );

  const onBreadcrumbClick = useCallback(
    (warehouseId: string, index: number) => {
      setCurrentMapKey(
        warehouseId === DEFAULT_MAP_DATA_NAME
          ? DEFAULT_MAP_DATA_KEY
          : warehouseId,
      );
      setBreadcrumb((prev) => prev.splice(0, index + 1));
    },
    [],
  );

  const onNodeClick = useCallback(
    (nodeInfo: WMSNodeClickInfo, editMode: EditMode) => {
      if (editMode === EditMode.BACKGROUND) {
        setCurrentMapKey(nodeInfo.id);
        setBreadcrumb((prev) => [...prev, nodeInfo.id]);
      }
    },
    [],
  );

  return (
    <SectionWrapper>
      <MapContent
        initialNodes={initialNodes}
        warehouseIds={breadcrumb}
        onSave={onSave}
        onBreadcrumbClick={onBreadcrumbClick}
        onNodeClick={onNodeClick}
      />
    </SectionWrapper>
  );
};

export default LocationsManagementMap;
