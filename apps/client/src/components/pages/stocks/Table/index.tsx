import { useMemo, useState } from 'react';
import { ChevronDownIcon, LinkIcon } from '@mezzanine-ui/icons';
import { Radio, RadioGroup, Dropdown, Button } from '@mezzanine-ui/react';
import TableWrapper from '../../../TableWrapper';
import StocksGroupTable from './GroupTable';
import StocksListTable from './ListTable';
import classes from './index.module.scss';

enum Mode {
  group = 'group',
  list = 'list',
}

function StocksTable() {
  const [mode, setMode] = useState<Mode>(Mode.group);

  const tableComponent = useMemo(() => {
    switch (mode) {
      case Mode.group:
        return <StocksGroupTable />;

      case Mode.list:
        return <StocksListTable />;

      default:
        return undefined;
    }
  }, [mode]);

  return (
    <TableWrapper
      title="庫存項目"
      otherActions={
        <div className={classes.actionsWrapper}>
          <RadioGroup
            size="sub"
            type="segment"
            value={mode}
            onChange={(e) => {
              setMode(e.target.value as Mode);
            }}
          >
            <Radio value={Mode.group} type="segment">
              料號模式
            </Radio>
            <Radio value={Mode.list} type="segment">
              攤平模式
            </Radio>
          </RadioGroup>
          <Dropdown
            options={[
              {
                icon: LinkIcon,
                id: '綁定銷售訂單',
                name: '綁定銷售訂單',
              },
            ]}
            placement="bottom-end"
            customWidth={240}
            zIndex={4}
          >
            <Button
              type="button"
              size="sub"
              icon={ChevronDownIcon}
              iconType="trailing"
            >
              執行操作
            </Button>
          </Dropdown>
        </div>
      }
    >
      {tableComponent}
    </TableWrapper>
  );
}

export default StocksTable;
