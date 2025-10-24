"use client";
import "./button.css";
export default function ButtonObeci({ text }: { text: string }) {
  return (
    <button className="button-obeci">
      {text}
    </button>
  );
}