"use client";
import "./title.css";
export default function Title({ text }: { text: string }) {
  return <h1 className="title-obeci">{text}</h1>;
}