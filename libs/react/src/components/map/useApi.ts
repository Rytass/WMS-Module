import { useState, useMemo, useEffect } from 'react';
import type { FlowNode } from '@rytass/wms-map-react-components';
import { compact } from 'lodash';
import { useLazyQuery } from '@apollo/client/react';
import { DEFAULT_MAP_DATA_KEY, DEFAULT_MAP_DATA_NAME } from '../../utils/share';
import { MapDataDocument } from '../../graphql/generated/.graphql';
import { mapDataToNodes } from './mapDataToNodes';

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

  const initialNodes = useMemo(
    (): FlowNode[] => mapDataToNodes(data?.mapData),
    [data?.mapData],
  );

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
