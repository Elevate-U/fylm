import { h } from 'preact';
import { route } from 'preact-router';
import { useAuth } from '../context/Auth';

const PrivateRoute = ({ component: Component, ...rest }) => {
  const { user } = useAuth();

  if (user) {
    return <Component {...rest} />;
  } else {
    route('/login', true);
    return null;
  }
};

export default PrivateRoute; 