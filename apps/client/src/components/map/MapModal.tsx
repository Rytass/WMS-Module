import { useCallback } from 'react';
import {
  WMSMapModal,
  ViewMode,
  WMSNodeClickInfo,
} from '@rytass/wms-map-react-components';
import { COLOR_PALETTE } from './utils';
import { DEFAULT_MAP_DATA_KEY, DEFAULT_MAP_DATA_NAME } from '../../utils/share';
import { useDialog } from '../dialog/useDialog';
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
  const { openDialog } = useDialog();

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
    async (nodeInfo: WMSNodeClickInfo) => {
      if (onNodeClickProps && nodeInfo.type !== 'imageNode') {
        const isConfirm = await openDialog({
          modalStatusType: 'info',
          title: '確認選擇此位置',
          cancelText: '取消',
          confirmText: '確認',
        });

        if (isConfirm) {
          onNodeClickProps(
            nodeInfo,
            existingLocationKeys.includes(nodeInfo.id),
          );
        }
      }
    },
    [existingLocationKeys, onNodeClickProps, openDialog],
  );

  const onNodeDoubleClick = useCallback(
    (nodeInfo: WMSNodeClickInfo) => {
      if (nodeInfo.type !== 'imageNode') {
        setCurrentMapKey(nodeInfo.id);
        setBreadcrumb((prev) => [...prev, nodeInfo.id]);
      }
    },
    [setBreadcrumb, setCurrentMapKey],
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
      showBreadcrumbEditButton={() => false}
      warehouseIds={breadcrumb}
      onBreadcrumbClick={onBreadcrumbClick}
      onNodeClick={onNodeClick}
      onNodeDoubleClick={onNodeDoubleClick}
    />
  );
}

export default MapModal;
