import { useCallback } from 'react';
import {
  WMSMapModal,
  ViewMode,
  Map,
  WMSNodeClickInfo,
} from '@rytass/wms-map-react-components';
import type { FlowNode } from '@rytass/wms-map-react-components';
import { COLOR_PALETTE } from './utils';

interface MapModalProps {
  open: boolean;
  onClose: VoidFunction;
  title?: string;
  viewMode?: ViewMode;
  initialNodes?: FlowNode[];
  warehouseIds?: string[];
  onSave?: (mapData: Map) => void;
  onBreadcrumbClick?: (warehouseId: string, index: number) => void;
  onNodeClick?: (nodeInfo: WMSNodeClickInfo) => void;
}

function MapModal({
  open,
  onClose,
  title = '庫位地圖',
  viewMode = ViewMode.VIEW,
  initialNodes,
  warehouseIds = [],
  onSave,
  onBreadcrumbClick,
  onNodeClick,
}: MapModalProps) {
  const handleUpload = useCallback(async (files: File[]): Promise<string[]> => {
    return files.map((file) => URL.createObjectURL(file));
  }, []);

  return (
    <WMSMapModal
      open={open}
      onClose={onClose}
      title={title}
      viewMode={viewMode}
      colorPalette={COLOR_PALETTE}
      onUpload={handleUpload}
      initialNodes={initialNodes}
      warehouseIds={warehouseIds}
      onSave={onSave}
      onBreadcrumbClick={onBreadcrumbClick}
      onNodeClick={onNodeClick}
    />
  );
}

export default MapModal;
