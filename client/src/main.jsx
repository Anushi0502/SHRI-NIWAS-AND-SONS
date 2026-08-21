import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import App from "./App";
import "./styles/index.css";
import { AuthProvider } from "./context/AuthContext";
import { CompanyProvider } from "./context/CompanyContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CompanyProvider>
          <App />
          <Toaster position="top-right" />
        </CompanyProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
