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
import { useMapSettings } from './settings';

interface MapModalProps {
  open: boolean;
  onClose: VoidFunction;
  title?: string;
  viewMode?: ViewMode;
  onNodeClick?: (
    nodeInfo: WMSNodeClickInfo,
    isExistingLocation: boolean,
  ) => void;
  /** Overrides `MapSettingsProvider`; see `MapSettings.confirmSelection`. */
  confirmSelection?: boolean;
}

function MapModal({
  open,
  onClose,
  title = '庫位地圖',
  viewMode = ViewMode.VIEW,
  onNodeClick: onNodeClickProps,
  confirmSelection: confirmSelectionProp,
}: MapModalProps) {
  const { openDialog } = useDialog();
  const settings = useMapSettings();
  const confirmSelection = confirmSelectionProp ?? settings.confirmSelection;

  const {
    setCurrentMapKey,
    breadcrumb,
    setBreadcrumb,
    existingLocationKeys,
    initialNodes,
  } = useQueryMapData();

  const handleClose = useCallback(() => {
    setCurrentMapKey(DEFAULT_MAP_DATA_KEY);
    setBreadcrumb([DEFAULT_MAP_DATA_NAME]);
    onClose();
  }, [onClose, setCurrentMapKey, setBreadcrumb]);

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
        const isConfirm =
          !confirmSelection ||
          (await openDialog({
            modalStatusType: 'info',
            title: '確認選擇此位置',
            supportingText: `您目前選擇的位置為：${nodeInfo.id}`,
            cancelText: '取消',
            confirmText: '確認',
          }));

        if (isConfirm) {
          onNodeClickProps(
            nodeInfo,
            existingLocationKeys.includes(nodeInfo.id),
          );
        }
      }
    },
    [confirmSelection, existingLocationKeys, onNodeClickProps, openDialog],
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
      onClose={handleClose}
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
