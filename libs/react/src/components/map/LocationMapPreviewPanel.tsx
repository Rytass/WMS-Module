import { useEffect, useMemo, type ReactElement } from 'react';
import { useLazyQuery } from '@apollo/client/react';
import { Breadcrumb, Spin, Typography } from '@mezzanine-ui/react';
import { WMSMapPreview } from '@rytass/wms-map-react-components';
import { LocationMapPreviewDocument } from '../../graphql/generated/.graphql';
import { DEFAULT_MAP_DATA_KEY, DEFAULT_MAP_DATA_NAME } from '../../utils/share';
import { mapDataToNodes } from './mapDataToNodes';
import classes from './LocationMapPreview.module.scss';

export interface LocationMapPreviewPanelProps {
  locationKey: string;
}

const displayMapKey = (key: string): string =>
  key === DEFAULT_MAP_DATA_KEY ? DEFAULT_MAP_DATA_NAME : key;

/**
 * The body of the hover card. Mounted only while the card is open, so a table
 * of a hundred locations holds no query until one of them is hovered.
 *
 * `cache-first` (the default) is the whole caching story: the result,
 * including a `null` one, is cached per `key`, so the same location never
 * queries twice however many cells or hovers ask for it.
 */
function LocationMapPreviewPanel({
  locationKey,
}: LocationMapPreviewPanelProps): ReactElement {
  const [fetchPreview, { data, loading, error, called }] = useLazyQuery(
    LocationMapPreviewDocument,
  );

  useEffect(() => {
    fetchPreview({ variables: { key: locationKey } }).catch(() => {
      // Surfaced through `error` below.
    });
  }, [fetchPreview, locationKey]);

  const preview = data?.locationMapPreview;

  const nodes = useMemo(() => mapDataToNodes(preview?.mapData), [preview]);

  const highlightIds = useMemo(() => [locationKey], [locationKey]);

  const breadcrumbItems = useMemo(
    () =>
      [...(preview?.path ?? []), locationKey].map((key, index, keys) => ({
        id: `${index}-${key}`,
        name: displayMapKey(key),
        current: index === keys.length - 1,
      })),
    [preview?.path, locationKey],
  );

  const renderBody = (): ReactElement => {
    if (!called || (loading && !data)) {
      return <Spin size="sub" loading />;
    }

    if (error && !data) {
      return (
        <Typography variant="caption" color="text-neutral">
          無法載入地圖
        </Typography>
      );
    }

    if (!preview) {
      return (
        <Typography variant="caption" color="text-neutral">
          尚未標示於地圖
        </Typography>
      );
    }

    return (
      <WMSMapPreview
        className={classes.map}
        initialNodes={nodes}
        highlightIds={highlightIds}
      />
    );
  };

  return (
    <div className={classes.panel}>
      {preview ? (
        <Breadcrumb
          condensed={breadcrumbItems.length > 4}
          items={breadcrumbItems}
        />
      ) : (
        <Typography variant="label-primary">{locationKey}</Typography>
      )}
      <div className={classes.canvas}>{renderBody()}</div>
    </div>
  );
}

export default LocationMapPreviewPanel;
