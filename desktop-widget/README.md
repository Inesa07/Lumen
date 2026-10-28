# Lumen desktop widget (Übersicht)

Lumi, today's goal, streak, mood and the quest of the day on the Mac desktop, without Xcode.

1. Supabase → SQL Editor: run `supabase/migrations/004_widget.sql` once.
2. Supabase → Edge Functions: create `widget` with `supabase/functions/widget/index.ts`, turn **Verify JWT off**.
3. Install Übersicht (free): https://tracesof.net/uebersicht
4. Lumen → Settings → Mac widget → **Connect widget**. Copy the URL and the key.
5. Übersicht menu → Open Widgets Folder. Put the `lumen.widget` folder there and paste the URL and key
   at the top of `lumen.widget/index.jsx`.

The browser keeps the summary up to date while Lumen (or Lumen mini) is open; the widget reloads every 5 minutes.

## What the widget shows

- **Lumi's little world.** In the morning Lumi wakes up, in the day it flies around, in the evening it
  gets cosy, and at night it sleeps (z z z). The sky follows the real time of day and the weather.
- **Weather.** The widget asks [wttr.in](https://wttr.in) at most every 30 minutes. wttr.in finds the
  city from the computer's internet address; nothing about Lumen is sent there.
- **Seasons and holidays.** Falling leaves in autumn, snow in winter, blossoms in spring, butterflies in
  summer; a Santa hat and a tree at New Year, a pumpkin at Halloween, a party hat on your birthday.
- **Lumi's mood.** Happy after a lesson today; missing you after 2 days without lessons.
- **The dream.** The dream from the Lumi page with its stars. Lumi wears the dream hat from 50 %.
- **Small or large.** `const SIZE = "small"` at the top hides the line with today's goal, streak, light
  and medals.
