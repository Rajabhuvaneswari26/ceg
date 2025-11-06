import React, { useState } from 'react';
import { Mail, ArrowRight } from 'lucide-react';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';
import toast from 'react-hot-toast';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      // Use environment variable for API URL
      const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';
      console.log('🌐 Sending OTP request to:', `${API_URL}/api/auth/send-otp`);
      
      const response = await fetch(`${API_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', response.headers);
      
      const data = await response.json();
      console.log('📦 Response data:', data);

      if (response.ok) {
        console.log('✅ OTP sent successfully');
        toast.success('OTP sent to your email!');
        // Store email in localStorage for OTP verification
        localStorage.setItem('otpEmail', email);
        // Navigate to OTP page
        window.location.href = '/otp';
      } else {
        console.log('❌ OTP send failed:', data);
        toast.error(data.message || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('💥 Error sending OTP:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-2xl font-bold text-gradient">CC</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome to CEG Connect</h1>
          <p className="text-white/80">Connect with your college community</p>
        </div>

        <Card className="bg-white/95 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Sign In</h2>
              <p className="text-gray-600">Enter your email to receive OTP</p>
            </div>

            <Input
              label="Email Address"
              type="email"
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail className="w-4 h-4 text-gray-400" />}
              required
            />

            <Button
              type="submit"
              loading={loading}
              className="w-full"
              size="lg"
            >
              Send OTP
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              New to CEG Connect?{' '}
              <span className="text-primary-600 font-medium">
                Just sign in with your email
              </span>
            </p>
          </div>
        </Card>

        <div className="mt-8 text-center">
          <p className="text-white/60 text-sm">
            © 2024 CEG Connect. Built for College of Engineering, Guindy.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

