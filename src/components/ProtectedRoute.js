import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const user = JSON.parse(sessionStorage.getItem("user"));

  if (!user) {
    return <Navigate to="/login" replace />; // Redirect to login if no user
  }

  return children; // Render the protected component if user exists
};

export default ProtectedRoute;