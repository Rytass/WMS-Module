import { useState, useCallback } from 'react';
import {
  useForm,
  DefaultValues,
  SubmitHandler,
  FieldValues,
} from 'react-hook-form';
import { Button, cx } from '@mezzanine-ui/react';
import { ChevronDownIcon } from '@mezzanine-ui/icons';
import { FormWrapper } from '../fields/FormWrapper';
import FormActionButtons from '../FormActionButtons';
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
              icon={{
                position: 'trailing',
                src: ChevronDownIcon,
              }}
              onClick={() => {
                setIsExpanded((state) => !state);
              }}
            >
              {isExpanded ? '收合進階搜尋' : '進階搜尋'}
            </Button>
          ) : (
            <div />
          )
        }
      />
    </FormWrapper>
  );
};

export default FilterWrapper;
