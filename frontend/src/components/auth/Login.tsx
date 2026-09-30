import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import OAuthButton from './OAuthButton';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services/authService';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    // Check for OAuth callback token
    const token = searchParams.get('token');
    if (token) {
      setLoading(true);
      authService
        .handleCallback(token)
        .then(({ user, token: authToken }) => {
          setUser(user, authToken);
          navigate('/');
        })
        .catch((error) => {
          console.error('Auth callback error:', error);
          setLoading(false);
        });
    }
  }, [searchParams, navigate, setUser, setLoading]);

  const handleGoogleLogin = () => {
    authService.googleLogin();
  };

  const handleGitHubLogin = () => {
    authService.githubLogin();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-light dark:bg-brand-dark px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-6xl font-handwritten text-gray-800 dark:text-white mb-4">
            Tudu
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            Your friendly todo app
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 text-center">
            Welcome back
          </h2>

          <div className="space-y-4">
            <OAuthButton provider="google" onClick={handleGoogleLogin} />
            <OAuthButton provider="github" onClick={handleGitHubLogin} />
          </div>

          <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
