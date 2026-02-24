import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import type { PasswordStrength } from '../auth/types';
import { useAuth } from '../auth/AuthContext';
import { checkRateLimit } from '../auth/authService';
import { DNAIcon } from '../components/icons/DNAIcon';

// ── Password Strength Utility ─────────────────────────────────────────────────

export function getPasswordStrength(password: string): PasswordStrength {
    const checks = {
        minLength: password.length >= 8,
        hasUppercase: /[A-Z]/.test(password),
        hasLowercase: /[a-z]/.test(password),
        hasNumber: /[0-9]/.test(password),
        hasSpecial: /[^A-Za-z0-9]/.test(password),
    };
    const passed = Object.values(checks).filter(Boolean).length;
    if (password.length < 4) return { score: 0, label: 'Too Short', color: '#ef4444', checks };
    if (passed <= 2) return { score: 1, label: 'Weak', color: '#ef4444', checks };
    if (passed === 3) return { score: 2, label: 'Fair', color: '#f59e0b', checks };
    if (passed === 4) return { score: 3, label: 'Strong', color: '#10b981', checks };
    return { score: 4, label: 'Very Strong', color: '#059669', checks };
}

// ── Shared Styles ─────────────────────────────────────────────────────────────

const S = {
    page: {
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column' as const,
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: "'Inter', system-ui, sans-serif",
    },
    card: {
        width: '100%',
        maxWidth: '460px',
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '24px',
        padding: '40px',
        boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
    },
    logo: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '32px',
        justifyContent: 'center' as const,
    },
    logoIcon: {
        width: '48px',
        height: '48px',
        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
        borderRadius: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 8px 25px rgba(59,130,246,0.35)',
    },
    label: {
        display: 'block',
        fontSize: '13px',
        fontWeight: 700,
        color: '#e2e8f0',
        marginBottom: '8px',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.8px',
    },
    input: {
        width: '100%',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '12px',
        padding: '13px 16px',
        color: '#fff',
        fontSize: '15px',
        outline: 'none',
        boxSizing: 'border-box' as const,
        fontFamily: "'Inter', system-ui, sans-serif",
        transition: 'border-color 0.2s',
    },
    inputFocus: {
        borderColor: 'rgba(59,130,246,0.6)',
    },
    primaryBtn: {
        width: '100%',
        padding: '15px',
        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
        color: '#fff',
        fontWeight: 800,
        fontSize: '15px',
        border: 'none',
        borderRadius: '14px',
        cursor: 'pointer',
        boxShadow: '0 10px 30px rgba(59,130,246,0.35)',
        transition: 'all 0.3s',
        fontFamily: "'Inter', system-ui, sans-serif",
        letterSpacing: '0.3px',
    },
    errorBox: {
        background: 'rgba(220,38,38,0.12)',
        border: '1px solid rgba(220,38,38,0.3)',
        borderRadius: '12px',
        padding: '13px 16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        marginBottom: '20px',
    },
    successBox: {
        background: 'rgba(16,185,129,0.1)',
        border: '1px solid rgba(16,185,129,0.3)',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        gap: '12px',
        alignItems: 'flex-start',
    },
    divider: {
        height: '1px',
        background: 'rgba(255,255,255,0.08)',
        margin: '24px 0',
    },
    trustRow: {
        display: 'flex',
        gap: '10px',
        justifyContent: 'center' as const,
        flexWrap: 'wrap' as const,
        marginTop: '20px',
    },
    badge: {
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        padding: '5px 12px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '100px',
        fontSize: '11px',
        fontWeight: 600,
        color: '#64748b',
    },
};

// ── Sub-components ────────────────────────────────────────────────────────────

