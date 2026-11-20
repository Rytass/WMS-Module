import { ReactElement, useEffect, useRef, useState } from 'react';
import { Modal, Typography } from '@mezzanine-ui/react';
import { useCompactLayout } from '../../../../hooks/useCompactLayout';
import classes from './index.module.scss';

interface CameraScanModalProps {
  open: boolean;
  onClose: VoidFunction;
  /** Called once with the first code read; the modal is expected to close. */
  onDetected: (code: string) => void;
}

type CameraState = 'starting' | 'scanning' | 'denied' | 'unavailable';

const CAMERA_HINTS: Readonly<Record<Exclude<CameraState, 'scanning'>, string>> =
  {
    starting: '正在開啟相機…',
    denied: '沒有相機權限。請在瀏覽器設定中允許本網站使用相機，或改用掃碼槍 / 手動輸入。',
    unavailable: '這台裝置無法使用相機（需要 HTTPS 與後置相機）。請改用掃碼槍 / 手動輸入。',
  };

/**
 * Reads a label through the device camera.
 *
 * The decoder is plain JavaScript (`@zxing/browser`), loaded on demand: the
 * site runs where an external CDN or a remotely fetched wasm binary cannot be
 * relied on, and a page that never opens the camera should not pay for it.
 * QR codes are what the label page prints; the common 1D symbologies are on as
 * well so a supplier's own barcode reads too.
 */
const CameraScanModal = ({
  open,
  onClose,
  onDetected,
}: CameraScanModalProps): ReactElement => {
  const compact = useCompactLayout();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<CameraState>('starting');
  const detectedRef = useRef(onDetected);

  detectedRef.current = onDetected;

  useEffect(() => {
    if (!open) return undefined;

    let stop: VoidFunction | null = null;
    let cancelled = false;

    setState('starting');

    const start = async (): Promise<void> => {
      if (!navigator.mediaDevices?.getUserMedia || !videoRef.current) {
        setState('unavailable');

        return;
      }

      const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] =
        await Promise.all([import('@zxing/browser'), import('@zxing/library')]);

      // Map key typed loosely: the enum is only reachable through the dynamic
      // import, and the reader takes `Map<DecodeHintType, any>` anyway.
      const hints = new Map<number, unknown>([
        [
          DecodeHintType.POSSIBLE_FORMATS,
          [
            BarcodeFormat.QR_CODE,
            BarcodeFormat.DATA_MATRIX,
            BarcodeFormat.CODE_128,
            BarcodeFormat.CODE_39,
            BarcodeFormat.EAN_13,
            BarcodeFormat.EAN_8,
          ],
        ],
      ]);

      const reader = new BrowserMultiFormatReader(hints);

      try {
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' } }, audio: false },
          videoRef.current,
          (result, _error, scanner) => {
            const text = result?.getText().trim();

            if (text) {
              scanner.stop();
              detectedRef.current(text);
            }
          },
        );

        if (cancelled) {
          controls.stop();

          return;
        }

        stop = () => controls.stop();
        setState('scanning');
      } catch (error) {
        if (cancelled) return;

        setState(
          error instanceof DOMException && error.name === 'NotAllowedError'
            ? 'denied'
            : 'unavailable',
        );
      }
    };

    void start();

    return () => {
      cancelled = true;
      stop?.();
    };
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      modalType="standard"
      size="regular"
      fullScreen={compact}
      showDismissButton
      showModalHeader
      title="相機掃碼"
      titleAlign="left"
      statusTypeIconLayout="horizontal"
      showStatusTypeIcon={false}
    >
      <div className={classes.camera}>
        <video
          ref={videoRef}
          className={classes.cameraVideo}
          muted
          playsInline
          aria-label="相機畫面"
        />
        <Typography
          variant="body"
          color={
            state === 'denied' || state === 'unavailable'
              ? 'text-error'
              : 'text-neutral'
          }
        >
          {state === 'scanning'
            ? '將標籤條碼對準畫面中央，讀取到後會自動關閉。'
            : CAMERA_HINTS[state]}
        </Typography>
      </div>
    </Modal>
  );
};

export default CameraScanModal;
