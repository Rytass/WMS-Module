import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  Popper,
  useDocumentEscapeKeyDown,
  type PopperPlacement,
} from '@mezzanine-ui/react';
import { uniq } from 'lodash';
import { formatKeyName } from '../../utils/share';
import LocationMapPreviewPanel from './LocationMapPreviewPanel';
import classes from './LocationMapPreview.module.scss';

const OPEN_DELAY_MS = 300;
const CLOSE_DELAY_MS = 150;
/** Room the card needs; used to pick a side, since Popper ships no `flip`. */
const PANEL_WIDTH = 320;
const PANEL_HEIGHT = 300;

/** Props to spread onto a caller-owned trigger (render-prop form). */
export interface LocationMapPreviewTriggerProps {
  ref: (node: HTMLElement | null) => void;
  onPointerEnter: (event: PointerEvent<HTMLElement>) => void;
  onPointerLeave: (event: PointerEvent<HTMLElement>) => void;
  onFocus: (event: FocusEvent<HTMLElement>) => void;
  onBlur: (event: FocusEvent<HTMLElement>) => void;
  'aria-expanded': boolean;
  'aria-controls': string | undefined;
}

export interface LocationMapPreviewProps {
  /** The location to preview. Empty renders `children` (or `-`) untouched. */
  locationKey?: string | null;
  /**
   * The trigger content; defaults to the key itself. Pass a function to keep
   * an interactive element of your own (e.g. a button) as the trigger: it
   * receives the hover/focus props to spread. In that form a tap keeps your
   * element's own click, so touch devices get no preview from it.
   */
  children?:
    | ReactNode
    | ((triggerProps: LocationMapPreviewTriggerProps) => ReactNode);
}

const hoverUnavailable = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(hover: none)').matches;

const isFocusVisible = (element: Element): boolean => {
  try {
    return element.matches(':focus-visible');
  } catch {
    return true;
  }
};

const choosePlacement = (anchor: Element | null): PopperPlacement => {
  if (!anchor || typeof window === 'undefined') return 'bottom-start';

  const rect = anchor.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom;
  const vertical =
    spaceBelow < PANEL_HEIGHT && rect.top > spaceBelow ? 'top' : 'bottom';
  const horizontal =
    window.innerWidth - rect.left < PANEL_WIDTH && rect.right > PANEL_WIDTH
      ? 'end'
      : 'start';

  return `${vertical}-${horizontal}`;
};

interface PreviewTriggerProps {
  locationKey: string;
  children: LocationMapPreviewProps['children'];
}

