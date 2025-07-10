import { h } from 'preact';
import { Router } from 'preact-router';
import { createHashHistory } from 'history';
import { AuthProvider } from './context/Auth';
import { Toaster } from 'react-hot-toast';

import Header from './components/Header';
import Home from './pages/Home';
import Favorites from './pages/Favorites';
import History from './pages/History';
import Watch from './pages/Watch';
import SearchPage from './pages/Search'; // Assuming we move search.jsx to pages/Search.jsx
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import PrivateRoute from './components/PrivateRoute';

const App = () => (
    <AuthProvider>
        <div class="app">
            <Toaster
                position="top-center"
                reverseOrder={false}
                gutter={8}
                containerClassName=""
                containerStyle={{}}
                toastOptions={{
                    // Define default options
                    className: '',
                    duration: 5000,
                    style: {
                        background: '#363636',
                        color: '#fff',
                    },

                    // Default options for specific types
                    success: {
                        duration: 3000,
                        theme: {
                            primary: 'green',
                            secondary: 'black',
                        },
                    },
                }}
            />
            <Header />
            <main>
                <Router history={createHashHistory()}>
                    <Home path="/" />
                    <PrivateRoute component={Favorites} path="/favorites" />
                    <PrivateRoute component={History} path="/history" />
                    <Watch path="/watch" />
                    <SearchPage path="/search" />
                    <Login path="/login" />
                    <SignUp path="/signup" />
                </Router>
            </main>
            <footer>
                <p>&copy; 2024 FreeStream. All Rights Reserved.</p>
            </footer>
        </div>
    </AuthProvider>
);

export default App; 