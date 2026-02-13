import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../i18n/I18nContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'signin' | 'signup';
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, mode: initialMode }) => {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmailSent, setForgotEmailSent] = useState(false);

  const { signIn, signUp, resetPasswordForEmail } = useAuth();
  const { t } = useI18n();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password);
        if (error) throw error;
        onClose();
      } else {
        const { error, data } = await signUp(email, password, fullName);
        if (error) throw error;
        
        // Show confirmation message for signup
        if (data?.user && !data.session) {
          setShowConfirmation(true);
        } else {
          onClose();
        }
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">
            {showForgotPassword ? t.auth.resetPassword : showConfirmation ? t.auth.checkEmail : (mode === 'signin' ? t.auth.signIn : t.auth.signUp)}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {showForgotPassword ? (
          forgotEmailSent ? (
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                </svg>
              </div>
              <h3 className="text-lg font-medium mb-2">{t.auth.emailSent}</h3>
              <p className="text-gray-600 mb-4" dangerouslySetInnerHTML={{ __html: t.auth.emailSentDesc.replace('{email}', email) }} />
              <p className="text-sm text-gray-500 mb-4">
                {t.auth.checkSpam}
              </p>
              <button
                onClick={() => { setShowForgotPassword(false); setForgotEmailSent(false); }}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
              >
                {t.auth.backToSignIn}
              </button>
            </div>
          ) : (
            <div>
              <p className="text-gray-600 mb-4">
                {t.auth.forgotDesc}
              </p>
              <form onSubmit={async (e) => {
                e.preventDefault();
                setLoading(true);
                setError('');
                try {
                  const { error } = await resetPasswordForEmail(email);
                  if (error) throw error;
                  setForgotEmailSent(true);
                } catch (err: any) {
                  setError(err.message);
                } finally {
                  setLoading(false);
                }
              }}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t.auth.email}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    autoFocus
                  />
                </div>
                {error && <div className="mb-4 text-red-600 text-sm">{error}</div>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? t.auth.sending : t.auth.sendResetLink}
                </button>
              </form>
              <div className="mt-4 text-center">
                <button
                  onClick={() => { setShowForgotPassword(false); setError(''); }}
                  className="text-blue-600 hover:text-blue-700"
                >
                  {t.auth.backToSignIn}
                </button>
              </div>
            </div>
          )
        ) : showConfirmation ? (
          <div className="text-center">
            <div className="mb-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 className="text-lg font-medium mb-2">{t.auth.registrationSuccess}</h3>
              <p className="text-gray-600 mb-4" dangerouslySetInnerHTML={{ __html: t.auth.confirmationSent.replace('{email}', email) }} />
              <p className="text-sm text-gray-500">
                {t.auth.confirmationSpam}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
            >
              {t.auth.gotIt}
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.auth.fullName}
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.auth.email}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.auth.password}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="mb-4 text-red-600 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t.auth.loading : (mode === 'signin' ? t.auth.signIn : t.auth.signUp)}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            className="text-blue-600 hover:text-blue-700"
          >
            {mode === 'signin' 
              ? t.auth.noAccount
              : t.auth.hasAccount
            }
          </button>
          {mode === 'signin' && (
            <div className="mt-2">
              <button
                onClick={() => { setShowForgotPassword(true); setError(''); }}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                {t.auth.forgotPassword}
              </button>
            </div>
          )}
        </div>
        </>
        )}
      </div>
    </div>
  );
};

export default AuthModal;