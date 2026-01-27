import { ReactNode } from 'react';
import { useRouter } from 'next/router';
import { ChevronLeftIcon } from '@mezzanine-ui/icons';
import {
  PageHeader,
  Breadcrumb,
  Button,
  PageFooter,
} from '@mezzanine-ui/react';
import ContentHeader from '@mezzanine-ui/react/ContentHeader';
import { Url } from 'next/dist/shared/lib/router/router';
import classes from './index.module.scss';

interface PageWrapperProps {
  title: string;
  children: ReactNode;
  breadcrumb?: { label: string; href?: Url }[];
  haveBack?: boolean;
  onBack?: (() => void) | (() => Promise<void>);
  haveFooter?: boolean;
}

function PageWrapper({
  title,
  children,
  breadcrumb,
  haveBack = false,
  onBack,
  haveFooter = false,
}: PageWrapperProps) {
  const { back, replace } = useRouter();

  return (
    <>
      <div className={classes.host}>
        <PageHeader className={classes.pageHeader}>
          {breadcrumb && (
            <Breadcrumb
              items={breadcrumb.map((b) => ({
                name: b.label,
                type: 'button',
                onClick: () => {
                  if (b.href) {
                    replace(b.href);
                  }
                },
              }))}
            />
          )}
          <ContentHeader title={title}>
            {haveBack && (
              <Button
                type="button"
                icon={ChevronLeftIcon}
                iconType="icon-only"
                variant="base-tertiary"
                size="sub"
                onClick={
                  onBack
                    ? async () => {
                        await onBack();
                      }
                    : back
                }
              />
            )}
          </ContentHeader>
        </PageHeader>
        {children}
      </div>
      {haveFooter && (
        <PageFooter
          className={classes.pageFooter}
          type="standard"
          actions={{
            primaryButton: {
              children: '關閉',
              onClick: back,
            },
          }}
        />
      )}
    </>
  );
}

export default PageWrapper;
