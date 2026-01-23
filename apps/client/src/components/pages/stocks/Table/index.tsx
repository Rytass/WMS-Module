import { useState } from 'react';
import { Radio, RadioGroup } from '@mezzanine-ui/react';
import TableWrapper from '../../../TableWrapper';
import StocksGroupTable from './GroupTable';

enum Mode {
  group = 'group',
  list = 'list',
}

function StocksTable() {
  const [mode, setMode] = useState<Mode>(Mode.group);

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
      <StocksGroupTable />
    </TableWrapper>
  );
}

export default StocksTable;
