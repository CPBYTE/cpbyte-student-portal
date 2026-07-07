import React from 'react'

import { Outlet } from 'react-router-dom';
import Navbar from '../componenets/Navbar';

function UserLayout() {
  return (
    <div className='w-full min-h-screen bg-[#070b0f] flex flex-col'>
      <Navbar />
      <div className='flex-1 md:ml-60 pt-16 md:pt-0 transition-all duration-300 ease-in-out flex flex-col'>
        <div className='MainContent w-full flex-1 bg-[#070b0f] flex flex-col justify-center items-center'>
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default UserLayout
