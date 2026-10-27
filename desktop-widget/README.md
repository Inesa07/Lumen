# Lumen desktop widget (Übersicht)

Lumi, today's goal, streak, mood and the quest of the day on the Mac desktop, without Xcode.

1. Supabase → SQL Editor: run `supabase/migrations/004_widget.sql` once.
2. Supabase → Edge Functions: create `widget` with `supabase/functions/widget/index.ts`, turn **Verify JWT off**.
3. Install Übersicht (free): https://tracesof.net/uebersicht
4. Lumen → Settings → Mac widget → **Connect widget**. Copy the URL and the key.
5. Übersicht menu → Open Widgets Folder. Put the `lumen.widget` folder there and paste the URL and key
   at the top of `lumen.widget/index.jsx`.

The browser keeps the summary up to date while Lumen (or Lumen mini) is open; the widget reloads every 5 minutes.