function PreviewTrigger({
  locationKey,
  children,
}: PreviewTriggerProps): ReactElement {
  const panelId = useId();
  const triggerRef = useRef<HTMLElement | null>(null);
  const popperRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerTypeRef = useRef<string>('mouse');
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<PopperPlacement>('bottom-start');

  const setTriggerRef = useCallback((node: HTMLElement | null): void => {
    triggerRef.current = node;
  }, []);

  const clearTimer = useCallback((): void => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const show = useCallback((): void => {
    clearTimer();
    setPlacement(choosePlacement(triggerRef.current));
    setOpen(true);
  }, [clearTimer]);

  const hide = useCallback((): void => {
    clearTimer();
    setOpen(false);
  }, [clearTimer]);

  const schedule = useCallback(
    (action: () => void, delay: number): void => {
      clearTimer();
      timerRef.current = setTimeout(action, delay);
    },
    [clearTimer],
  );

  const isMouse = (event: PointerEvent<HTMLElement>): boolean =>
    event.pointerType === 'mouse' && !hoverUnavailable();

  const onPointerEnter = useCallback(
    (event: PointerEvent<HTMLElement>): void => {
      if (!isMouse(event)) return;
      if (open) clearTimer();
      else schedule(show, OPEN_DELAY_MS);
    },
    [clearTimer, open, schedule, show],
  );

  const onPointerLeave = useCallback(
    (event: PointerEvent<HTMLElement>): void => {
      if (!isMouse(event)) return;
      if (open) schedule(hide, CLOSE_DELAY_MS);
      else clearTimer();
    },
    [clearTimer, hide, open, schedule],
  );

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLElement>): void => {
      pointerTypeRef.current = event.pointerType;
    },
    [],
  );

  // A tap fires emulated hover, focus and click in turn. Hover is mouse-only
  // and focus opens only when focus-visible, so the click alone decides.
  const onClick = useCallback(
    (event: MouseEvent<HTMLElement>): void => {
      const touch = pointerTypeRef.current !== 'mouse' || hoverUnavailable();

      if (!touch) {
        show();

        return;
      }

      event.stopPropagation();

      if (open) hide();
      else show();
    },
    [hide, open, show],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>): void => {
      if (event.key !== 'Enter' && event.key !== ' ') return;

      event.preventDefault();

      if (open) hide();
      else show();
    },
    [hide, open, show],
  );

  const onFocus = useCallback(
    (event: FocusEvent<HTMLElement>): void => {
      if (isFocusVisible(event.currentTarget)) show();
    },
    [show],
  );

  const onBlur = useCallback(
    (event: FocusEvent<HTMLElement>): void => {
      const next = event.relatedTarget;

      if (next instanceof Node && popperRef.current?.contains(next)) return;

      hide();
    },
    [hide],
  );

  useDocumentEscapeKeyDown(() => (open ? hide : undefined), [open, hide]);

  // Click away: the card lives in a portal, so neither node contains the other.
  useEffect(() => {
    if (!open) return undefined;

    const onDocumentPointerDown = (event: Event): void => {
      const target = event.target;

      if (!(target instanceof Node)) return;
      if (triggerRef.current?.contains(target)) return;
      if (popperRef.current?.contains(target)) return;

      hide();
    };

    document.addEventListener('pointerdown', onDocumentPointerDown);

    return () =>
      document.removeEventListener('pointerdown', onDocumentPointerDown);
  }, [hide, open]);

  const triggerProps: LocationMapPreviewTriggerProps = {
    ref: setTriggerRef,
    onPointerEnter,
    onPointerLeave,
    onFocus,
    onBlur,
    'aria-expanded': open,
    'aria-controls': open ? panelId : undefined,
  };

  const trigger =
    typeof children === 'function' ? (
      children(triggerProps)
    ) : (
      <span
        {...triggerProps}
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        aria-label={`${locationKey} 地圖位置`}
        className={classes.trigger}
        onPointerDown={onPointerDown}
        onClick={onClick}
        onKeyDown={onKeyDown}
      >
        {children ?? locationKey}
      </span>
    );

  return (
    <>
      {trigger}
      <Popper
        ref={popperRef}
        id={panelId}
        role="dialog"
        aria-label={`${locationKey} 地圖預覽`}
        anchor={triggerRef}
        open={open}
        options={{ placement }}
        className={classes.popper}
        onPointerEnter={(event): void => {
          if (event.pointerType === 'mouse') clearTimer();
        }}
        onPointerLeave={(event): void => {
          if (event.pointerType === 'mouse') schedule(hide, CLOSE_DELAY_MS);
        }}
      >
        <LocationMapPreviewPanel locationKey={locationKey} />
      </Popper>
    </>
  );
}

/**
 * Wraps a location key so hovering it (or tapping it, on a device without
 * hover, or focusing it from the keyboard) opens the map the location is drawn
 * on, with the location highlighted.
 */
function LocationMapPreview({
  locationKey,
  children,
}: LocationMapPreviewProps): ReactElement {
  if (!locationKey) {
    if (typeof children === 'function') return <>-</>;

    return <>{children ?? '-'}</>;
  }

  return <PreviewTrigger locationKey={locationKey}>{children}</PreviewTrigger>;
}

export interface LocationMapPreviewListProps {
  /** Raw location keys; empty and `DEFAULT` ones render as `-`. */
  locationKeys: ReadonlyArray<string | null | undefined>;
  /** The separator the column already used. */
  separator: string;
  /** Shown when there are no keys at all. */
  empty?: ReactNode;
}

/**
 * Several locations in one cell: deduplicated like the columns already were,
 * with each key its own trigger.
 */
export function LocationMapPreviewList({
  locationKeys,
  separator,
  empty = '',
}: LocationMapPreviewListProps): ReactElement {
  const keys = uniq(locationKeys.map((key) => formatKeyName(key ?? undefined)));

  if (keys.length === 0) return <>{empty}</>;

  return (
    <>
      {keys.map((key, index) => (
        <Fragment key={key}>
          {index > 0 ? separator : null}
          {key === '-' ? key : <LocationMapPreview locationKey={key} />}
        </Fragment>
      ))}
    </>
  );
}

export default LocationMapPreview;
