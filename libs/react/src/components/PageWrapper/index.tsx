import { ReactElement, ReactNode } from 'react';
import { useWmsRouter } from '../../router/context';
import { Breadcrumb, PageFooter, ButtonProps, cx } from '@mezzanine-ui/react';
import ContentHeader from '@mezzanine-ui/react/ContentHeader';
import classes from './index.module.scss';

interface PageWrapperProps {
  title: string;
  titleButtons?: ReactElement<ButtonProps> | ReactElement<ButtonProps>[];
  children: ReactNode;
  breadcrumb?: { label: string; href?: string }[];
  haveBack?: boolean;
  onBack?: (() => void) | (() => Promise<void>);
  haveFooter?: boolean;
  moreGap?: boolean;
}

function PageWrapper({
  title,
  titleButtons,
  children,
  breadcrumb,
  haveBack = false,
  onBack,
  haveFooter = false,
  moreGap = false,
}: PageWrapperProps) {
  const { back, replace } = useWmsRouter();

  return (
    <>
      <div
        className={cx(classes.host, {
          [classes.moreGap]: moreGap,
        })}
      >
        <div className={classes.pageHeader}>
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
          <ContentHeader
            title={title}
            onBackClick={
              haveBack
                ? onBack
                  ? async () => {
                      await onBack();
                    }
                  : back
                : undefined
            }
          >
            {titleButtons}
          </ContentHeader>
        </div>
        {children}
      </div>
      {haveFooter && (
        <PageFooter
          className={classes.pageFooter}
          type="standard"
          actions={{
            primaryButton: {
              type: 'button',
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
