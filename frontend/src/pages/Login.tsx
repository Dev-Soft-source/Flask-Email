import React, { useState } from "react";
import axios from "axios";
import api from "./Api";

interface LoginPageProps {
  onLoginSuccess: () => void;
}

function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent page reload

    try {
      const res = await api.post("/api/login", {
        username,
        password,
      });

      const { token } = res.data;
      if (token) {
        localStorage.setItem("token", token);
        onLoginSuccess();
      } else {
        setError("No token received. Login failed.");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.response?.data?.error || "Login failed");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md text-center">
        <div className="flex justify-center mb-4">
          <img src="/user.jpg" alt="User Icon" className="w-16 h-16" />
        </div>
        <h2 className="text-xl font-semibold mb-6">
          LOGIN BROTHER'S IT INBOXING CHECKER1
        </h2>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-100 p-2 rounded">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleLogin}>
          <div className="text-left">
            <label className="block mb-1 text-sm font-medium">Username:</label>
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>
          <div className="text-left">
            <label className="block mb-1 text-sm font-medium">Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;