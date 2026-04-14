// client/src/auth/tokenService.ts

export async function refreshAccessToken() {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) throw new Error("No refresh token available");

  const res = await fetch(`https://web-production-6baf3.up.railway.app/api/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh: refreshToken }),
  });

  if (!res.ok) throw new Error("Failed to refresh token");

  const data = await res.json();
  localStorage.setItem("accessToken", data.access);
  return data.access;
}

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  let accessToken = localStorage.getItem("accessToken");
  let headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
   if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
   }

  let res = await fetch(url, { ...options, headers });

  if (res.status === 401) { // Token expired or invalid
    try {
      accessToken = await refreshAccessToken();

      headers = {
        ...(options.headers || {}),
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      };

      res = await fetch(url, { ...options, headers });
      if (res.status === 401) {
        throw new Error("Unauthorized");
      }
    } catch (e) {
      // Optionally redirect to login
      localStorage.clear();
      window.location.href = "/login";
      throw e;
    }
  }

  return res;
}
