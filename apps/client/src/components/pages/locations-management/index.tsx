import {
  WMSMapModalContent,
  EditMode,
  ViewMode,
  DrawingMode,
} from '@rytass/wms-map-react-components';
import PageWrapper from '../../PageWrapper';

function LocationsManagement() {
  return (
    <PageWrapper title="庫位管理">
      <WMSMapModalContent
        editMode={EditMode.BACKGROUND}
        viewMode={ViewMode.EDIT}
        drawingMode={DrawingMode.NONE}
        colorPalette={['#FF6B6B', '#4ECDC4', '#45B7D1']}
        selectedColor="#FF6B6B"
        onEditModeChange={(mode) => {
          //
        }}
        onToggleRectangleTool={() => {
          //
        }}
        onTogglePenTool={() => {
          //
        }}
        onColorChange={(color) => {
          //
        }}
        onUpload={async () => {
          return [];
        }}
      />
    </PageWrapper>
  );
}

export default LocationsManagement;
