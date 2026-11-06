import React from "react";
export const PageHead = ({ eyebrow, title, children, action }) => (
  <div className="gym-page-head">
    <div>
      <span className="gym-eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{children}</p>
    </div>
    {action}
  </div>
);
export const Card = ({ title, children, className = "" }) => (
  <section className={"gym-card " + className}>
    {title && <h2>{title}</h2>}
    {children}
  </section>
);
export const Empty = ({ children }) => (
  <div className="gym-empty">{children}</div>
);
export const Field = ({ label, children }) => (
  <label className="gym-field">
    <span>{label}</span>
    {children}
  </label>
);
export const Notice = ({ children, error = false }) =>
  children ? (
    <p
      role={error ? "alert" : "status"}
      className={"gym-notice " + (error ? "error" : "")}
    >
      {children}
    </p>
  ) : null;
