import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { axiosInstance } from "../../lib/axios";

export const markAttendance = createAsyncThunk(
  "markAttendance/markAttendance",
  async ({ subject, responses, date }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axiosInstance.post(
        "/coordinator/markAttendance",
        {
          subject,
          responses,
          date
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return res.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to mark attendance"
      );
    }
  }
);

export const fetchOverallAttendance = createAsyncThunk(
  "markAttendance/fetchOverallAttendance",
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axiosInstance.get("/coordinator/attendance", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return res.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch overall attendance summary"
      );
    }
  }
);

const markAttendanceSlice = createSlice({
  name: "marAttendance",
  initialState: {
    loading: false,
    error: null,
    overallAttendance: [],
    overallLoading: false,
    overallError: null,
  },
  extraReducers: (builder) => {
    builder
        .addCase(markAttendance.pending, (state) => {
            state.loading = true;
        })
        
        .addCase(markAttendance.fulfilled, (state, action)=>{
            state.loading=false,
            state.error=null
        })

        .addCase(markAttendance.rejected,(state, action)=>{
            state.loading=false,
            state.error=action.payload
        })

        .addCase(fetchOverallAttendance.pending, (state) => {
            state.overallLoading = true;
            state.overallError = null;
        })
        .addCase(fetchOverallAttendance.fulfilled, (state, action)=>{
            state.overallLoading = false;
            state.overallAttendance = action.payload;
            state.overallError = null;
        })
        .addCase(fetchOverallAttendance.rejected,(state, action)=>{
            state.overallLoading = false;
            state.overallError = action.payload;
        });
  },
});

export default markAttendanceSlice.reducer;
