// src/routes/PrivateRoute.jsx
import { Navigate, Outlet } from "react-router-dom";
import { isAuthenticated } from "../services/authServices";

export default function PrivateRoute() {
  return isAuthenticated() ? <Outlet /> : <Navigate to="/" replace />;
}
