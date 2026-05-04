import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  WMSMapModalContent,
  EditMode,
  ViewMode,
  DrawingMode,
  Map,
  WMSNodeClickInfo,
  transformApiDataToNodes,
} from '@rytass/wms-map-react-components';
import type { FlowNode } from '@rytass/wms-map-react-components';
import { compact } from 'lodash';
import { COLOR_PALETTE } from './utils';
import { DEFAULT_MAP_DATA_KEY, DEFAULT_MAP_DATA_NAME } from '../../utils/share';
import { useLazyQueryMapData } from './useApi';

interface MapContentProps {
  viewMode?: ViewMode;
  onSave?: (mapData: Map, currentMapKey: string) => Promise<void>;
  onNodeClick?: (nodeInfo: WMSNodeClickInfo, editMode: EditMode) => void;
}

function MapContent({
  viewMode = ViewMode.EDIT,
  onSave,
  onNodeClick: onNodeClickProps,
}: MapContentProps) {
  const [currentMapKey, setCurrentMapKey] =
    useState<string>(DEFAULT_MAP_DATA_KEY);
  const [breadcrumb, setBreadcrumb] = useState<string[]>([
    DEFAULT_MAP_DATA_NAME,
  ]);
  const [editMode, setEditMode] = useState<EditMode>(EditMode.BACKGROUND);
  const [drawingMode, setDrawingMode] = useState<DrawingMode>(DrawingMode.NONE);
  const [selectedColor, setSelectedColor] = useState<string>(COLOR_PALETTE[0]);

  const { fetchMapData, data, loading: queryLoading } = useLazyQueryMapData();

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
      onNodeClickProps?.(nodeInfo, editMode);

      if (editMode === EditMode.BACKGROUND) {
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
    [existingLocationKeys, onNodeClickProps, viewMode],
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
