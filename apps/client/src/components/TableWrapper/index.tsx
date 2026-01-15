import { ReactElement } from 'react';
import { Typography, Button, TableProps } from '@mezzanine-ui/react';
import { PlusIcon } from '@mezzanine-ui/icons';
import classes from './index.module.scss';

interface TableWrapperBaseProps {
  title: string;
  children: ReactElement<TableProps>;
}

interface TableWrapperWithCreate {
  createText: string;
  onCreate: VoidFunction;
}

interface TableWrapperWithoutCreate {
  createText?: never;
  onCreate?: never;
}

type TableWrapperProps = TableWrapperBaseProps &
  (TableWrapperWithCreate | TableWrapperWithoutCreate);

function TableWrapper({
  title,
  children,
  createText,
  onCreate,
}: TableWrapperProps) {
  return (
    <div className={classes.host}>
      <div className={classes.titleWrapper}>
        <Typography variant="h3" color="text-neutral-solid">
          {title}
        </Typography>
        {createText && onCreate && (
          <Button
            type="button"
            onClick={onCreate}
            size="sub"
            icon={{
              position: 'leading',
              src: PlusIcon,
            }}
          >
            {createText}
          </Button>
        )}
      </div>
      {children}
    </div>
  );
}

export default TableWrapper;
