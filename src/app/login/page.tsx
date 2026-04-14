"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  // Real login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch(`https://web-production-6baf3.up.railway.app/api/auth/token/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username, // Use username if backend expects that
          password: password,
        }),
      });

      const data = await res.json();
      if (res.ok && data.access) {
        localStorage.setItem("accessToken", data.access);
        localStorage.setItem("refreshToken", data.refresh);
        router.push("/dashboard");
      } else {
        alert("Login failed: " + (data.detail || "Invalid credentials"));
      }
    } catch (err) {
      alert("Error logging in");
      console.error(err);
    }
  };

  return (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#e6f4f1] to-[#d0ebe3] font-poppins px-4">
    <div className="w-full max-w-sm p-8 bg-white border border-gray-200 shadow-md rounded-xl">
      <div className="flex justify-center mb-6">
        <Image
          src="/logo.png"
          alt="Early Circuit Logo"
          width={160}
          height={80}
          priority
          />
      </div>
      <h2 className="text-xl font-semibold mb-6 text-center text-[#008060]">
        Login to Early Circuit
      </h2>
      <form onSubmit={handleLogin} className="space-y-4">
        <input
          type="text"
          placeholder="Username"
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#008060] text-sm"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#008060] text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute text-xs text-gray-500 -translate-y-1/2 right-3 top-2/4 focus:outline-none"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        <button
          type="submit"
          className="w-full bg-[#008060] hover:bg-[#006747] text-white py-2 rounded-md text-sm font-medium transition duration-200">
          Login
        </button>
      </form>
    </div>
  </div>
);
}
