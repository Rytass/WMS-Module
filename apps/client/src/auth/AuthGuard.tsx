import dynamic from 'next/dynamic';

const AuthorizedAdminPage = dynamic(() => import('./AuthorizedAdminPage'), {
  ssr: false,
});

const AuthGuard: FC = ({ children }) => {
  return <AuthorizedAdminPage>{children}</AuthorizedAdminPage>;
};

export default AuthGuard;
