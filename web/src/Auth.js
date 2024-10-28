import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { supabase } from './client/supabaseClient.js';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';  
import './styles/Auth.css';

function Auth() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
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
                if (loginError) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Login Gagal',
                        text: 'Email atau kata sandi tidak valid.',
                        confirmButtonText: 'Tutup'
                    });
                    return;
                }

                if (data.user) {
                    setUser(data.user);
                    navigate('/dashboard');
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Login Gagal',
                        text: 'Email atau kata sandi tidak valid.',
                        confirmButtonText: 'Tutup'
                    });
                }
            } else {
                const { user: newUser, error: registerError } = await supabase.auth.signUp({ email, password });
                if (registerError) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Gagal Mendaftar',
                        text: 'Pengguna Sudah Terdaftar',
                        confirmButtonText: 'Tutup'
                    });
                    return;
                }

                if (newUser) {
                    const { error: insertError } = await supabase.from('users').insert([{ user_id: newUser.id, email: newUser.email }]);
                    if (insertError) {
                        Swal.fire({
                            icon: 'error',
                            title: 'Gagal Menyimpan Data',
                            text: insertError.message || 'Terjadi kesalahan saat menyimpan data pengguna.',
                            confirmButtonText: 'Tutup'
                        });
                        return;
                    }

                    Swal.fire({
                        icon: 'success',
                        title: 'Berhasil Mendaftar',
                        text: 'Anda telah berhasil mendaftar. Silakan masuk ke akun Anda.',
                        confirmButtonText: 'Tutup'
                    }).then(() => {
                        navigate('/dashboard');
                    });
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
            <h2>{isLogin ? 'Masuk' : 'Daftar'}</h2>
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
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Kata Sandi"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        maxLength={20}
                    />
                    <span className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
                        <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                    </span>
                </div>
                <button type="submit" disabled={loading}>
                    {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : (isLogin ? 'Masuk' : 'Daftar')}
                </button>
            </form>
            <button className="toggle-button" onClick={() => setIsLogin(!isLogin)}>
                {isLogin ? 'Belum ada Akun? Daftar' : 'Punya Akun? Masuk'}
            </button>
            {error && <p style={{ color: 'red' }}>Error: {error}</p>}
        </div>
    );
}

export default Auth;
