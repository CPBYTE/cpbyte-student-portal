import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {axiosInstance, setAccessToken} from "../../lib/axios";

export const loginUser = createAsyncThunk(
  "auth/login",
  async ({ library_id, password }, { rejectWithValue }) => {
    try {
      const res = await axiosInstance.post("/auth/login", { library_id, password });
      setAccessToken(res.data.data);
      localStorage.setItem("token", res.data.data);
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Login failed");
    }
  }
);

export const logoutUser = createAsyncThunk(
    "auth/logout",
    async(_,{rejectWithValue})=>{
        try {
          const res = await axiosInstance.get("/auth/logout");
          setAccessToken(null);
          return res.data;
        } catch (err) {
          return rejectWithValue(err.response?.data?.message || "Logout failed");
        }
    }
)

const initialState= {
    user: null,
    token: localStorage.getItem("token") || null,
    loading: false,
    error: null,
  }

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers:{
    authRefresh:()=>initialState,
    clearError:(state)=>{
      state.error=null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user || null;
        state.token = action.payload.data;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(logoutUser.pending, (state)=>{
        state.error=null;
        state.loading=true;
      })
      .addCase(logoutUser.fulfilled,(state)=>{
        state.user=null;
        state.token=null;
         localStorage.removeItem("token"); 
      })
      .addCase(logoutUser.rejected,(state,action)=>{
        state.error=action.payload;
        state.loading=false;
      })
  },
});

export const {authRefresh, clearError} = authSlice.actions
export default authSlice.reducer;