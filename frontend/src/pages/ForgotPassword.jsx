import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, ArrowLeft, Send, CheckCircle2, Copy } from "lucide-react";
import logo from "../assets/CPBYTE_LOGO.jpg";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import * as THREE from "three";

function ForgotPassword() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) {
      toast.error("Please enter your Library ID or Email");
      return;
    }

    const toastId = toast.loading("Processing request...");
    setLoading(true);

    try {
      const res = await axiosInstance.post("/auth/forgot-password", {
        identifier: identifier.trim(),
      });

      toast.success(res.data.message || "Reset link generated!", { id: toastId });
      setSuccessData(res.data);
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to process request";
      toast.error(errorMsg, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const copyResetLink = (link) => {
    navigator.clipboard.writeText(link);
    toast.success("Reset link copied to clipboard!");
  };

  return (
    <div ref={vantaRef} className="flex flex-col items-center justify-center min-h-screen w-full bg-gray-950 p-4">
      <div className="w-full max-w-md p-8 space-y-6 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 z-10 bg-gray-900/60">
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <img src={logo} alt="CPBYTE Logo" className="w-20 h-20 rounded-full mix-blend-color-dodge bg-white object-cover" />
          </div>
          <h2 className="text-3xl font-extrabold text-white">Reset Password</h2>
          <p className="mt-2 text-sm text-gray-400">
            Enter your Library ID or Email address to receive password reset instructions.
          </p>
        </div>

        {successData ? (
          <div className="space-y-4 text-center">
            <div className="flex justify-center text-green-400">
              <CheckCircle2 className="w-16 h-16" />
            </div>
            <h3 className="text-lg font-semibold text-white">Instructions Sent</h3>
            <p className="text-sm text-gray-300">
              Password reset link has been processed for <span className="font-semibold text-indigo-400">{successData.email}</span>.
            </p>

            {successData.resetLink && (
              <div className="mt-4 p-4 bg-gray-800/80 border border-gray-700 rounded-lg text-left space-y-3">
                {successData.mailResult?.previewUrl && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1 font-semibold">Sent Email Preview (Ethereal):</p>
                    <a
                      href={successData.mailResult.previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-xs text-indigo-400 hover:text-indigo-300 underline font-mono"
                    >
                      View Sent Email Inbox Preview &rarr;
                    </a>
                  </div>
                )}

                <div>
                  <p className="text-xs text-gray-400 mb-1 font-semibold">Direct Reset Link (Dev Mode):</p>
                  <div className="flex items-center justify-between bg-gray-950 p-2 rounded border border-gray-700">
                    <span className="text-xs text-gray-300 font-mono truncate mr-2">{successData.resetLink}</span>
                    <button
                      onClick={() => copyResetLink(successData.resetLink)}
                      className="p-1 text-gray-400 hover:text-white transition-colors"
                      title="Copy Link"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="pt-1 text-center">
                  <button
                    onClick={() => navigate(`/reset-password?token=${successData.resetToken}`)}
                    className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded transition-colors"
                  >
                    Proceed to Reset Password Page
                  </button>
                </div>
              </div>
            )}

            <div className="pt-2">
              <Link
                to="/login"
                className="inline-flex items-center text-sm font-medium text-indigo-400 hover:text-indigo-300"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Sign in
              </Link>
            </div>
          </div>
        ) : (
          <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="identifier" className="block text-sm font-medium text-gray-300">
                Library ID or Email
              </label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <BookOpen className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-600 rounded-md bg-gray-800/80 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter Library ID or Email"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`flex items-center justify-center w-full px-4 py-2.5 text-sm font-medium text-white ${
                loading ? "bg-indigo-400" : "bg-indigo-600 hover:bg-indigo-700"
              } rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer transition-colors`}
            >
              <Send className="w-4 h-4 mr-2" />
              {loading ? "Sending Link..." : "Send Reset Link"}
            </button>

            <div className="text-center pt-2">
              <Link
                to="/login"
                className="inline-flex items-center text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Sign in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default ForgotPassword;
