import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BookOpen, Lock, LogIn, Eye, EyeOff } from 'lucide-react';
import logo from '../assets/CPBYTE_LOGO.jpg';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser, clearError } from '../redux/slices/authSlice';
import toast from 'react-hot-toast';
import * as THREE from 'three';

function LoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useDispatch();
  const { error, loading } = useSelector(state => state.authSlice);


  const vantaRef = useRef(null);
  const vantaEffect = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const loadVanta = async () => {
      const VANTA = await import('vanta/dist/vanta.net.min');

      if (isMounted && !vantaEffect.current) {
        vantaEffect.current = VANTA.default({
          el: vantaRef.current,
          THREE: THREE,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.00,
          minWidth: 200.00,
          scale: 1.00,
          scaleMobile: 1.00,
          color: 0xfff5,
          backgroundColor: 0x0,
          points: 20.00,
          maxDistance: 10.00,
          spacing: 20.00
        });
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
    const toastId = toast.loading("Logging in...");
    const library_id = e.target[0].value;
    const password = e.target[1].value;
    if (!library_id || !password) {
      toast.error("Please fill in all fields", { id: toastId });
      return;
    }

    // clear any previous error
    dispatch(clearError());

    const res = await dispatch(loginUser({ library_id, password }));
    if (res.meta.requestStatus === "fulfilled") {
      navigate('/');
      toast.success("Logged in successfully", { id: toastId });
    } else {
      toast.error(res.payload || "Login failed", { id: toastId });
    }
  };

  return (
    <div ref={vantaRef} className="flex flex-col items-center justify-center min-h-screen w-full bg-gray-950 p-4">
      <div className="w-full max-w-md p-8 space-y-8 backdrop-blur-sm rounded-2xl shadow-xl border border-white z-10">
        <div className="text-center">
          <div className="flex justify-center">
            <img src={logo} alt="" className='w-1/3 rounded-full mix-blend-color-dodge bg-white' />
          </div>
          <h2 className="text-3xl font-extrabold text-white">Student Portal Access</h2>
          <p className="mt-2 text-sm text-gray-400">Sign in to your CPBYTE account</p>
        </div>

        {error !== null && (
          <div className='w-full bg-red-500 text-white rounded-xl overflow-hidden'>
            <h1 className='p-2 w-full text-center'>{error}</h1>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="library-id" className="block text-sm font-medium text-gray-300">Library ID</label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <BookOpen className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  id="library-id"
                  name="library-id"
                  type="text"
                  required
                  className="block w-full pl-10 pr-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter your library ID"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-gray-300">Password</label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Lock className="w-5 h-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  className="block w-full pl-10 pr-10 py-2 border border-gray-600 rounded-md bg-gray-800 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-300"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
          <div>
            <button
              type="submit"
              disabled={loading}
              className={`flex justify-center w-full px-4 py-2 text-sm font-medium text-white ${loading ? "bg-[#5eacff]" : "bg-[#057eff]"} border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-gray-800 cursor-pointer`}>
              <LogIn className="w-5 h-5 mr-2" />
              {loading ? "Signing In" : "Sign in"}
            </button>
          </div>
        </form>
      </div>

      {/* Testing Credentials */}
      {/* <div className="w-full max-w-md mt-6 p-4 backdrop-blur-sm rounded-lg border border-gray-700 bg-gray-900/50 z-10">
        <h3 className="text-sm font-semibold text-gray-300 mb-3 text-center">Test Credentials</h3>
        
        Coordinator Credentials
        <div className="mb-3">
          <p className="text-xs font-semibold text-indigo-400 mb-1">Coordinator:</p>
          <div className="space-y-1 text-xs text-gray-400">
            <p className="flex justify-between">
              <span className="font-medium text-gray-300">Library ID:</span>
              <span className="font-mono text-gray-200">2327CSE1241</span>
            </p>
            <p className="flex justify-between">
              <span className="font-medium text-gray-300">Password:</span>
              <span className="font-mono text-gray-200">rajatjain</span>
            </p>
          </div>
        </div>

        Member Credentials
        <div>
          <p className="text-xs font-semibold text-blue-400 mb-1">Member:</p>
          <div className="space-y-1 text-xs text-gray-400">
            <p className="flex justify-between">
              <span className="font-medium text-gray-300">Library ID:</span>
              <span className="font-mono text-gray-200">2428CSEAI1029</span>
            </p>
            <p className="flex justify-between">
              <span className="font-medium text-gray-300">Password:</span>
              <span className="font-mono text-gray-200">CPBYTE123</span>
            </p>
          </div>
        </div>
      </div> */}
    </div>
  );

}

export default LoginPage;