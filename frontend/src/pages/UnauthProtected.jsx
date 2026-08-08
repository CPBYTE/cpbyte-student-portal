import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import load from '../assets/Animation - 1751523503507.webm'
import { userProfile } from '../redux/slices/profileSlice'

function UnauthProtected({children}) {
  const dispatch = useDispatch()  
  const {data, loading} = useSelector((state) => state.dashboard)
  
  const [isloading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(()=>{
    const token = localStorage.getItem('token')
    if(!token){
      navigate('/login')
    }
  }, [navigate])

  useEffect(() => {
    async function fetchData() {
      const res = await dispatch(userProfile())

      if(res.meta.requestStatus==="fulfilled")        
        setLoading(false)
      else {
        localStorage.removeItem('token')
        navigate('/login')
      }
    }

    if(!data || Object.keys(data).length === 0) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [dispatch, data, navigate])

  if(isloading) {
    return (
        <div className="flex justify-center items-center h-screen bg-gray-950">
            <video src={load} autoPlay muted loop></video>
        </div>
    )
  } else {
    return (
      <>
        {children}
      </>
    )
  }
}

export default UnauthProtected
