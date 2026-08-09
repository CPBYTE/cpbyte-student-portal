import React, { useState,useEffect,useRef } from 'react';
import { User, Lock, Mail, BookOpen, Calendar, CreditCard, Camera, Save } from 'lucide-react';
import noimage from '../assets/noImage.webp';
import { useDispatch, useSelector } from 'react-redux';
import toast from "react-hot-toast"
import { updateAvatar } from '../redux/slices/settingsSlice';
import * as THREE from 'three';
import ChangePass from '../componenets/ChangePass';
import axios from 'axios';
import { axiosInstance } from '../lib/axios';

export default function UserSettings() { 

  const user=useSelector(state=>state.dashboard.data)
  const dispatch = useDispatch();
  const vantaRef = useRef(null);
  const vantaEffect = useRef(null); 
  const [disable,setDisable] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || noimage)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedUrl, setUploadedUrl] = useState("")
  const inputRef=useRef(null)

  useEffect(() => {
    let isMounted = true;

    const loadVanta = async () => {
      const VANTA = await import('vanta/dist/vanta.net.min');

      if (isMounted && !vantaEffect.current) {
        vantaEffect.current = VANTA.default({
          el: vantaRef.current,
          THREE: THREE,
          mouseControls: false,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.00,
          minWidth: 200.00,
          scale: 1.00,
          scaleMobile: 1.00,
          color: 0xfff5,
          backgroundColor: 0x000000,
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
   
  const fixed={
    email: user.email,
    role: user.role,
    year: user.year, 
    libraryId: user.library_id
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setDisable(true);
    const toastId = toast.loading("Uploading image to Cloudinary...");

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        const MAX_WIDTH = 300;
        const MAX_HEIGHT = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(async (blob) => {
          try {
            // A. Fetch secure signature from backend
            const token = localStorage.getItem("token");
            const sigRes = await axiosInstance.get("/settings/cloudinarySignature", {
              headers: { Authorization: `Bearer ${token}` }
            });
            const { signature, timestamp, cloudName, apiKey } = sigRes.data;

            // B. Prepare FormData for direct Cloudinary upload
            const formData = new FormData();
            formData.append("file", blob, "avatar.jpg");
            formData.append("api_key", apiKey);
            formData.append("timestamp", timestamp);
            formData.append("signature", signature);
            formData.append("folder", "avatars");

            // C. Upload file directly to Cloudinary
            const cloudRes = await axios.post(
              `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
              formData
            );
            const secureUrl = cloudRes.data.secure_url;

            setAvatarUrl(secureUrl);
            setUploadedUrl(secureUrl);
            toast.success("Image uploaded! Click 'Save Changes' to apply.", { id: toastId });
          } catch (err) {
            console.error("Direct upload failed:", err);
            toast.error("Failed to upload image to Cloudinary", { id: toastId });
          } finally {
            setIsUploading(false);
            setDisable(false);
          }
        }, "image/jpeg", 0.7);
      };
    };
  };

  const handleSaveAvatar = (e) => {
    e.preventDefault();
    if (!uploadedUrl) {
      toast.error("Please select an image first!");
      return;
    }
    setDisable(true);
    const toastId = toast.loading("Saving changes...");

    dispatch(updateAvatar({ image: uploadedUrl }))
      .then((res) => {
        if (res.error) {
          toast.error("Couldn't update profile pic!!", { id: toastId });
        } else {
          toast.success("Successfully updated profile pic!!", { id: toastId });
          window.location.reload();
        }
      })
      .finally(() => {
        setDisable(false);
      });
  };

  return (
    <div ref={vantaRef} className="min-h-screen bg-[#070b0f] w-full pt-16 text-gray-200 p-4 md:p-8">
      <div className="max-w-3xl mx-auto backdrop-blur-sm">
        <div className='mb-8 flex items-center gap-2'>
          <div className='bg-[#0ec1e7] w-2 h-8 rounded-full'>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Account Settings</h1>
        </div>
        <div className="space-y-8">
          <div className=" border border-gray-500 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <div className="mr-2 bg-blue-500 p-2 rounded-lg" >
              <User  size={20} />
              </div>
              Profile Picture
            </h2>
            <div className="flex flex-col items-center md:flex-row md:items-start gap-6">
              <div className="relative">
                <div className="w-32 h-32 bg-gray-700 rounded-full overflow-hidden flex items-center justify-center relative">
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#0ec1e7]" />
                    </div>
                  )}
                  <img 
                    src={avatarUrl} 
                    alt="User avatar" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <button 
                  type="button" 
                  onClick={() => inputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-blue-600 hover:bg-blue-700 p-2 rounded-full transition-colors z-20"
                >
                  <Camera size={18} className="text-white" />
                </button>
              </div>
              <form onSubmit={handleSaveAvatar} className='w-full'>
              <div className="flex flex-col gap-2 mb-4">
                <p className="text-gray-400">Upload a new profile picture</p>
                <label htmlFor="image" className="bg-gray-800 hover:bg-gray-700 cursor-pointer text-white py-2 px-4 w-fit text-center rounded-md transition-colors" >
                <input
                  type="file"
                  id="image"
                  name="image"
                  accept="image/*"
                  className="hidden"
                  ref={inputRef}
                  onChange={handleFileChange}
                />
                  Choose Image
                </label>
                
                <p className="text-sm  text-gray-500">Recommended: .jpeg, .png, .webp
                </p>
              </div>
              <div className="flex justify-end">
                <button
                  disabled={disable || !uploadedUrl}
                  type="submit"
                  className={`flex items-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-md transition-colors cursor-pointer ${disable || !uploadedUrl ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Save className="mr-2" size={18} />
                  Save Changes
                </button>
              </div>
              </form>
            </div>
          </div>
          <div className=" border backdrop-blur-sm border-gray-500 rounded-lg p-6">
            <div className='mb-4 w-full'>
            <div className="text-xl font-semibold flex items-center mb-2">
              <div className="mr-2 bg-green-400 p-2 rounded-lg">
              <Mail  size={20} />
              </div>
              <span>Account Information</span>
            </div>
            <div className=" border-red-600 bg-red-900/20 flex items-center rounded-lg p-3">
             <Lock size={16} className="text-red-400 mr-2" />
            <p className='text-red-400 text-sm '>*Only Admin has the Access to Edit your Account information.</p>
            </div>
            </div>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm text-gray-300 font-medium mb-1">
                  Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={fixed.email}
                    disabled
                    className="w-full bg-gray-900 border flex items-center border-gray-600 rounded-md py-2 px-4 pl-10 outline-none"
                  />
                  <Mail className="absolute left-2 top-[0.9rem] text-gray-400" size={16} />
                </div>
              </div>
              
              <div>
                <label htmlFor="role" className="block text-sm text-gray-300 font-medium mb-1">
                  Role
                </label>
                <div className="relative">
                  <select
                    id="role"
                    name="role"
                    placeholder="Select Role"
                    value={fixed.role}
                    disabled
                    className="w-full bg-gray-900 border border-gray-600 rounded-md py-2 px-4 pl-10 focus:ring-2 focus:ring-gray-400 focus:border-gray-500 outline-none appearance-none"
                  >
                    <option value="USER">User</option>
                    <option value="COORDINATOR">Coordinator</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  <BookOpen className="absolute left-2 top-[0.9rem] text-gray-400" size={16} />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="year" className="block text-sm  text-gray-300 font-medium mb-1">
                    Year
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="year"
                      name="year"
                      placeholder='Enter Year of College'
                      value={fixed.year}
                      disabled
                      className="w-full bg-gray-900 border border-gray-600 rounded-md py-2 px-4 pl-10 focus:ring-2 focus:ring-gray-400 focus:border-gray-500 outline-none"
                    />
                    <Calendar className="absolute left-2 top-[0.9rem] text-gray-400" size={16} />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="libraryId" className="block text-sm text-gray-300 font-medium mb-1">
                    Library ID
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="libraryId"
                      name="libraryId"
                      placeholder='Enter Library ID'
                      value={fixed.libraryId}
                      disabled
                      className="w-full bg-gray-900 border border-gray-600 rounded-md py-2 px-4 pl-10 focus:ring-2 focus:ring-gray-400 focus:border-gray-500 outline-none"
                    />
                    <CreditCard className="absolute left-2 top-[0.9rem] text-gray-400" size={16} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className=" border backdrop-blur-sm border-gray-500 rounded-lg  shadow-2xl p-6">
            <h2 className="text-xl text-white font-semibold mb-4 flex items-center">
              <div className="bg-red-600 p-2 rounded-lg mr-3">
                <Lock size={20} />
              </div>
              Change Password
            </h2>
            
            <ChangePass/>
          </div>
        </div>
      </div>
    </div>
  );
}