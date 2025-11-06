import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft, RotateCcw } from 'lucide-react';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';
import toast from 'react-hot-toast';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from '../firebase';

const OTP: React.FC = () => {
  const navigate = useNavigate();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes

  useEffect(() => {
    const storedEmail = localStorage.getItem('otpEmail');
    if (storedEmail) {
      setEmail(storedEmail);
    } else {
      // Redirect to login if no email found
      navigate('/login');
    }

    // Start countdown timer
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!otp || otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    if (!auth) {
      toast.error('Firebase not initialized');
      return;
    }

    setLoading(true);

    try {
      // Use environment variable for API URL
      const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        // Sign in with custom token
        await signInWithCustomToken(auth, data.token);
        
        toast.success('OTP verified successfully!');
        
        // Clear OTP email
        localStorage.removeItem('otpEmail');
        
        // Navigate to profile setup
        navigate('/profile-setup');
      } else {
        toast.error(data.message || 'Invalid OTP');
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
      toast.error('Failed to verify OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!email) return;

    setResendLoading(true);

    try {
      const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';
      console.log('🔄 Resending OTP to:', email);
      console.log('🌐 API URL:', `${API_URL}/api/auth/send-otp`);
      
      const response = await fetch(`${API_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      console.log('📡 Resend response status:', response.status);
      const data = await response.json();
      console.log('📦 Resend response data:', data);

      if (response.ok) {
        console.log('✅ OTP resent successfully');
        toast.success('OTP resent to your email!');
        setTimeLeft(300); // Reset timer
      } else {
        console.log('❌ OTP resend failed:', data);
        toast.error(data.message || 'Failed to resend OTP');
      }
    } catch (error) {
      console.error('💥 Error resending OTP:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Shield className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Verify Your Email</h1>
          <p className="text-white/80">Enter the 6-digit code sent to your email</p>
        </div>

        <Card className="bg-white/95 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Enter OTP</h2>
              <p className="text-gray-600">
                We sent a code to <span className="font-medium">{email}</span>
              </p>
            </div>

            <Input
              label="Verification Code"
              type="text"
              placeholder="000000"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              icon={<Shield className="w-4 h-4 text-gray-400" />}
              required
              maxLength={6}
            />

            {timeLeft > 0 && (
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Code expires in <span className="font-medium text-primary-600">{formatTime(timeLeft)}</span>
                </p>
              </div>
            )}

            <Button
              type="submit"
              loading={loading}
              className="w-full"
              size="lg"
              disabled={timeLeft === 0}
            >
              Verify OTP
            </Button>

            {timeLeft === 0 && (
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">Code expired</p>
                <Button
                  type="button"
                  variant="outline"
                  loading={resendLoading}
                  onClick={handleResendOTP}
                  className="w-full"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Resend Code
                </Button>
              </div>
            )}
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Login
            </Link>
          </div>
        </Card>

        <div className="mt-8 text-center">
          <p className="text-white/60 text-sm">
            Didn't receive the code? Check your spam folder
          </p>
        </div>
      </div>
    </div>
  );
};

export default OTP;

