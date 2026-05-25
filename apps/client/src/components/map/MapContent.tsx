import { useState, useCallback } from 'react';
import {
  WMSMapModalContent,
  EditMode,
  ViewMode,
  DrawingMode,
  Map,
  WMSNodeClickInfo,
} from '@rytass/wms-map-react-components';
import { COLOR_PALETTE } from './utils';
import { DEFAULT_MAP_DATA_KEY, DEFAULT_MAP_DATA_NAME } from '../../utils/share';
import { useDialog } from '../dialog/useDialog';
import { useQueryMapData } from './useApi';
import { uploadFile } from '../../utils/upload';

interface MapContentProps {
  viewMode?: ViewMode;
  onSave?: (mapData: Map, currentMapKey: string) => Promise<void>;
  onNodeClick?: (
    nodeInfo: WMSNodeClickInfo,
    isExistingLocation: boolean,
    editMode: EditMode,
  ) => void;
}

function MapContent({
  viewMode = ViewMode.EDIT,
  onSave,
  onNodeClick: onNodeClickProps,
}: MapContentProps) {
  const { openDialog } = useDialog();
  const [editMode, setEditMode] = useState<EditMode>(EditMode.BACKGROUND);
  const [drawingMode, setDrawingMode] = useState<DrawingMode>(DrawingMode.NONE);
  const [selectedColor, setSelectedColor] = useState<string>(COLOR_PALETTE[0]);

  const {
    currentMapKey,
    setCurrentMapKey,
    breadcrumb,
    setBreadcrumb,
    existingLocationKeys,
    initialNodes,
  } = useQueryMapData();

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
    async (nodeInfo: WMSNodeClickInfo, editMode: EditMode) => {
      if (onNodeClickProps && nodeInfo.type !== 'imageNode') {
        const isConfirm = await openDialog({
          modalStatusType: 'info',
          title: '確認選擇此位置',
          supportingText: `您目前選擇的位置為：${nodeInfo.id}`,
          cancelText: '取消',
          confirmText: '確認',
        });

        if (isConfirm) {
          onNodeClickProps(
            nodeInfo,
            existingLocationKeys.includes(nodeInfo.id),
            editMode,
          );
        }
      }
    },
    [existingLocationKeys, onNodeClickProps, openDialog],
  );

  const onNodeDoubleClick = useCallback(
    (nodeInfo: WMSNodeClickInfo) => {
      if (editMode === EditMode.BACKGROUND && nodeInfo.type !== 'imageNode') {
        setCurrentMapKey(nodeInfo.id);
        setBreadcrumb((prev) => [...prev, nodeInfo.id]);
      }
    },
    [editMode, setBreadcrumb, setCurrentMapKey],
  );

  const handleEditModeChange = useCallback((mode: EditMode) => {
    setEditMode(mode);
    setDrawingMode(DrawingMode.NONE);
  }, []);

  const handleToggleRectangleTool = useCallback(() => {
    setDrawingMode((prev) =>
      prev === DrawingMode.RECTANGLE ? DrawingMode.NONE : DrawingMode.RECTANGLE,
    );
  }, []);

  const handleTogglePenTool = useCallback(() => {
    setDrawingMode((prev) =>
      prev === DrawingMode.PEN ? DrawingMode.NONE : DrawingMode.PEN,
    );
  }, []);

  const handleUpload = useCallback(async (files: File[]): Promise<string[]> => {
    const urls = await Promise.all(
      files.map(async (file) => {
        const res = await uploadFile(file);

        return `/api/files/get/${res.data.id}`;
      }),
    );

    return urls;
  }, []);

  return (
    <WMSMapModalContent
      editMode={editMode}
      viewMode={viewMode}
      drawingMode={drawingMode}
      colorPalette={COLOR_PALETTE}
      selectedColor={selectedColor}
      onSave={async (mapData) => {
        await onSave?.(mapData, currentMapKey);
      }}
      onBreadcrumbClick={onBreadcrumbClick}
      showBreadcrumbEditButton={() => false}
      onNodeClick={(nodeInfo) => {
        onNodeClick?.(nodeInfo, editMode);
      }}
      onNodeDoubleClick={onNodeDoubleClick}
      onEditModeChange={handleEditModeChange}
      onToggleRectangleTool={handleToggleRectangleTool}
      onTogglePenTool={handleTogglePenTool}
      onColorChange={setSelectedColor}
      onUpload={handleUpload}
      initialNodes={initialNodes}
      warehouseIds={breadcrumb}
    />
  );
}

export default MapContent;
