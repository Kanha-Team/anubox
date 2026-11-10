"use client";

import React, { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Modal } from "./Modal";
import { Icon } from "./Icon";
import { showToast } from "@/lib/toast";

export interface QRModalProps {
  url: string;
  onClose: () => void;
}

export function QRModal({ url, onClose }: QRModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: 440,
        margin: 0,
        errorCorrectionLevel: "H",
        color: {
          dark: "#0b0a16",
          light: "#ffffff",
        },
      })
        .then(() => setReady(true))
        .catch(() => showToast("Could Not Make The QR Code", "err"));
    }
  }, [url]);

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !ready) {
      showToast("The QR Code Is Still Loading", "warn");
      return;
    }
    const a = document.createElement("a");
    a.download = `anubox-qr-${Date.now()}.png`;
    a.href = canvas.toDataURL("image/png");
    document.body.appendChild(a);
    a.click();
    a.remove();
    showToast("QR Code Saved", "ok");
  };

  return (
    <Modal onClose={onClose} title="QR Code" width={380}>
      <div className="modal-head">
        <h2>
          <Icon name="qr" /> QR Code
        </h2>
        <p className="mono qr-url">{url}</p>
      </div>
      <div className="qr-box">
        {!ready && <span className="sk" />}
        <canvas
          ref={canvasRef}
          width="440"
          height="440"
          aria-label="QR Code For The File Link"
        />
      </div>
      <div className="modal-actions">
        <button type="button" className="btn" onClick={onClose}>
          Close
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSave}
          disabled={!ready}
        >
          <Icon name="download" /> Save PNG
        </button>
      </div>
    </Modal>
  );
}

export default QRModal;
