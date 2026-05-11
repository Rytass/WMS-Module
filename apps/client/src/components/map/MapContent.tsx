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
import { useQueryMapData } from './useApi';

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
    (nodeInfo: WMSNodeClickInfo, editMode: EditMode) => {
      onNodeClickProps?.(
        nodeInfo,
        existingLocationKeys.includes(nodeInfo.id),
        editMode,
      );

      if (editMode === EditMode.BACKGROUND && nodeInfo.type !== 'imageNode') {
        if (
          (viewMode === ViewMode.VIEW &&
            existingLocationKeys.includes(nodeInfo.id)) ||
          viewMode === ViewMode.EDIT
        ) {
          setCurrentMapKey(nodeInfo.id);
          setBreadcrumb((prev) => [...prev, nodeInfo.id]);
        }
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
    return files.map((file) => URL.createObjectURL(file));
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
      onNodeClick={(nodeInfo) => {
        onNodeClick?.(nodeInfo, editMode);
      }}
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
