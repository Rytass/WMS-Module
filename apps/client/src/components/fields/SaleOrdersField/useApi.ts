import { useState, useCallback } from 'react';
import { useLazyQuery } from '@apollo/client/react';
import { SelectValue } from '@mezzanine-ui/react';
import { SaleOrdersDocument } from '../../../graphql/generated/.graphql';

export function useLazyQuerySaleOrders(saleOrdersId: string) {
  const [currentOptions, setCurrentOptions] = useState<SelectValue[]>([]);
  const [fetchSaleOrders] = useLazyQuery(SaleOrdersDocument);

  const onVisibilityChange = useCallback(async () => {
    if (saleOrdersId) {
      try {
        const { data } = await fetchSaleOrders({
          variables: {
            saleOrdersId,
          },
        });

        const options = (data?.saleOrders ?? []).map((s) => ({
          id: s,
          name: s,
        }));

        setCurrentOptions(options);
      } catch (error) {
        console.error(error);
      }
    }
  }, [fetchSaleOrders, saleOrdersId]);

  return {
    currentOptions,
    setCurrentOptions,
    onVisibilityChange,
  };
}
