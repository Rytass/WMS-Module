import { useState, useCallback } from 'react';
import {
  useForm,
  DefaultValues,
  SubmitHandler,
  FieldValues,
} from 'react-hook-form';
import { Button } from '@mezzanine-ui/react';
import { ChevronDownIcon, ChevronUpIcon } from '@mezzanine-ui/icons';
import { FormWrapper } from '../fields/FormWrapper';
import { FilterType, renderFilter } from './utils';
import classes from './index.module.scss';

interface FilterWrapperProps<T extends FieldValues> {
  haveAdvancedFilters?: boolean;
  defaultValues: DefaultValues<T>;
  baseFilters: {
    filters: FilterType[];
    gridTemplateColumns: string;
  };
  onSubmit?: SubmitHandler<T>;
}

const FilterWrapper = <T extends FieldValues>({
  haveAdvancedFilters = false,
  defaultValues,
  baseFilters,
  onSubmit,
}: FilterWrapperProps<T>) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const methods = useForm<T>({
    defaultValues,
  });

  const onReset = useCallback(() => {
    methods.reset();
  }, [methods]);

  return (
    <FormWrapper className={classes.host} methods={methods} onSubmit={onSubmit}>
      <div className={classes.filters}>
        <div
          className={classes.baseFilters}
          style={{ gridTemplateColumns: baseFilters.gridTemplateColumns }}
        >
          {baseFilters.filters.map(renderFilter)}
        </div>
      </div>
      <div className={classes.actions}>
        {haveAdvancedFilters ? (
          <Button
            type="button"
            size="sub"
            variant="base-text-link"
            icon={{
              position: 'trailing',
              src: isExpanded ? ChevronUpIcon : ChevronDownIcon,
            }}
            onClick={() => {
              setIsExpanded((state) => !state);
            }}
          >
            {isExpanded ? '收合進階搜尋' : '進階搜尋'}
          </Button>
        ) : (
          <div />
        )}
        <div className={classes.buttons}>
          <Button
            type="button"
            size="sub"
            variant="base-secondary"
            className={classes.button}
            onClick={onReset}
          >
            重置
          </Button>
          <Button type="submit" size="sub" className={classes.button}>
            查詢
          </Button>
        </div>
      </div>
    </FormWrapper>
  );
};

export default FilterWrapper;
