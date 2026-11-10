"use client";

import React from "react";
import Nav from "@/components/Nav";
import { Icon } from "@/components/Icon";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <>
      <Nav />
      <main id="main" className="lost">
        <div className="wrap lost-in rise">
          <span className="modal-ico bad">
            <Icon name="alert" />
          </span>
          <h1>Something Went Wrong</h1>
          <p className="lost-text">
            That Did Not Work As Expected. Try Again, Or Come Back In A Moment.
          </p>
          {error?.digest && (
            <code className="lost-path">Reference: {error.digest}</code>
          )}
          <div className="lost-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => reset()}
            >
              Try Again
            </button>
            <a className="btn" href="/">
              Go Home
            </a>
          </div>
        </div>
      </main>
    </>
  );
}
