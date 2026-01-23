import {
  ListIcon,
  FolderMoveIcon,
  SearchHistoryIcon,
  FileSearchIcon,
  SystemIcon,
} from '@mezzanine-ui/icons';
import { NextPath } from '../utils/nextpath';

export function useRoutes() {
  return [
    {
      title: '庫存查詢',
      icon: ListIcon,
      children: [
        {
          title: '庫存清單',
          href: NextPath.STOCKS,
        },
        {
          title: '地圖清單',
          href: NextPath.MAPS,
        },
        {
          title: '標籤查詢',
          href: '/1-3',
        },
      ],
    },
    {
      title: '庫存異動',
      icon: FolderMoveIcon,
      href: NextPath.STOCKMOVEMENT,
    },
    {
      title: '異動紀錄',
      icon: SearchHistoryIcon,
      href: NextPath.CHANGEHISTORY,
    },
    {
      title: '盤點',
      icon: FileSearchIcon,
      href: NextPath.STOCKTAKING,
    },
    {
      title: '主檔管理',
      icon: SystemIcon,
      children: [
        {
          title: '載具管理',
          href: NextPath.LOADERSMANAGEMENT,
        },
        {
          title: '庫位管理',
          href: NextPath.LOCATIONSMANAGEMENT,
        },
        {
          title: '料號管理',
          href: NextPath.MATERIALSMANAGEMENT,
        },
        {
          title: '出庫單',
          href: NextPath.SHIPINVENTORYORDERS,
        },
        {
          title: '入庫單',
          href: NextPath.RECEIVEINVENTORYORDERS,
        },
      ],
    },
  ];
}
