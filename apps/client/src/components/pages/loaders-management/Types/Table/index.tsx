import { useMemo } from 'react';
import dayjs from 'dayjs';
import { TableColumn, Badge } from '@mezzanine-ui/react';
import { useQuery } from '@apollo/client/react';
import TableWrapper from '../../../../TableWrapper';
import Table from '../../../../TableWrapper/Table';
import {
  useTablePageState,
  useTablePageTotal,
} from '../../../../../hooks/useTablePagination';
import {
  LoadersDocument,
  LoaderFragment,
} from '../../../../../graphql/generated/.graphql';
// import { FilterValues } from '../typing';

function LoadersManagementTypesTable() {
  return (
    <TableWrapper
      title="類別項目"
      createText="新增類別"
      onCreate={() => {
        console.log('新增類別');
      }}
    ></TableWrapper>
  );
}

export default LoadersManagementTypesTable;
