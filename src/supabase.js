import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://abusgasorwsaoahmjvyl.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFidXNnYXNvcndzYW9haG1qdnlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MDI4MjYsImV4cCI6MjA4NTI3ODgyNn0.lmDfWXnKlNw4HMTnlD3dnMyCuZy3tjJNANyVTpE-MKw";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
