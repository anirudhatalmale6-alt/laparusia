# LaParusia

Pizza and bakery. Static site — no build step, no dependency.

**English only**, by the client's instruction.

## The eight-slice builder

The pizza is cut into eight, and each slice carries its **own** toppings. A
topping on one slice costs an eighth of what it costs on the whole pizza —
that arithmetic is the reason to cut it into eight at all. Without it, eight
slices would just be a drawing.

Sizes are in inches. The size chip also states how many people it serves,
because "14 inches" means nothing to most people and "serves 2 to 3" does.

## Every price is a placeholder

`data/menu.json` holds the sizes, bases, toppings and bakery items. **No figure
is written into the code.** Replace the numbers in that file and the page
follows — sizes, toppings and bakery items too. The page says so on screen; it
is a demonstration, not an offer.

## Notes on the drawing

The topping positions are **deterministic**, seeded from the slice number and
the topping name. The same slice with the same toppings always draws exactly
the same picture. With `Math.random()` the pieces would jump on every redraw
and you would see a flicker instead of a choice.

Positions are drawn in polar coordinates with a square root on the radius:
without it everything piles up near the tip, because a wedge has far more area
near the crust than at the centre.

## Keyboard and screen readers

Each slice is a real button: reachable by tab, activated by Enter or Space, and
labelled with what is on it ("Slice 3, with mushroom, black olive"). A
clickable pizza nobody can reach by keyboard excludes customers for nothing.

## Running it

Any static server. There is no build.

```
python3 -m http.server 8850
```
