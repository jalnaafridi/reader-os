"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import type { Genre } from "@/types/database";

export interface Book {
  id: number;
  title: string;
  author: string;
  description: string;
  cover_url: string;
  cover_color: string;
  genre: Genre;
  difficulty: string;
  designing_question: string;
  identity_theme: string;
  total_chapters: number;
  is_published: boolean;
}

export function useBooks(genre?: Genre) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      const supabase = createClient();
      let query = supabase
        .from("books")
        .select("*")
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      if (genre) query = query.eq("genre", genre);

      const { data, error } = await query;
      if (error) setError(error.message);
      else setBooks(data || []);
      setLoading(false);
    }
    fetch();
  }, [genre]);

  return { books, loading, error };
}
