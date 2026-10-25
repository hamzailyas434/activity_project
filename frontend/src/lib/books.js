import { useState } from "react";
import { useUI } from "../components/ui";
import { useApi } from "./api";
import useLoad from "./useLoad";

/* Shelf state shared by both designs: books, reading summary, which book (and page) the route opens, delete. */
export function useShelf(sub) {
  const api = useApi();
  const { toast, ask } = useUI();
  const books = useLoad(api, a => a.get("/books"), "", []);
  const summary = useLoad(api, a => a.get("/books/dashboard-summary"), "", null);
  const [up, setUp] = useState(false), [goal, setGoal] = useState(false);
  const list = Array.isArray(books.data) ? books.data : [];
  const today = summary.data?.pages_today || 0, target = summary.data?.daily_pages_goal || 10;
  // most recently read first; fall back to newest upload
  const cur = [...list].sort((a, b) => String(b.last_read_date || "").localeCompare(String(a.last_read_date || "")))[0];
  // #/books/4 opens the reader at the saved page, #/books/4/161 at page 161
  const [, idS, pgS] = String(sub || "").match(/^(\d+)(?:\/(\d+))?$/) || [];
  const openId = idS ? +idS : null, openPg = pgS ? +pgS : null;
  const reading = openId && list.find(b => b.id === openId);

  const del = async b => {
    if (!(await ask({ title: `Delete ${b.title}?`, body: "The book file, its notes, bookmarks and highlights will be removed.", ok: "Delete", danger: true }))) return;
    try { await api.del(`/books/${b.id}`); books.setData(l => l.filter(x => x.id !== b.id)); toast("Book deleted"); }
    catch (e) { toast(e.message, "err"); }
  };

  return { api, toast, ask, books, summary, up, setUp, goal, setGoal, list, today, target, cur, openId, openPg, reading, del };
}
