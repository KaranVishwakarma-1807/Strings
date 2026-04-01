# Strings

Strings is an interactive browser-based text physics playground.  
It lets users simulate strings made of characters or words, then manipulate them with pull, tie, and cut interactions.

## Features

- Real-time text-chain physics simulation
- Token modes:
  - `Characters`
  - `Words`
- Precision actions:
  - `Grab Selected`
  - `Tie/Untie Selected`
  - `Cut Selected Link`
- Keyboard-first control support
- Lightweight static app (HTML, CSS, JavaScript)

## Getting Started

No build step is required.

1. Open `index.html` in your browser.
2. Enter text in `Your String`.
3. Choose token mode (`Characters` or `Words`).
4. Click `Spawn String`.
5. Select a token or link on the canvas.
6. Use action buttons or keyboard shortcuts to interact.

## Controls

### Mouse / UI

- `Pull`, `Tie`, `Cut`: select interaction mode
- `Grab Selected`: hold/release selected token
- `Tie/Untie Selected`: pin/unpin selected token
- `Cut Selected Link`: split selected connection
- `Spawn String`: add a new string chain
- `Reset Scene`: reset the simulation

### Keyboard Shortcuts

- `1`: Pull tool
- `2`: Tie tool
- `3`: Cut tool
- `G` or `Space`: Grab/Release selected token
- `T`: Tie/Untie selected token
- `X`: Cut selected link
- `N`: Spawn string
- `R`: Reset scene

Note: Shortcuts are disabled while typing in the text input field.

## Deployment (GitHub Pages)

This project includes a GitHub Actions workflow for Pages deployment.

1. Push to the `main` branch.
2. In GitHub, open `Settings` -> `Pages`.
3. Under `Build and deployment`, set `Source` to `GitHub Actions`.
4. Push a new commit to trigger deployment.

Your site URL will be:

`https://<your-username>.github.io/Strings/`

## License

This project is distributed under the terms of the repository's `LICENSE` file.
