import { ReactNode } from 'react';
import { Typography, cx } from '@mezzanine-ui/react';
import classes from './index.module.scss';

interface SectionWrapperProps {
  title?: string;
  className?: string;
  children: ReactNode;
  action?: ReactNode;
  grayBackground?: boolean;
}

function SectionWrapper({
  title,
  className,
  children,
  action,
  grayBackground = false,
}: SectionWrapperProps) {
  return (
    <div
      className={cx(classes.host, className, {
        [classes.grayBackground]: grayBackground,
      })}
    >
      {(title || action) && (
        <div className={classes.titleWrapper}>
          {title && (
            <Typography variant="h3" color="text-neutral-solid">
              {title}
            </Typography>
          )}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export default SectionWrapper;
