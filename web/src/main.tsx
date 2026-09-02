import React from "react";
import ReactDOM from "react-dom/client";
import DashboardPage from "../app/page";
import "../app/globals.css";

const root = document.getElementById("root");
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <DashboardPage />
    </React.StrictMode>
  );
}

if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}
if (typeof window !== "undefined" && "caches" in window) {
  caches.keys().then((keys) => {
    for (const key of keys) {
      caches.delete(key);
    }
  });
}
