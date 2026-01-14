import classes from './index.module.scss';

const Main: FC = ({ children }) => {
  return (
    <main className={classes.main}>
      <div className={classes.page}>{children}</div>
    </main>
  );
};

export default Main;
