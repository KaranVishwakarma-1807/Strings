# Strings

Interactive text-physics web app where users can pull, tie, and cut string chains made from letters, words, and characters.

## Run

1. Open `index.html` in your browser.
2. Type your text in `Your String`.
3. Choose token mode:
   - `Characters` to simulate each character.
   - `Words` to simulate each word.
4. Click `Spawn String`.
5. Move cursor over the exact token/link you want.
6. Use action buttons for precision:
   - `Grab Selected`: grab/release the selected token.
   - `Tie/Untie Selected`: pin or unpin the selected token.
   - `Cut Selected Link`: split the selected connection.
7. Use `Reset Scene` anytime.

## Keyboard shortcuts

- `1`: select Pull tool
- `2`: select Tie tool
- `3`: select Cut tool
- `G` or `Space`: grab/release selected token
- `T`: tie/untie selected token
- `X`: cut selected link
- `N`: spawn string
- `R`: reset scene

Shortcuts are disabled while typing in the text input.

## Host on GitHub Pages

1. Push this repo to GitHub on the `main` branch.
2. In GitHub, go to `Settings` -> `Pages`.
3. Under `Build and deployment`, select `Source: GitHub Actions`.
4. Push any new commit to `main` and wait for the workflow to finish.
5. Your site will be available at:
   - `https://<your-username>.github.io/Strings/`

## Included interactions

- Physics simulation for text token chains
- Character and word modes
- Pulling, tying, and cutting via precision action buttons
- Objective tracker for ties and cuts
