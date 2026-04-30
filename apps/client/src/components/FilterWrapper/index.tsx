import { ReactNode, useState, useCallback, useEffect } from 'react';
import {
  useForm,
  DefaultValues,
  SubmitHandler,
  FieldValues,
} from 'react-hook-form';
import { isEqual } from 'lodash';
import { Button, cx } from '@mezzanine-ui/react';
import { ChevronDownIcon } from '@mezzanine-ui/icons';
import { usePreviousValue } from '../../hooks/usePreviousValue';
import { FormWrapper } from '../fields/FormWrapper';
import FormActionButtons from '../FormActionButtons';
import { renderFilter } from './utils';
import { FilterType } from './typing';
import classes from './index.module.scss';

interface FilterWrapperProps<T extends FieldValues> {
  haveAdvancedFilters?: boolean;
  defaultValues: DefaultValues<T>;
  baseFilters: {
    filters: (FilterType | ReactNode)[];
    gridTemplateColumns: string;
  };
  expandedFilters1?: {
    filters: (FilterType | ReactNode)[];
    gridTemplateColumns: string;
  };
  expandedFilters2?: {
    filters: (FilterType | ReactNode)[];
    gridTemplateColumns: string;
  };
  onSubmit?: SubmitHandler<T>;
  syncValues?: T;
}

const FilterWrapper = <T extends FieldValues>({
  haveAdvancedFilters = false,
  defaultValues,
  expandedFilters1,
  expandedFilters2,
  baseFilters,
  onSubmit,
  syncValues,
}: FilterWrapperProps<T>) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const methods = useForm<T>({
    defaultValues,
  });

  const prevSyncValues = usePreviousValue(syncValues);

  useEffect(() => {
    if (syncValues && !isEqual(prevSyncValues, syncValues)) {
      methods.reset(syncValues, {
        keepDefaultValues: true,
        keepDirty: true,
      });
    }
  }, [methods, prevSyncValues, syncValues]);

  const onReset = useCallback(() => {
    methods.reset();
    onSubmit?.({} as T);
  }, [methods, onSubmit]);

  return (
    <FormWrapper className={classes.host} methods={methods} onSubmit={onSubmit}>
      <div className={classes.filters}>
        <div
          className={classes.filterLine}
          style={{ gridTemplateColumns: baseFilters.gridTemplateColumns }}
        >
          {baseFilters.filters.map(renderFilter)}
        </div>
        {isExpanded && (
          <>
            {expandedFilters1 && (
              <div
                className={classes.filterLine}
                style={{
                  gridTemplateColumns: expandedFilters1.gridTemplateColumns,
                }}
              >
                {expandedFilters1.filters.map(renderFilter)}
              </div>
            )}
            {expandedFilters2 && (
              <div
                className={classes.filterLine}
                style={{
                  gridTemplateColumns: expandedFilters2.gridTemplateColumns,
                }}
              >
                {expandedFilters2.filters.map(renderFilter)}
              </div>
            )}
          </>
        )}
      </div>
      <FormActionButtons
        onReset={onReset}
        submitText="查詢"
        otherActionButton={
          haveAdvancedFilters ? (
            <Button
              type="button"
              size="sub"
              variant="base-text-link"
              className={cx(classes.expandButton, {
                [classes.isExpanded]: isExpanded,
              })}
              icon={ChevronDownIcon}
              iconType="trailing"
              onClick={() => {
                setIsExpanded((state) => !state);
              }}
            >
              {isExpanded ? '收合進階搜尋' : '進階搜尋'}
            </Button>
          ) : null
        }
      />
    </FormWrapper>
  );
};

export default FilterWrapper;
