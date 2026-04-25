import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import DemoDashboard from "./DemoDashboard";
import ClientsView from "./components/ClientsView";
import LoyaltySettings from "./components/LoyaltySettings";
import ScannerView from "./components/ScannerView";
import PublicEnrollment from "./views/PublicEnrollment";
import { ProtectedRoute } from "./components/ProtectedRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/rejoindre/:restaurantId" element={<PublicEnrollment />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DemoDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers"
          element={
            <ProtectedRoute>
              <ClientsView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/loyalty"
          element={
            <ProtectedRoute>
              <LoyaltySettings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/scanner"
          element={
            <ProtectedRoute>
              <ScannerView />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
