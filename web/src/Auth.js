import React, { useState } from 'react';
import { supabase } from './client/supabaseClient.js';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import './Auth.css';

function Auth() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const validatePassword = (password) => {
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        return hasUpperCase && hasLowerCase && hasNumbers;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        if (!validatePassword(password)) {
            setError("Password harus mengandung setidaknya satu huruf besar, satu huruf kecil, dan satu angka.");
            setLoading(false);
            return;
        }

        try {
            if (isLogin) {
                const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password });

                if (loginError) throw new Error(loginError.message);

                setUser(data.user);
                navigate('/dashboard');
            } else {
                const { user: newUser, error: registerError } = await supabase.auth.signUp({ email, password });

                if (registerError) {
                    console.error('Registration error:', registerError);
                    throw new Error(registerError.message);
                }

                if (newUser) {
                    const { error: insertError } = await supabase
                        .from('users')
                        .insert([{ user_id: newUser.id, email: newUser.email }]);

                    if (insertError) throw new Error(insertError.message);

                    setUser(newUser);
                    navigate('/dashboard');
                } else {
                    throw new Error("User not created.");
                }
            }
        } catch (error) {
            setError(error.message);
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <h2>{isLogin ? 'Login' : 'Register'}</h2>
            {user && <p>Welcome, {user.email}!</p>}
            <form onSubmit={handleSubmit}>
                <div className="input-container">
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div className="input-container">
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <button type="submit" disabled={loading}>
                    {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : (isLogin ? 'Login' : 'Register')}
                </button>
            </form>
            <button className="toggle-button" onClick={() => setIsLogin(!isLogin)}>
                {isLogin ? 'Need an account? Register' : 'Have an account? Login'}
            </button>
            {error && <p style={{ color: 'red' }}>Error: {error}</p>}
        </div>
    );
}

export default Auth;
