import {
  FormEvent,
  ReactElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Input, Message } from '@mezzanine-ui/react';
import FormField from '@mezzanine-ui/react/Form/FormField';
import { FormFieldLayout } from '@mezzanine-ui/core/form';
import { CameraIcon } from '@mezzanine-ui/icons';
import { useModal } from '../../../modal/useModal';
import {
  useAddInventories,
  useInventoryActions,
} from '../../../inventoryActions/useInventoryActions';
import { useCompactLayout } from '../../../../hooks/useCompactLayout';
import { useScanLookup } from '../useApi';
import ChooseStockTable from './ChooseStockTable';
import CameraScanModal from './CameraScanModal';
import classes from './index.module.scss';

/**
 * Where a label is scanned: a hardware scanner (types the code and presses
 * Enter), the device camera, or a person typing. All three end in `lookUp`.
 *
 * The code is matched exactly (`scanCode`). Nothing found says so and keeps the
 * focus here for the next scan; one position is added straight away; several
 * open a list to pick from.
 */
const LabelInput = (): ReactElement => {
  const { openModal, closeModal, open: modalOpen } = useModal();
  const { targetAction } = useInventoryActions();
  const addInventories = useAddInventories();
  const lookUpScan = useScanLookup();
  const compact = useCompactLayout();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  const refocus = useCallback((): void => {
    // A hardware scanner types into whatever has focus. Only take it back when
    // nothing else (a quantity, a setting) is being edited.
    const active = document.activeElement;
    const editingElsewhere =
      active instanceof HTMLElement &&
      active !== inputRef.current &&
      active.matches('input, textarea, select, [contenteditable="true"]');

    if (!editingElsewhere) inputRef.current?.focus();
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!modalOpen) refocus();
  }, [modalOpen, refocus]);

  const lookUp = useCallback(
    async (raw: string): Promise<void> => {
      const code = raw.trim();

      if (!code || busy) return;

      setBusy(true);
      setValue('');

      // The pick list takes the focus itself; handing it back to this field
      // behind an open modal would leave the operator typing into nothing.
      let openedList = false;

      try {
        const { total, only } = await lookUpScan(code);

        if (total === 0) {
          Message.error(`找不到「${code}」對應的庫存`);
        } else if (only) {
          addInventories({
            targetStocks: [only],
            currentAction: targetAction,
            onAddSuccess: () => {
              Message.success(
                `已加入料號：${only.material.key} / 批號：${only.batch.key} / 儲存位置：${only.location.key}`,
              );
            },
          });
        } else {
          openedList = true;
          openModal({
            title: `${code}（${total} 筆）`,
            // Not `wide` on a phone: its max-width (100% - 32px) outranks
            // full-screen's width and left a strip of backdrop showing.
            fullScreen: compact,
            size: compact ? 'regular' : 'wide',
            cancelButtonProps: {
              style: {
                display: 'none',
              },
            },
            confirmButtonProps: {
              variant: 'base-secondary',
            },
            confirmText: '關閉',
            onConfirm: closeModal,
            children: <ChooseStockTable scanCode={code} />,
          });
        }
      } catch {
        Message.error('查詢失敗，請再掃一次');
      } finally {
        setBusy(false);
        if (!openedList) refocus();
      }
    },
    [
      addInventories,
      busy,
      closeModal,
      compact,
      lookUpScan,
      openModal,
      refocus,
      targetAction,
    ],
  );

  const onSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault();
      void lookUp(value);
    },
    [lookUp, value],
  );

  return (
    <form className={classes.host} onSubmit={onSubmit}>
      <FormField
        name="label"
        label="標籤掃碼"
        layout={compact ? FormFieldLayout.VERTICAL : FormFieldLayout.HORIZONTAL}
        fullWidth
      >
        <Input
          variant="action"
          inputRef={inputRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="請掃描標籤條碼"
          size="main"
          fullWidth
          inputProps={{
            enterKeyHint: 'search',
            autoComplete: 'off',
            autoCapitalize: 'off',
            spellCheck: false,
          }}
          // The action button is capped at 80px by Mezzanine; a four-character
          // label plus the icon overflowed it.
          actionButton={{
            position: 'suffix',
            icon: CameraIcon,
            label: '相機',
            'aria-label': '相機掃碼',
            onClick: () => setCameraOpen(true),
          }}
        />
      </FormField>
      <CameraScanModal
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onDetected={(code) => {
          setCameraOpen(false);
          void lookUp(code);
        }}
      />
    </form>
  );
};

export default LabelInput;
