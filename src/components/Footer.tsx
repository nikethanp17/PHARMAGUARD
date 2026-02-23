import React from 'react';
import { Link } from 'react-router-dom';
import { Github, Twitter, Linkedin, Shield, Lock } from 'lucide-react';
import { DNAIcon } from './icons/DNAIcon';

const Footer: React.FC = () => (
    <footer className="relative z-10 bg-[#080f1e] border-t border-white/10 mt-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">

                {/* Brand */}
                <div className="col-span-1 md:col-span-1">
                    <div className="flex items-center gap-2.5 mb-4">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <DNAIcon size={20} className="text-white" />
                        </div>
                        <span className="text-white font-black text-lg">Your Genes</span>
                    </div>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        CPIC-aligned pharmacogenomic risk prediction. Personalized medicine, powered by your genetic data.
                    </p>
                    <div className="flex items-center gap-2 mt-4">
                        <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 text-xs font-semibold px-2.5 py-1 rounded-lg">
                            <Shield className="w-3 h-3" /> HIPAA
                        </span>
                        <span className="flex items-center gap-1.5 text-blue-400 bg-blue-400/10 border border-blue-400/20 text-xs font-semibold px-2.5 py-1 rounded-lg">
                            <Lock className="w-3 h-3" /> 256-bit SSL
                        </span>
                    </div>
                </div>

                {/* Product */}
                <div>
                    <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Product</h4>
                    <ul className="space-y-2.5">
                        {['How It Works', 'Features', 'Supported Genes', 'Drug Database', 'API Access'].map(item => (
                            <li key={item}>
                                <a href="#" className="text-slate-400 hover:text-white text-sm transition-colors">{item}</a>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Legal */}
                <div>
                    <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Legal & Compliance</h4>
                    <ul className="space-y-2.5">
                        {[
                            { label: 'Privacy Policy', href: '#' },
                            { label: 'Terms of Service', href: '#' },
                            { label: 'HIPAA Notice', href: '#' },
                            { label: 'Cookie Policy', href: '#' },
                            { label: 'Data Processing', href: '#' },
                        ].map(item => (
                            <li key={item.label}>
                                <a href={item.href} className="text-slate-400 hover:text-white text-sm transition-colors">{item.label}</a>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Support */}
                <div>
                    <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Support</h4>
                    <ul className="space-y-2.5 mb-6">
                        {['Contact Support', 'Documentation', 'Clinical References', 'CPIC Guidelines', 'Report an Issue'].map(item => (
                            <li key={item}>
                                <a href="#" className="text-slate-400 hover:text-white text-sm transition-colors">{item}</a>
                            </li>
                        ))}
                    </ul>
                    <div className="flex gap-3">
                        {[Github, Twitter, Linkedin].map((Icon, i) => (
                            <a key={i} href="#" className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-all group">
                                <Icon className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                            </a>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom bar */}
            <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                <p className="text-slate-500 text-sm">
                    © 2026 Your Genes. All rights reserved.
                </p>
                <p className="text-slate-600 text-xs text-center">
                    Data sources: FDA AERS · CDC NVSS · CPIC Guidelines · WHO Pharmacovigilance DB
                </p>
            </div>
        </div>
    </footer>
);

export default Footer;
