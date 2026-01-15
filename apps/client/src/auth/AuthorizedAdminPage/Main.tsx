import Navigation from './Navigation';
import classes from './index.module.scss';

const Main: FC = ({ children }) => {
  return (
    <main className={classes.main}>
      <Navigation />
      <div className={classes.page}>{children}</div>
    </main>
  );
};

export default Main;
