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
          href: '/1-1',
        },
        {
          title: '地圖清單',
          href: '/1-2',
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
      href: '/2',
    },
    {
      title: '異動紀錄',
      icon: SearchHistoryIcon,
      href: NextPath.CHANGEHISTORY,
    },
    {
      title: '盤點',
      icon: FileSearchIcon,
      href: '/4',
    },
    {
      title: '主檔管理',
      icon: SystemIcon,
      children: [
        {
          title: '載具管理',
          href: '/5-1',
        },
        {
          title: '庫位管理',
          href: '/5-2',
        },
        {
          title: '料號管理',
          href: '/5-3',
        },
        {
          title: '出庫單',
          href: NextPath.SHIPINVENTORYORDER,
        },
        {
          title: '入庫單',
          href: NextPath.RECEIVEINVENTORYORDER,
        },
      ],
    },
  ];
}
