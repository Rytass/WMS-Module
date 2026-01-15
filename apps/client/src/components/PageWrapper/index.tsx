import { ReactNode } from 'react';
import { useRouter } from 'next/router';
import { ChevronLeftIcon } from '@mezzanine-ui/icons';
import { Typography, Button } from '@mezzanine-ui/react';
import classes from './index.module.scss';

interface PageWrapperProps {
  title: string;
  children: ReactNode;
  haveBack?: boolean;
}

function PageWrapper({ title, children, haveBack = false }: PageWrapperProps) {
  const { back } = useRouter();

  return (
    <div className={classes.host}>
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
