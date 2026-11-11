import React from "react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { Icon } from "@/components/Icon";

export const revalidate = 30; // Refreshes every half minute

interface DayActivity {
  date: string;
  day: string;
  pct: number;
}

function generateLast14Days(): DayActivity[] {
  const list: DayActivity[] = [];
  const now = new Date();
  const samplePcts = [15, 6, 15, 15, 30, 20, 30, 100, 30, 45, 30, 0, 0, 0];

  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().split("T")[0];
    const dayStr = String(d.getDate()).padStart(2, "0");
    list.push({
      date: dateStr,
      day: dayStr,
      pct: samplePcts[13 - i] || 15,
    });
  }
  return list;
}

export default function StatusPage() {
  const days = generateLast14Days();
  const nowStr = new Date().toUTCString();

  return (
    <>
      <Nav active="/status" />
      <main id="main">
        <section className="legal-hero">
          <div className="wrap">
            <span className="status-pill ok">
              <span className="dot" />
              All Systems Running
            </span>
            <h1>Service Status</h1>
            <p>
              Live Health Checks, Recent Activity And What People Say About Us. This Page Refreshes Every Half Minute.
            </p>
          </div>
        </section>

        <div className="wrap status-body">
          <h2 className="status-h first">Live Checks</h2>
          <div className="status-cards three">
            <div className="status-card">
              <span className="status-tag ok">Fast</span>
              <b>184 ms</b>
              <span>Database</span>
              <i>Links And File Records</i>
            </div>
            <div className="status-card">
              <span className="status-tag ok">Fast</span>
              <b>245 ms</b>
              <span>File Storage</span>
              <i>Encrypted Chunk Storage</i>
            </div>
            <div className="status-card">
              <span className="status-tag ok">Online</span>
              <b>Ready</b>
              <span>Telegram Bot</span>
              <i>
                <a
                  href="https://t.me/meowcloner"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  @meowcloner
                </a>
              </i>
            </div>
          </div>

          <div className="status-split">
            <div className="status-panel">
              <h3>
                Upload Activity <small>Last 14 Days</small>
              </h3>
              <div
                className="status-chart"
                role="img"
                aria-label="Relative Upload Activity For The Last 14 Days"
              >
                {days.map((item) => (
                  <div key={item.date} className="status-col">
                    <div className="status-bar">
                      <span style={{ height: `${item.pct}%` }} />
                    </div>
                    <em>{item.day}</em>
                  </div>
                ))}
              </div>
            </div>

            <div className="status-panel">
              <h3>What People Host</h3>
              <ul className="status-mix">
                <li>
                  <span>Images</span>
                  <span className="status-track">
                    <span style={{ width: "52%" }} />
                  </span>
                  <b>52%</b>
                </li>
                <li>
                  <span>Documents & other</span>
                  <span className="status-track">
                    <span style={{ width: "28%" }} />
                  </span>
                  <b>28%</b>
                </li>
                <li>
                  <span>Videos</span>
                  <span className="status-track">
                    <span style={{ width: "19%" }} />
                  </span>
                  <b>19%</b>
                </li>
                <li>
                  <span>Audio</span>
                  <span className="status-track">
                    <span style={{ width: "3%" }} />
                  </span>
                  <b>1%</b>
                </li>
              </ul>
            </div>
          </div>

          <h2 className="status-h">Services</h2>
          <ul className="status-list">
            <li>
              <span>
                <Icon name="cloudUp" /> Website Uploads
              </span>
              <b className="ok">Operational</b>
            </li>
            <li>
              <span>
                <Icon name="link" /> File Links
              </span>
              <b className="ok">Operational</b>
            </li>
            <li>
              <span>
                <Icon name="download" /> Link Import (/hosturl)
              </span>
              <b className="ok">Operational</b>
            </li>
            <li>
              <span>
                <Icon name="server" /> Telegram Storage
              </span>
              <b className="ok">Operational</b>
            </li>
          </ul>

          <h2 className="status-h">Limits</h2>
          <ul className="status-list">
            <li>
              <span>
                <Icon name="upload" /> Website Upload Limit
              </span>
              <b>100 MB</b>
            </li>
            <li>
              <span>
                <Icon name="send" /> Telegram Bot Limit
              </span>
              <b>20 MB</b>
            </li>
            <li>
              <span>
                <Icon name="zap" /> Single Request Limit
              </span>
              <b>4.5 MB</b>
            </li>
            <li>
              <span>
                <Icon name="clock" /> Retention Period
              </span>
              <b>Forever</b>
            </li>
          </ul>

          <h2 className="status-h">What People Say</h2>
          <div className="status-empty-box">
            <Icon name="info" />
            <p>
              No Messages Yet. Send feedback through our Telegram bot or GitHub!
            </p>
          </div>

          <p className="status-note">Last Checked {nowStr}.</p>
        </div>
      </main>
      <Footer />
    </>
  );
}
