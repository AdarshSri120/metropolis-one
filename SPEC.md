# Metropolis One — simulation checks

Checked against this city, not the older NEXT build. Numbers are from the running rules, before and after the fix.

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
| North–south one-way painted on an east–west street | Cars still drove east. Path length 7. | No car takes that street. Path length 0. |
| East–west one-way on an east–west street | Cars drove east. | Still drive east. |
| North–south one-way on a north–south street | — | Cars still drive it. Path length 9. |
| Traffic score on the sample city | 100 on the first look, because the score used last month’s cars. | 96 immediately. After four months, 94. A signal does not move it. |

One-way here means an axis, matching the chip: east–west, or north–south. It is not a free-angle road, and it is not one car per person.

## Still approximate

Streets, avenues and expressways change how much traffic a tile can hold. They are not separate lanes with their own speed. Metro, rail and buses are sampled journeys, not a timetable for every passenger. That is deliberate on a phone.
