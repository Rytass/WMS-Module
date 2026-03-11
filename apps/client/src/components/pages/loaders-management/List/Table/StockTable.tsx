interface StockTableProps {
  loaderId: string;
}

const StockTable: FC<StockTableProps> = ({ loaderId }) => {
  return <div>StockTable: {loaderId}</div>;
};

export default StockTable;
