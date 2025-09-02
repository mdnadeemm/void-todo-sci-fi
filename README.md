# Void Todo (minimal sci‑fi)

A minimal, modern, dark sci‑fi styled multi‑page Todo web app. Includes CSV import/export and a trailing Done button.

## Features

- Multi‑page lists (Pages sidebar)
- Add todos with Enter or Add button
- Trailing Done button and checkbox
- Rename/Delete page
- CSV Export/Import
- LocalStorage persistence
- Responsive, minimal dark sci‑fi theme

## Run

Open `index.html` in your browser. No build needed.

## CSV schema

Header:

```
list_id,list_name,todo_id,todo_text,done
```

Notes:

- Each row represents a todo. Empty todo_text creates an empty list row if needed.
- `done` accepts `true` or `false`.
- `todo_id` can be blank; it will be generated.

## Import/Export

- Export: click Export CSV.
- Import: click Import CSV and choose a `.csv`.

## Sample

See `sample.csv`.

## Tech

Plain HTML/CSS/JS. No dependencies.
