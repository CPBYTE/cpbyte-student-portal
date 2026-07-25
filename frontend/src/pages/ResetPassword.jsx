import React, { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Lock, Eye, EyeOff, CheckCircle2, ArrowLeft, KeyRound, AlertTriangle } from "lucide-react";
import logo from "../assets/CPBYTE_LOGO.jpg";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import * as THREE from "three";

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [verifying, setVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const vantaRef = useRef(null);
  const vantaEffect = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const loadVanta = async () => {
      try {
        const VANTA = await import("vanta/dist/vanta.net.min");
        if (isMounted && !vantaEffect.current && vantaRef.current) {
          vantaEffect.current = VANTA.default({
            el: vantaRef.current,
            THREE: THREE,
            mouseControls: true,
            touchControls: true,
            gyroControls: false,
            minHeight: 200.0,
            minWidth: 200.0,
            scale: 1.0,
            scaleMobile: 1.0,
            color: 0xfff5,
            backgroundColor: 0x0,
            points: 20.0,
            maxDistance: 10.0,
            spacing: 20.0,
          });
        }
      } catch (err) {
        console.error("Vanta load error", err);
      }
    };

    loadVanta();

    return () => {
      isMounted = false;
      if (vantaEffect.current) {
        vantaEffect.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    if (!token) {
      setVerifying(false);
      setTokenValid(false);
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await axiosInstance.get(`/auth/verify-reset-token?token=${token}`);
        if (res.data.success) {
          setTokenValid(true);
          setUserInfo(res.data.data);
        }
      } catch (err) {
        setTokenValid(false);
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    const toastId = toast.loading("Updating password...");
    setLoading(true);

    try {
      const res = await axiosInstance.post("/auth/reset-password", {
        token,
        newPassword,
      });

      toast.success(res.data.message || "Password updated successfully!", { id: toastId });
      setResetSuccess(true);
      setTimeout(() => {
        navigate("/login");
      }, 2500);
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to reset password";
      toast.error(errorMsg, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={vantaRef} className="flex flex-col items-center justify-center min-h-screen w-full bg-gray-950 p-4">
      <div className="w-full max-w-md p-8 space-y-6 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 z-10 bg-gray-900/60">
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <img src={logo} alt="CPBYTE Logo" className="w-20 h-20 rounded-full mix-blend-color-dodge bg-white object-cover" />
          </div>
          <h2 className="text-3xl font-extrabold text-white">Create New Password</h2>
          {userInfo && (
            <p className="mt-2 text-sm text-gray-300">
              Resetting password for <span className="font-semibold text-indigo-400">{userInfo.name}</span> ({userInfo.library_id})
            </p>
          )}
        </div>

        {verifying ? (
          <div className="text-center py-8 space-y-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500 mx-auto"></div>
            <p className="text-sm text-gray-400">Verifying reset link...</p>
          </div>
        ) : resetSuccess ? (
          <div className="text-center py-6 space-y-4">
            <div className="flex justify-center text-green-400">
              <CheckCircle2 className="w-16 h-16" />
            </div>
            <h3 className="text-xl font-bold text-white">Password Reset Successful!</h3>
            <p className="text-sm text-gray-300">
              Your password has been reset. Redirecting you to the sign-in page...
            </p>
            <Link
              to="/login"
              className="inline-flex items-center justify-center w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md transition-colors"
            >
              Sign In Now
            </Link>
          </div>
        ) : !tokenValid ? (
          <div className="text-center py-6 space-y-4">
            <div className="flex justify-center text-red-400">
              <AlertTriangle className="w-16 h-16" />
            </div>
            <h3 className="text-lg font-semibold text-white">Invalid or Expired Link</h3>
            <p className="text-sm text-gray-400">
              The password reset link is invalid or has expired. Please request a new link.
            </p>
            <div className="pt-2 flex flex-col space-y-3">
              <Link
                to="/forgot-password"
                className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md transition-colors"
              >
                Request New Reset Link
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center text-sm font-medium text-gray-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Sign in
              </Link>
            </div>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-gray-300">
                New Password
              </label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Lock className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  id="new-password"
                  name="new-password"
                  type={showNewPassword ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2 border border-gray-600 rounded-md bg-gray-800/80 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-300"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-300">
                Confirm New Password
              </label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <KeyRound className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2 border border-gray-600 rounded-md bg-gray-800/80 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-300"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`flex items-center justify-center w-full px-4 py-2.5 text-sm font-medium text-white ${
                loading ? "bg-indigo-400" : "bg-indigo-600 hover:bg-indigo-700"
              } rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer transition-colors`}
            >
              {loading ? "Resetting Password..." : "Reset Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default ResetPassword;
