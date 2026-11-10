"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { Icon } from "@/components/Icon";
import { CodeBlock, CodeItem } from "@/components/CodeBlock";
import { copyToClipboard } from "@/lib/utils";

const TOC_GROUPS: [string, [string, string][]][] = [
  [
    "Getting Started",
    [
      ["overview", "Overview"],
      ["quickstart", "Quick Start"],
    ],
  ],
  [
    "Endpoints",
    [
      ["upload", "Upload A File"],
      ["hosturl", "Import From A Link"],
      ["large", "Large Files"],
      ["retrieve", "Open A File"],
    ],
  ],
  [
    "Reference",
    [
      ["responses", "Responses"],
      ["errors", "Errors"],
      ["limits", "Limits"],
      ["security", "Encryption"],
      ["admin", "Admin Access"],
      ["notes", "Good To Know"],
    ],
  ],
];

const FACTS: [string, string][] = [
  ["key", "No Api Key"],
  ["code", "Json Responses"],
  ["cloudUp", "Files Up To 100 Mb"],
  ["zap", "Range Requests"],
];

const ERROR_ROWS: [string, string, string][] = [
  ["400", "Bad Request", "A File, Url, Id Or Json Body Is Missing Or Invalid."],
  ["401", "Unauthorized", "Sign In Is Required For This Route, Or The Credentials Are Wrong."],
  ["404", "Not Found", "The File Does Not Exist Or Has Been Deleted."],
  ["413", "Too Large", "The File Or Piece Is Over The Size Limit."],
  ["416", "Range Not Satisfiable", "The Range Header Asks For Bytes Outside The File."],
  ["500", "Server Error", "Something Went Wrong On Our Side. Try Again In A Moment."],
  ["502", "Storage Error", "The Storage Provider Could Not Deliver The File Right Now."],
];

const LIMIT_ROWS: [string, string][] = [
  ["Largest File", "Up To 100 Mb By Default. The Site Owner Can Change It."],
  ["Piece Size", "At Most 4,000,000 Bytes Per Piece For Large Uploads."],
  ["Single Request", "Post /upload Takes About 4.5 Mb Per Request On Vercel."],
  ["File Links", "A Timestamp And An Extension, Such As 1753020712833.Png."],
];

const ALL_SECTION_IDS = TOC_GROUPS.flatMap(([, items]) =>
  items.map(([id]) => id)
);

function EndpointTag({
  verb,
  path,
  auth,
}: {
  verb: string;
  path: string;
  auth?: boolean;
}) {
  return (
    <div className="ep">
      <span className={`verb ${verb.toLowerCase()}`}>{verb}</span>
      <code>{path}</code>
      {auth && (
        <span className="lock">
          <Icon name="lock" /> Needs Sign In
        </span>
      )}
    </div>
  );
}

function ParamTable({
  rows,
  head = ["Name", "Type", "Required", "Description"],
}: {
  rows: [string, string, string, string][];
  head?: [string, string, string, string];
}) {
  return (
    <div className="tbl-wrap">
      <table>
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]}>
              <td>
                <code>{r[0]}</code>
              </td>
              <td>{r[1]}</td>
              <td>{r[2]}</td>
              <td>{r[3]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusCodeBadge({ code }: { code: string }) {
  const cls = code.startsWith("5") ? "bad" : code.startsWith("4") ? "warn" : "ok";
  return <span className={`status-code ${cls}`}>{code}</span>;
}

function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2>
      <a className="anchor" href={`#${id}`} aria-label={`Link To ${children}`}>
        #
      </a>
      {children}
    </h2>
  );
}

