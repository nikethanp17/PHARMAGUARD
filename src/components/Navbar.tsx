import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { DNAIcon } from './icons/DNAIcon';
import { useAuth } from '../auth/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_LINKS = [
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Features', href: '#features' },
    { label: 'Statistics', href: '#statistics' },
    { label: 'About', href: '#about' },
];

const Navbar: React.FC = () => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [isScrolled, setIsScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        const onScroll = () => setIsScrolled(window.scrollY > 20);
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const isLandingPage = location.pathname === '/';

    const handleNavClick = (href: string) => {
        setMenuOpen(false);
        if (href.startsWith('#')) {
            if (!isLandingPage) {
                navigate('/' + href);
            } else {
                document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
            }
        }
    };

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-[#0f172a]/95 backdrop-blur-xl border-b border-white/10 shadow-2xl' : 'bg-transparent'
                }`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2.5 group">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg group-hover:shadow-blue-500/30 transition-all">
                            <DNAIcon size={20} className="text-white" />
                        </div>
                        <span className="text-white font-black text-lg tracking-tight">
                            Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">Genes</span>
                        </span>
                    </Link>

                    {/* Desktop nav */}
                    <div className="hidden md:flex items-center gap-6">
                        {isLandingPage && NAV_LINKS.map(link => (
                            <button
                                key={link.label}
                                onClick={() => handleNavClick(link.href)}
                                className="text-slate-300 hover:text-white text-sm font-medium transition-colors"
                            >
                                {link.label}
                            </button>
                        ))}
                    </div>

                    {/* CTA Buttons */}
                    <div className="hidden md:flex items-center gap-3">
                        {isAuthenticated ? (
                            <Link
                                to="/dashboard"
                                className="px-5 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-bold rounded-xl hover:from-blue-500 hover:to-purple-500 transition-all shadow-lg hover:shadow-blue-500/25"
                            >
                                Go to Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link to="/login" className="px-4 py-2 text-slate-300 hover:text-white text-sm font-semibold transition-colors">
                                    Log In
                                </Link>
                                <Link
                                    to="/register"
                                    className="px-5 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-bold rounded-xl hover:from-blue-500 hover:to-purple-500 transition-all shadow-lg hover:shadow-blue-500/25"
                                >
                                    Sign Up
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Mobile menu button */}
                    <button
                        className="md:hidden text-white p-2"
                        onClick={() => setMenuOpen(v => !v)}
                        aria-label="Toggle menu"
                    >
                        {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile menu */}
            <AnimatePresence>
                {menuOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="md:hidden bg-[#0f172a]/98 backdrop-blur-xl border-b border-white/10 overflow-hidden"
                    >
                        <div className="px-4 py-4 flex flex-col gap-3">
                            {NAV_LINKS.map(link => (
                                <button
                                    key={link.label}
                                    onClick={() => handleNavClick(link.href)}
                                    className="text-slate-300 text-left text-sm font-medium py-2"
                                >
                                    {link.label}
                                </button>
                            ))}
                            <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
                                {isAuthenticated ? (
                                    <Link to="/dashboard" onClick={() => setMenuOpen(false)} className="text-center py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-bold rounded-xl">
                                        Go to Dashboard
                                    </Link>
                                ) : (
                                    <>
                                        <Link to="/login" onClick={() => setMenuOpen(false)} className="text-center py-2.5 border border-white/20 text-white text-sm font-semibold rounded-xl">Log In</Link>
                                        <Link to="/register" onClick={() => setMenuOpen(false)} className="text-center py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-bold rounded-xl">Sign Up Free</Link>
                                    </>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
};

export default Navbar;
