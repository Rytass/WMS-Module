import { useState, useCallback } from 'react';
import {
  WMSMapModalContent,
  EditMode,
  ViewMode,
  DrawingMode,
  Map,
  WMSNodeClickInfo,
} from '@rytass/wms-map-react-components';
import type { FlowNode } from '@rytass/wms-map-react-components';
import { COLOR_PALETTE } from './utils';

interface MapContentProps {
  viewMode?: ViewMode;
  initialNodes?: FlowNode[];
  warehouseIds?: string[];
  onSave?: (mapData: Map) => void;
  onBreadcrumbClick?: (warehouseId: string, index: number) => void;
  onNodeClick?: (nodeInfo: WMSNodeClickInfo) => void;
}

function MapContent({
  viewMode = ViewMode.EDIT,
  initialNodes,
  warehouseIds = [],
  onSave,
  onBreadcrumbClick,
  onNodeClick,
}: MapContentProps) {
  const [editMode, setEditMode] = useState<EditMode>(EditMode.BACKGROUND);
  const [drawingMode, setDrawingMode] = useState<DrawingMode>(DrawingMode.NONE);
  const [selectedColor, setSelectedColor] = useState<string>(COLOR_PALETTE[0]);

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
      onSave={onSave}
      onBreadcrumbClick={onBreadcrumbClick}
      onNodeClick={onNodeClick}
      onEditModeChange={handleEditModeChange}
      onToggleRectangleTool={handleToggleRectangleTool}
      onTogglePenTool={handleTogglePenTool}
      onColorChange={setSelectedColor}
      onUpload={handleUpload}
      initialNodes={initialNodes}
      warehouseIds={warehouseIds}
    />
  );
}

export default MapContent;