export default function DocsPage() {
  const [activeId, setActiveId] = useState("overview");
  const [origin, setOrigin] = useState("https://anubox.vercel.app");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: "-15% 0px -75% 0px" }
    );

    ALL_SECTION_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const uploadCode: CodeItem[] = [
    {
      label: "cURL",
      lang: "bash",
      code: `curl -X POST ${origin}/upload \\\n  -F "file=@path/to/file.jpg"`,
    },
    {
      label: "JavaScript",
      lang: "js",
      code: `const form = new FormData();\nform.append('file', fileInput.files[0]);\n\nconst res = await fetch('${origin}/upload', {\n  method: 'POST',\n  body: form\n});\nconst data = await res.json();\nconsole.log(data.url);`,
    },
    {
      label: "Python",
      lang: "py",
      code: `import requests\n\nwith open('file.jpg', 'rb') as f:\n    r = requests.post('${origin}/upload', files={'file': f})\n\nprint(r.json()['url'])`,
    },
  ];

  const hosturlCode: CodeItem[] = [
    {
      label: "cURL",
      lang: "bash",
      code: `curl "${origin}/hosturl?url=https://example.com/image.jpg"`,
    },
    {
      label: "JavaScript",
      lang: "js",
      code: `const res = await fetch(\n  '${origin}/hosturl?url=' + encodeURIComponent('https://example.com/image.jpg')\n);\nconsole.log((await res.json()).url);`,
    },
    {
      label: "Python",
      lang: "py",
      code: `import requests\n\nr = requests.get('${origin}/hosturl', params={'url': 'https://example.com/image.jpg'})\nprint(r.json()['url'])`,
    },
  ];

  const largeCode: CodeItem[] = [
    {
      label: "JavaScript",
      lang: "js",
      code: `const CHUNK = 4_000_000;\nconst uploadId = crypto.randomUUID().replaceAll('-', '');\nconst chunks = [];\n\nfor (let i = 0; i * CHUNK < file.size; i++) {\n  const res = await fetch('${origin}/api/upload/chunk', {\n    method: 'POST',\n    headers: {\n      'x-upload-id': uploadId,\n      'x-chunk-index': String(i),\n      'x-file-name': encodeURIComponent(file.name),\n    },\n    body: file.slice(i * CHUNK, (i + 1) * CHUNK),\n  });\n  chunks.push(await res.json());\n}\n\nconst done = await fetch('${origin}/api/upload/complete', {\n  method: 'POST',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify({ uploadId, name: file.name, type: file.type, chunks }),\n});\nconsole.log((await done.json()).url);`,
    },
  ];

  const responseSuccess: CodeItem[] = [
    {
      label: "Success 200",
      lang: "json",
      code: `{\n  "data": "${origin}/1753020712833.png",\n  "url": "${origin}/1753020712833.png",\n  "id": "1753020712833.png",\n  "filename": "sample.png",\n  "size": 83638,\n  "uploaded_on": "2026-11-10T14:11:52.833Z",\n  "media_type": "image/png"\n}`,
    },
  ];

  const adminCode: CodeItem[] = [
    {
      label: "Delete",
      lang: "bash",
      code: `curl -X POST ${origin}/delete-images \\\n  -u admin:YOUR_PASSWORD \\\n  -H "Content-Type: application/json" \\\n  -d '["${origin}/1753020712833.png"]'`,
    },
    {
      label: "List Files",
      lang: "bash",
      code: `curl -u admin:YOUR_PASSWORD \\\n  "${origin}/admin/api/media?page=1&limit=100"`,
    },
  ];

  return (
    <>
      <Nav active="/docs">
        <Link className="btn btn-primary btn-sm" href="/">
          <Icon name="upload" />
          <span className="hide-sm">Open Uploader</span>
        </Link>
      </Nav>

      <main id="main" className="docs">
        <header className="docs-hero">
          <div className="wrap rise">
            <span className="kicker">Api Reference</span>
            <h1>AnuBox File Hosting Api</h1>
            <p>
              Upload A File And Get A Permanent Direct Link Back. Every Response Is Json And You Do Not Need An Api Key.
            </p>
            <div className="docs-base">
              <span>Base Url</span>
              <code>{origin}</code>
              <button
                type="button"
                className="btn btn-icon btn-sm btn-ghost"
                onClick={() => copyToClipboard(origin, "Base Url Copied")}
                title="Copy Base Url"
                aria-label="Copy Base Url"
              >
                <Icon name="copy" />
              </button>
            </div>
            <ul className="docs-facts">
              {FACTS.map(([icon, label]) => (
                <li key={label}>
                  <Icon name={icon} /> {label}
                </li>
              ))}
            </ul>
          </div>
        </header>

        <div className="wrap docs-grid">
          <aside className="toc" aria-label="On This Page">
            {TOC_GROUPS.map(([group, items]) => (
              <div key={group} className="toc-group">
                <span className="toc-h">{group}</span>
                {items.map(([id, label]) => (
                  <a
                    key={id}
                    href={`#${id}`}
                    className={activeId === id ? "on" : ""}
                    aria-current={activeId === id ? "location" : undefined}
                  >
                    {label}
                  </a>
                ))}
              </div>
            ))}
          </aside>

          <div className="docs-body">
            {/* OVERVIEW */}
            <section id="overview">
              <SectionHeading id="overview">Overview</SectionHeading>
              <p>
                Three Endpoints Cover Most Needs: Upload A File, Import One From A Link, And Open It Again From Its Direct Url.
              </p>
              <div className="trio-mini">
                <div>
                  <Icon name="zap" />
                  <b>Fast</b>
                  <p>Cached Delivery With Support For Range Requests.</p>
                </div>
                <div>
                  <Icon name="lock" />
                  <b>Private</b>
                  <p>Files Are Encrypted Before They Reach Storage.</p>
                </div>
                <div>
                  <Icon name="code" />
                  <b>Simple</b>
                  <p>Plain Json And Nothing To Configure.</p>
                </div>
              </div>
              <ul className="ep-list">
                <li>
                  <EndpointTag verb="POST" path="/upload" />
                  <span>Multipart Upload, Up To About 4.5 Mb Per Request.</span>
                </li>
                <li>
                  <EndpointTag verb="GET" path="/hosturl?url={media_url}" />
                  <span>Copy A File From A Public Link.</span>
                </li>
                <li>
                  <EndpointTag verb="GET" path="/{timestamp}.{ext}" />
                  <span>Open A Stored File By Its Direct Link.</span>
                </li>
              </ul>
            </section>

            {/* QUICKSTART */}
            <section id="quickstart">
              <SectionHeading id="quickstart">Quick Start</SectionHeading>
              <ol className="docs-steps">
                <li>
                  <b>Send A File.</b>
                  <span>
                    Post It As <code>multipart/form-data</code> To{" "}
                    <code>/upload</code>.
                  </span>
                </li>
                <li>
                  <b>Read The Link.</b>
                  <span>
                    The Json Answer Holds The Permanent Link In <code>url</code>.
                  </span>
                </li>
                <li>
                  <b>Share It.</b>
                  <span>Open It, Embed It Or Hot-Link It Anywhere.</span>
                </li>
              </ol>
              <CodeBlock items={uploadCode.slice(0, 1)} />
            </section>

            {/* UPLOAD */}
            <section id="upload">
              <SectionHeading id="upload">Upload A File</SectionHeading>
              <EndpointTag verb="POST" path="/upload" />
              <p>
                Send The File As <code>multipart/form-data</code>. Vercel Limits One Request Body To About 4.5 Mb, So Use This For Small Files. For Anything Bigger, See{" "}
                <a href="#large">Large Files</a>.
              </p>
              <ParamTable rows={[["file", "file", "Yes", "The File To Upload."]]} />
              <CodeBlock items={uploadCode} />
            </section>

            {/* HOSTURL */}
            <section id="hosturl">
              <SectionHeading id="hosturl">Import From A Link</SectionHeading>
              <EndpointTag verb="GET" path="/hosturl?url={media_url}" />
              <p>
                We Download The Remote File On Our Server And Store It For You. It Works For Files Up To The 100 Mb Limit, Which Makes It Handy For Copying Images That Already Live Somewhere Else.
              </p>
              <ParamTable
                rows={[
                  [
                    "url",
                    "string",
                    "Yes",
                    "A Public Http Or Https Link To The File. Remember To Url-Encode It.",
                  ],
                ]}
              />
              <CodeBlock items={hosturlCode} />
            </section>

            {/* LARGE */}
            <section id="large">
              <SectionHeading id="large">Large Files</SectionHeading>
              <p>
                The Website Cuts Each File Into Pieces Of At Most 4,000,000 Bytes, Uploads Every Piece, And Then Asks The Server To Save The Result. You Can Do The Same From Your Own Code, For Files Up To 100 Mb.
              </p>
              <EndpointTag verb="POST" path="/api/upload/chunk" />
              <p>
                The Body Is The Raw Bytes Of One Piece. You Get Back A Signed Record For That Piece.
              </p>
              <ParamTable
                head={["Header", "Type", "Required", "Description"]}
                rows={[
                  [
                    "x-upload-id",
                    "string",
                    "Yes",
                    "Random, 8 To 64 Characters, The Same For Every Piece Of One File.",
                  ],
                  [
                    "x-chunk-index",
                    "integer",
                    "Yes",
                    "The Position Of The Piece: 0, 1, 2 And So On.",
                  ],
                  [
                    "x-file-name",
                    "string",
                    "No",
                    "The File Name, Url-Encoded.",
                  ],
                ]}
              />
              <EndpointTag verb="POST" path="/api/upload/complete" />
              <p>
                Send Json With The Records From The Step Above. The Response Is The Normal Success Json.
              </p>
              <ParamTable
                head={["Field", "Type", "Required", "Description"]}
                rows={[
                  [
                    "uploadId",
                    "string",
                    "Yes",
                    "The Same Id Used For Every Piece.",
                  ],
                  ["name", "string", "Yes", "The Original File Name."],
                  ["type", "string", "No", "The Mime Type Of The File."],
                  ["meta", "object", "No", "Optional Width, Height And Duration."],
                  [
                    "chunks",
                    "array",
                    "Yes",
                    "The Records Returned By Each Piece Upload.",
                  ],
                ]}
              />
              <CodeBlock items={largeCode} />
            </section>

            {/* RETRIEVE */}
            <section id="retrieve">
              <SectionHeading id="retrieve">Open A File</SectionHeading>
              <EndpointTag verb="GET" path="/{timestamp}.{ext}" />
              <p>
                Every Upload Returns A Direct Link Such As{" "}
                <code>{origin}/1753020712833.png</code>. Open It In A Browser, Put It In An <code>&lt;img&gt;</code> Tag, Or Hot-Link It Anywhere. The File Is Decrypted As It Is Sent, And Range Requests Work, So Video And Audio Can Seek. Types That Can Run Code In A Browser (<code>html</code>, <code>js</code>, <code>css</code>, <code>xml</code> And <code>svg</code>) Always Download.
              </p>
            </section>

            {/* RESPONSES */}
            <section id="responses">
              <SectionHeading id="responses">Responses</SectionHeading>
              <CodeBlock items={responseSuccess} />
              <dl className="fields">
                <div>
                  <dt>
                    <code>data</code> And <code>url</code>
                  </dt>
                  <dd>The Direct Link To The Stored File.</dd>
                </div>
                <div>
                  <dt>
                    <code>id</code>
                  </dt>
                  <dd>The File Key, Which Is The Last Part Of The Link.</dd>
                </div>
                <div>
                  <dt>
                    <code>filename</code>
                  </dt>
                  <dd>The Original File Name.</dd>
                </div>
                <div>
                  <dt>
                    <code>size</code>
                  </dt>
                  <dd>File Size In Bytes.</dd>
                </div>
                <div>
                  <dt>
                    <code>uploaded_on</code>
                  </dt>
                  <dd>Upload Time As An Iso 8601 Timestamp.</dd>
                </div>
                <div>
                  <dt>
                    <code>media_type</code>
                  </dt>
                  <dd>The Mime Type Of The File.</dd>
                </div>
              </dl>
              <CodeBlock
                items={[
                  {
                    label: "Error 4xx Or 5xx",
                    lang: "json",
                    code: '{\n  "error": "Failed to download file from URL"\n}',
                  },
                ]}
              />
            </section>

            {/* ERRORS */}
            <section id="errors">
              <SectionHeading id="errors">Errors</SectionHeading>
              <p>
                A Failed Request Returns An Http Status Code And A Json Body With A Readable <code>error</code> Message.
              </p>
              <div className="tbl-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Meaning</th>
                      <th>Common Cause</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ERROR_ROWS.map(([code, meaning, cause]) => (
                      <tr key={code}>
                        <td>
                          <StatusCodeBadge code={code} />
                        </td>
                        <td>{meaning}</td>
                        <td>{cause}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* LIMITS */}
            <section id="limits">
              <SectionHeading id="limits">Limits</SectionHeading>
              <dl className="fields">
                {LIMIT_ROWS.map(([label, val]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{val}</dd>
                  </div>
                ))}
              </dl>
            </section>

            {/* SECURITY */}
            <section id="security">
              <SectionHeading id="security">Encryption</SectionHeading>
              <p>
                Every File Is Split Into Pieces And Each Piece Is Encrypted On Our Server Before It Is Sent To Telegram. The Pieces Are Saved With Random Names, So The People Who Can See The Telegram Chat Only Find Unreadable Data.
              </p>
              <p>
                When Someone Opens Your Link, The Pieces Are Fetched, Checked And Decrypted On The Fly. If A Piece Was Changed In Storage, The Download Stops Instead Of Serving Damaged Data. Files Uploaded Before Encryption Was Added Keep Working As They Are.
              </p>
            </section>

            {/* ADMIN */}
            <section id="admin">
              <SectionHeading id="admin">Admin Access</SectionHeading>
              <p>
                The Admin Dashboard Has Its Own Sign In Page At <code>/admin</code>. For Scripts, The Same Routes Also Accept Http Basic Credentials Built From The <code>USERNAME</code> And <code>PASSWORD</code> Environment Variables.
              </p>
              <EndpointTag verb="GET" path="/admin" auth />
              <p>Browse, Preview, Copy And Delete Everything That Has Been Uploaded.</p>
              <EndpointTag verb="GET" path="/admin/api/media?page=1&limit=100" auth />
              <EndpointTag verb="POST" path="/delete-images" auth />
              <CodeBlock items={adminCode} />
            </section>

            {/* NOTES */}
            <section id="notes">
              <SectionHeading id="notes">Good To Know</SectionHeading>
              <ul className="bullets">
                <li>
                  Use <code>POST /upload</code> For Small Files And <code>/hosturl</code> For Files That Already Exist Online.
                </li>
                <li>
                  If The Site Owner Turns On <code>ENABLE_AUTH</code>, Uploads Need The Admin Credentials Too.
                </li>
                <li>
                  For Each Upload We Keep The File Name, Size, Type And, For Images And Video, The Dimensions And Duration.
                </li>
                <li>
                  We Also Keep The Ip Address That Made The Upload, For Abuse Protection. Only Site Administrators Can See It, And It Is Never Part Of A Response.
                </li>
              </ul>

              <div className="docs-next">
                <div>
                  <b>Ready To Build?</b>
                  <span>Try The Uploader Or Check That Everything Is Running.</span>
                </div>
                <div className="docs-next-links">
                  <Link className="btn btn-primary btn-sm" href="/">
                    <Icon name="upload" /> Open Uploader
                  </Link>
                  <Link className="btn btn-sm" href="/status">
                    <Icon name="zap" /> Service Status
                  </Link>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
