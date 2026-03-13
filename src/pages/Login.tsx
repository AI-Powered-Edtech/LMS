import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export function Login() {
    const { user, signIn, signUp, loading } = useAuth();
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.spinner} />
            </div>
        );
    }

    if (user) {
        return <Navigate to="/" replace />;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);

        try {
            if (mode === 'login') {
                const { error: err } = await signIn(email, password);
                if (err) setError(err.message);
            } else {
                const { error: err } = await signUp(email, password, firstName, lastName);
                if (err) setError(err.message);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const fillDemo = (role: string) => {
        const demoPassword = import.meta.env.VITE_DEMO_PASSWORD;
        if (!demoPassword) {
            console.warn("Demo password not configured");
        }
        setEmail(`demo.${role}@edusync.dev`);
        setPassword(demoPassword ?? '');
        setMode('login');
        setError('');
    };

    return (
        <div style={styles.container}>
            <div style={styles.card}>
                <div style={styles.logo}>
                    <span style={styles.logoIcon}>📚</span>
                    <h1 style={styles.title}>EduSync</h1>
                    <p style={styles.subtitle}>Learning Management System</p>
                </div>

                <div style={styles.tabs}>
                    <button
                        style={mode === 'login' ? styles.activeTab : styles.tab}
                        onClick={() => { setMode('login'); setError(''); }}
                    >
                        Sign In
                    </button>
                    <button
                        style={mode === 'register' ? styles.activeTab : styles.tab}
                        onClick={() => { setMode('register'); setError(''); }}
                    >
                        Register
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={styles.form}>
                    {mode === 'register' && (
                        <div style={styles.nameRow}>
                            <div style={styles.field}>
                                <label style={styles.label}>First Name</label>
                                <input
                                    style={styles.input}
                                    value={firstName}
                                    onChange={e => setFirstName(e.target.value)}
                                    placeholder="John"
                                    required
                                />
                            </div>
                            <div style={styles.field}>
                                <label style={styles.label}>Last Name</label>
                                <input
                                    style={styles.input}
                                    value={lastName}
                                    onChange={e => setLastName(e.target.value)}
                                    placeholder="Doe"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    <div style={styles.field}>
                        <label style={styles.label}>Email</label>
                        <input
                            type="email"
                            style={styles.input}
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                        />
                    </div>

                    <div style={styles.field}>
                        <label style={styles.label}>Password</label>
                        <input
                            type="password"
                            style={styles.input}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            minLength={6}
                        />
                    </div>

                    {error && <div style={styles.error}>{error}</div>}

                    <button
                        type="submit"
                        style={styles.submitBtn}
                        disabled={submitting}
                    >
                        {submitting ? 'Loading...' : mode === 'login' ? 'Sign In' : 'Create Account'}
                    </button>
                </form>

                <div style={styles.demo}>
                    <p style={styles.demoTitle}>Demo Accounts</p>
                    <div style={styles.demoButtons}>
                        <button style={styles.demoBtn} onClick={() => fillDemo('student')}>
                            🎓 Student
                        </button>
                        <button style={styles.demoBtn} onClick={() => fillDemo('teacher')}>
                            👩‍🏫 Teacher
                        </button>
                        <button style={styles.demoBtn} onClick={() => fillDemo('admin')}>
                            🛡️ Admin
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

const styles: Record<string, React.CSSProperties> = {
    container: {
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        padding: '1rem',
    },
    card: {
        background: '#1e293b',
        borderRadius: '1rem',
        padding: '2.5rem',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
        border: '1px solid rgba(255,255,255,0.1)',
    },
    logo: {
        textAlign: 'center' as const,
        marginBottom: '2rem',
    },
    logoIcon: { fontSize: '3rem' },
    title: {
        color: '#f1f5f9',
        fontSize: '1.75rem',
        fontWeight: 700,
        margin: '0.5rem 0 0.25rem',
    },
    subtitle: {
        color: '#94a3b8',
        fontSize: '0.875rem',
        margin: 0,
    },
    tabs: {
        display: 'flex',
        gap: '0.5rem',
        marginBottom: '1.5rem',
        background: '#0f172a',
        borderRadius: '0.5rem',
        padding: '4px',
    },
    tab: {
        flex: 1,
        padding: '0.625rem',
        border: 'none',
        background: 'transparent',
        color: '#94a3b8',
        borderRadius: '0.375rem',
        cursor: 'pointer',
        fontWeight: 500,
    },
    activeTab: {
        flex: 1,
        padding: '0.625rem',
        border: 'none',
        background: '#3b82f6',
        color: '#fff',
        borderRadius: '0.375rem',
        cursor: 'pointer',
        fontWeight: 600,
    },
    form: { display: 'flex', flexDirection: 'column' as const, gap: '1rem' },
    nameRow: { display: 'flex', gap: '0.75rem' },
    field: { display: 'flex', flexDirection: 'column' as const, gap: '0.25rem', flex: 1 },
    label: { color: '#cbd5e1', fontSize: '0.8rem', fontWeight: 500 },
    input: {
        padding: '0.75rem',
        borderRadius: '0.5rem',
        border: '1px solid rgba(255,255,255,0.15)',
        background: '#0f172a',
        color: '#f1f5f9',
        fontSize: '0.9rem',
        outline: 'none',
    },
    error: {
        background: 'rgba(239,68,68,0.15)',
        color: '#fca5a5',
        padding: '0.75rem',
        borderRadius: '0.5rem',
        fontSize: '0.8rem',
        border: '1px solid rgba(239,68,68,0.3)',
    },
    submitBtn: {
        padding: '0.875rem',
        borderRadius: '0.5rem',
        border: 'none',
        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
        color: '#fff',
        fontWeight: 600,
        fontSize: '1rem',
        cursor: 'pointer',
        marginTop: '0.5rem',
    },
    spinner: {
        width: '40px',
        height: '40px',
        border: '3px solid rgba(255,255,255,0.2)',
        borderTop: '3px solid #3b82f6',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
    },
    demo: {
        marginTop: '1.5rem',
        paddingTop: '1.5rem',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        textAlign: 'center' as const,
    },
    demoTitle: { color: '#64748b', fontSize: '0.75rem', margin: '0 0 0.75rem', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
    demoButtons: { display: 'flex', gap: '0.5rem', justifyContent: 'center' },
    demoBtn: {
        padding: '0.5rem 1rem',
        borderRadius: '0.375rem',
        border: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(255,255,255,0.05)',
        color: '#94a3b8',
        cursor: 'pointer',
        fontSize: '0.8rem',
    },
};
