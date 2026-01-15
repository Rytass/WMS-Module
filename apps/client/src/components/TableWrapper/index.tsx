import { Typography, Button } from '@mezzanine-ui/react';
import { PlusIcon } from '@mezzanine-ui/icons';
import classes from './index.module.scss';

interface TableWrapperBaseProps {
  title: string;
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

const TableWrapper: FC<TableWrapperProps> = ({
  title,
  createText,
  onCreate,
}) => {
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
      Table
    </div>
  );
};

export default TableWrapper;
