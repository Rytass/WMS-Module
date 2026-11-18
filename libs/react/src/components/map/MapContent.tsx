import {
  useState,
  useCallback,
  useId,
  useMemo,
  type CSSProperties,
} from 'react';
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
import { useMapSettings } from './settings';
import { useRangeLabelTones, type LabelTone } from './labelContrast';
import { uploadFile } from '../../utils/upload';
import classes from './MapContent.module.scss';

interface MapContentProps {
  viewMode?: ViewMode;
  onSave?: (mapData: Map, currentMapKey: string) => Promise<void>;
  onNodeClick?: (
    nodeInfo: WMSNodeClickInfo,
    isExistingLocation: boolean,
    editMode: EditMode,
  ) => void;
  /** Overrides `MapSettingsProvider`; see `MapSettings.confirmSelection`. */
  confirmSelection?: boolean;
  /**
   * The location currently selected through this map. Its range is outlined in
   * the brand colour and the other ranges fade, on the map level that shows it;
   * other levels are left alone.
   */
  selectedLocationKey?: string | null;
  /** CSS height of the map, e.g. `'40vh'`. Defaults to the package's own height. */
  height?: string;
}

/**
 * The map package keeps its nodes in internal state and only reloads them when
 * the set of ids changes, so a selection cannot travel through node data
 * without remounting the map (and losing the viewport). It is drawn with a
 * stylesheet scoped to this map instead, keyed on React Flow's `data-id`.
 */
function selectionStyle(scope: string, key: string): string {
  const root = `[data-wms-map="${CSS.escape(scope)}"]`;
  const selected = `.react-flow__node[data-id="${CSS.escape(key)}"]`;
  const ranges = ['rectangleNode', 'pathNode']
    .map((type) => `${root} .react-flow__node-${type}:not(${selected})`)
    .join(', ');

  return `${ranges} { opacity: 0.35; transition: opacity 0.2s ease; }
${root} ${selected} { outline: 3px solid var(--wms-map-selected-ring); outline-offset: 2px; border-radius: 6px; }`;
}

/**
 * Range labels in the tone `useRangeLabelTones` picked, each with a halo of the
 * opposite tone so it stays legible across the linework of a floor plan. The
 * package sets `color: white` on the label's parent, so the rule targets the
 * label `span` itself and needs no `!important`.
 */
function labelStyle(
  scope: string,
  tones: ReadonlyMap<string, LabelTone>,
): string {
  const root = `[data-wms-map="${CSS.escape(scope)}"]`;
  const rule = (tone: LabelTone): string => {
    const ids = [...tones]
      .filter(([, t]) => t === tone)
      .map(
        ([id]) => `${root} .react-flow__node[data-id="${CSS.escape(id)}"] span`,
      );
    const [text, halo] =
      tone === 'dark'
        ? ['--wms-map-label-dark', '--wms-map-label-light']
        : ['--wms-map-label-light', '--wms-map-label-dark'];

    return ids.length
      ? `${ids.join(', ')} { color: var(${text}); text-shadow: 0 0 2px var(${halo}), 0 0 2px var(${halo}), 0 0 4px var(${halo}); }`
      : '';
  };

  return `${rule('dark')}\n${rule('light')}`;
}

function MapContent({
  viewMode = ViewMode.EDIT,
  onSave,
  onNodeClick: onNodeClickProps,
  confirmSelection: confirmSelectionProp,
  selectedLocationKey,
  height,
}: MapContentProps) {
  const scope = useId();
  const { openDialog } = useDialog();
  const settings = useMapSettings();
  const confirmSelection = confirmSelectionProp ?? settings.confirmSelection;
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

  const labelTones = useRangeLabelTones(initialNodes);
  const labels = useMemo(
    () => (labelTones.size ? labelStyle(scope, labelTones) : ''),
    [labelTones, scope],
  );

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
            editMode,
          );
        }
      }
    },
    [confirmSelection, existingLocationKeys, onNodeClickProps, openDialog],
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
    <div
      className={
        height ? `${classes.container} ${classes.sized}` : classes.container
      }
      data-wms-map={scope}
      style={
        height ? ({ '--wms-map-height': height } as CSSProperties) : undefined
      }
    >
      {labels ? <style>{labels}</style> : null}
      {selectedLocationKey &&
      initialNodes.some((node) => node.id === selectedLocationKey) ? (
        <style>{selectionStyle(scope, selectedLocationKey)}</style>
      ) : null}
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
    </div>
  );
}

export default MapContent;
