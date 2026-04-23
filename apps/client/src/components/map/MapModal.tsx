import { useCallback } from 'react';
import { WMSMapModal, ViewMode } from '@rytass/wms-map-react-components';
import { COLOR_PALETTE } from './utils';

interface MapModalProps {
  open: boolean;
  onClose: VoidFunction;
  title?: string;
  viewMode?: ViewMode;
  warehouseIds?: string[];
}

function MapModal({
  open,
  onClose,
  title = '庫位地圖',
  viewMode = ViewMode.VIEW,
  warehouseIds = [],
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
      warehouseIds={warehouseIds}
    />
  );
}

export default MapModal;
