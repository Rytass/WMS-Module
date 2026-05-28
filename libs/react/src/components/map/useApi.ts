import { useState, useMemo, useEffect } from 'react';
import { transformApiDataToNodes } from '@rytass/wms-map-react-components';
import type { FlowNode } from '@rytass/wms-map-react-components';
import { compact } from 'lodash';
import { useLazyQuery } from '@apollo/client/react';
import { DEFAULT_MAP_DATA_KEY, DEFAULT_MAP_DATA_NAME } from '../../utils/share';
import { MapDataDocument } from '../../graphql/generated/.graphql';

export function useQueryMapData() {
  const [currentMapKey, setCurrentMapKey] =
    useState<string>(DEFAULT_MAP_DATA_KEY);
  const [breadcrumb, setBreadcrumb] = useState<string[]>([
    DEFAULT_MAP_DATA_NAME,
  ]);
  const [fetchMapData, { data, loading }] = useLazyQuery(MapDataDocument, {
    fetchPolicy: 'cache-and-network',
  });

  useEffect(() => {
    fetchMapData({
      variables: {
        key: currentMapKey,
      },
    });
  }, [currentMapKey, fetchMapData]);

  const existingLocationKeys = useMemo(
    () => compact((data?.mapData.ranges ?? []).map((r) => r.location?.key)),
    [data?.mapData.ranges],
  );

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

  return {
    currentMapKey,
    setCurrentMapKey,
    breadcrumb,
    setBreadcrumb,
    loading,
    existingLocationKeys,
    initialNodes,
  };
}