interface PasswordInputProps {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    id: string;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({ value, onChange, placeholder = 'Enter password', id }) => {
    const [show, setShow] = useState(false);
    const [focused, setFocused] = useState(false);
    return (
        <div style={{ position: 'relative' }}>
            <input
                id={id}
                type={show ? 'text' : 'password'}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                autoComplete="current-password"
                style={{ ...S.input, paddingRight: '48px', ...(focused ? S.inputFocus : {}) }}
            />
            <button
                type="button"
                onClick={() => setShow(s => !s)}
                tabIndex={-1}
                aria-label={show ? 'Hide password' : 'Show password'}
                style={{
                    position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '4px',
                }}
            >
                <i className={`fas ${show ? 'fa-eye-slash' : 'fa-eye'}`} style={{ fontSize: '15px' }} />
            </button>
        </div>
    );
};

interface PasswordStrengthBarProps { password: string }

export const PasswordStrengthBar: React.FC<PasswordStrengthBarProps> = ({ password }) => {
    if (!password) return null;
    const strength = getPasswordStrength(password);
    return (
        <div style={{ marginTop: '10px' }}>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                {[1, 2, 3, 4].map(i => (
                    <div key={i} style={{
                        flex: 1, height: '4px', borderRadius: '4px',
                        background: i <= strength.score ? strength.color : 'rgba(255,255,255,0.1)',
                        transition: 'background 0.3s',
                    }} />
                ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: strength.color }}>{strength.label}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {[
                    { key: 'minLength', label: '8+ chars' },
                    { key: 'hasUppercase', label: 'Uppercase' },
                    { key: 'hasNumber', label: 'Number' },
                    { key: 'hasSpecial', label: 'Special (!@#...)' },
                ].map(({ key, label }) => {
                    const ok = strength.checks[key as keyof typeof strength.checks];
                    return (
                        <span key={key} style={{
                            fontSize: '10px', fontWeight: 600,
                            color: ok ? '#10b981' : '#475569',
                            display: 'flex', alignItems: 'center', gap: '4px',
                        }}>
                            <i className={`fas ${ok ? 'fa-check-circle' : 'fa-circle'}`} style={{ fontSize: '9px' }} />
                            {label}
                        </span>
                    );
                })}
            </div>
        </div>
    );
};

const TrustBadges: React.FC = () => (
    <div style={S.trustRow}>
        {[
            { icon: 'fa-shield-alt', color: '#10b981', label: 'HIPAA Compliant' },
            { icon: 'fa-lock', color: '#3b82f6', label: '256-bit SSL' },
            { icon: 'fa-user-shield', color: '#8b5cf6', label: 'Data Encrypted' },
        ].map(b => (
            <div key={b.label} style={S.badge}>
                <i className={`fas ${b.icon}`} style={{ color: b.color, fontSize: '10px' }} />
                <span>{b.label}</span>
            </div>
        ))}
    </div>
);

const AuthHeader: React.FC = () => (
    <div style={S.logo}>
        <div style={S.logoIcon}>
            <i className="fas fa-dna" style={{ fontSize: '22px', color: '#fff' }} />
        </div>
        <div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <DNAIcon size={22} className="" style={{ color: '#3b82f6' }} /> Your Genes
            </div>
            <div style={{ fontSize: '10px', color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '1.5px', fontWeight: 600 }}>
                Patient Portal
            </div>
        </div>
    </div>
);

// ══════════════════════════════════════════════════════════════════════════════
// LOGIN PAGE
// ══════════════════════════════════════════════════════════════════════════════

export const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const { login, isLoading } = useAuth();
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [identifierFocused, setIdentifierFocused] = useState(false);
    const [lockoutMs, setLockoutMs] = useState(0);

    // Lockout countdown
    React.useEffect(() => {
        if (lockoutMs <= 0) return;
        const t = setInterval(() => setLockoutMs(p => Math.max(0, p - 1000)), 1000);
        return () => clearInterval(t);
    }, [lockoutMs]);

    const formatCountdown = (ms: number) => {
        const mins = Math.floor(ms / 60000);
        const secs = Math.floor((ms % 60000) / 1000);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!identifier.trim()) { setError('Please enter your email, username, or phone number.'); return; }
        if (!password) { setError('Please enter your password.'); return; }

        // Check rate limit before submitting
        const rl = checkRateLimit(identifier.toLowerCase().trim());
        if (rl.locked) {
            setLockoutMs(rl.remainingMs);
            setError(`Too many failed attempts. Try again in ${formatCountdown(rl.remainingMs)}.`);
            return;
        }

        try {
            await login({ identifier, password, rememberMe });
            navigate('/dashboard');
        } catch (err: any) {
            const msg: string = err.message || 'Login failed.';
            setError(msg);
            if (msg.includes('locked')) {
                const rl2 = checkRateLimit(identifier.toLowerCase().trim());
                setLockoutMs(rl2.remainingMs);
            }
        }
    };

