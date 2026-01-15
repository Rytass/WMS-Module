import { ReactNode } from 'react';
import { useRouter } from 'next/router';
import { ChevronLeftIcon } from '@mezzanine-ui/icons';
import { Breadcrumb, Typography, Button } from '@mezzanine-ui/react';
import { Url } from 'next/dist/shared/lib/router/router';
import classes from './index.module.scss';

interface PageWrapperProps {
  title: string;
  children: ReactNode;
  breadcrumb?: { label: string; href?: Url }[];
  haveBack?: boolean;
}

function PageWrapper({
  title,
  children,
  breadcrumb,
  haveBack = false,
}: PageWrapperProps) {
  const { back, replace } = useRouter();

  return (
    <div className={classes.host}>
      {breadcrumb && (
        <Breadcrumb
          items={breadcrumb.map((b) => ({
            label: b.label,
            onClick: () => {
              if (b.href) {
                replace(b.href);
              }
            },
          }))}
        />
      )}
      <div className={classes.titleWrapper}>
        {haveBack && (
          <Button
            type="button"
            icon={{ position: 'icon-only', src: ChevronLeftIcon }}
            variant="base-tertiary"
            size="sub"
            onClick={back}
          />
        )}
        <Typography variant="h2" color="text-neutral-solid">
          {title}
        </Typography>
      </div>
      {children}
    </div>
  );
}

export default PageWrapper;
