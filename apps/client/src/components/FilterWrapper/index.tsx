import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@mezzanine-ui/react';
import { ChevronDownIcon, ChevronUpIcon } from '@mezzanine-ui/icons';
import { FormWrapper } from '../fields/FormWrapper';
import { InputField } from '../fields/InputField';
import classes from './index.module.scss';

interface FilterWrapperProps {
  haveAdvancedFilters?: boolean;
}

function FilterWrapper({ haveAdvancedFilters = false }: FilterWrapperProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const methods = useForm();

  return (
    <FormWrapper
      className={classes.host}
      methods={methods}
      onSubmit={(values) => {
        console.log('values', values);
      }}
    >
      <div className={classes.filters}>
        <div
          className={classes.baseFilters}
          style={{ gridTemplateColumns: '1fr 1fr' }}
        >
          <InputField name="description" label="備註" placeholder="輸入備註" />
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
}

export default FilterWrapper;