    return (
        <div style={S.page}>
            {/* Home button — top-left corner */}
            <Link
                to="/"
                className="fixed top-4 left-4 z-50 flex items-center space-x-2 px-4 py-2 bg-slate-800/50 backdrop-blur-md rounded-lg border border-slate-700 text-white hover:bg-slate-700/50 transition-all"
            >
                <DNAIcon size={20} className="text-blue-500" />
                <span className="text-sm font-medium">Home</span>
            </Link>
            <div style={S.card}>
                <AuthHeader />

                <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', marginBottom: '6px', textAlign: 'center' }}>
                    Welcome back
                </h2>
                <p style={{ fontSize: '14px', color: '#64748b', textAlign: 'center', marginBottom: '28px' }}>
                    Sign in to your Patient Portal
                </p>

                {error && (
                    <div style={S.errorBox} role="alert">
                        <i className="fas fa-exclamation-triangle" style={{ color: '#ef4444', marginTop: '1px', flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                            <span style={{ color: '#fca5a5', fontSize: '13px', fontWeight: 500 }}>{error}</span>
                            {lockoutMs > 0 && (
                                <div style={{ color: '#ef4444', fontSize: '18px', fontWeight: 800, marginTop: '6px', fontFamily: 'monospace' }}>
                                    {formatCountdown(lockoutMs)}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                    <div style={{ marginBottom: '18px' }}>
                        <label htmlFor="login-identifier" style={S.label}>Email / Username / Phone</label>
                        <input
                            id="login-identifier"
                            type="text"
                            value={identifier}
                            onChange={e => setIdentifier(e.target.value)}
                            placeholder="e.g. john@clinic.org"
                            onFocus={() => setIdentifierFocused(true)}
                            onBlur={() => setIdentifierFocused(false)}
                            autoComplete="username"
                            style={{ ...S.input, ...(identifierFocused ? S.inputFocus : {}) }}
                        />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label htmlFor="login-password" style={{ ...S.label, marginBottom: 0 }}>Password</label>
                            <button
                                type="button"
                                onClick={() => navigate('/forgot-password')}
                                style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '12px', cursor: 'pointer', fontWeight: 600, fontFamily: "'Inter', system-ui, sans-serif" }}
                            >
                                Forgot Password?
                            </button>
                        </div>
                        <PasswordInput id="login-password" value={password} onChange={setPassword} placeholder="Enter your password" />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
                        <input
                            id="remember-me"
                            type="checkbox"
                            checked={rememberMe}
                            onChange={e => setRememberMe(e.target.checked)}
                            style={{ width: '16px', height: '16px', accentColor: '#3b82f6', cursor: 'pointer' }}
                        />
                        <label htmlFor="remember-me" style={{ color: '#94a3b8', fontSize: '13px', cursor: 'pointer', userSelect: 'none' }}>
                            Remember me for 30 days
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || lockoutMs > 0}
                        style={{
                            ...S.primaryBtn,
                            opacity: isLoading || lockoutMs > 0 ? 0.6 : 1,
                            cursor: isLoading || lockoutMs > 0 ? 'not-allowed' : 'pointer',
                        }}
                    >
                        {isLoading
                            ? <><i className="fas fa-circle-notch fa-spin" style={{ marginRight: '8px' }} />Signing in...</>
                            : <><i className="fas fa-sign-in-alt" style={{ marginRight: '8px' }} />Sign In</>
                        }
                    </button>
                </form>

                <div style={S.divider} />

                <div style={{ textAlign: 'center' }}>
                    <span style={{ color: '#64748b', fontSize: '13px' }}>Don't have an account? </span>
                    <button
                        onClick={() => navigate('/register')}
                        style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif" }}
                    >
                        Create Account
                    </button>
                </div>
                <div style={{ textAlign: 'center', marginTop: '8px' }}>
                    <button
                        onClick={() => window.open('mailto:support@yourgenes.health', '_blank')}
                        style={{ background: 'none', border: 'none', color: '#475569', fontSize: '12px', cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif" }}
                    >
                        <i className="fas fa-headset" style={{ marginRight: '6px' }} />Contact Support
                    </button>
                </div>

                <TrustBadges />

                <p style={{ textAlign: 'center', fontSize: '11px', color: '#334155', marginTop: '16px', lineHeight: 1.6 }}>
                    Your genetic data is encrypted and secure. By signing in, you agree to our{' '}
                    <button style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '11px', textDecoration: 'underline', fontFamily: "'Inter', system-ui, sans-serif" }}>
                        Privacy Policy
                    </button>
                    .
                </p>
            </div>
        </div>
    );
};

// ══════════════════════════════════════════════════════════════════════════════
// REGISTER PAGE
// ══════════════════════════════════════════════════════════════════════════════

export const RegisterPage: React.FC = () => {
    const navigate = useNavigate();
    const { register, isLoading } = useAuth();
    const [form, setForm] = useState({
        fullName: '', email: '', username: '', phone: '',
        password: '', confirmPassword: '',
        agreedToTerms: false, hipaaConsent: false,
    });
    const [error, setError] = useState('');
    const [focused, setFocused] = useState<Record<string, boolean>>({});

    const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));
    const focusStyle = (k: string) => focused[k] ? S.inputFocus : {};

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!form.fullName.trim()) { setError('Please enter your full name.'); return; }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(form.email)) { setError('Please enter a valid email address.'); return; }
        if (form.username.length < 3) { setError('Username must be at least 3 characters.'); return; }
        if (!/^[a-zA-Z0-9_]+$/.test(form.username)) { setError('Username can only contain letters, numbers, and underscores.'); return; }
        if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }
        const strength = getPasswordStrength(form.password);
        if (strength.score < 2) { setError('Please choose a stronger password (at least Fair strength).'); return; }
        if (!form.agreedToTerms) { setError('Please agree to the Terms & Conditions.'); return; }
        if (!form.hipaaConsent) { setError('HIPAA consent is required to use this healthcare system.'); return; }

        try {
            await register({
                fullName: form.fullName, email: form.email, username: form.username,
                phone: form.phone || undefined, password: form.password,
                confirmPassword: form.confirmPassword,
                agreedToTerms: form.agreedToTerms, hipaaConsent: form.hipaaConsent,
            });
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Registration failed. Please try again.');
        }
    };

    return (
        <div style={{ ...S.page, padding: '24px', justifyContent: 'flex-start', overflowY: 'auto' }}>
            <div style={{ ...S.card, maxWidth: '520px', width: '100%', margin: '24px auto' }}>
                <AuthHeader />

                <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '4px', textAlign: 'center' }}>
                    Create Patient Account
                </h2>
                <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', marginBottom: '28px' }}>
                    Secure access to your pharmacogenomic data
                </p>

                {error && (
                    <div style={S.errorBox} role="alert">
                        <i className="fas fa-exclamation-triangle" style={{ color: '#ef4444', marginTop: '1px', flexShrink: 0 }} />
                        <span style={{ color: '#fca5a5', fontSize: '13px', fontWeight: 500 }}>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                    {/* Full Name */}
                    <div style={{ marginBottom: '16px' }}>
                        <label htmlFor="reg-fullname" style={S.label}>Full Name</label>
                        <input id="reg-fullname" type="text" value={form.fullName} onChange={e => set('fullName', e.target.value)}
                            placeholder="Dr. Jane Smith" autoComplete="name"
                            onFocus={() => setFocused(f => ({ ...f, fullName: true }))}
                            onBlur={() => setFocused(f => ({ ...f, fullName: false }))}
                            style={{ ...S.input, ...focusStyle('fullName') }} />
                    </div>

                    {/* Email */}
                    <div style={{ marginBottom: '16px' }}>
                        <label htmlFor="reg-email" style={S.label}>Email Address</label>
                        <input id="reg-email" type="email" value={form.email} onChange={e => set('email', e.target.value)}
                            placeholder="jane@clinic.org" autoComplete="email"
                            onFocus={() => setFocused(f => ({ ...f, email: true }))}
                            onBlur={() => setFocused(f => ({ ...f, email: false }))}
                            style={{ ...S.input, ...focusStyle('email') }} />
                    </div>

                    {/* Username + Phone Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                        <div>
                            <label htmlFor="reg-username" style={S.label}>Username</label>
                            <input id="reg-username" type="text" value={form.username} onChange={e => set('username', e.target.value)}
                                placeholder="dr_jane_smith" autoComplete="username"
                                onFocus={() => setFocused(f => ({ ...f, username: true }))}
                                onBlur={() => setFocused(f => ({ ...f, username: false }))}
                                style={{ ...S.input, ...focusStyle('username') }} />
                        </div>
                        <div>
                            <label htmlFor="reg-phone" style={{ ...S.label }}>
                                Phone <span style={{ color: '#475569', fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
                            </label>
                            <input id="reg-phone" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                                placeholder="+91 98765 43210" autoComplete="tel"
                                onFocus={() => setFocused(f => ({ ...f, phone: true }))}
                                onBlur={() => setFocused(f => ({ ...f, phone: false }))}
                                style={{ ...S.input, ...focusStyle('phone') }} />
                        </div>
                    </div>

                    {/* Password */}
                    <div style={{ marginBottom: '16px' }}>
                        <label htmlFor="reg-password" style={S.label}>Create Password</label>
                        <PasswordInput id="reg-password" value={form.password} onChange={v => set('password', v)} placeholder="Min 8 chars, mixed case + symbols" />
                        <PasswordStrengthBar password={form.password} />
                    </div>

                    {/* Confirm Password */}
                    <div style={{ marginBottom: '24px' }}>
                        <label htmlFor="reg-confirm" style={S.label}>Confirm Password</label>
                        <PasswordInput id="reg-confirm" value={form.confirmPassword} onChange={v => set('confirmPassword', v)} placeholder="Re-enter password" />
                        {form.confirmPassword && form.password !== form.confirmPassword && (
                            <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px' }}>
                                <i className="fas fa-times-circle" style={{ marginRight: '6px' }} />Passwords do not match.
                            </p>
                        )}
                        {form.confirmPassword && form.password === form.confirmPassword && (
                            <p style={{ color: '#10b981', fontSize: '12px', marginTop: '6px' }}>
                                <i className="fas fa-check-circle" style={{ marginRight: '6px' }} />Passwords match.
                            </p>
                        )}
                    </div>

                    {/* Terms */}
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={form.agreedToTerms} onChange={e => set('agreedToTerms', e.target.checked)}
                                style={{ marginTop: '2px', width: '16px', height: '16px', accentColor: '#3b82f6', cursor: 'pointer', flexShrink: 0 }} />
                            <span style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6 }}>
                                I agree to the{' '}
                                <button type="button" style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: "'Inter', system-ui, sans-serif", padding: 0 }}>Terms & Conditions</button>
                                {' '}and{' '}
                                <button type="button" style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '13px', fontWeight: 600, fontFamily: "'Inter', system-ui, sans-serif", padding: 0 }}>Privacy Policy</button>.
                            </span>
                        </label>
                    </div>

                    {/* HIPAA */}
                    <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', padding: '16px', marginBottom: '24px' }}>
                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={form.hipaaConsent} onChange={e => set('hipaaConsent', e.target.checked)}
                                style={{ marginTop: '2px', width: '16px', height: '16px', accentColor: '#10b981', cursor: 'pointer', flexShrink: 0 }} />
                            <span style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.6 }}>
                                <i className="fas fa-shield-alt" style={{ color: '#10b981', marginRight: '6px' }} />
                                <strong style={{ color: '#34d399' }}>HIPAA Consent:</strong> I consent to the processing of my genetic and health data in accordance with HIPAA regulations. My data will be encrypted, stored securely, and never shared without my explicit permission.
                            </span>
                        </label>
                    </div>

                    <button type="submit" disabled={isLoading}
                        style={{ ...S.primaryBtn, opacity: isLoading ? 0.6 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }}>
                        {isLoading
                            ? <><i className="fas fa-circle-notch fa-spin" style={{ marginRight: '8px' }} />Creating Account...</>
                            : <><i className="fas fa-user-plus" style={{ marginRight: '8px' }} />Create Account</>
                        }
                    </button>
                </form>

                <div style={S.divider} />

                <div style={{ textAlign: 'center' }}>
                    <span style={{ color: '#64748b', fontSize: '13px' }}>Already have an account? </span>
                    <button onClick={() => navigate('/login')}
                        style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif" }}>
                        Sign In
                    </button>
                </div>

                <TrustBadges />
            </div>
        </div>
    );
};

