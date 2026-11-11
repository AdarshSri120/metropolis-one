# Metropolis One — simulation checks

Checked against this city, not the older NEXT build. Numbers are from the running rules.

## Already true

| Check | Result |
| --- | --- |
| Empty map GDP | ₹0. No phantom ₹1,000. |
| Empty map power and water | 0%. Nothing is connected, so nothing is covered. |
| Plant and waterworks both off any road | 0% and 0%. Each one needs the other, and neither touches a road. |
| Signal painted on a real road | Traffic stayed 94. Happiness stayed 86. An isolated light does not fake a clearer city. |
| Sample city | 3,134 people, power 98, water 99, 5 bridges. Still the same city. |
| Broken save | NaN cash, an infinite month, and a non-finite camera load as finite numbers. Cash falls back to ₹8.50 lakh. The camera stays on the map. |

## Fixed

| Check | Before | After |
| --- | --- | --- |
| Power plant alone, no road | Power 100% | Power 0%. A plant only covers a road it touches. |
| Waterworks alone, no road | Water 100% | Water 0%. Same rule. |
| Home beside a road that also touches power and water | — | Power 100%, water 100%, the home is served. |
| One-way on an east–west street | The first paint only chose an axis. Cars could still drive back the other way. | East, then west, then south, then north. A car on an eastbound road never steps west. The same rule holds for the other three directions. |
| Older city file | A north–south one-way was stored as the number 2. | That old file loads as southbound, not westbound. A new file keeps west as west. |
| Traffic score on the sample city | 100 on the first look, because the score used last month’s cars. | 96 immediately. After four months, 94. A signal does not move it. |
| Autosave | Only treasury, month, and how many tiles were built. A tax, a fare, a district, or a one-way could sit unsaved. | The whole city file is compared, including the name. It writes about every 12 seconds, and again when the 3D view or the lot plan is swapped. |
| ₹0 fare and 0% duty | A free fare came back as ₹8. A 0% duty came back as 4%. | Both stay at zero. |
| Scroll zoom | Each switch between the lot plan and 3D left the old scroll listener in place. | One scroll listener and one right-click listener after Lots, 3D, Lots. |
| Import duty | The duty was added to export sales. | Export sales stay `goods sold × 1.8`. The slider is an import duty: `goods bought in × duty`. |

One-way is a painted direction, not a free-angle road, and not one car per person. The arrow on the road points the only way traffic may go. A corner is allowed. The reverse is not.

## Still approximate

Streets, avenues and expressways change how much traffic a tile can hold. They are not separate lanes with their own speed. Cars follow a handful of generated paths that obey one-way signs. They do not each route from a home to a job, and they do not queue at a signal. Metro, rail and buses are sampled journeys, not a timetable for every passenger. Goods balance inside a road network. They are not hauled as inventory. The four sectors are separate grids with edge roads, not one seamless map. That is deliberate on a phone.
