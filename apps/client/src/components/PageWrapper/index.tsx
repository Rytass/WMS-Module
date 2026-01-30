import { ReactElement, ReactNode } from 'react';
import { useRouter } from 'next/router';
import { Breadcrumb, PageFooter, ButtonProps } from '@mezzanine-ui/react';
import ContentHeader from '@mezzanine-ui/react/ContentHeader';
import { Url } from 'next/dist/shared/lib/router/router';
import classes from './index.module.scss';

interface PageWrapperProps {
  title: string;
  titleButtons?: ReactElement<ButtonProps> | ReactElement<ButtonProps>[];
  children: ReactNode;
  breadcrumb?: { label: string; href?: Url }[];
  haveBack?: boolean;
  onBack?: (() => void) | (() => Promise<void>);
  haveFooter?: boolean;
}

function PageWrapper({
  title,
  titleButtons,
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
            size="sub"
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
