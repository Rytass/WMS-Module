import { useCallback, Key } from 'react';
import { Tab, TabItem } from '@mezzanine-ui/react';
import { parseAsString, useQueryState } from 'nuqs';

interface PageTabsProps {
  tabs: {
    id: string;
    name: string;
  }[];
  setActiveTab?: (tabId: string) => void;
}

const PageTabs: FC<PageTabsProps> = ({ tabs, setActiveTab }) => {
  const [tabId, setTabId] = useQueryState(
    'tab',
    parseAsString.withDefault(tabs[0].id),
  );

  const onChange = useCallback(
    (tabId: Key) => {
      setTabId(tabId as string);
      setActiveTab?.(tabId as string);
    },
    [setActiveTab, setTabId],
  );

  return (
    <Tab activeKey={tabId} onChange={onChange} direction="horizontal">
      {tabs.map((tab) => (
        <TabItem key={tab.id}>{tab.name}</TabItem>
      ))}
    </Tab>
  );
};

export default PageTabs;
