import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import BackgroundDNA from '../components/BackgroundDNA';
import FloatingOrganelles from '../components/FloatingOrganelles';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import HeroSection from '../components/HeroSection';
import StatisticsDashboard from '../components/StatisticsDashboard';
import HowItWorks from '../components/HowItWorks';
import FeaturesSection from '../components/FeaturesSection';
import CallToAction from '../components/CallToAction';

const LandingPage: React.FC = () => {
    const { isAuthenticated, isLoading } = useAuth();
    const navigate = useNavigate();

    // If already authenticated, redirect to dashboard
    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            navigate('/dashboard', { replace: true });
        }
    }, [isAuthenticated, isLoading, navigate]);

    return (
        <div
            className="relative min-h-screen overflow-x-hidden"
            style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 40%, #0f172a 100%)' }}
        >
            {/* === Fixed Animated Backgrounds === */}
            <BackgroundDNA />
            <FloatingOrganelles />

            {/* === Page Content === */}
            <div className="relative z-10">
                <Navbar />
                <main>
                    <HeroSection />
                    <StatisticsDashboard />
                    <HowItWorks />
                    <FeaturesSection />
                    <CallToAction />
                </main>
                <Footer />
            </div>
        </div>
    );
};

export default LandingPage;
