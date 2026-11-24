"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";
import { Icon } from "@/components/Icon";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const usernameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    if (!username.trim() || !password) {
      setError("Enter Your Username And Password.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json.error || "Sign In Failed. Please Try Again.");
      }

      if (json.token) {
        sessionStorage.setItem("anubox_admin_token", json.token);
      }

      const nextParam = new URLSearchParams(window.location.search).get("next");
      const dest =
        typeof nextParam === "string" &&
        nextParam.startsWith("/") &&
        !nextParam.startsWith("//") &&
        !nextParam.includes("\\")
          ? nextParam
          : "/admin";

      router.replace(dest);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Sign In Failed. Please Try Again.");
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setLoading(false);
    }
  }

  return (
    <>
      <Nav />
      <main id="main" className="login">
        <div className="wrap">
          <form
            className={`login-card rise${shake ? " shake" : ""}`}
            onSubmit={handleSubmit}
            noValidate
          >
            <img
              className="login-logo"
              src="/assets/img/icon.jpg"
              alt=""
              width="56"
              height="56"
            />
            <h1>Admin Sign In</h1>
            <p>Sign In To Manage The Files Stored On AnuBox File Hosting.</p>

            <div className="login-form">
              <div className="field">
                <label htmlFor="username">Username</label>
                <div className="field-wrap">
                  <input
                    ref={usernameRef}
                    id="username"
                    name="username"
                    className="input"
                    type="text"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    aria-invalid={Boolean(error)}
                  />
                  <Icon name="user" className="field-ico" />
                </div>
              </div>

              <div className="field">
                <label htmlFor="password">Password</label>
                <div className="field-wrap has-toggle">
                  <input
                    id="password"
                    name="password"
                    className="input"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-invalid={Boolean(error)}
                    onKeyUp={(e) =>
                      setCapsLock(
                        Boolean(e.getModifierState && e.getModifierState("CapsLock"))
                      )
                    }
                    onBlur={() => setCapsLock(false)}
                  />
                  <Icon name="key" className="field-ico" />
                  <button
                    type="button"
                    className="btn btn-icon btn-sm btn-ghost reveal"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide Password" : "Show Password"}
                    aria-pressed={showPassword}
                  >
                    <Icon name={showPassword ? "eyeOff" : "eye"} />
                  </button>
                </div>
                {capsLock && <span className="caps-note">Caps Lock Is On</span>}
              </div>

              {error && (
                <div className="form-error" role="alert">
                  <Icon name="alert" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary btn-block"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spin" /> Signing In
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </div>

            <p className="login-foot">
              <Link href="/">Back To The Uploader</Link>
            </p>
          </form>
        </div>
      </main>
    </>
  );
}