// ══════════════════════════════════════════════════════════════════════════════
// FORGOT PASSWORD PAGE
// ══════════════════════════════════════════════════════════════════════════════

export const ForgotPasswordPage: React.FC = () => {
    const navigate = useNavigate();
    const { forgotPassword, isLoading } = useAuth();
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [sent, setSent] = useState(false);
    const [focused, setFocused] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) { setError('Please enter a valid email address.'); return; }
        try {
            await forgotPassword({ email });
            setSent(true);
        } catch (err: any) {
            setError(err.message || 'Failed to send reset link. Please try again.');
        }
    };

    return (
        <div style={S.page}>
            <div style={S.card}>
                <AuthHeader />

                {!sent ? (
                    <>
                        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                            <div style={{ width: '64px', height: '64px', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                <i className="fas fa-key" style={{ fontSize: '24px', color: '#3b82f6' }} />
                            </div>
                            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>Reset Password</h2>
                            <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>
                                Enter your email address and we'll send you a link to reset your password.
                            </p>
                        </div>

                        {error && (
                            <div style={S.errorBox} role="alert">
                                <i className="fas fa-exclamation-triangle" style={{ color: '#ef4444', flexShrink: 0 }} />
                                <span style={{ color: '#fca5a5', fontSize: '13px', fontWeight: 500 }}>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} noValidate>
                            <div style={{ marginBottom: '24px' }}>
                                <label htmlFor="forgot-email" style={S.label}>Email Address</label>
                                <input id="forgot-email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                                    placeholder="your@email.com" autoComplete="email"
                                    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                                    style={{ ...S.input, ...(focused ? S.inputFocus : {}) }} />
                            </div>
                            <button type="submit" disabled={isLoading}
                                style={{ ...S.primaryBtn, opacity: isLoading ? 0.6 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }}>
                                {isLoading
                                    ? <><i className="fas fa-circle-notch fa-spin" style={{ marginRight: '8px' }} />Sending...</>
                                    : <><i className="fas fa-paper-plane" style={{ marginRight: '8px' }} />Send Reset Link</>
                                }
                            </button>
                        </form>
                    </>
                ) : (
                    <div style={S.successBox}>
                        <div style={{ width: '40px', height: '40px', background: 'rgba(16,185,129,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <i className="fas fa-check" style={{ color: '#10b981', fontSize: '18px' }} />
                        </div>
                        <div>
                            <p style={{ color: '#34d399', fontWeight: 700, fontSize: '15px', marginBottom: '6px' }}>Check your inbox!</p>
                            <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: 1.6 }}>
                                If an account exists for <strong style={{ color: '#e2e8f0' }}>{email}</strong>, a password reset link has been sent. Check your spam folder if you don't see it.
                            </p>
                            <p style={{ color: '#64748b', fontSize: '11px', marginTop: '8px' }}>
                                <i className="fas fa-info-circle" style={{ marginRight: '6px', color: '#3b82f6' }} />
                                Demo: check browser console for the reset token.
                            </p>
                        </div>
                    </div>
                )}

                <div style={S.divider} />

                <div style={{ textAlign: 'center' }}>
                    <button onClick={() => navigate('/login')}
                        style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif" }}>
                        <i className="fas fa-arrow-left" style={{ marginRight: '8px' }} />Back to Sign In
                    </button>
                </div>
            </div>
        </div>
    );
};

// ══════════════════════════════════════════════════════════════════════════════
// RESET PASSWORD PAGE
// ══════════════════════════════════════════════════════════════════════════════

export const ResetPasswordPage: React.FC = () => {
    const navigate = useNavigate();
    const urlParams = new URLSearchParams(window.location.search);
    const resetToken = urlParams.get('token') || '';
    const { resetPassword, isLoading } = useAuth();
    const [token, setToken] = useState(resetToken);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!token.trim()) { setError('Reset token is required.'); return; }
        if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
        const strength = getPasswordStrength(newPassword);
        if (strength.score < 2) { setError('Please choose a stronger password.'); return; }

        try {
            await resetPassword({ token, newPassword, confirmPassword });
            setSuccess(true);
            setTimeout(() => navigate('/login'), 3000);
        } catch (err: any) {
            setError(err.message || 'Password reset failed. Please try again.');
        }
    };

    return (
        <div style={S.page}>
            <div style={S.card}>
                <AuthHeader />

                {success ? (
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ width: '72px', height: '72px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                            <i className="fas fa-check-circle" style={{ fontSize: '32px', color: '#10b981' }} />
                        </div>
                        <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>Password Reset!</h2>
                        <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '4px' }}>Your password has been successfully updated.</p>
                        <p style={{ color: '#64748b', fontSize: '12px' }}>Redirecting to Sign In...</p>
                    </div>
                ) : (
                    <>
                        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>New Password</h2>
                            <p style={{ fontSize: '13px', color: '#64748b' }}>Enter your reset token and choose a new password.</p>
                        </div>

                        {error && (
                            <div style={S.errorBox} role="alert">
                                <i className="fas fa-exclamation-triangle" style={{ color: '#ef4444', flexShrink: 0 }} />
                                <span style={{ color: '#fca5a5', fontSize: '13px', fontWeight: 500 }}>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} noValidate>
                            {!resetToken && (
                                <div style={{ marginBottom: '16px' }}>
                                    <label htmlFor="reset-token" style={S.label}>Reset Token</label>
                                    <input id="reset-token" type="text" value={token} onChange={e => setToken(e.target.value)}
                                        placeholder="Paste your reset token here"
                                        style={{ ...S.input, fontFamily: 'monospace', fontSize: '13px' }} />
                                    <p style={{ color: '#64748b', fontSize: '11px', marginTop: '6px' }}>
                                        <i className="fas fa-info-circle" style={{ marginRight: '4px', color: '#3b82f6' }} />
                                        Check the browser console for your token (demo mode).
                                    </p>
                                </div>
                            )}

                            <div style={{ marginBottom: '16px' }}>
                                <label htmlFor="reset-new" style={S.label}>New Password</label>
                                <PasswordInput id="reset-new" value={newPassword} onChange={setNewPassword} placeholder="Enter new password" />
                                <PasswordStrengthBar password={newPassword} />
                            </div>

                            <div style={{ marginBottom: '24px' }}>
                                <label htmlFor="reset-confirm" style={S.label}>Confirm New Password</label>
                                <PasswordInput id="reset-confirm" value={confirmPassword} onChange={setConfirmPassword} placeholder="Re-enter new password" />
                            </div>

                            <button type="submit" disabled={isLoading}
                                style={{ ...S.primaryBtn, opacity: isLoading ? 0.6 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }}>
                                {isLoading
                                    ? <><i className="fas fa-circle-notch fa-spin" style={{ marginRight: '8px' }} />Resetting...</>
                                    : <><i className="fas fa-lock" style={{ marginRight: '8px' }} />Reset Password</>
                                }
                            </button>
                        </form>

                        <div style={S.divider} />
                        <div style={{ textAlign: 'center' }}>
                            <button onClick={() => navigate('/login')}
                                style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Inter', system-ui, sans-serif" }}>
                                <i className="fas fa-arrow-left" style={{ marginRight: '8px' }} />Back to Sign In
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
