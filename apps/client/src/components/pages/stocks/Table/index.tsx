import { useMemo, useState } from 'react';
import { Radio, RadioGroup } from '@mezzanine-ui/react';
import TableWrapper from '../../../TableWrapper';
import StocksGroupTable from './GroupTable';
import StocksListTable from './ListTable';

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
        <div>
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
        </div>
      }
    >
      {tableComponent}
    </TableWrapper>
  );
}

export default StocksTable;
