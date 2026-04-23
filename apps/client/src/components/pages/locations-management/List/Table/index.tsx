import { useState, useMemo, useCallback } from 'react';
import { TableColumn, Badge } from '@mezzanine-ui/react';
import TableWrapper from '../../../../TableWrapper';
import Table from '../../../../TableWrapper/Table';
import Actions from './Actions';
import { LocationFragment } from '../../../../../graphql/generated/.graphql';
import { useQueryLocations } from '../../useApi';
import LocationFormModal from '../../FormModal';
import { FormValues } from '../../FormModal/typing';

const LocationsManagementListTable: FC = () => {
  const [modalOpened, setModalOpened] = useState<boolean>(false);
  const { data, loading, pageTotal, page, setPage, limit, setLimit } =
    useQueryLocations();

  const dataSource = useMemo(
    (): LocationFragment[] => data?.locations.items ?? [],
    [data?.locations.items],
  );

  const columns: TableColumn<LocationFragment>[] = [
    {
      key: 'actions',
      title: '操作',
      width: 152,
      render: (source) => <Actions source={source} />,
    },
    {
      key: 'isActive',
      title: '狀態',
      width: 100,
      render: (source) =>
        source.isActive ? (
          <Badge variant="dot-success" text="啟用中" />
        ) : (
          <Badge variant="dot-inactive" text="已停用" />
        ),
    },
    {
      key: 'key',
      title: '儲存位置 ID',
      width: 194,
      render: (source) => source.key,
    },
    {
      key: 'description',
      title: '位置說明',
      render: (source) => source.description,
    },
  ];

  const onCreate = useCallback(async (values: FormValues) => {
    try {
      console.log('values', values);
    } catch (error) {
      console.error(error);
    }
  }, []);

  return (
    <>
      <TableWrapper
        title="庫位項目"
        createText="新增庫位"
        onCreate={() => {
          setModalOpened(true);
        }}
      >
        <Table<LocationFragment>
          columns={columns}
          dataSource={dataSource}
          loading={loading}
          pagination={{
            current: page,
            onChange: (page) => setPage(page),
            total: pageTotal,
            pageSize: limit,
            onChangePageSize: (size) => setLimit(size),
          }}
        />
      </TableWrapper>
      <LocationFormModal
        title="新增庫位"
        defaultValues={{
          locationId: '',
          description: '',
          parentLocation: null,
        }}
        submitText="新增"
        onSubmit={onCreate}
        closeModal={() => {
          setModalOpened(false);
        }}
        open={modalOpened}
        confirmMode="create"
      />
    </>
  );
};

export default LocationsManagementListTable;
