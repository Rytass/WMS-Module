import {
  WMSMapModalContent,
  EditMode,
  ViewMode,
  DrawingMode,
} from '@rytass/wms-map-react-components';

function MapContent() {
  return (
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
  );
}

export default MapContent;
