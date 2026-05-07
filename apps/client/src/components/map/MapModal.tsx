import { useCallback } from 'react';
import {
  WMSMapModal,
  ViewMode,
  WMSNodeClickInfo,
} from '@rytass/wms-map-react-components';
import { COLOR_PALETTE } from './utils';
import { DEFAULT_MAP_DATA_KEY, DEFAULT_MAP_DATA_NAME } from '../../utils/share';
import { useQueryMapData } from './useApi';

interface MapModalProps {
  open: boolean;
  onClose: VoidFunction;
  title?: string;
  viewMode?: ViewMode;
  onNodeClick?: (
    nodeInfo: WMSNodeClickInfo,
    isExistingLocation: boolean,
  ) => void;
}

function MapModal({
  open,
  onClose,
  title = '庫位地圖',
  viewMode = ViewMode.VIEW,
  onNodeClick: onNodeClickProps,
}: MapModalProps) {
  const {
    setCurrentMapKey,
    breadcrumb,
    setBreadcrumb,
    existingLocationKeys,
    initialNodes,
  } = useQueryMapData();

  const handleUpload = useCallback(async (files: File[]): Promise<string[]> => {
    return files.map((file) => URL.createObjectURL(file));
  }, []);

  const onBreadcrumbClick = useCallback(
    (warehouseId: string, index: number) => {
      setCurrentMapKey(
        warehouseId === DEFAULT_MAP_DATA_NAME
          ? DEFAULT_MAP_DATA_KEY
          : warehouseId,
      );
      setBreadcrumb((prev) => prev.splice(0, index + 1));
    },
    [setBreadcrumb, setCurrentMapKey],
  );

  const onNodeClick = useCallback(
    (nodeInfo: WMSNodeClickInfo) => {
      onNodeClickProps?.(nodeInfo, existingLocationKeys.includes(nodeInfo.id));

      if (
        (viewMode === ViewMode.VIEW &&
          existingLocationKeys.includes(nodeInfo.id)) ||
        viewMode === ViewMode.EDIT
      ) {
        setCurrentMapKey(nodeInfo.id);
        setBreadcrumb((prev) => [...prev, nodeInfo.id]);
      }
    },
    [
      existingLocationKeys,
      onNodeClickProps,
      setBreadcrumb,
      setCurrentMapKey,
      viewMode,
    ],
  );

  return (
    <WMSMapModal
      open={open}
      onClose={onClose}
      title={title}
      viewMode={viewMode}
      colorPalette={COLOR_PALETTE}
      onUpload={handleUpload}
      initialNodes={initialNodes}
      warehouseIds={breadcrumb}
      onBreadcrumbClick={onBreadcrumbClick}
      onNodeClick={onNodeClick}
    />
  );
}

export default MapModal;
