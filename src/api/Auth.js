// src/api/authService.js
import { storage } from "../utils/storage";

const API_LOGIN = "https://droneark.bsi.co.id/api/users/user/login";
const API_LOGOUT = "https://droneark.bsi.co.id/api/users/user/logout";

export async function login(username, password) {
  try {
    const response = await fetch(API_LOGIN, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();
    console.log("🧠 Login response:", data);

    if (data.status === "success" && data.session_token) {
      const session = {
        token: data.session_token,
        refresh: data.refresh_token,
        expires: data.expires_at,
        user_id: data.user_id,
        username: data.username,
        role: data.role,
      };

      await storage.setItem("session", JSON.stringify(session));
      return { success: true, session };
    }

    return { success: false, message: data.message || "Invalid credentials" };
  } catch (error) {
    console.error("❌ Login error:", error);
    return { success: false, message: "Login failed. Check your connection." };
  }
}

export async function logout() {
  try {
    const session = await getSession();
    const token = session.session.session_token;
    const response = await fetch(API_LOGOUT,{
      method:"POST",
      headers:{
        "Content-Type": "application/json",
      },
      body:{
        "session_token": token
      }
    }
    );
    data = await response.json();
    if(data.status !== 200){
      throw new Error("can't logout");
    }
    await storage.removeItem("session");
    await storage.clear();
    console.log("👋 Logged out and cleared session");
    return true;
  } catch (error) {
    console.error("❌ Logout error:", error);
    return false;
  }
}

export async function getSession() {
  try {
    const stored = await storage.getItem("session");
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error("❌ Get session error:", error);
    return null;
  }
}
