import { ReactElement, ReactNode } from 'react';
import { Typography, Button, TableProps } from '@mezzanine-ui/react';
import { PlusIcon } from '@mezzanine-ui/icons';
import SectionWrapper from '../SectionWrapper';
import classes from './index.module.scss';

interface TableWrapperBaseProps {
  title: string;
  children?: ReactElement<TableProps>;
  tableSectionClassName?: string;
  otherActions?: ReactNode;
  /** Filter bar rendered inside the card, between the title row and the table. */
  filters?: ReactNode;
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
  tableSectionClassName,
  otherActions,
  filters,
  createText,
  onCreate,
}: TableWrapperProps) {
  return (
    <SectionWrapper className={tableSectionClassName}>
      <div className={classes.titleWrapper}>
        <Typography variant="h3" color="text-neutral-solid">
          {title}
        </Typography>
        <div className={classes.actions}>
          {otherActions}
          {createText && onCreate && (
            <Button
              type="button"
              onClick={onCreate}
              size="sub"
              icon={PlusIcon}
              iconType="leading"
            >
              {createText}
            </Button>
          )}
        </div>
      </div>
      {filters}
      {children}
    </SectionWrapper>
  );
}

export default TableWrapper;
